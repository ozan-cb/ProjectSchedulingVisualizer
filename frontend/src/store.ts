import { create } from "zustand";
import type {
  TaskEvent,
  Task,
  TimelineState,
  SearchTreeState,
  SearchNode,
  ViewMode,
  GameState,
  ConstraintViolation,
  InstanceMetadata,
} from "./types";
import { extractProblemDefinition } from "./problemExtractor";
import { validateSchedule as validateScheduleConstraints } from "./constraintValidator";

interface TimelineStore extends TimelineState, GameState {
  currentInstance: InstanceMetadata | null;
  loadEvents: (events: TaskEvent[]) => void;
  setCurrentInstance: (instance: InstanceMetadata) => void;
  switchInstance: (instance: InstanceMetadata) => void;
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  reset: () => void;
  getTasksAtTime: (time: number) => Task[];
  getSearchTreeAtTime: (time: number) => SearchTreeState;
  setViewMode: (mode: ViewMode) => void;
  getLatestEventAtTime: (time: number) => TaskEvent | null;
  setGameMode: (enabled: boolean) => void;
  setUserSchedule: (taskId: string, start: number, end: number) => void;
  validateSchedule: () => ConstraintViolation[];
  resetGame: (mode: "clear" | "revert") => void;
  getProblemDefinition: () => ReturnType<typeof extractProblemDefinition>;
  getCurrentSchedule: () => Map<string, { start: number; end: number }>;
  getCurrentCost: () => number;
  isScheduleValid: () => boolean;
  isScheduleOptimal: () => boolean;
}

const initialState: TimelineState = {
  events: [],
  tasks: [],
  currentTime: 0,
  maxTime: 0,
  minTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  viewMode: "game",
  isGameMode: false,
  userSchedule: new Map(),
  constraintViolations: [],
  gameStatus: "not_started",
  lastValidSchedule: new Map(),
};

function calculateTreePositions(
  nodes: Map<string, SearchNode>,
  rootId: string,
): void {
  const nodeWidth = 120;
  const horizontalSpacing = 40;
  const verticalSpacing = 80;

  const subtreeWidths = new Map<string, number>();

  function calculateSubtreeWidth(nodeId: string): number {
    const node = nodes.get(nodeId);
    if (!node || node.children.length === 0) {
      subtreeWidths.set(nodeId, nodeWidth);
      return nodeWidth;
    }

    let totalWidth = 0;
    node.children.forEach((childId, index) => {
      const childWidth = calculateSubtreeWidth(childId);
      totalWidth += childWidth;
      if (index < node.children.length - 1) {
        totalWidth += horizontalSpacing;
      }
    });

    subtreeWidths.set(nodeId, Math.max(nodeWidth, totalWidth));
    return subtreeWidths.get(nodeId)!;
  }

  function assignPositions(nodeId: string, x: number, y: number): void {
    const node = nodes.get(nodeId);
    if (!node) return;

    node.x = x;
    node.y = y;

    if (node.children.length === 0) return;

    const subtreeWidth = subtreeWidths.get(nodeId) || nodeWidth;
    let currentX = x - subtreeWidth / 2;

    node.children.forEach((childId) => {
      const childWidth = subtreeWidths.get(childId) || nodeWidth;
      const childX = currentX + childWidth / 2;
      assignPositions(childId, childX, y + verticalSpacing);
      currentX += childWidth + horizontalSpacing;
    });
  }

  calculateSubtreeWidth(rootId);
  const root = nodes.get(rootId);
  if (root) {
    assignPositions(rootId, 400, 60);
  }
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  ...initialState,
  currentInstance: null,

  loadEvents: (events) => {
    const timestamps = events.map((e) => e.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    set({
      events,
      minTime,
      maxTime,
      currentTime: minTime,
    });
  },

  setCurrentInstance: (instance) => {
    set({ currentInstance: instance });
  },

  switchInstance: (instance) => {
    set({
      currentInstance: instance,
      events: [],
      tasks: [],
      currentTime: 0,
      maxTime: 0,
      minTime: 0,
      isPlaying: false,
      userSchedule: new Map(),
      constraintViolations: [],
      gameStatus: "not_started",
      lastValidSchedule: new Map(),
    });
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  reset: () => set({ ...initialState, currentInstance: null }),

  setViewMode: (mode) => set({ viewMode: mode }),

  getTasksAtTime: (time) => {
    const { events } = get();
    const taskMap = new Map<string, Task>();

    const filteredEvents = events.filter((event) => event.timestamp <= time);

    filteredEvents.forEach((event) => {
      switch (event.type) {
        case "assign":
          taskMap.set(event.taskId, {
            id: event.taskId,
            name: event.taskName || event.taskId,
            start: new Date(event.startTime || 0),
            end: new Date(event.endTime || 0),
            startTime: event.startTime || 0,
            endTime: event.endTime || 0,
            progress: 0,
            resourceId: event.resourceId,
          });
          break;
        case "remove":
          taskMap.delete(event.taskId);
          break;
        case "start":
          const startTask = taskMap.get(event.taskId);
          if (startTask && event.startTime !== undefined) {
            startTask.start = new Date(event.startTime);
            startTask.startTime = event.startTime;
            if (event.endTime !== undefined) {
              startTask.end = new Date(event.endTime);
              startTask.endTime = event.endTime;
            }
          }
          break;
        case "complete":
          const completeTask = taskMap.get(event.taskId);
          if (completeTask && event.endTime !== undefined) {
            completeTask.end = new Date(event.endTime);
            completeTask.endTime = event.endTime;
            completeTask.progress = 100;
          }
          break;
        case "modify":
          const modifyTask = taskMap.get(event.taskId);
          if (modifyTask && event.newValue) {
            Object.assign(modifyTask, event.newValue);
          }
          break;
      }
    });

    return Array.from(taskMap.values()).sort((a, b) => {
      const aId = parseInt(a.id);
      const bId = parseInt(b.id);
      return aId - bId;
    });
  },

  getSearchTreeAtTime: (time) => {
    const { events } = get();
    const nodes = new Map<string, SearchNode>();
    const rootId = "root";
    const currentPath: string[] = [rootId];
    const visibleNodes = new Set<string>();
    let maxDecisionLevel = 0;

    nodes.set(rootId, {
      id: rootId,
      parentId: null,
      decisionLevel: 0,
      taskId: "root",
      taskName: "Root",
      value: 0,
      timestamp: 0,
      status: "created",
      children: [],
      x: 0,
      y: 0,
    });
    visibleNodes.add(rootId);

    for (const event of events) {
      if (event.timestamp > time) break;

      if (event.type === "assign" && event.nodeId) {
        const nodeId = event.nodeId;
        const parentId = event.parentNodeId || rootId;
        const decisionLevel = event.decisionLevel || 0;

        const newNode: SearchNode = {
          id: nodeId,
          parentId,
          decisionLevel,
          taskId: event.taskId,
          taskName: event.taskName || event.taskId,
          value: event.startTime || 0,
          timestamp: event.timestamp,
          status: (event.nodeStatus as any) || "created",
          children: [],
          x: 0,
          y: 0,
        };

        nodes.set(nodeId, newNode);
        visibleNodes.add(nodeId);
        currentPath.push(nodeId);
        maxDecisionLevel = Math.max(maxDecisionLevel, decisionLevel);

        const parent = nodes.get(parentId);
        if (parent) {
          parent.children.push(nodeId);
        }
      } else if (
        event.type === "remove" &&
        event.backtrackToLevel !== undefined
      ) {
        const backtrackLevel = event.backtrackToLevel;
        while (currentPath.length > backtrackLevel + 1) {
          const removed = currentPath.pop();
          if (removed) {
            visibleNodes.delete(removed);
          }
        }
      }
    }

    calculateTreePositions(nodes, rootId);

    return {
      nodes,
      rootId,
      currentPath,
      maxDecisionLevel,
      visibleNodes,
    };
  },

  getLatestEventAtTime: (time) => {
    const { events } = get();
    const eventsAtTime = events.filter((e) => e.timestamp === time);
    return eventsAtTime.length > 0
      ? eventsAtTime[eventsAtTime.length - 1]
      : null;
  },

  setGameMode: (enabled) => {
    const state = get();
    set({ isGameMode: enabled });
    if (enabled && state.userSchedule.size === 0) {
      const problem = state.getProblemDefinition();
      const initialSchedule = new Map<string, { start: number; end: number }>();
      problem.tasks.forEach((task) => {
        initialSchedule.set(task.id, { start: 0, end: task.duration });
      });
      set({
        userSchedule: initialSchedule,
        lastValidSchedule: new Map(initialSchedule),
        gameStatus: "in_progress",
      });
      get().validateSchedule();
    }
  },

  setUserSchedule: (taskId, start, end) => {
    const state = get();
    const newSchedule = new Map(state.userSchedule);
    newSchedule.set(taskId, { start, end });
    set({ userSchedule: newSchedule });
    get().validateSchedule();
  },

  validateSchedule: () => {
    const state = get();
    const problem = state.getProblemDefinition();
    console.log("=== VALIDATION DEBUG ===");
    console.log(
      "Problem tasks:",
      problem.tasks.map((t) => ({
        id: t.id,
        name: t.name,
        deps: t.dependencies,
      })),
    );
    console.log("User schedule:", Object.fromEntries(state.userSchedule));
    const violations = validateScheduleConstraints(state.userSchedule, problem);
    console.log("Violations found:", violations);
    const isValid = violations.length === 0;
    set({ constraintViolations: violations });

    if (isValid) {
      set({
        lastValidSchedule: new Map(state.userSchedule),
        gameStatus: "in_progress",
      });
    }

    return violations;
  },

  resetGame: (mode) => {
    const state = get();
    if (mode === "clear") {
      set({
        userSchedule: new Map(),
        constraintViolations: [],
        gameStatus: "not_started",
      });
    } else if (mode === "revert") {
      set({
        userSchedule: new Map(state.lastValidSchedule),
        constraintViolations: [],
        gameStatus: "in_progress",
      });
    }
  },

  getProblemDefinition: () => {
    const state = get();
    return extractProblemDefinition(state.events);
  },

  getCurrentSchedule: () => {
    const state = get();
    if (state.isGameMode) {
      return state.userSchedule;
    }
    const problem = state.getProblemDefinition();
    return problem.optimalSchedule;
  },

  getCurrentCost: () => {
    const state = get();
    if (state.userSchedule.size === 0) return 0;
    return Math.max(
      ...Array.from(state.userSchedule.values()).map((t) => t.end),
    );
  },

  isScheduleValid: () => {
    const state = get();
    return state.constraintViolations.length === 0;
  },

  isScheduleOptimal: () => {
    const state = get();
    const problem = state.getProblemDefinition();
    const currentCost = state.getCurrentCost();
    return state.isScheduleValid() && currentCost === problem.optimalMakespan;
  },
}));
