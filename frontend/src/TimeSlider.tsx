import React, { useEffect, useRef } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { useTimelineStore } from "./store";

export const TimeSlider: React.FC = () => {
  const {
    currentTime,
    minTime,
    maxTime,
    setCurrentTime,
    isPlaying,
    playbackSpeed,
    togglePlayback,
  } = useTimelineStore();

  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let lastTimestamp = performance.now();

    const animate = (timestamp: number) => {
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const timeIncrement = delta * playbackSpeed;
      const newTime = Math.min(currentTime + timeIncrement, maxTime);

      setCurrentTime(newTime);

      if (newTime < maxTime) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, maxTime, playbackSpeed, setCurrentTime]);

  const handleSliderChange = (value: number | number[]) => {
    if (typeof value === "number") {
      setCurrentTime(value);
    }
  };

  const progress =
    maxTime > minTime
      ? ((currentTime - minTime) / (maxTime - minTime)) * 100
      : 0;

  const formatTime = (ms: number) => {
    const date = new Date(ms);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const millis = date.getMilliseconds().toString().padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${millis}`;
  };

  return (
    <div className="time-slider">
      <div className="time-controls">
        <button onClick={() => setCurrentTime(minTime)}>⏮</button>
        <button
          onClick={() => setCurrentTime(Math.max(minTime, currentTime - 1000))}
        >
          ⏪
        </button>
        <button onClick={togglePlayback}>{isPlaying ? "⏸" : "▶️"}</button>
        <button
          onClick={() => setCurrentTime(Math.min(maxTime, currentTime + 1000))}
        >
          ⏩
        </button>
        <button onClick={() => setCurrentTime(maxTime)}>⏭</button>
      </div>

      <div className="slider-container">
        <Slider
          min={minTime}
          max={maxTime}
          value={currentTime}
          onChange={handleSliderChange}
          step={1}
        />
      </div>

      <div className="time-display">
        <span>Current: {formatTime(currentTime)}</span>
        <span>Progress: {progress.toFixed(1)}%</span>
      </div>
    </div>
  );
};
