import React, { useState } from 'react';
import { Stage, Layer, Rect, Arrow, Text } from 'react-konva';

const KonvaWrapper = () => {
  const [shapes, setShapes] = useState([]);

  const getRandomPosition = () => ({
    x: Math.random() * 700,
    y: Math.random() * 500
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

  const handleShapeClick = (shapeId) => {
    console.log(`Clicked shape with ID: ${shapeId}`);
    alert(`Shape clicked: ${shapeId}`);
  };

  return (
    <div>
      <button 
        onClick={addShape}
        style={{
          padding: '10px 20px',
          margin: '10px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Add Random Shape
      </button>

      <Stage width={800} height={600} style={{ border: '1px solid black' }}>
        <Layer>
          {shapes.map((shape) => (
            shape.type === 'arrow' ? (
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
            ) : (
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
            )
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default KonvaWrapper;