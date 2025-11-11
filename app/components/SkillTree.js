'use client'
import React, { useState, useEffect } from 'react';
import { Tldraw, createShapeId, Editor } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

const SkillTree = () => {
  const [editor, setEditor] = useState(null);
  const [skills, setSkills] = useState([]);
  const [outcomeNames, setOutcomeNames] = useState({});
  const [isLoading, setIsLoading] = useState(true);

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

  // Initialize tldraw with shapes
  const handleMount = (editor) => {
    setEditor(editor);

    if (skills.length === 0) return;

    const shapes = [];

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

    // Zoom to fit
    editor.zoomToFit({ duration: 0 });
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
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 5px 0' }}>Manitoba Math Curriculum</h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          Grades 1-9 • {skills.length} skills • {Object.keys(outcomeGroups).length} outcomes
        </p>
      </div>
      <Tldraw onMount={handleMount} />
    </div>
  );
};

export default SkillTree;
