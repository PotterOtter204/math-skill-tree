'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Circle, Arrow } from 'react-konva';


const getRandomColor = () => {
  return `hsl(${Math.random() * 360}, 70%, 60%)`;
}

// Helper function to generate a list of "targets" (circles)
function generateTargets(width, height) {
  const number = 10;
  const result = [];
  while (result.length < number) {
    result.push({
      id: 'target-' + result.length,
      x: width * Math.random(),
      y: height * Math.random(),
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      radius: 20 + Math.random() * 20,
    });
  }
  return result;
}

// Helper function to generate arrows between targets
function generateConnectors(targetsList) {
  const number = 10;
  const result = [];
  while (result.length < number) {
    const from = 'target-' + Math.floor(Math.random() * targetsList.length);
    const to = 'target-' + Math.floor(Math.random() * targetsList.length);
    if (from === to) {
      continue;
    }
    result.push({
      id: 'connector-' + result.length,
      from: from,
      to: to,
    });
  }
  return result;
}

// Helper function to calculate connector points from one circle to another
function getConnectorPoints(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(-dy, dx);
  const radius = 50;

  return [
    from.x + -radius * Math.cos(angle + Math.PI),
    from.y + radius * Math.sin(angle + Math.PI),
    to.x + -radius * Math.cos(angle),
    to.y + radius * Math.sin(angle),
  ];
}

const DragTestPage = () => {
  const [targets, setTargets] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const stageRef = useRef(null);

  // Initialize targets and connectors on mount
  useEffect(() => {
    const width = window.innerWidth - 40;
    const height = window.innerHeight - 150;

    const newTargets = generateTargets(width, height);
    const newConnectors = generateConnectors(newTargets);

    // eslint-disable react-hooks/exhaustive-deps
    setTargets(newTargets);
    setConnectors(newConnectors);
    setDimensions({ width, height });
  }, []);

  // Handle target drag
  const handleDragMove = (targetId, newX, newY) => {
    const updatedTargets = targets.map((target) =>
      target.id === targetId
        ? { ...target, x: newX, y: newY }
        : target
    );
    setTargets(updatedTargets);
  };

  // Render arrows with updated points based on current target positions
  const renderConnectors = () => {
    return connectors.map((connector) => {
      const fromTarget = targets.find((t) => t.id === connector.from);
      const toTarget = targets.find((t) => t.id === connector.to);

      if (!fromTarget || !toTarget) return null;

      const points = getConnectorPoints(fromTarget, toTarget);

      return (
        <Arrow
          key={connector.id}
          id={connector.id}
          points={points}
          stroke="black"
          fill="black"
          strokeWidth={2}
          pointerLength={15}
          pointerWidth={15}
        />
      );
    });
  };

  // Render circles
  const renderTargets = () => {
    return targets.map((target) => (
      <Circle
        key={target.id}
        id={target.id}
        x={target.x}
        y={target.y}
        radius={20 + Math.random() * 20}
        fill={getRandomColor()}
        shadowBlur={10}
        shadowOpacity={0.3}
        draggable
        onDragMove={(e) =>
          handleDragMove(target.id, e.target.x(), e.target.y())
        }
      />
    ));
  };

  return (
    <div>
      <div
        style={{
          padding: '10px',
          marginBottom: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px',
        }}
      >
        <h2>Konva Draggable Targets with Connectors</h2>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Drag the circles around to see the connectors update dynamically
        </p>
      </div>

      {dimensions.width > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ border: '2px solid #333', backgroundColor: '#fafafa' }}
        >
          <Layer>
            {renderConnectors()}
            {renderTargets()}
          </Layer>
        </Stage>
      )}
    </div>
  );
};

export default DragTestPage;
