import React, { useState } from "react";
import type { EventFile } from "./types";
import { useTimelineStore } from "./store";
import { TimeSlider } from "./TimeSlider";
import { GanttChart } from "./GanttChart";
import "./App.css";

export const FileLoader: React.FC = () => {
  const { loadEvents } = useTimelineStore();
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data: EventFile = JSON.parse(content);

        if (!data.events || !Array.isArray(data.events)) {
          throw new Error("Invalid event file format");
        }

        loadEvents(data.events);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="file-loader">
      <h2>RCPSP Visualization</h2>
      <p>Upload an event file to visualize the solving process</p>

      <input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="file-input"
      />

      {error && <div className="error">{error}</div>}

      <div className="file-format-info">
        <h3>Expected File Format:</h3>
        <pre>
          {JSON.stringify(
            {
              version: "1.0",
              events: [
                {
                  id: "1",
                  type: "assign",
                  taskId: "task-1",
                  timestamp: 0,
                  startTime: 0,
                  endTime: 1000,
                  resourceId: "resource-1",
                },
              ],
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  );
};

function App() {
  const { events } = useTimelineStore();

  return (
    <div className="app">
      {events.length === 0 ? (
        <FileLoader />
      ) : (
        <div className="visualization">
          <TimeSlider />
          <GanttChart />
        </div>
      )}
    </div>
  );
}

export default App;
