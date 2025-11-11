 'use client'
import React, { useState, useRef, useEffect } from 'react';
import SkillNode from './SkillNode';

const SkillTree = () => {
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [draggingSkill, setDraggingSkill] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Draw connections between skills
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = containerRef.current;

    // Set canvas size to match container
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw arrows from child to parent (prerequisite)
    skills.forEach(skill => {
      if (skill.prerequisites && skill.prerequisites.length > 0) {
        skill.prerequisites.forEach(prereqId => {
          const prereqSkill = skills.find(s => s.id === prereqId);
          if (prereqSkill) {
            drawArrow(ctx, skill, prereqSkill);
          }
        });
      }
    });
  }, [skills]);

  // Fetch skills from the API on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/get-skills');
        if (!res.ok) throw new Error('Failed to fetch skills');
        const data = await res.json();
        if (!cancelled) setSkills(data);
      } catch (err) {
        console.error('Error loading skills:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const drawArrow = (ctx, fromSkill, toSkill) => {
    // Calculate centers of skill nodes
    const fromX = fromSkill.x + 75; // 150px width / 2
    const fromY = fromSkill.y + 50; // 100px height / 2
    const toX = toSkill.x + 75;
    const toY = toSkill.y + 50;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw arrowhead pointing from child to parent
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 15;
    const arrowWidth = 8;

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle),
      toY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)
    );
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle),
      toY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)
    );
    ctx.closePath();
    ctx.fillStyle = '#333';
    ctx.fill();
  };

  const handleSkillClick = (skillId) => {
    if (connectingFrom) {
      // If we're in connecting mode, create connection
      if (connectingFrom !== skillId) {
        setSkills(prevSkills =>
          prevSkills.map(skill =>
            skill.id === skillId
              ? { ...skill, prerequisites: [...(skill.prerequisites || []), connectingFrom] }
              : skill
          )
        );
      }
      setConnectingFrom(null);
    } else {
      setSelectedSkill(skillId);
    }
  };

  const handleDragStart = (skillId, e) => {
    e.preventDefault();
    const skill = skills.find(s => s.id === skillId);
    setDraggingSkill(skillId);
    setDragOffset({
      x: e.clientX - skill.x,
      y: e.clientY - skill.y
    });
  };

  const handleDrag = (e) => {
    if (draggingSkill) {
      e.preventDefault();
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      setSkills(prevSkills =>
        prevSkills.map(skill =>
          skill.id === draggingSkill
            ? { ...skill, x: newX, y: newY }
            : skill
        )
      );
    }
  };

  const handleDragEnd = () => {
    setDraggingSkill(null);
  };

  const handleAddSkill = () => {
    const newSkill = {
      id: `skill-${Date.now()}`,
      name: 'New Skill',
      description: 'Click to edit',
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 300,
      prerequisites: []
    };
    setSkills([...skills, newSkill]);
  };

  const handleConnectMode = () => {
    if (selectedSkill) {
      setConnectingFrom(selectedSkill);
      setSelectedSkill(null);
    }
  };

  const handleDeleteSkill = () => {
    if (selectedSkill) {
      setSkills(prevSkills => {
        // Remove the skill and any references to it
        return prevSkills
          .filter(skill => skill.id !== selectedSkill)
          .map(skill => ({
            ...skill,
            prerequisites: (skill.prerequisites || []).filter(prereqId => prereqId !== selectedSkill)
          }));
      });
      setSelectedSkill(null);
    }
  };

  // Convenience for showing selected skill name (handle different JSON shapes)
  const selectedObj = skills.find(s => s.id === selectedSkill);
  const selectedLabel = selectedObj ? (selectedObj.name || selectedObj.skill || selectedObj.id) : null;

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        borderBottom: '1px solid #ccc',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, marginRight: '20px' }}>Math Skill Tree</h2>
        <button
          onClick={handleAddSkill}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add Skill
        </button>
        <button
          onClick={handleConnectMode}
          disabled={!selectedSkill}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedSkill ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedSkill ? 'pointer' : 'not-allowed'
          }}
        >
          {connectingFrom ? 'Select Parent Skill' : 'Connect to Parent'}
        </button>
        <button
          onClick={handleDeleteSkill}
          disabled={!selectedSkill}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedSkill ? '#f44336' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedSkill ? 'pointer' : 'not-allowed'
          }}
        >
          Delete Skill
        </button>
        {connectingFrom && (
          <span style={{ color: '#2196F3', fontWeight: 'bold' }}>
            Click on a parent skill to connect...
          </span>
        )}
        {selectedSkill && (
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
            Selected: {selectedLabel}
          </span>
        )}
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          backgroundColor: '#fafafa'
        }}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
      >
        {/* Canvas for drawing connections */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            width: '100%',
            height: '100%'
          }}
        />

        {/* Skill nodes */}
        {skills.map(skill => (
          <SkillNode
            key={skill.id}
            skill={skill}
            isSelected={selectedSkill === skill.id}
            onClick={handleSkillClick}
            onDragStart={handleDragStart}
            isDragging={draggingSkill === skill.id}
          />
        ))}
      </div>

      {/* Instructions */}
      <div style={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #ccc',
        fontSize: '12px'
      }}>
        <strong>Instructions:</strong> Click a skill to select it. Drag skills to move them.
  Use the Connect to Parent button to link a child skill to its prerequisite.
        Arrows point from child skills to their parent prerequisites.
      </div>
    </div>
  );
};

export default SkillTree;
