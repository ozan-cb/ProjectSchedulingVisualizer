import React, { useMemo } from "react";
import { useTimelineStore } from "./store";

export const GanttChart: React.FC = () => {
  const { currentTime, getTasksAtTime } = useTimelineStore();
  const tasks = useMemo(() => getTasksAtTime(currentTime), [currentTime]);

  if (tasks.length === 0) {
    return (
      <div className="gantt-chart">
        <h3>Tasks at Solver Step {currentTime}</h3>
        <p style={{ color: "#666", fontSize: "16px", marginTop: "20px" }}>
          No tasks assigned at this step
        </p>
      </div>
    );
  }

  const allTimes = tasks.flatMap((t) => [t.start.getTime(), t.end.getTime()]);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const timeRange = maxTime - minTime || 1;

  const timeMarkers = [];
  const numMarkers = 10;
  for (let i = 0; i <= numMarkers; i++) {
    const time = minTime + (timeRange * i) / numMarkers;
    timeMarkers.push(time);
  }

  return (
    <div className="gantt-chart">
      <h3>Tasks at Solver Step {currentTime}</h3>

      <div style={{ marginTop: "24px" }}>
        <div
          style={{
            display: "flex",
            marginBottom: "12px",
            borderBottom: "2px solid #e0e0e0",
            paddingBottom: "8px",
          }}
        >
          {timeMarkers.map((time, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: "13px",
                color: "#666",
                fontWeight: "500",
              }}
            >
              {Math.round(time)}
            </div>
          ))}
        </div>

        {tasks.map((task) => {
          const start = task.start.getTime();
          const end = task.end.getTime();
          const left = ((start - minTime) / timeRange) * 100;
          const width = ((end - start) / timeRange) * 100;

          return (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "16px",
                padding: "12px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                background: "#fafafa",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  width: "140px",
                  fontWeight: "600",
                  fontSize: "15px",
                  color: "#333",
                }}
              >
                {task.name}
              </div>

              <div
                style={{
                  flex: 1,
                  position: "relative",
                  height: "36px",
                  background: "#f0f0f0",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    width: `${width}%`,
                    height: "100%",
                    background:
                      "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "600",
                    boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                  }}
                >
                  {Math.round(start)} - {Math.round(end)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
