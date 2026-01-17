import React, { useState, useEffect, useRef } from "react";
import type { EventFile } from "./types";
import { useTimelineStore } from "./store";
import { TimeSlider } from "./TimeSlider";
import { SearchTree } from "./SearchTree";
import { ViewToggle } from "./ViewToggle";
import { GameMode } from "./GameMode";
import { ReadOnlyGantt } from "./ReadOnlyGantt";
import "./App.css";

export const FileLoader: React.FC = () => {
  const { loadEvents } = useTimelineStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    fetch("/events.json")
      .then((res) => res.json())
      .then((data: EventFile) => {
        if (!data.events || !Array.isArray(data.events)) {
          throw new Error("Invalid event file format");
        }
        loadEvents(data.events);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load events");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="header">
          <h1>Project Scheduling Visualizer</h1>
          <p>Visualize Constraint Programming Solver Search Process</p>
        </div>
        <div className="content">
          <div className="file-loader">
            <h2>Loading Events...</h2>
            <p>Please wait while we load the solver events</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="header">
          <h1>Project Scheduling Visualizer</h1>
          <p>Visualize Constraint Programming Solver Search Process</p>
        </div>
        <div className="content">
          <div className="file-loader">
            <h2>Error Loading Events</h2>
            <p className="error">{error}</p>
            <p>Make sure events.json is in the public folder</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

function App() {
  const { events, viewMode } = useTimelineStore();

  return (
    <div className="app">
      <div className="header">
        <h1>RCPSP-viz</h1>
        <p>Visualize Constraint Programming Solver Search Process</p>
      </div>
      <div className="content">
        {events.length === 0 ? (
          <FileLoader />
        ) : (
          <div className="visualization">
            <ViewToggle />
            {viewMode === "game" ? (
              <GameMode />
            ) : (
              <>
                <TimeSlider />
                {viewMode === "gantt" && <ReadOnlyGantt />}
                {viewMode === "tree" && <SearchTree />}
                {viewMode === "both" && (
                  <div className="split-view">
                    <ReadOnlyGantt />
                    <SearchTree />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
