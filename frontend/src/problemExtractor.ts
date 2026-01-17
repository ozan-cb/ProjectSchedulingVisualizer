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
  // Get all unique timestamps
  const timestamps = Array.from(new Set(events.map((e) => e.timestamp))).sort(
    (a, b) => a - b,
  );

  // Get all task IDs
  const taskIds = Array.from(
    new Set(
      events
        .filter((e) => e.taskId && e.taskName !== "Solver")
        .map((e) => e.taskId),
    ),
  );

  let bestSchedule: Map<string, { start: number; end: number }> = new Map();
  let bestMakespan = Infinity;

  // For each timestamp, check if we have a complete solution
  for (const timestamp of timestamps) {
    const schedule = new Map<string, { start: number; end: number }>();

    // Get events at this timestamp, excluding task definition events
    const eventsAtTimestamp = events.filter(
      (e) =>
        e.timestamp === timestamp &&
        e.taskId &&
        (e.type === "assign" || e.type === "start") &&
        !e.description?.startsWith("Task defined"),
    );

    // Find the highest decision level at this timestamp
    const maxDecisionLevel = Math.max(
      ...eventsAtTimestamp.map((e) => e.decisionLevel || 0),
    );

    // Filter to only events with the highest decision level at this timestamp
    const finalEvents = eventsAtTimestamp.filter(
      (e) => (e.decisionLevel || 0) === maxDecisionLevel,
    );

    // Extract task timings from the final events
    finalEvents.forEach((event) => {
      if (event.startTime !== undefined && event.endTime !== undefined) {
        schedule.set(event.taskId, {
          start: event.startTime,
          end: event.endTime,
        });
      }
    });

    // Check if we have a complete solution (all tasks assigned)
    if (schedule.size === taskIds.length) {
      const makespan = calculateMakespan(schedule);
      if (makespan < bestMakespan) {
        bestMakespan = makespan;
        bestSchedule = schedule;
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
