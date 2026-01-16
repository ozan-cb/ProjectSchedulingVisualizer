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

export interface TimelineState {
  events: TaskEvent[];
  tasks: Task[];
  currentTime: number;
  maxTime: number;
  minTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
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
