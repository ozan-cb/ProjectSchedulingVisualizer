import { create } from "zustand";
import type { TaskEvent, Task, TimelineState } from "./types";

interface TimelineStore extends TimelineState {
  loadEvents: (events: TaskEvent[]) => void;
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  reset: () => void;
  getTasksAtTime: (time: number) => Task[];
}

const initialState: TimelineState = {
  events: [],
  tasks: [],
  currentTime: 0,
  maxTime: 0,
  minTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
};

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  ...initialState,

  loadEvents: (events) => {
    const timestamps = events.map((e) => e.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    // Find first timestamp with an assign event
    const firstAssignEvent = events.find((e) => e.type === "assign");
    const initialTime = firstAssignEvent ? firstAssignEvent.timestamp : minTime;

    set({
      events,
      minTime,
      maxTime,
      currentTime: initialTime,
    });
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  reset: () => set(initialState),

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
          }
          break;
        case "complete":
          const completeTask = taskMap.get(event.taskId);
          if (completeTask && event.endTime !== undefined) {
            completeTask.end = new Date(event.endTime);
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

    return Array.from(taskMap.values());
  },
}));
