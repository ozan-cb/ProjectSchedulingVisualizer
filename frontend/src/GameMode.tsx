import React from "react";
import { useTimelineStore } from "./store";
import { DraggableGantt } from "./DraggableGantt";
import { CostDisplay } from "./CostDisplay";
import { ResourceUsagePlots } from "./ResourceUsagePlots";
import { ConstraintViolationsPanel } from "./ConstraintViolationsPanel";
import { GameControls } from "./GameControls";

export const GameMode: React.FC = () => {
  const { setGameMode } = useTimelineStore();

  React.useEffect(() => {
    setGameMode(true);
    return () => setGameMode(false);
  }, [setGameMode]);

  return (
    <div className="game-mode">
      <div className="game-header">
        <h2>Game Mode</h2>
        <GameControls />
      </div>

      <div className="game-content">
        <div className="game-main">
          <CostDisplay />
          <DraggableGantt />
        </div>

        <div className="game-sidebar">
          <ResourceUsagePlots />
          <ConstraintViolationsPanel />
        </div>
      </div>
    </div>
  );
};
