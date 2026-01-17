import React from "react";
import { useTimelineStore } from "./store";

export const GameControls: React.FC = () => {
  const { enforcementMode, setEnforcementMode, resetGame } = useTimelineStore();

  return (
    <div className="game-controls">
      <div className="enforcement-mode">
        <label>
          <input
            type="radio"
            value="learning"
            checked={enforcementMode === "learning"}
            onChange={() => setEnforcementMode("learning")}
          />
          Learning Mode
        </label>
        <label>
          <input
            type="radio"
            value="strict"
            checked={enforcementMode === "strict"}
            onChange={() => setEnforcementMode("strict")}
          />
          Strict Mode
        </label>
      </div>
      <div className="reset-buttons">
        <button onClick={() => resetGame("clear")}>Clear All</button>
        <button onClick={() => resetGame("revert")}>Revert to Valid</button>
      </div>
    </div>
  );
};
