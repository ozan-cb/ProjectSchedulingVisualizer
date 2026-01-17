import React from "react";
import { useTimelineStore } from "./store";

export const ViewToggle: React.FC = () => {
  const { viewMode, setViewMode } = useTimelineStore();

  return (
    <div className="view-toggle">
      <button
        className={`view-btn ${viewMode === "gantt" ? "active" : ""}`}
        onClick={() => setViewMode("gantt")}
      >
        Gantt Chart
      </button>
      <button
        className={`view-btn ${viewMode === "tree" ? "active" : ""}`}
        onClick={() => setViewMode("tree")}
      >
        Search Tree
      </button>
      <button
        className={`view-btn ${viewMode === "both" ? "active" : ""}`}
        onClick={() => setViewMode("both")}
      >
        Both Views
      </button>
    </div>
  );
};
