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
}

export interface Task {
  id: string;
  name: string;
  start: Date;
  end: Date;
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
  viewMode: "gantt" | "tree" | "both";
}

export type ViewMode = "gantt" | "tree" | "both";

export interface EventFile {
  version: string;
  events: TaskEvent[];
  metadata?: {
    projectName?: string;
    totalTasks?: number;
    solver?: string;
  };
}
