import React from "react";

interface DependencyArrowsProps {
  tasks: Array<{
    id: string;
    name: string;
    duration: number;
    dependencies: string[];
  }>;
  userSchedule: Map<string, { start: number; end: number }>;
  unitWidth: number;
  rowHeight: number;
  taskNameWidth: number;
}

export const DependencyArrows: React.FC<DependencyArrowsProps> = ({
  tasks,
  userSchedule,
  unitWidth,
  rowHeight,
  taskNameWidth,
}) => {
  const getTaskRow = (taskId: string): number => {
    const index = tasks.findIndex((t) => t.id === taskId);
    return index;
  };

  const isConstraintSatisfied = (taskId: string, depId: string): boolean => {
    const taskTiming = userSchedule.get(taskId);
    const depTiming = userSchedule.get(depId);

    if (!taskTiming || !depTiming) return false;

    const satisfied = depTiming.end <= taskTiming.start;
    console.log(
      `Arrow check: ${depId} -> ${taskId}: dep.end=${depTiming.end}, task.start=${taskTiming.start}, satisfied=${satisfied}`,
    );
    return satisfied;
  };

  const getArrowPath = (
    fromTaskId: string,
    toTaskId: string,
  ): { path: string; color: string } => {
    const fromRow = getTaskRow(fromTaskId);
    const toRow = getTaskRow(toTaskId);
    const fromTiming = userSchedule.get(fromTaskId);
    const toTiming = userSchedule.get(toTaskId);

    if (!fromTiming || !toTiming) {
      return { path: "", color: "#999" };
    }

    const fromX = taskNameWidth + fromTiming.end * unitWidth;
    const fromY = fromRow * rowHeight + rowHeight / 2;
    const toX = taskNameWidth + toTiming.start * unitWidth;
    const toY = toRow * rowHeight + rowHeight / 2;

    const isSatisfied = isConstraintSatisfied(toTaskId, fromTaskId);
    const color = isSatisfied ? "#4caf50" : "#f44336";

    const midX = (fromX + toX) / 2;

    const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

    return { path, color };
  };

  const arrows: Array<{
    path: string;
    color: string;
    fromTask: string;
    toTask: string;
  }> = [];

  tasks.forEach((task) => {
    task.dependencies.forEach((depId) => {
      const { path, color } = getArrowPath(depId, task.id);
      if (path) {
        arrows.push({ path, color, fromTask: depId, toTask: task.id });
      }
    });
  });

  const maxRow = tasks.length;
  const maxTime = Math.max(
    ...Array.from(userSchedule.values()).map((t) => t.end),
  );
  const svgWidth = taskNameWidth + (maxTime + 1) * unitWidth;
  const svgHeight = maxRow * rowHeight;

  return (
    <svg
      className="dependency-arrows"
      width={svgWidth}
      height={svgHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <defs>
        <marker
          id="arrowhead-green"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#4caf50" />
        </marker>
        <marker
          id="arrowhead-red"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#f44336" />
        </marker>
      </defs>
      {arrows.map((arrow, index) => (
        <g key={index}>
          <path
            d={arrow.path}
            stroke={arrow.color}
            strokeWidth="2"
            fill="none"
            markerEnd={`url(#arrowhead-${arrow.color === "#4caf50" ? "green" : "red"})`}
            opacity="0.8"
          />
        </g>
      ))}
    </svg>
  );
};
