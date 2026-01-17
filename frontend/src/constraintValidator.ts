import type { ProblemDefinition } from "./problemExtractor";

export interface ConstraintViolation {
  type: "precedence" | "resource" | "overlap";
  taskId: string;
  message: string;
  severity: "error" | "warning";
  relatedTasks?: string[];
}

export function validateSchedule(
  schedule: Map<string, { start: number; end: number }>,
  problem: ProblemDefinition,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // 1. Check precedence constraints
  violations.push(...validatePrecedence(schedule, problem));

  // 2. Check resource constraints
  violations.push(...validateResources(schedule, problem));

  // 3. Check for overlaps (same task scheduled twice)
  violations.push(...validateOverlaps(schedule, problem));

  return violations;
}

function validatePrecedence(
  schedule: Map<string, { start: number; end: number }>,
  problem: ProblemDefinition,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  problem.tasks.forEach((task) => {
    const taskTiming = schedule.get(task.id);
    if (!taskTiming) return;

    task.dependencies.forEach((depId) => {
      const depTiming = schedule.get(depId);
      if (!depTiming) return;

      // Check if dependency finishes before task starts
      if (depTiming.end > taskTiming.start) {
        violations.push({
          type: "precedence",
          taskId: task.id,
          message: `Task "${task.name}" starts at ${taskTiming.start} but dependency "${problem.tasks.find((t) => t.id === depId)?.name}" ends at ${depTiming.end}`,
          severity: "error",
          relatedTasks: [depId],
        });
      }
    });
  });

  return violations;
}

function validateResources(
  schedule: Map<string, { start: number; end: number }>,
  problem: ProblemDefinition,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // Calculate resource usage at each time unit
  problem.resources.forEach((resource) => {
    const usage = new Array(problem.timeHorizon + 1).fill(0);
    const tasksUsingResource: Map<number, string[]> = new Map();

    schedule.forEach((timing, taskId) => {
      const task = problem.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const demand = task.resourceDemands[parseInt(resource.id)] || 0;
      if (demand === 0) return;

      for (let t = timing.start; t < timing.end; t++) {
        usage[t] += demand;
        if (!tasksUsingResource.has(t)) {
          tasksUsingResource.set(t, []);
        }
        tasksUsingResource.get(t)!.push(taskId);
      }
    });

    // Check for over-allocation
    for (let t = 0; t <= problem.timeHorizon; t++) {
      if (usage[t] > resource.capacity) {
        const tasksAtTime = tasksUsingResource.get(t) || [];
        violations.push({
          type: "resource",
          taskId: tasksAtTime[0] || "",
          message: `Resource "${resource.id}" over-allocated at time ${t}: ${usage[t]} > ${resource.capacity}`,
          severity: "error",
          relatedTasks: tasksAtTime,
        });
      }
    }
  });

  return violations;
}

function validateOverlaps(
  schedule: Map<string, { start: number; end: number }>,
  problem: ProblemDefinition,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // Check if any task overlaps with itself (shouldn't happen)
  schedule.forEach((timing, taskId) => {
    if (timing.start >= timing.end) {
      violations.push({
        type: "overlap",
        taskId,
        message: `Task "${problem.tasks.find((t) => t.id === taskId)?.name}" has invalid timing: start (${timing.start}) >= end (${timing.end})`,
        severity: "error",
      });
    }
  });

  return violations;
}
