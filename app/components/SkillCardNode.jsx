import React, { useEffect, useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';

const SkillCardNodeComponent = ({
  id,
  x,
  y,
  width = 260,
  height = 180,
  skill,
  outcomeCode,
  outcomeDescription,
  selected = false,
  hovered = false,
  draggable = true,
  onNodeClick,
  onNodeHover,
  onNodeDragStart,
  onNodeDragEnd,
  onStartConnection,
  isConnectionSource = false,
}) => {
  const groupRef = useRef(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    group.clearCache();
    const ratio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    group.cache({ pixelRatio: ratio });
    group.getLayer()?.batchDraw();
  }, [skill, outcomeCode, outcomeDescription, width, height, selected, hovered, isConnectionSource, draggable]);

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
      onNodeDragEnd(id, e.target.x(), e.target.y(), e);
    }
  };

  const handleConnectorClick = (e) => {
    if (e && typeof e.cancelBubble !== 'undefined') {
      e.cancelBubble = true;
    }
    if (onStartConnection) {
      onStartConnection(id);
    }
  };

  const baseStroke = selected ? '#2ecc71' : hovered ? '#2980b9' : '#d1d5db';
  const background = selected ? '#eafaf1' : '#ffffff';
  const connectorFill = isConnectionSource ? '#8e44ad' : '#34495e';

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      offsetX={width / 2}
      offsetY={height / 2}
      nodeId={id}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Rect
        width={width}
        height={height}
        cornerRadius={12}
        fill={background}
        stroke={baseStroke}
        strokeWidth={selected ? 3 : 2}
        shadowBlur={hovered ? 18 : 10}
        shadowColor="black"
        shadowOpacity={hovered ? 0.3 : 0.15}
        perfectDrawEnabled={false}
      />

      <Rect
        x={16}
        y={18}
        width={width - 64}
        height={height - 60}
        fill="transparent"
        perfectDrawEnabled={false}
        listening={false}
      />

      <Text
        x={20}
        y={20}
        width={width - 80}
        text={skill}
        fontSize={14}
        fontStyle="bold"
        fill="#1f2933"
        wrap="word"
        lineHeight={1.2}
        listening={false}
      />

     

      <Group
        x={width - 40}
        y={height / 2 - 24}
        onClick={handleConnectorClick}
        onTap={handleConnectorClick}
        onMouseEnter={(e) => {
          if (e.target && e.target.getStage()) {
            e.target.getStage().container().style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          if (e.target && e.target.getStage()) {
            e.target.getStage().container().style.cursor = '';
          }
        }}
      >
        <Rect
          width={32}
          height={32}
          cornerRadius={10}
          fill={connectorFill}
          opacity={hovered || isConnectionSource ? 0.9 : 0.75}
          stroke={selected ? '#f1c40f' : '#1a1a1a'}
          strokeWidth={1}
          perfectDrawEnabled={false}
        />
        <Text
          x={0}
          y={6}
          width={32}
          align="center"
          text="+"
          fontSize={20}
          fill="#ffffff"
          listening={false}
        />
      </Group>
    </Group>
  );
};

export default React.memo(SkillCardNodeComponent);
