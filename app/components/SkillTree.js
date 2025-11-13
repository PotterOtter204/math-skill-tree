'use client'
import React, { useState, useRef, useEffect } from 'react';
import SkillNode from './SkillNode';

const sanitizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }
      if (typeof entry === 'number') {
        return String(entry);
      }
      if (entry && typeof entry === 'object' && typeof entry.id === 'string') {
        return entry.id.trim();
      }
      return '';
    })
    .filter(Boolean);
};

const sanitizeContentEntries = (value, prefix = 'entry') => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce((acc, item, index) => {
    if (!item) {
      return acc;
    }

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) {
        return acc;
      }
      acc.push({
        id: `${prefix}-${index}`,
        title: '',
        content: trimmed
      });
      return acc;
    }

    if (typeof item === 'object') {
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const content = typeof item.content === 'string' ? item.content.trim() : '';
      if (!title && !content) {
        return acc;
      }
      acc.push({
        id: typeof item.id === 'string' ? item.id : `${prefix}-${index}`,
        title,
        content
      });
    }

    return acc;
  }, []);
};

const createContentEntry = (title, content, prefix) => ({
  id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: title.trim(),
  content: content.trim()
});

const normalizeSkillShape = (skill, index = 0) => {
  if (!skill || typeof skill !== 'object') {
    return null;
  }

  const {
    practiceQuestions,
    practice_questions,
    instructionalContent,
    instructional_content,
    prerequisites,
    ...rest
  } = skill;

  const practiceSource = Array.isArray(practiceQuestions)
    ? practiceQuestions
    : Array.isArray(practice_questions)
      ? practice_questions
      : [];

  const instructionalSource = Array.isArray(instructionalContent)
    ? instructionalContent
    : Array.isArray(instructional_content)
      ? instructional_content
      : [];

  const normalizedName = typeof rest.name === 'string'
    ? rest.name.trim()
    : typeof rest.skill === 'string'
      ? rest.skill.trim()
      : '';

  const normalizedDescription = typeof rest.description === 'string'
    ? rest.description.trim()
    : typeof rest.outcomeDescription === 'string'
      ? rest.outcomeDescription.trim()
      : '';

  return {
    ...rest,
    name: normalizedName || rest.name || rest.skill || rest.id,
    skill: normalizedName || rest.skill || rest.name || rest.id,
    description: normalizedDescription,
    prerequisites: sanitizeStringArray(prerequisites),
    practiceQuestions: sanitizeContentEntries(practiceSource, `practice-${index}`),
    instructionalContent: sanitizeContentEntries(instructionalSource, `instruction-${index}`)
  };
};

const normalizeSkillList = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item, index) => normalizeSkillShape(item, index))
    .filter((item) => item !== null);
};

const SkillTree = () => {
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [draggingSkill, setDraggingSkill] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [newPractice, setNewPractice] = useState({ title: '', content: '' });
  const [newInstruction, setNewInstruction] = useState({ title: '', content: '' });
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
        if (!cancelled) {
          setSkills(normalizeSkillList(data));
        }
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
    const baseSkill = {
      id: `skill-${Date.now()}`,
      name: 'New Skill',
      skill: 'New Skill',
      description: 'Click to edit',
      outcomeDescription: 'Click to edit',
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 300,
      prerequisites: [],
      practiceQuestions: [],
      instructionalContent: []
    };
    const normalized = normalizeSkillShape(baseSkill, skills.length);
    setSkills((prev) => [...prev, normalized]);
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

  const handleSkillNameChange = (value) => {
    if (!selectedSkill) {
      return;
    }
    const trimmed = value;
    setSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.id === selectedSkill
          ? { ...skill, name: trimmed, skill: trimmed }
          : skill
      )
    );
  };

  const handleSkillDescriptionChange = (value) => {
    if (!selectedSkill) {
      return;
    }
    setSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.id === selectedSkill
          ? { ...skill, description: value, outcomeDescription: value }
          : skill
      )
    );
  };

  const handleRemovePrerequisite = (prereqId) => {
    if (!selectedSkill) {
      return;
    }

    setSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.id === selectedSkill
          ? {
              ...skill,
              prerequisites: (skill.prerequisites || []).filter(id => id !== prereqId)
            }
          : skill
      )
    );
  };

  const handlePracticeFieldChange = (field, value) => {
    setNewPractice(prev => ({ ...prev, [field]: value }));
  };

  const handleInstructionFieldChange = (field, value) => {
    setNewInstruction(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPracticeQuestion = (e) => {
    if (e) {
      e.preventDefault();
    }

    if (!selectedSkill) {
      return;
    }

    const title = newPractice.title.trim();
    const content = newPractice.content.trim();

    if (!title || !content) {
      return;
    }

    const entry = createContentEntry(title, content, 'practice');

    setSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.id === selectedSkill
          ? {
              ...skill,
              practiceQuestions: [...(skill.practiceQuestions || []), entry]
            }
          : skill
      )
    );

    setNewPractice({ title: '', content: '' });
  };

  const handleRemovePracticeQuestion = (entryId) => {
    if (!selectedSkill) {
      return;
    }

    setSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.id === selectedSkill
          ? {
              ...skill,
              practiceQuestions: (skill.practiceQuestions || []).filter(item => item.id !== entryId)
            }
          : skill
      )
    );
  };

  const handleAddInstructionalContent = (e) => {
    if (e) {
      e.preventDefault();
    }

    if (!selectedSkill) {
      return;
    }

    const title = newInstruction.title.trim();
    const content = newInstruction.content.trim();

    if (!title || !content) {
      return;
    }

    const entry = createContentEntry(title, content, 'instruction');

    setSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.id === selectedSkill
          ? {
              ...skill,
              instructionalContent: [...(skill.instructionalContent || []), entry]
            }
          : skill
      )
    );

    setNewInstruction({ title: '', content: '' });
  };

  const handleRemoveInstructionalContent = (entryId) => {
    if (!selectedSkill) {
      return;
    }

    setSkills(prevSkills =>
      prevSkills.map(skill =>
        skill.id === selectedSkill
          ? {
              ...skill,
              instructionalContent: (skill.instructionalContent || []).filter(item => item.id !== entryId)
            }
          : skill
      )
    );
  };

  // Convenience for showing selected skill name (handle different JSON shapes)
  const selectedObj = skills.find(s => s.id === selectedSkill);
  const selectedLabel = selectedObj ? (selectedObj.name || selectedObj.skill || selectedObj.id) : null;

  useEffect(() => {
    setNewPractice({ title: '', content: '' });
    setNewInstruction({ title: '', content: '' });
  }, [selectedSkill]);

  useEffect(() => {
    console.log(selectedObj)
  }, []);

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

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
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

        {selectedObj && (
          <aside
            style={{
              width: '340px',
              borderLeft: '1px solid #ddd',
              backgroundColor: '#ffffff',
              padding: '20px',
              overflowY: 'auto',
           
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Skill Details</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>
                Name
              </label>
              <input
                type="text"
                value={selectedObj.name || selectedObj.skill || ''}
                onChange={(e) => handleSkillNameChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5f5',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={selectedObj.description || selectedObj.outcomeDescription || ''}
                onChange={(e) => handleSkillDescriptionChange(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5f5',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <section style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#111827' }}>Prerequisites</h4>
              {selectedObj.prerequisites && selectedObj.prerequisites.length > 0 ? (
                selectedObj.prerequisites.map(prereqId => {
                  const prereqSkill = skills.find(s => s.id === prereqId);
                  const label = prereqSkill ? (prereqSkill.name || prereqSkill.skill || prereqSkill.id) : prereqId;
                  return (
                    <div
                      key={prereqId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: '13px'
                      }}
                    >
                      <span style={{ flex: 1, marginRight: '8px', color: '#1f2937' }}>{label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePrerequisite(prereqId)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ef4444',
                          background: '#fff5f5',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>No prerequisites linked.</p>
              )}
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#111827' }}>Instructional Content</h4>
              {selectedObj.instructionalContent && selectedObj.instructionalContent.length > 0 ? (
                selectedObj.instructionalContent.map(item => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                      marginBottom: '10px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '14px', color: '#111827' }}>{item.title || 'Untitled Resource'}</strong>
                      <button
                        type="button"
                        onClick={() => handleRemoveInstructionalContent(item.id)}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap' }}>{item.content}</p>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>No instructional content yet.</p>
              )}

              <form onSubmit={handleAddInstructionalContent} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <input
                  type="text"
                  value={newInstruction.title}
                  onChange={(e) => handleInstructionFieldChange('title', e.target.value)}
                  placeholder="Title"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5f5',
                    fontSize: '14px'
                  }}
                />
                <textarea
                  value={newInstruction.content}
                  onChange={(e) => handleInstructionFieldChange('content', e.target.value)}
                  placeholder="Content"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5f5',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add Instruction
                </button>
              </form>
            </section>

            <section>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#111827' }}>Practice Questions</h4>
              {selectedObj.practiceQuestions && selectedObj.practiceQuestions.length > 0 ? (
                selectedObj.practiceQuestions.map(item => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                      marginBottom: '10px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '14px', color: '#111827' }}>{item.title || 'Untitled Question'}</strong>
                      <button
                        type="button"
                        onClick={() => handleRemovePracticeQuestion(item.id)}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap' }}>{item.content}</p>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>No practice questions yet.</p>
              )}

              <form onSubmit={handleAddPracticeQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <input
                  type="text"
                  value={newPractice.title}
                  onChange={(e) => handlePracticeFieldChange('title', e.target.value)}
                  placeholder="Title"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5f5',
                    fontSize: '14px'
                  }}
                />
                <textarea
                  value={newPractice.content}
                  onChange={(e) => handlePracticeFieldChange('content', e.target.value)}
                  placeholder="Content"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5f5',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add Practice Question
                </button>
              </form>
            </section>
          </aside>
        )}
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
