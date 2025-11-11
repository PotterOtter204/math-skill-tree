 'use client'
import React, { useState, useRef, useEffect, useMemo } from 'react';

const SkillTree = () => {
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [draggingSkill, setDraggingSkill] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [zoom, setZoom] = useState(0.3); // Start zoomed out
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [editingSkill, setEditingSkill] = useState(null);
  const [outcomeNames, setOutcomeNames] = useState({});
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Group skills by outcome
  const outcomeGroups = useMemo(() => {
    const groups = {};
    skills.forEach(skill => {
      const outcomeCode = skill.outcome_code;
      if (!groups[outcomeCode]) {
        groups[outcomeCode] = [];
      }
      groups[outcomeCode].push(skill);
    });
    return groups;
  }, [skills]);

  // Calculate outcome metadata (center position, bounds)
  const outcomeMetadata = useMemo(() => {
    const metadata = {};
    Object.keys(outcomeGroups).forEach(outcomeCode => {
      const skillsInOutcome = outcomeGroups[outcomeCode];
      if (skillsInOutcome.length === 0) return;

      const xs = skillsInOutcome.map(s => s.x);
      const ys = skillsInOutcome.map(s => s.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      metadata[outcomeCode] = {
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        minX,
        maxX,
        minY,
        maxY,
        count: skillsInOutcome.length
      };
    });
    return metadata;
  }, [outcomeGroups]);

  // Determine level of detail based on zoom
  const showOutcomes = zoom < 0.5; // Show outcomes when zoomed out
  const showSkills = zoom >= 0.5; // Show individual skills when zoomed in

  // Redraw canvas when state changes
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

    // Save context and apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    if (showOutcomes && !showSkills) {
      // Draw outcome nodes
      Object.keys(outcomeMetadata).forEach(outcomeCode => {
        const meta = outcomeMetadata[outcomeCode];
        drawOutcomeNode(ctx, outcomeCode, meta, selectedOutcome === outcomeCode);
      });
    } else if (showSkills) {
      // Draw connections between skills
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
    }

    ctx.restore();
  }, [skills, zoom, pan, outcomeMetadata, showOutcomes, showSkills, selectedOutcome, outcomeNames]);

  // Fetch skills and outcome names from the API on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [skillsRes, namesRes] = await Promise.all([
          fetch('/api/get-skills'),
          fetch('/api/get-outcome-names')
        ]);

        if (!skillsRes.ok) throw new Error('Failed to fetch skills');

        const skillsData = await skillsRes.json();
        if (!cancelled) setSkills(skillsData);

        if (namesRes.ok) {
          const namesData = await namesRes.json();
          if (!cancelled) setOutcomeNames(namesData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const drawOutcomeNode = (ctx, outcomeCode, meta, isSelected) => {
    const width = 250;
    const height = 150;
    const x = meta.centerX - width / 2;
    const y = meta.centerY - height / 2;

    // Draw rectangle
    ctx.fillStyle = isSelected ? '#e3f2fd' : '#fff';
    ctx.strokeStyle = isSelected ? '#2196F3' : '#999';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Draw outcome code
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(outcomeCode, meta.centerX, y + 10);

    // Draw outcome description (truncated)
    const outcomeName = outcomeNames[outcomeCode] || '';
    ctx.font = '10px Arial';
    ctx.fillStyle = '#555';
    const maxWidth = width - 20;
    const truncated = outcomeName.length > 60 ? outcomeName.substring(0, 60) + '...' : outcomeName;

    // Wrap text
    const words = truncated.split(' ');
    let line = '';
    let yOffset = y + 35;
    const lineHeight = 12;
    let lineCount = 0;
    const maxLines = 3;

    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, meta.centerX, yOffset);
        line = word + ' ';
        yOffset += lineHeight;
        lineCount++;
        if (lineCount >= maxLines) break;
      } else {
        line = testLine;
      }
    }
    if (lineCount < maxLines && line) {
      ctx.fillText(line, meta.centerX, yOffset);
      yOffset += lineHeight;
    }

    // Draw skill count
    ctx.font = '11px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(`${meta.count} skills`, meta.centerX, y + height - 35);

    // Draw grade label
    const grade = parseInt(outcomeCode.split('.')[0]);
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = '#2196F3';
    ctx.fillText(`Grade ${grade}`, meta.centerX, y + height - 20);
  };

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

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prevZoom => Math.max(0.1, Math.min(2, prevZoom * delta)));
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      // Check if clicking on a node
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      if (showOutcomes && !showSkills) {
        // Check for outcome clicks
        let clicked = false;
        Object.keys(outcomeMetadata).forEach(outcomeCode => {
          const meta = outcomeMetadata[outcomeCode];
          const width = 250;
          const height = 150;
          const x = meta.centerX - width / 2;
          const y = meta.centerY - height / 2;

          if (mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height) {
            setSelectedOutcome(outcomeCode);
            clicked = true;
          }
        });

        if (!clicked) {
          setSelectedOutcome(null);
          setIsPanning(true);
          setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
      } else {
        // Pan mode for skills view too
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
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

  const handleUpdateSkill = async (skillId, updates) => {
    setSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.id === skillId ? { ...skill, ...updates } : skill
      )
    );

    // Persist to server
    try {
      const updatedSkills = skills.map(skill =>
        skill.id === skillId ? { ...skill, ...updates } : skill
      );
      await fetch('/api/save-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSkills)
      });
    } catch (err) {
      console.error('Failed to save skills:', err);
    }
  };

  const handleAddSkill = () => {
    const newSkill = {
      id: `skill-${Date.now()}`,
      skill: 'New Skill',
      outcome_code: '1.N.1',
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
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <h2 style={{ margin: 0, marginRight: '20px' }}>Manitoba Math Curriculum</h2>

        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button
            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
            style={{
              padding: '8px 12px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            -
          </button>
          <span style={{ fontSize: '12px', minWidth: '80px', textAlign: 'center' }}>
            Zoom: {(zoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            style={{
              padding: '8px 12px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>

        <span style={{
          fontSize: '12px',
          padding: '4px 8px',
          backgroundColor: showOutcomes ? '#FFE082' : '#C8E6C9',
          borderRadius: '4px'
        }}>
          {showOutcomes ? 'Showing Outcomes' : 'Showing Skills'}
        </span>

        {selectedOutcome && (
          <span style={{ color: '#2196F3', fontWeight: 'bold' }}>
            Selected: {selectedOutcome}
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
          overflow: 'hidden',
          backgroundColor: '#fafafa',
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Canvas for drawing */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        />

        {/* Skill nodes - only render when showing skills */}
        {showSkills && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {skills.map(skill => (
              <div
                key={skill.id}
                style={{
                  position: 'absolute',
                  left: skill.x,
                  top: skill.y,
                  width: 150,
                  minHeight: 60,
                  padding: '8px',
                  backgroundColor: selectedSkill === skill.id ? '#e3f2fd' : '#fff',
                  border: selectedSkill === skill.id ? '2px solid #2196F3' : '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  overflow: 'hidden'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editingSkill !== skill.id) {
                    handleSkillClick(skill.id);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingSkill(skill.id);
                }}
              >
                {editingSkill === skill.id ? (
                  <textarea
                    autoFocus
                    defaultValue={skill.skill}
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      fontSize: '10px',
                      border: 'none',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    onBlur={(e) => {
                      handleUpdateSkill(skill.id, { skill: e.target.value });
                      setEditingSkill(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingSkill(null);
                      }
                    }}
                  />
                ) : (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '9px', color: '#666', marginBottom: '4px' }}>
                      {skill.id}
                    </div>
                    <div style={{ fontSize: '10px' }}>
                      {skill.skill}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #ccc',
        fontSize: '12px'
      }}>
        <strong>Instructions:</strong> Use mouse wheel to zoom. Click and drag to pan.
        {showSkills ? 'Double-click skills to edit. ' : 'Click outcomes to select. '}
        Zoom in to see individual skills, zoom out to see outcomes.
      </div>
    </div>
  );
};

export default SkillTree;
