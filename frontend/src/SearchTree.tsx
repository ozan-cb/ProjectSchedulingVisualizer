import React, { useMemo, useRef, useEffect, useState } from "react";
import { useTimelineStore } from "./store";
import { motion } from "framer-motion";

interface TreeNodeProps {
  node: any;
  isActive: boolean;
  isPruned: boolean;
  isLatest: boolean;
  onClick: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = React.memo(
  ({ node, isActive, isPruned, isLatest, onClick }) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.25 }}
        className={`
        tree-node
        ${isActive ? "active" : ""}
        ${isPruned ? "pruned" : ""}
        ${isLatest ? "latest" : ""}
      `}
        style={{
          position: "absolute",
          left: `${node.x}px`,
          top: `${node.y}px`,
          transform: "translate(-50%, -50%)",
        }}
        onClick={onClick}
      >
        <div className="node-content">
          <div className="node-task">{node.taskName}</div>
          <div className="node-value">{node.value}</div>
        </div>
      </motion.div>
    );
  },
);

export const SearchTree: React.FC = () => {
  const { currentTime, getSearchTreeAtTime, isPlaying, getLatestEventAtTime } =
    useTimelineStore();
  const treeState = useMemo(
    () => getSearchTreeAtTime(currentTime),
    [currentTime, getSearchTreeAtTime],
  );
  const latestEvent = useMemo(
    () => getLatestEventAtTime(currentTime),
    [currentTime, getLatestEventAtTime],
  );

  const { nodes, currentPath, maxDecisionLevel } = treeState;
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const prevTimeRef = useRef<number>(currentTime);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const treeWidth = Math.max(2000, (maxDecisionLevel + 1) * 200);
  const treeHeight = Math.max(800, (maxDecisionLevel + 1) * 100);

  const currentPathSet = new Set(currentPath);

  const activeNodeId = currentPath[currentPath.length - 1];
  const activeNode = nodes.get(activeNodeId);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setIsUserScrolling(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if (containerRef.current) {
        setScrollStart({
          left: containerRef.current.scrollLeft,
          top: containerRef.current.scrollTop,
        });
      }
    }
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    containerRef.current.scrollLeft = scrollStart.left - deltaX;
    containerRef.current.scrollTop = scrollStart.top - deltaY;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleScroll = () => {
    setIsUserScrolling(true);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart, scrollStart]);

  useEffect(() => {
    if (containerRef.current && activeNode && !isDragging && !isUserScrolling) {
      const container = containerRef.current;

      const nodeX = activeNode.x;
      const nodeY = activeNode.y;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const padding = 60;
      const scrollX = nodeX - containerWidth / 2 + padding;
      const scrollY = nodeY - containerHeight / 2 + padding;

      container.scrollTo({
        left: Math.max(0, scrollX),
        top: Math.max(0, scrollY),
        behavior: "smooth",
      });
    }
  }, [currentTime, activeNode, isDragging, isUserScrolling]);

  useEffect(() => {
    if (isPlaying && treeRef.current) {
      treeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isPlaying]);

  useEffect(() => {
    const timeChanged = currentTime !== prevTimeRef.current;

    if (timeChanged && !isPlaying) {
      setIsUserScrolling(false);
    }

    prevTimeRef.current = currentTime;
  }, [currentTime, isPlaying]);

  return (
    <div ref={treeRef} className="search-tree">
      <div className="tree-header">
        <h3>Search Tree</h3>
        <div className="tree-stats">
          <span>Decision Level: {currentPath.length - 1}</span>
          <span>Max Level: {maxDecisionLevel}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="tree-container"
        onMouseDown={handleMouseDown}
        onScroll={handleScroll}
      >
        <div
          style={{ width: treeWidth, height: treeHeight, position: "relative" }}
        >
          {Array.from(nodes.values()).map((node) => {
            if (!node.parentId) return null;
            const parent = nodes.get(node.parentId);
            if (!parent) return null;

            const isEdgeActive =
              currentPathSet.has(node.id) && currentPathSet.has(parent.id);

            return (
              <svg
                key={`edge-${node.id}`}
                className={`tree-edge ${isEdgeActive ? "active" : ""}`}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: treeWidth,
                  height: treeHeight,
                  pointerEvents: "none",
                }}
              >
                <line
                  x1={parent.x}
                  y1={parent.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={isEdgeActive ? "#667eea" : "#e0e0e0"}
                  strokeWidth={isEdgeActive ? 2 : 1}
                />
              </svg>
            );
          })}

          {Array.from(nodes.values()).map((node) => {
            const isActive = currentPathSet.has(node.id);
            const isPruned = node.status === "pruned";
            const isLatest = latestEvent?.nodeId === node.id;

            return (
              <TreeNode
                key={node.id}
                node={node}
                isActive={isActive}
                isPruned={isPruned}
                isLatest={isLatest}
                onClick={() => console.log("Node clicked:", node)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
