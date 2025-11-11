'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { Tldraw, createShapeId, Editor, track } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

const SkillTree = () => {
  const [editor, setEditor] = useState(null);
  const [skills, setSkills] = useState([]);
  const [outcomeNames, setOutcomeNames] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectingMode, setConnectingMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);

  // Fetch skills and outcome names
  useEffect(() => {
    const load = async () => {
      try {
        const [skillsRes, namesRes] = await Promise.all([
          fetch('/api/get-skills'),
          fetch('/api/get-outcome-names')
        ]);

        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          setSkills(skillsData);
        }

        if (namesRes.ok) {
          const namesData = await namesRes.json();
          setOutcomeNames(namesData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Group skills by outcome
  const outcomeGroups = React.useMemo(() => {
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

  // Save skills to server
  const saveSkills = useCallback(async (updatedSkills) => {
    try {
      await fetch('/api/save-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSkills)
      });
    } catch (err) {
      console.error('Failed to save skills:', err);
    }
  }, []);

  // Handle clicking on skills in connecting mode
  const handleShapeClick = useCallback((shapeId) => {
    if (!connectingMode || !editor) return;

    const skill = skills.find(s => s.id === shapeId);
    if (!skill) return;

    if (!connectFrom) {
      // First click - select the prerequisite (parent)
      setConnectFrom(shapeId);
      const shape = editor.getShape(createShapeId(shapeId));
      if (shape) {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          props: { ...shape.props, color: 'green' }
        });
      }
    } else {
      // Second click - create connection to dependent skill (child)
      if (connectFrom !== shapeId) {
        // Add prerequisite relationship
        const updatedSkills = skills.map(s => {
          if (s.id === shapeId) {
            const prerequisites = s.prerequisites || [];
            if (!prerequisites.includes(connectFrom)) {
              return { ...s, prerequisites: [...prerequisites, connectFrom] };
            }
          }
          return s;
        });

        setSkills(updatedSkills);
        saveSkills(updatedSkills);

        // Create arrow from child to parent (prerequisite)
        const fromShape = editor.getShape(createShapeId(shapeId));
        const toShape = editor.getShape(createShapeId(connectFrom));

        if (fromShape && toShape) {
          editor.createShape({
            type: 'arrow',
            props: {
              start: { type: 'binding', boundShapeId: fromShape.id, normalizedAnchor: { x: 0.5, y: 0.5 } },
              end: { type: 'binding', boundShapeId: toShape.id, normalizedAnchor: { x: 0.5, y: 0.5 } },
              color: 'red',
              size: 'm'
            }
          });
        }

        // Reset connecting mode
        const resetShape = editor.getShape(createShapeId(connectFrom));
        if (resetShape) {
          editor.updateShape({
            id: resetShape.id,
            type: resetShape.type,
            props: { ...resetShape.props, color: 'grey' }
          });
        }
      }

      setConnectFrom(null);
      setConnectingMode(false);
    }
  }, [connectingMode, connectFrom, skills, editor, saveSkills]);

  // Initialize tldraw with shapes
  const handleMount = (editor) => {
    setEditor(editor);

    if (skills.length === 0) return;

    const shapes = [];
    const skillShapeMap = {}; // Map skill IDs to shape IDs

    // Create shapes for each outcome group
    Object.keys(outcomeGroups).forEach(outcomeCode => {
      const skillsInOutcome = outcomeGroups[outcomeCode];
      if (skillsInOutcome.length === 0) return;

      // Calculate bounds of this outcome
      const xs = skillsInOutcome.map(s => s.x);
      const ys = skillsInOutcome.map(s => s.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs) + 150; // Add skill width
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys) + 60; // Add skill height

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = maxX - minX + 40; // Add padding
      const height = maxY - minY + 80; // Add padding for label

      // Create a frame/rectangle for the outcome
      const frameId = createShapeId();
      shapes.push({
        id: frameId,
        type: 'geo',
        x: minX - 20,
        y: minY - 60,
        props: {
          geo: 'rectangle',
          w: width,
          h: height,
          color: 'light-blue',
          fill: 'none',
          dash: 'dashed',
          size: 's'
        }
      });

      // Create large text label for outcome (readable when zoomed out)
      const grade = parseInt(outcomeCode.split('.')[0]);
      const outcomeName = outcomeNames[outcomeCode] || '';
      const labelText = `${outcomeCode} - Grade ${grade}\n${outcomeName.substring(0, 80)}${outcomeName.length > 80 ? '...' : ''}`;

      const labelId = createShapeId();
      shapes.push({
        id: labelId,
        type: 'text',
        x: centerX - 200,
        y: minY - 55,
        props: {
          text: labelText,
          size: 'xl',
          color: 'blue',
          w: 400,
          autoSize: false,
          scale: 2 // Make it even larger
        }
      });

      // Create skill shapes
      skillsInOutcome.forEach(skill => {
        const skillId = createShapeId(skill.id);
        skillShapeMap[skill.id] = skillId;
        shapes.push({
          id: skillId,
          type: 'geo',
          x: skill.x,
          y: skill.y,
          props: {
            geo: 'rectangle',
            w: 150,
            h: 60,
            color: 'grey',
            fill: 'solid',
            size: 's',
            text: skill.skill.substring(0, 80)
          }
        });
      });
    });

    // Add all shapes to the editor
    editor.createShapes(shapes);

    // Create arrows for existing prerequisites
    skills.forEach(skill => {
      if (skill.prerequisites && skill.prerequisites.length > 0) {
        skill.prerequisites.forEach(prereqId => {
          const fromShapeId = skillShapeMap[skill.id];
          const toShapeId = skillShapeMap[prereqId];

          if (fromShapeId && toShapeId) {
            editor.createShape({
              type: 'arrow',
              props: {
                start: { type: 'binding', boundShapeId: fromShapeId, normalizedAnchor: { x: 0.5, y: 0.5 } },
                end: { type: 'binding', boundShapeId: toShapeId, normalizedAnchor: { x: 0.5, y: 0.5 } },
                color: 'red',
                size: 'm'
              }
            });
          }
        });
      }
    });

    // Zoom to fit
    editor.zoomToFit({ duration: 0 });

    // Listen for shape clicks
    editor.on('event', (event) => {
      if (event.type === 'click' && event.name === 'click' && event.target === 'shape') {
        const shape = event.shape;
        if (shape && shape.type === 'geo') {
          // Extract skill ID from shape ID
          const shapeIdStr = shape.id.toString();
          const skill = skills.find(s => createShapeId(s.id).toString() === shapeIdStr);
          if (skill) {
            handleShapeClick(skill.id);
          }
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Loading curriculum...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1000,
        background: 'white',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '350px'
      }}>
        <h3 style={{ margin: '0 0 5px 0' }}>Manitoba Math Curriculum</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
          Grades 1-9 • {skills.length} skills • {Object.keys(outcomeGroups).length} outcomes
        </p>
        <button
          onClick={() => {
            setConnectingMode(!connectingMode);
            setConnectFrom(null);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: connectingMode ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          {connectingMode ? (connectFrom ? 'Click dependent skill...' : 'Click prerequisite...') : 'Add Prerequisite Connection'}
        </button>
        {connectingMode && (
          <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#2196F3', fontWeight: 'bold' }}>
            {connectFrom
              ? '2. Click the skill that depends on the green one'
              : '1. Click the prerequisite skill (will turn green)'}
          </p>
        )}
      </div>
      <Tldraw onMount={handleMount} />
    </div>
  );
};

export default SkillTree;
