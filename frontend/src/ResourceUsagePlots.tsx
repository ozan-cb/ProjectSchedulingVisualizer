import React from "react";
import { useTimelineStore } from "./store";
import { ResourceUsagePlot } from "./ResourceUsagePlot";

export const ResourceUsagePlots: React.FC = () => {
  const { getProblemDefinition, userSchedule } = useTimelineStore();
  const problem = getProblemDefinition();

  return (
    <div className="resource-usage-plots">
      <h3>Resource Usage</h3>
      {problem.resources.map((resource) => (
        <ResourceUsagePlot
          key={resource.id}
          resource={resource}
          schedule={userSchedule}
          tasks={problem.tasks}
          timeHorizon={problem.timeHorizon}
        />
      ))}
    </div>
  );
};
