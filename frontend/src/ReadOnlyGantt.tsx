import React from "react";
import { useTimelineStore } from "./store";
import { DependencyArrows } from "./DependencyArrows";
import { ResourceUsagePlots } from "./ResourceUsagePlots";

export const ReadOnlyGantt: React.FC = () => {
  const { getProblemDefinition, getTasksAtTime, currentTime } =
    useTimelineStore();
  const problem = getProblemDefinition();
  const tasks = getTasksAtTime(currentTime);

  const unitWidth = 40;
  const rowHeight = 40;
  const taskNameWidth = 150;

  return (
    <div className="game-content">
      <div className="game-main">
        <div className="draggable-gantt">
          <div className="gantt-header">
            <div className="task-header">Task</div>
            <div className="timeline-header">
              {Array.from({ length: problem.timeHorizon + 1 }, (_, i) => (
                <div key={i} className="time-unit" style={{ width: unitWidth }}>
                  {i}
                </div>
              ))}
            </div>
          </div>
          <div className="gantt-body" style={{ position: "relative" }}>
            {tasks.map((task) => {
              const start = task.start.getTime();
              const end = task.end.getTime();

              return (
                <div
                  key={task.id}
                  className="gantt-row"
                  style={{ height: rowHeight }}
                >
                  <div className="task-name">{task.name}</div>
                  <div className="timeline-row">
                    <div
                      className="task-bar"
                      style={{
                        left: start * unitWidth,
                        width: (end - start) * unitWidth,
                        top: 5,
                        height: rowHeight - 10,
                        cursor: "default",
                      }}
                      title={`${task.name}: ${start}-${end} (duration: ${end - start})`}
                    >
                      {task.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="game-sidebar">
        <ResourceUsagePlots />
      </div>
    </div>
  );
};
