import React from 'react';
import { Group, Circle, Text, Rect, Star } from 'react-konva';

/**
 * Custom interactive node component with various interactive features
 * Demonstrates how to create reusable JSX components for react-konva
 */
const InteractiveNode = ({
  id,
  x,
  y,
  radius = 50,
  color = '#2196F3',
  text = 'Node',
  hovered = false,
  selected = false,
  clicks = 0,
  draggable = true,
  type = 'circle', // 'circle', 'square', 'star'
  onNodeClick,
  onNodeHover,
  onNodeDragStart,
  onNodeDragEnd,
}) => {
  const handleClick = () => {
    if (onNodeClick) {
      onNodeClick(id);
    }
  };

  const handleMouseEnter = () => {
    if (onNodeHover) {
      onNodeHover(id, true);
    }
  };

  const handleMouseLeave = () => {
    if (onNodeHover) {
      onNodeHover(id, false);
    }
  };

  const handleDragStart = (e) => {
    if (onNodeDragStart) {
      onNodeDragStart(id, e);
    }
  };

  const handleDragEnd = (e) => {
    if (onNodeDragEnd) {
      onNodeDragEnd(id, e.target.x(), e.target.y());
    }
  };

  const scale = hovered ? 1.15 : selected ? 1.1 : 1;
  const strokeWidth = selected ? 4 : hovered ? 3 : 2;
  const strokeColor = selected ? '#FFD700' : hovered ? '#fff' : '#333';

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background shadow for depth */}
      {type === 'circle' && (
        <Circle
          radius={radius * scale}
          fill="rgba(0, 0, 0, 0.2)"
          offsetY={-3}
          blur={10}
        />
      )}

      {/* Main shape */}
      {type === 'circle' && (
        <Circle
          radius={radius * scale}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          shadowBlur={hovered ? 20 : 10}
          shadowColor="black"
          shadowOpacity={0.3}
        />
      )}

      {type === 'square' && (
        <Rect
          width={radius * 2 * scale}
          height={radius * 2 * scale}
          offsetX={radius * scale}
          offsetY={radius * scale}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          cornerRadius={10}
          shadowBlur={hovered ? 20 : 10}
          shadowColor="black"
          shadowOpacity={0.3}
        />
      )}

      {type === 'star' && (
        <Star
          numPoints={5}
          innerRadius={radius * 0.5 * scale}
          outerRadius={radius * scale}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          shadowBlur={hovered ? 20 : 10}
          shadowColor="black"
          shadowOpacity={0.3}
        />
      )}

      {/* Node label */}
      <Text
        y={-12}
        width={radius * 2}
        offsetX={radius}
        text={text}
        fontSize={14}
        fontStyle="bold"
        fill="white"
        align="center"
      />

      {/* Click counter */}
      {clicks > 0 && (
        <Text
          y={5}
          width={radius * 2}
          offsetX={radius}
          text={`Clicks: ${clicks}`}
          fontSize={10}
          fill="white"
          align="center"
        />
      )}

      {/* Selected indicator */}
      {selected && (
        <Circle
          y={-radius * scale - 15}
          radius={5}
          fill="#FFD700"
        />
      )}

      {/* Draggable indicator */}
      {draggable && hovered && (
        <Text
          y={radius * scale + 10}
          width={radius * 2}
          offsetX={radius}
          text="⇅ Drag me"
          fontSize={10}
          fill="#666"
          align="center"
        />
      )}
    </Group>
  );
};

export default InteractiveNode;
