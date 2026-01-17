import React, { useState, useEffect, useRef } from "react";
import type { EventFile, InstanceMetadata, InstancesConfig } from "./types";
import { useTimelineStore } from "./store";
import { TimeSlider } from "./TimeSlider";
import { SearchTree } from "./SearchTree";
import { ViewToggle } from "./ViewToggle";
import { GameMode } from "./GameMode";
import { ReadOnlyGantt } from "./ReadOnlyGantt";
import { ReadOnlyGanttWithResources } from "./ReadOnlyGanttWithResources";
import "./App.css";

export const FileLoader: React.FC<{ instanceFile: string }> = ({
  instanceFile,
}) => {
  const { loadEvents } = useTimelineStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    fetch(instanceFile)
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
  }, [instanceFile, loadEvents]);

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
  const {
    events,
    viewMode,
    currentInstance,
    setCurrentInstance,
    switchInstance,
  } = useTimelineStore();
  const [instances, setInstances] = useState<InstanceMetadata[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);

  useEffect(() => {
    fetch("/instances.json")
      .then((res) => res.json())
      .then((data: InstancesConfig) => {
        if (!data.instances || !Array.isArray(data.instances)) {
          throw new Error("Invalid instances config format");
        }
        setInstances(data.instances);
        setLoadingInstances(false);

        if (!currentInstance && data.instances.length > 0) {
          setCurrentInstance(data.instances[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to load instances:", err);
        setLoadingInstances(false);
      });
  }, [currentInstance, setCurrentInstance]);

  const handleInstanceChange = (instanceId: string) => {
    const instance = instances.find((i) => i.id === instanceId);
    if (instance) {
      switchInstance(instance);
    }
  };

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <h1>RCPSP-viz</h1>
          <p>Visualize Constraint Programming Solver Search Process</p>
        </div>
        {!loadingInstances && instances.length > 0 && (
          <div className="instance-selector">
            <select
              value={currentInstance?.id || ""}
              onChange={(e) => handleInstanceChange(e.target.value)}
              className="instance-select"
            >
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="content">
        {events.length === 0 ? (
          <FileLoader
            instanceFile={
              currentInstance
                ? `/${currentInstance.file}`
                : "/events-simple.json"
            }
          />
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
                    <ReadOnlyGanttWithResources />
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
