import React, { useEffect, useRef, useCallback } from "react";
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
      const newTime = Math.min(
        useTimelineStore.getState().currentTime + timeIncrement,
        maxTime,
      );

      setCurrentTime(newTime);

      if (newTime < maxTime) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        togglePlayback();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, maxTime, playbackSpeed, setCurrentTime]);

  const handleSliderChange = useCallback(
    (value: number | number[]) => {
      if (typeof value === "number") {
        setCurrentTime(value);
      }
    },
    [setCurrentTime],
  );

  const handleSliderAfterChange = useCallback(
    (value: number | number[]) => {
      if (typeof value === "number") {
        setCurrentTime(value);
      }
    },
    [setCurrentTime],
  );

  const progress =
    maxTime > minTime
      ? ((currentTime - minTime) / (maxTime - minTime)) * 100
      : 0;

  const formatTime = (ms: number) => {
    return `Step ${ms}`;
  };

  return (
    <div className="time-slider">
      <div className="time-controls">
        <button onClick={() => setCurrentTime(minTime)}>⏮</button>
        <button
          onClick={() => setCurrentTime(Math.max(minTime, currentTime - 1))}
        >
          ⏪
        </button>
        <button onClick={togglePlayback}>{isPlaying ? "⏸" : "▶️"}</button>
        <button
          onClick={() => setCurrentTime(Math.min(maxTime, currentTime + 1))}
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
          onAfterChange={handleSliderAfterChange}
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
