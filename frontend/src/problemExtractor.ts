import type { TaskEvent } from "./types";

export interface ProblemDefinition {
  tasks: Array<{
    id: string;
    name: string;
    duration: number;
    dependencies: string[];
    resourceDemands: number[];
  }>;
  resources: Array<{
    id: string;
    capacity: number;
  }>;
  timeHorizon: number;
  optimalSchedule: Map<string, { start: number; end: number }>;
  optimalMakespan: number;
}

export function extractProblemDefinition(
  events: TaskEvent[],
): ProblemDefinition {
  const tasks = new Map<
    string,
    {
      id: string;
      name: string;
      duration: number;
      dependencies: string[];
      resourceDemands: number[];
    }
  >();

  const resources = new Map<string, { id: string; capacity: number }>();
  let timeHorizon = 0;

  // Extract tasks and their properties from events
  events.forEach((event) => {
    if (event.taskId && event.taskName) {
      // Filter out non-task items like "Solver"
      if (event.taskName === "Solver" || event.taskName.startsWith("Solver")) {
        return;
      }

      if (!tasks.has(event.taskId)) {
        tasks.set(event.taskId, {
          id: event.taskId,
          name: event.taskName,
          duration: 0,
          dependencies: [],
          resourceDemands: [],
        });
      }

      // Extract duration and dependencies from task definition events only
      // Task definition events have description starting with "Task defined"
      if (event.description && event.description.startsWith("Task defined")) {
        const task = tasks.get(event.taskId)!;

        // Extract duration from description string (e.g., "Task defined with duration 4")
        const durationMatch = event.description.match(/duration (\d+)/);
        if (durationMatch) {
          task.duration = parseInt(durationMatch[1], 10);
          console.log(
            `Task definition: ${task.name} (${task.id}), duration=${task.duration}`,
          );
        }

        // Extract dependencies
        if (event.dependencies) {
          task.dependencies = event.dependencies.map((depId) =>
            depId.toString(),
          );
        }
      }
    }
  });

  // Extract resources (simplified - assuming 2 resources based on driver.cpp)
  resources.set("0", { id: "0", capacity: 3 });
  resources.set("1", { id: "1", capacity: 2 });

  // Assign resource demands to tasks (simplified)
  tasks.forEach((task) => {
    task.resourceDemands = [1, 1];
  });

  // Extract time horizon from events
  events.forEach((event) => {
    if (event.endTime !== undefined) {
      timeHorizon = Math.max(timeHorizon, event.endTime);
    }
  });

  // Extract optimal schedule from final events
  const optimalSchedule = extractOptimalSchedule(events);
  const optimalMakespan = calculateMakespan(optimalSchedule);

  return {
    tasks: Array.from(tasks.values()),
    resources: Array.from(resources.values()),
    timeHorizon,
    optimalSchedule,
    optimalMakespan,
  };
}

export function extractOptimalSchedule(
  events: TaskEvent[],
): Map<string, { start: number; end: number }> {
  const schedule = new Map<string, { start: number; end: number }>();

  // Get the last timestamp
  const maxTimestamp = Math.max(...events.map((e) => e.timestamp));

  // Get all events at the last timestamp
  const finalEvents = events.filter((e) => e.timestamp === maxTimestamp);

  // Extract task timings from final events
  finalEvents.forEach((event) => {
    if (
      event.taskId &&
      event.startTime !== undefined &&
      event.endTime !== undefined
    ) {
      schedule.set(event.taskId, {
        start: event.startTime,
        end: event.endTime,
      });
    }
  });

  return schedule;
}

export function calculateMakespan(
  schedule: Map<string, { start: number; end: number }>,
): number {
  if (schedule.size === 0) return 0;
  return Math.max(...Array.from(schedule.values()).map((t) => t.end));
}
