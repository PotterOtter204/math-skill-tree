import React, { useState, useRef } from 'react';
import { Stage, Layer, Rect, Arrow, Text, Circle, Group } from 'react-konva';

const KonvaWrapper = () => {
  const [shapes, setShapes] = useState([]);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);

  // Zoom configuration
  const SCALE_BY = 1.02;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5;

  const getRandomPosition = () => ({
    x: Math.random() * 1500 + 200,
    y: Math.random() * 1000 + 200
  });

  const addShape = () => {
    const isArrow = Math.random() > 0.5;
    const pos = getRandomPosition();

    const newShape = {
      id: `shape-${Date.now()}-${Math.random()}`,
      type: isArrow ? 'arrow' : 'rectangle',
      x: pos.x,
      y: pos.y,
      ...(isArrow
        ? {
            points: [0, 0, 100, 100],
            pointerLength: 20,
            pointerWidth: 20,
            fill: 'black',
            stroke: 'black',
            strokeWidth: 4
          }
        : {
            width: 100,
            height: 80,
            fill: 'blue',
            stroke: 'black',
            strokeWidth: 2,
            text: `Rect ${shapes.filter(s => s.type === 'rectangle').length + 1}`
          }
      )
    };

    setShapes([...shapes, newShape]);
  };

  const addInteractiveComponent = () => {
    const pos = getRandomPosition();
    const newShape = {
      id: `interactive-${Date.now()}-${Math.random()}`,
      type: 'interactive',
      x: pos.x,
      y: pos.y,
      radius: 40,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      text: `Node ${shapes.filter(s => s.type === 'interactive').length + 1}`,
      hovered: false,
      clicks: 0
    };
    setShapes([...shapes, newShape]);
  };

  const handleShapeClick = (shapeId) => {
    console.log(`Clicked shape with ID: ${shapeId}`);

    // Update click count for interactive shapes
    setShapes(shapes.map(shape =>
      shape.id === shapeId && shape.type === 'interactive'
        ? { ...shape, clicks: (shape.clicks || 0) + 1 }
        : shape
    ));
  };

  const handleShapeHover = (shapeId, isHovered) => {
    setShapes(shapes.map(shape =>
      shape.id === shapeId
        ? { ...shape, hovered: isHovered }
        : shape
    ));
  };

  // Handle wheel zoom
  const handleWheel = (e) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    // Calculate mouse position relative to the stage
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Determine zoom direction
    const direction = e.evt.deltaY > 0 ? -1 : 1;

    // Calculate new scale with limits
    let newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    // Calculate new position to zoom relative to pointer
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

  // Handle stage drag
  const handleDragEnd = (e) => {
    setStagePosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const resetView = () => {
    setStageScale(1);
    setStagePosition({ x: 0, y: 0 });
  };

  return (
    <div>
      <div style={{
        padding: '10px',
        marginBottom: '10px',
        backgroundColor: '#f0f0f0',
        borderRadius: '5px'
      }}>
        <button
          onClick={addShape}
          style={{
            padding: '10px 20px',
            margin: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Add Random Shape
        </button>

        <button
          onClick={addInteractiveComponent}
          style={{
            padding: '10px 20px',
            margin: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Add Interactive Node
        </button>

        <button
          onClick={resetView}
          style={{
            padding: '10px 20px',
            margin: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Reset View
        </button>

        <span style={{ marginLeft: '20px', fontSize: '14px' }}>
          Zoom: {(stageScale * 100).toFixed(0)}% |
          Position: ({stagePosition.x.toFixed(0)}, {stagePosition.y.toFixed(0)})
        </span>

        <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
          💡 Use mouse wheel to zoom, drag to pan
        </div>
      </div>

      <Stage
        ref={stageRef}
        width={window.innerWidth - 40}
        height={window.innerHeight - 150}
        style={{ border: '2px solid #333', backgroundColor: '#fafafa' }}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        onWheel={handleWheel}
        draggable
        onDragEnd={handleDragEnd}
      >
        <Layer>
          {shapes.map((shape) => {
            if (shape.type === 'arrow') {
              return (
                <Arrow
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  points={shape.points}
                  pointerLength={shape.pointerLength}
                  pointerWidth={shape.pointerWidth}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  onClick={() => handleShapeClick(shape.id)}
                />
              );
            } else if (shape.type === 'interactive') {
              return (
                <Group
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                >
                  <Circle
                    radius={shape.hovered ? shape.radius * 1.2 : shape.radius}
                    fill={shape.color}
                    stroke={shape.hovered ? '#fff' : '#333'}
                    strokeWidth={shape.hovered ? 4 : 2}
                    shadowBlur={shape.hovered ? 20 : 10}
                    shadowColor="black"
                    shadowOpacity={0.3}
                    onClick={() => handleShapeClick(shape.id)}
                    onMouseEnter={() => handleShapeHover(shape.id, true)}
                    onMouseLeave={() => handleShapeHover(shape.id, false)}
                  />
                  <Text
                    y={-10}
                    width={shape.radius * 2}
                    offsetX={shape.radius}
                    text={shape.text}
                    fontSize={14}
                    fontStyle="bold"
                    fill="white"
                    align="center"
                    onClick={() => handleShapeClick(shape.id)}
                    onMouseEnter={() => handleShapeHover(shape.id, true)}
                    onMouseLeave={() => handleShapeHover(shape.id, false)}
                  />
                  {shape.clicks > 0 && (
                    <Text
                      y={5}
                      width={shape.radius * 2}
                      offsetX={shape.radius}
                      text={`Clicks: ${shape.clicks}`}
                      fontSize={10}
                      fill="white"
                      align="center"
                      onClick={() => handleShapeClick(shape.id)}
                      onMouseEnter={() => handleShapeHover(shape.id, true)}
                      onMouseLeave={() => handleShapeHover(shape.id, false)}
                    />
                  )}
                </Group>
              );
            } else {
              return (
                <React.Fragment key={shape.id}>
                  <Rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    fill={shape.fill}
                    stroke={shape.stroke}
                    strokeWidth={shape.strokeWidth}
                    onClick={() => handleShapeClick(shape.id)}
                  />
                  <Text
                    x={shape.x}
                    y={shape.y + shape.height / 2 - 10}
                    width={shape.width}
                    text={shape.text}
                    fontSize={16}
                    fill="white"
                    align="center"
                    onClick={() => handleShapeClick(shape.id)}
                  />
                </React.Fragment>
              );
            }
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default KonvaWrapper;