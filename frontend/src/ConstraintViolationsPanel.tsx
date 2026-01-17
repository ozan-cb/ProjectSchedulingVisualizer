import React from "react";
import { useTimelineStore } from "./store";

export const ConstraintViolationsPanel: React.FC = () => {
  const { constraintViolations } = useTimelineStore();

  if (constraintViolations.length === 0) {
    return (
      <div className="violations-panel">
        <h3>Constraint Violations</h3>
        <p className="no-violations">No violations</p>
      </div>
    );
  }

  return (
    <div className="violations-panel">
      <h3>Constraint Violations</h3>
      <div className="violations-list">
        {constraintViolations.map((violation, index) => (
          <div key={index} className={`violation-item ${violation.severity}`}>
            <div className="violation-type">{violation.type}</div>
            <div className="violation-message">{violation.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
