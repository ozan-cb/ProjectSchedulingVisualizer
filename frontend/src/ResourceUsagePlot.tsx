import React, { useRef, useEffect } from "react";

interface ResourceUsagePlotProps {
  resource: { id: string; capacity: number };
  schedule: Map<string, { start: number; end: number }>;
  tasks: Array<{ id: string; name: string; resourceDemands: number[] }>;
  timeHorizon: number;
}

export const ResourceUsagePlot: React.FC<ResourceUsagePlotProps> = ({
  resource,
  schedule,
  tasks,
  timeHorizon,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const padding = 30;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    const xScale = plotWidth / timeHorizon;
    const yScale = plotHeight / resource.capacity;

    const usage = new Array(timeHorizon + 1).fill(0);

    schedule.forEach((timing, taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const demand = task.resourceDemands[parseInt(resource.id)] || 0;
      if (demand === 0) return;

      for (let t = timing.start; t < timing.end; t++) {
        usage[t] += demand;
      }
    });

    ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
    ctx.strokeStyle = "rgba(59, 130, 246, 1)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(padding, height - padding);

    for (let t = 0; t <= timeHorizon; t++) {
      const x = padding + t * xScale;
      const y = height - padding - usage[t] * yScale;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(padding + plotWidth, height - padding);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, height - padding - resource.capacity * yScale);
    ctx.lineTo(
      padding + plotWidth,
      height - padding - resource.capacity * yScale,
    );
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#666";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `Resource ${resource.id} (Capacity: ${resource.capacity})`,
      width / 2,
      15,
    );

    ctx.textAlign = "right";
    ctx.fillText(
      resource.capacity.toString(),
      padding - 5,
      height - padding - resource.capacity * yScale + 4,
    );
    ctx.fillText("0", padding - 5, height - padding + 4);

    ctx.textAlign = "center";
    ctx.fillText("0", padding, height - padding + 15);
    ctx.fillText(
      timeHorizon.toString(),
      width - padding,
      height - padding + 15,
    );
  }, [resource, schedule, tasks, timeHorizon]);

  return (
    <div className="resource-usage-plot">
      <canvas ref={canvasRef} width={400} height={150} />
    </div>
  );
};
