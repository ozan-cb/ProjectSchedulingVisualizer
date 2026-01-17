import React from "react";
import { useTimelineStore } from "./store";

export const ViewToggle: React.FC = () => {
  const { viewMode, setViewMode } = useTimelineStore();

  return (
    <div className="view-toggle">
      <div className="view-group">
        <span className="view-group-label">Game</span>
        <button
          className={`view-btn ${viewMode === "game" ? "active" : ""}`}
          onClick={() => setViewMode("game")}
        >
          Game Mode
        </button>
      </div>
      <div className="view-group">
        <span className="view-group-label">Solver Views</span>
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
    </div>
  );
};
