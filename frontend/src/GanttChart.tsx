import React from "react";
import { useTimelineStore } from "./store";
import "gantt-task-react/dist/index.css";

export const GanttChart: React.FC = () => {
  const { currentTime, getTasksAtTime } = useTimelineStore();
  const tasks = getTasksAtTime(currentTime);

  return (
    <div className="gantt-chart">
      <h3>Tasks at {new Date(currentTime).toISOString()}</h3>
      {tasks.length === 0 ? (
        <p>No tasks at this time</p>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <div key={task.id} className="task-item">
              <div className="task-info">
                <strong>{task.name}</strong>
                {task.resourceId && (
                  <span className="resource">Resource: {task.resourceId}</span>
                )}
              </div>
              <div className="task-timeline">
                <div className="task-bar" style={{ width: "100%" }}>
                  <div
                    className="task-progress"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
              <div className="task-times">
                <span>Start: {task.start.toLocaleString()}</span>
                <span>End: {task.end.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
