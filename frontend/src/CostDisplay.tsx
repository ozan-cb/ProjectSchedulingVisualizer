import React from "react";
import { useTimelineStore } from "./store";

export const CostDisplay: React.FC = () => {
  const {
    getCurrentCost,
    isScheduleValid,
    isScheduleOptimal,
    getProblemDefinition,
  } = useTimelineStore();
  const currentCost = getCurrentCost();
  const isValid = isScheduleValid();
  const isOptimal = isScheduleOptimal();
  const problem = getProblemDefinition();

  return (
    <div className="cost-display">
      <div className="cost-item">
        <span className="cost-label">Current Makespan:</span>
        <span
          className={`cost-value ${
            !isValid ? "invalid" : isOptimal ? "optimal" : "suboptimal"
          }`}
        >
          {currentCost}
        </span>
      </div>
      <div className="cost-item">
        <span className="cost-label">Optimal Makespan:</span>
        <span className="cost-value">{problem.optimalMakespan}</span>
      </div>
      <div className="cost-status">
        {isOptimal && <span className="status-optimal">★ Optimal</span>}
        {isValid && !isOptimal && <span className="status-valid">✓ Valid</span>}
        {!isValid && <span className="status-invalid">✗ Invalid</span>}
      </div>
    </div>
  );
};
