import React, { useState, useRef } from 'react';
import { Stage, Layer, Arrow, Line } from 'react-konva';
import InteractiveNode from './InteractiveNode';

/**
 * Enhanced Konva Wrapper with zoom, pan, and custom interactive components
 * Demonstrates modern canvas functionality with react-konva
 */
const EnhancedKonvaWrapper = () => {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const stageRef = useRef(null);

  // Zoom configuration
  const SCALE_BY = 1.02;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5;

  const nodeTypes = ['circle', 'square', 'star'];
  const colors = [
    '#2196F3', '#4CAF50', '#FF9800', '#E91E63',
    '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'
  ];

  const addNode = (type = null) => {
    const nodeType = type || nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    const newNode = {
      id: `node-${Date.now()}-${Math.random()}`,
      x: Math.random() * 1500 + 200,
      y: Math.random() * 1000 + 200,
      radius: 50,
      color: colors[Math.floor(Math.random() * colors.length)],
      text: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${nodes.length + 1}`,
      type: nodeType,
      hovered: false,
      selected: false,
      clicks: 0,
      draggable: true
    };
    setNodes([...nodes, newNode]);
  };

  const handleNodeClick = (nodeId) => {
    console.log(`Clicked node: ${nodeId}`);

    // If we're in connection mode
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        // Create connection
        const newConnection = {
          id: `conn-${Date.now()}`,
          from: connectingFrom,
          to: nodeId
        };
        setConnections([...connections, newConnection]);
      }
      setConnectingFrom(null);
    } else {
      // Select node
      setSelectedNodeId(nodeId);
    }

    // Update click count
    setNodes(nodes.map(node =>
      node.id === nodeId
        ? { ...node, clicks: (node.clicks || 0) + 1, selected: true }
        : { ...node, selected: false }
    ));
  };

  const handleNodeHover = (nodeId, isHovered) => {
    setNodes(nodes.map(node =>
      node.id === nodeId
        ? { ...node, hovered: isHovered }
        : node
    ));
  };

  const handleNodeDragEnd = (nodeId, newX, newY) => {
    setNodes(nodes.map(node =>
      node.id === nodeId
        ? { ...node, x: newX, y: newY }
        : node
    ));
  };

  const startConnection = () => {
    if (selectedNodeId) {
      setConnectingFrom(selectedNodeId);
      alert('Click on another node to create a connection');
    } else {
      alert('Please select a node first by clicking on it');
    }
  };

  const deleteSelected = () => {
    if (selectedNodeId) {
      setNodes(nodes.filter(node => node.id !== selectedNodeId));
      setConnections(connections.filter(
        conn => conn.from !== selectedNodeId && conn.to !== selectedNodeId
      ));
      setSelectedNodeId(null);
    }
  };

  const clearAll = () => {
    if (confirm('Clear all nodes and connections?')) {
      setNodes([]);
      setConnections([]);
      setSelectedNodeId(null);
      setConnectingFrom(null);
    }
  };

  // Handle wheel zoom
  const handleWheel = (e) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

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

  // Get node position by id for drawing connections
  const getNodeById = (id) => nodes.find(node => node.id === id);

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: '0 20px 0 0' }}>Interactive Canvas Demo</h3>

        <button
          onClick={() => addNode('circle')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          + Circle
        </button>

        <button
          onClick={() => addNode('square')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          + Square
        </button>

        <button
          onClick={() => addNode('star')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          + Star
        </button>

        <button
          onClick={startConnection}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#9b59b6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          Connect Nodes
        </button>

        <button
          onClick={deleteSelected}
          disabled={!selectedNodeId}
          style={{
            padding: '8px 16px',
            cursor: selectedNodeId ? 'pointer' : 'not-allowed',
            backgroundColor: selectedNodeId ? '#e67e22' : '#7f8c8d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            opacity: selectedNodeId ? 1 : 0.6
          }}
        >
          Delete Selected
        </button>

        <button
          onClick={clearAll}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#c0392b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          Clear All
        </button>

        <button
          onClick={resetView}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#34495e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          Reset View
        </button>

        <div style={{ marginLeft: 'auto', fontSize: '14px' }}>
          Zoom: {(stageScale * 100).toFixed(0)}% |
          Nodes: {nodes.length} |
          Connections: {connections.length}
        </div>
      </div>

      {/* Help text */}
      <div style={{
        padding: '8px 10px',
        backgroundColor: '#ecf0f1',
        fontSize: '12px',
        color: '#34495e',
        borderBottom: '1px solid #bdc3c7'
      }}>
        💡 <strong>Controls:</strong> Mouse wheel to zoom | Drag background to pan | Drag nodes to move |
        Click node to select | Use "Connect Nodes" to link selected node to another
        {connectingFrom && <span style={{ color: '#e74c3c', fontWeight: 'bold' }}> | 🔗 Connection mode active - click target node</span>}
      </div>

      {/* Canvas */}
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight - 100}
        style={{ backgroundColor: '#f8f9fa', cursor: connectingFrom ? 'crosshair' : 'grab' }}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        onWheel={handleWheel}
        draggable
        onDragEnd={handleDragEnd}
      >
        <Layer>
          {/* Draw connections */}
          {connections.map(conn => {
            const fromNode = getNodeById(conn.from);
            const toNode = getNodeById(conn.to);

            if (!fromNode || !toNode) return null;

            // Calculate arrow points
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const angle = Math.atan2(dy, dx);
            const radius = toNode.radius || 50;

            // Start from edge of fromNode, end at edge of toNode
            const startX = fromNode.x + Math.cos(angle) * (fromNode.radius || 50);
            const startY = fromNode.y + Math.sin(angle) * (fromNode.radius || 50);
            const endX = toNode.x - Math.cos(angle) * radius;
            const endY = toNode.y - Math.sin(angle) * radius;

            return (
              <Arrow
                key={conn.id}
                points={[startX, startY, endX, endY]}
                stroke="#34495e"
                strokeWidth={3}
                fill="#34495e"
                pointerLength={15}
                pointerWidth={15}
                opacity={0.6}
                dash={[10, 5]}
              />
            );
          })}

          {/* Draw nodes using custom component */}
          {nodes.map(node => (
            <InteractiveNode
              key={node.id}
              id={node.id}
              x={node.x}
              y={node.y}
              radius={node.radius}
              color={node.color}
              text={node.text}
              type={node.type}
              hovered={node.hovered}
              selected={node.selected}
              clicks={node.clicks}
              draggable={node.draggable}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              onNodeDragEnd={handleNodeDragEnd}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default EnhancedKonvaWrapper;
