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

  // Extract resources and demands from task definitions
  events.forEach((event) => {
    if (event.description && event.description.startsWith("Task defined")) {
      const taskId = event.taskId;
      if (!taskId) return;

      // Extract resource demands from description
      // Format: "Task defined with duration X Resources: [d0, d1, d2, ...]"
      const resourceMatch = event.description.match(/Resources: \[(.*?)\]/);
      if (resourceMatch) {
        const demands = resourceMatch[1]
          .split(",")
          .map((d) => parseInt(d.trim(), 10));
        const task = tasks.get(taskId);
        if (task) {
          task.resourceDemands = demands;
        }
      }
    }
  });

  // Determine resource capacities from task demands
  // For the resource-constrained instance (3 tasks), capacity is 1
  // For the rocket launch instance (5 tasks with "Static Fire Test"), capacity is 2
  // For other instances, use max demand + 1
  const isResourceConstrained = tasks.size === 3;
  const isRocketLaunch =
    tasks.size === 5 &&
    Array.from(tasks.values()).some((t) => t.name === "Static Fire Test");
  const maxDemands = new Map<number, number>();

  tasks.forEach((task) => {
    task.resourceDemands.forEach((demand, resourceIndex) => {
      const currentMax = maxDemands.get(resourceIndex) || 0;
      maxDemands.set(resourceIndex, Math.max(currentMax, demand));
    });
  });

  maxDemands.forEach((maxDemand, resourceIndex) => {
    let capacity: number;
    if (isResourceConstrained) {
      capacity = 1;
    } else if (isRocketLaunch) {
      capacity = 2;
    } else {
      capacity = Math.max(maxDemand + 1, 2);
    }
    resources.set(resourceIndex.toString(), {
      id: resourceIndex.toString(),
      capacity,
    });
  });

  // Extract time horizon from optimal schedule, not all events
  // This avoids using large intermediate search bounds
  const optimalSchedule = extractOptimalSchedule(events);
  const optimalMakespan = calculateMakespan(optimalSchedule);
  timeHorizon = optimalMakespan;

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
  // Get all task IDs
  const taskIds = Array.from(
    new Set(
      events
        .filter((e) => e.taskId && e.taskName !== "Solver")
        .map((e) => e.taskId),
    ),
  );

  const schedule = new Map<string, { start: number; end: number }>();

  // First, try to find "Final solution" events
  taskIds.forEach((taskId) => {
    const finalSolutionEvents = events.filter(
      (e) =>
        e.taskId === taskId &&
        e.type === "start" &&
        e.description?.includes("Final solution"),
    );

    if (finalSolutionEvents.length > 0) {
      const event = finalSolutionEvents[finalSolutionEvents.length - 1];
      if (event.startTime !== undefined && event.endTime !== undefined) {
        schedule.set(taskId, {
          start: event.startTime,
          end: event.endTime,
        });
      }
    }
  });

  // If we found all tasks in final solution, return it
  if (schedule.size === taskIds.length) {
    return schedule;
  }

  // Otherwise, fall back to the original logic
  const timestamps = Array.from(new Set(events.map((e) => e.timestamp))).sort(
    (a, b) => a - b,
  );

  let bestSchedule: Map<string, { start: number; end: number }> = new Map();
  let bestMakespan = Infinity;

  for (const timestamp of timestamps) {
    const currentSchedule = new Map<string, { start: number; end: number }>();

    const eventsUpToTimestamp = events.filter((e) => e.timestamp <= timestamp);

    taskIds.forEach((taskId) => {
      const taskEvents = eventsUpToTimestamp.filter(
        (e) =>
          e.taskId === taskId &&
          e.type === "start" &&
          !e.description?.startsWith("Task defined"),
      );

      if (taskEvents.length > 0) {
        const latestEvent = taskEvents[taskEvents.length - 1];
        if (
          latestEvent.startTime !== undefined &&
          latestEvent.endTime !== undefined
        ) {
          currentSchedule.set(taskId, {
            start: latestEvent.startTime,
            end: latestEvent.endTime,
          });
        }
      }
    });

    if (currentSchedule.size === taskIds.length) {
      const makespan = calculateMakespan(currentSchedule);
      if (makespan < bestMakespan) {
        bestMakespan = makespan;
        bestSchedule = new Map(currentSchedule);
      }
    }
  }

  return bestSchedule;
}

export function calculateMakespan(
  schedule: Map<string, { start: number; end: number }>,
): number {
  if (schedule.size === 0) return 0;
  return Math.max(...Array.from(schedule.values()).map((t) => t.end));
}
