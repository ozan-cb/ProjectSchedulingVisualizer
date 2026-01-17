import React, { useRef, useState } from "react";
import { useTimelineStore } from "./store";
import { DependencyArrows } from "./DependencyArrows";

export const DraggableGantt: React.FC = () => {
  const {
    getProblemDefinition,
    userSchedule,
    setUserSchedule,
    enforcementMode,
  } = useTimelineStore();
  const problem = getProblemDefinition();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const timing = userSchedule.get(taskId);
    if (!timing) return;

    setDraggedTask(taskId);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask) return;

    const target = e.target as HTMLElement;
    const timelineRow = target.closest(".timeline-row") as HTMLElement;
    if (!timelineRow) return;

    const timelineRect = timelineRow.getBoundingClientRect();
    const unitWidth = 40;

    const x = e.clientX - timelineRect.left - dragOffset;
    const newStart = Math.max(0, Math.round(x / unitWidth));

    const task = problem.tasks.find((t) => t.id === draggedTask);
    if (!task) return;

    const newEnd = newStart + task.duration;

    if (enforcementMode === "strict") {
      const tempSchedule = new Map(userSchedule);
      tempSchedule.set(draggedTask, { start: newStart, end: newEnd });
      const violations = useTimelineStore.getState().validateSchedule();
      if (violations.length > 0) {
        setDraggedTask(null);
        return;
      }
    }

    setUserSchedule(draggedTask, newStart, newEnd);
    setDraggedTask(null);
  };

  const unitWidth = 40;
  const rowHeight = 40;
  const taskNameWidth = 150;

  return (
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
      <div
        className="gantt-body"
        ref={containerRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ position: "relative" }}
      >
        <DependencyArrows
          tasks={problem.tasks}
          userSchedule={userSchedule}
          unitWidth={unitWidth}
          rowHeight={rowHeight}
          taskNameWidth={taskNameWidth}
        />
        {problem.tasks.map((task) => {
          const timing = userSchedule.get(task.id);
          const start = timing?.start ?? 0;
          const end = timing?.end ?? task.duration;
          const duration = end - start;

          console.log(
            `Task ${task.name}: start=${start}, end=${end}, duration=${duration}, barWidth=${duration * unitWidth}px`,
          );

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
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  style={{
                    left: start * unitWidth,
                    width: (end - start) * unitWidth,
                    top: 5,
                    height: rowHeight - 10,
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
  );
};
