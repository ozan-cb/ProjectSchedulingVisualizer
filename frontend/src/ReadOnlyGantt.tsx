import React from "react";
import { useTimelineStore } from "./store";

export const ReadOnlyGantt: React.FC = () => {
  const { getProblemDefinition, getTasksAtTime, currentTime } =
    useTimelineStore();
  const problem = getProblemDefinition();
  const tasks = getTasksAtTime(currentTime);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const unitWidth = 40;
  const rowHeight = 40;

  return (
    <div className="gantt-chart">
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
          {problem.tasks.map((task) => {
            const currentTask = taskMap.get(task.id);

            return (
              <div
                key={task.id}
                className="gantt-row"
                style={{ height: rowHeight }}
              >
                <div className="task-name">{task.name}</div>
                <div className="timeline-row">
                  {currentTask && (
                    <div
                      className="task-bar"
                      style={{
                        left: currentTask.startTime * unitWidth,
                        width:
                          (currentTask.endTime - currentTask.startTime) *
                          unitWidth,
                        top: 5,
                        height: rowHeight - 10,
                        cursor: "default",
                      }}
                      title={`${task.name}: ${currentTask.startTime}-${currentTask.endTime} (duration: ${currentTask.endTime - currentTask.startTime})`}
                    >
                      {task.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
