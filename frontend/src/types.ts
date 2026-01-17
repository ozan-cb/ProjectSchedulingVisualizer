export type EventType = "assign" | "remove" | "start" | "complete" | "modify";

export interface TaskEvent {
  id: string;
  type: EventType;
  taskId: string;
  taskName?: string;
  timestamp: number;
  startTime?: number;
  endTime?: number;
  resourceId?: string;
  previousValue?: any;
  newValue?: any;
  decisionLevel?: number;
  backtrackToLevel?: number;
  nodeId?: string;
  parentNodeId?: string;
  nodeStatus?: "created" | "pruned" | "solution";
  description?: string;
  dependencies?: number[];
  successors?: number[];
}

export interface Task {
  id: string;
  name: string;
  start: Date;
  end: Date;
  startTime: number;
  endTime: number;
  progress: number;
  resourceId?: string;
  dependencies?: string[];
}

export interface SearchNode {
  id: string;
  parentId: string | null;
  decisionLevel: number;
  taskId: string;
  taskName: string;
  value: number;
  timestamp: number;
  status: "created" | "pruned" | "solution";
  children: string[];
  x: number;
  y: number;
}

export interface SearchTreeState {
  nodes: Map<string, SearchNode>;
  rootId: string;
  currentPath: string[];
  maxDecisionLevel: number;
  visibleNodes: Set<string>;
}

export interface TimelineState {
  events: TaskEvent[];
  tasks: Task[];
  currentTime: number;
  maxTime: number;
  minTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  viewMode: ViewMode;
  isGameMode: boolean;
  userSchedule: Map<string, { start: number; end: number }>;
  constraintViolations: ConstraintViolation[];
  gameStatus: "not_started" | "in_progress" | "completed";
  lastValidSchedule: Map<string, { start: number; end: number }>;
}

export type ViewMode = "gantt" | "tree" | "both" | "game";

export interface ConstraintViolation {
  type: "precedence" | "resource" | "overlap";
  taskId: string;
  message: string;
  severity: "error" | "warning";
  relatedTasks?: string[];
}

export interface GameState {
  isGameMode: boolean;
  userSchedule: Map<string, { start: number; end: number }>;
  constraintViolations: ConstraintViolation[];
  gameStatus: "not_started" | "in_progress" | "completed";
  lastValidSchedule: Map<string, { start: number; end: number }>;
}

export interface EventFile {
  version: string;
  events: TaskEvent[];
  metadata?: {
    projectName?: string;
    totalTasks?: number;
    solver?: string;
  };
}

export interface InstanceMetadata {
  id: string;
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  file: string;
}

export interface InstancesConfig {
  instances: InstanceMetadata[];
}
