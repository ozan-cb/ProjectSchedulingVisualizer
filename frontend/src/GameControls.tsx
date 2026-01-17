import React from "react";
import { useTimelineStore } from "./store";

export const GameControls: React.FC = () => {
  const { resetGame } = useTimelineStore();

  return (
    <div className="game-controls">
      <div className="reset-buttons">
        <button onClick={() => resetGame("clear")}>Clear All</button>
        <button onClick={() => resetGame("revert")}>Revert to Valid</button>
      </div>
    </div>
  );
};
