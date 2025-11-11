'use client'
import React from 'react';

const SkillNode = ({ skill, isSelected, onClick, onDragStart, onDrag, onDragEnd, isDragging }) => {
  const handleMouseDown = (e) => {
    if (onDragStart) {
      onDragStart(skill.id, e);
    }
  };

  const handleMouseMove = (e) => {
    if (onDrag && isDragging) {
      onDrag(skill.id, e);
    }
  };

  const handleMouseUp = (e) => {
    if (onDragEnd) {
      onDragEnd(skill.id, e);
    }
  };

  return (
    <div
      className={`skill-node ${isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: skill.x,
        top: skill.y,
        width: '150px',
        height: '100px',
        border: '2px solid #333',
        borderRadius: '8px',
        backgroundColor: isSelected ? '#4CAF50' : '#fff',
        cursor: 'move',
        padding: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        userSelect: 'none',
        zIndex: isSelected ? 10 : 1,
        transition: isDragging ? 'none' : 'background-color 0.2s'
      }}
      onClick={() => onClick && onClick(skill.id)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{
        fontWeight: 'bold',
        fontSize: '14px',
        marginBottom: '5px',
        textAlign: 'center',
        color: isSelected ? '#fff' : '#333'
      }}>
        {skill.name}
      </div>
      <div style={{
        fontSize: '11px',
        color: isSelected ? '#f0f0f0' : '#666',
        textAlign: 'center'
      }}>
        {skill.description}
      </div>
    </div>
  );
};

export default SkillNode;
