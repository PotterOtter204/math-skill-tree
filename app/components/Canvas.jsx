'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { Stage, Layer, Arrow, Group, Rect, Text } from 'react-konva';
import { Trash2 } from 'lucide-react';
import InteractiveNode from './InteractiveNode';
import SkillCardNode from './SkillCardNode';
import outcomeNameLookup from '../api/get-skills/outcomeNameLookUp.json';

const DEFAULT_SKILL_WIDTH = 260;
const DEFAULT_SKILL_HEIGHT = 180;
const DEFAULT_OUTCOME_RADIUS = 60;
const VIEW_PADDING = 400;

const rectsIntersect = (a, b) => {
  if (!a || !b) {
    return false;
  }
  return !(
    a.right < b.left
    || a.left > b.right
    || a.bottom < b.top
    || a.top > b.bottom
  );
};

const getNodeBounds = (node) => {
  if (!node) {
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
  }

  if (node.variant === 'skill') {
    const width = typeof node.width === 'number' ? node.width : DEFAULT_SKILL_WIDTH;
    const height = typeof node.height === 'number' ? node.height : DEFAULT_SKILL_HEIGHT;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    return {
      left: node.x - halfWidth,
      right: node.x + halfWidth,
      top: node.y - halfHeight,
      bottom: node.y + halfHeight,
    };
  }

  const radius = typeof node.radius === 'number' ? node.radius : DEFAULT_OUTCOME_RADIUS;
  return {
    left: node.x - radius,
    right: node.x + radius,
    top: node.y - radius,
    bottom: node.y + radius,
  };
};

const isNodeWithinBounds = (node, bounds, padding = 0) => {
  if (!node || !bounds) {
    return false;
  }

  const nodeBounds = getNodeBounds(node);
  const paddedBounds = {
    left: bounds.left - padding,
    right: bounds.right + padding,
    top: bounds.top - padding,
    bottom: bounds.bottom + padding,
  };

  return rectsIntersect(nodeBounds, paddedBounds);
};

const randomId = (prefix) => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const resolveOutcomeDescription = (value, outcomeCode) => {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    if (typeof value.description === 'string') {
      return value.description;
    }
    if (typeof value.title === 'string') {
      return value.title;
    }
  }

  const fallback = outcomeCode ? outcomeNameLookup[outcomeCode] : null;
  if (typeof fallback === 'string') {
    return fallback;
  }
  if (fallback && typeof fallback === 'object' && typeof fallback.description === 'string') {
    return fallback.description;
  }

  return null;
};

const dedupeStrings = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  input.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
};

const sanitizeContentEntries = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce((acc, entry) => {
    if (!entry || typeof entry !== 'object') {
      return acc;
    }
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    const content = typeof entry.content === 'string' ? entry.content.trim() : '';
    if (!title || !content) {
      return acc;
    }
    acc.push({ title, content });
    return acc;
  }, []);
};

const mergeContentEntries = (base, incoming) => {
  const existing = sanitizeContentEntries(base);
  const additions = sanitizeContentEntries(incoming);

  if (additions.length === 0) {
    return existing;
  }

  const seen = new Set(existing.map((item) => `${item.title}::${item.content}`));
  const merged = [...existing];

  additions.forEach((item) => {
    const key = `${item.title}::${item.content}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(item);
  });

  return merged;
};

const buildConnectionKey = (fromId, toId) => `conn-${fromId}-->${toId}`;

const deriveConnectionsFromNodes = (nodesList, previousConnections = []) => {
  const nodeMap = new Map(nodesList.map((node) => [node.id, node]));
  const previousMap = new Map(
    (Array.isArray(previousConnections) ? previousConnections : []).map((conn) => [
      buildConnectionKey(conn.from, conn.to),
      conn,
    ])
  );

  const connections = [];

  nodesList.forEach((node) => {
    const prerequisites = Array.isArray(node?.prerequisites) ? node.prerequisites : [];
    prerequisites.forEach((prereqId) => {
      if (!nodeMap.has(prereqId)) {
        return;
      }
      const key = buildConnectionKey(prereqId, node.id);
      const existing = previousMap.get(key);
      connections.push({
        id: existing?.id ?? key,
        from: prereqId,
        to: node.id,
        hovered: existing?.hovered ?? false,
        selected: existing?.selected ?? false,
      });
    });
  });

  return connections;
};

const attachDependentsToNodes = (nodesList) => {
  const dependentsMap = new Map();

  nodesList.forEach((node) => {
    if (!node?.id) {
      return;
    }
    const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
    prereqs.forEach((prereqId) => {
      if (!prereqId) {
        return;
      }
      if (!dependentsMap.has(prereqId)) {
        dependentsMap.set(prereqId, new Set());
      }
      dependentsMap.get(prereqId).add(node.id);
    });
  });

  return nodesList.map((node) => {
    if (!node?.id) {
      return node;
    }
    const dependents = dependentsMap.has(node.id)
      ? Array.from(dependentsMap.get(node.id))
      : [];
    return {
      ...node,
      prerequisites: dedupeStrings(node?.prerequisites ?? []),
      dependents,
    };
  });
};

const normalizeNode = (rawNode) => {
  if (!rawNode) {
    return null;
  }

  const inferredVariant = rawNode.variant ?? (rawNode.skill || rawNode.name ? 'skill' : 'outcome');

  if (inferredVariant === 'skill') {
    const outcomeCode = rawNode.outcomeCode ?? rawNode.outcome_code ?? 'Unknown Outcome';
    const outcomeDescription = resolveOutcomeDescription(
      rawNode.outcomeDescription ?? rawNode.outcomeTitle ?? null,
      outcomeCode
    );
    return {
      id: rawNode.id ?? randomId('skill'),
      x: typeof rawNode.x === 'number' ? rawNode.x : 120,
      y: typeof rawNode.y === 'number' ? rawNode.y : 120,
      width: typeof rawNode.width === 'number' ? rawNode.width : DEFAULT_SKILL_WIDTH,
      height: typeof rawNode.height === 'number' ? rawNode.height : DEFAULT_SKILL_HEIGHT,
      skill: rawNode.skill ?? rawNode.name ?? 'New Skill',
      outcomeCode,
      outcomeDescription,
      hovered: false,
      selected: false,
      draggable: rawNode.draggable ?? true,
      clicks: rawNode.clicks ?? 0,
      variant: 'skill',
      prerequisites: dedupeStrings(rawNode.prerequisites),
      dependents: dedupeStrings(rawNode.dependents),
      metadata: rawNode.metadata ?? null,
      instructionalContent: sanitizeContentEntries(rawNode.instructionalContent ?? rawNode.instructional_content),
      practiceQuestions: sanitizeContentEntries(rawNode.practiceQuestions ?? rawNode.practice_questions),
    };
  }

  return {
    id: rawNode.id ?? randomId('outcome'),
    x: typeof rawNode.x === 'number' ? rawNode.x : 160,
    y: typeof rawNode.y === 'number' ? rawNode.y : 160,
    radius: typeof rawNode.radius === 'number' ? rawNode.radius : DEFAULT_OUTCOME_RADIUS,
    color: rawNode.color ?? '#2563eb',
    text: rawNode.text ?? 'Outcome',
    hovered: false,
    selected: false,
    draggable: rawNode.draggable ?? true,
    clicks: rawNode.clicks ?? 0,
    type: rawNode.type ?? 'circle',
    variant: 'outcome',
    prerequisites: dedupeStrings(rawNode.prerequisites),
    dependents: dedupeStrings(rawNode.dependents),
  };
};

const normalizeConnections = (rawConnections, validNodeIds) => {
  if (!Array.isArray(rawConnections)) {
    return [];
  }
  const nodeSet = new Set(validNodeIds);
  const unique = new Map();

  rawConnections.forEach((conn) => {
    if (!conn || !nodeSet.has(conn.from) || !nodeSet.has(conn.to)) {
      return;
    }
    const key = buildConnectionKey(conn.from, conn.to);
    if (!unique.has(key)) {
      unique.set(key, {
        id: conn.id ?? key,
        from: conn.from,
        to: conn.to,
        hovered: conn.hovered ?? false,
        selected: conn.selected ?? false,
      });
    }
  });

  return Array.from(unique.values());
};

const sanitizeNodeForSave = (node) => {
  if (!node) {
    return null;
  }
  const { hovered, selected, clicks, isConnectionSource, ...rest } = node;
  return {
    ...rest,
    prerequisites: dedupeStrings(rest.prerequisites),
    dependents: dedupeStrings(rest.dependents),
    instructionalContent: sanitizeContentEntries(rest.instructionalContent),
    practiceQuestions: sanitizeContentEntries(rest.practiceQuestions),
  };
};

/**
 * Enhanced Konva Wrapper with zoom, pan, and custom interactive components
 * Demonstrates modern canvas functionality with react-konva
 */
const Canvas = forwardRef(({ onSkillSelect }, ref) => {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [selectedOutcomeCode, setSelectedOutcomeCode] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1024, height: 768 });
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [activeDragNodeId, setActiveDragNodeId] = useState(null);
  const stageRef = useRef(null);
  const backgroundLayerRef = useRef(null);
  const connectionLayerRef = useRef(null);
  const nodeLayerRef = useRef(null);
  const dragLayerRef = useRef(null);
  const isDraggingNodeRef = useRef(false);
  const lastSkillIdRef = useRef(null);
  const outcomeDragStateRef = useRef(null);
  const pendingPlacementRef = useRef(null);

  const clearSelection = useCallback((options = {}) => {
    const { outcome = true } = options;
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setConnectingFrom(null);
    if (outcome) {
      setSelectedOutcomeCode(null);
    }

    setNodes((prev) => {
      let changed = false;
      const updated = prev.map((node) => {
        if (node.selected) {
          changed = true;
          return { ...node, selected: false };
        }
        return node;
      });
      return changed ? updated : prev;
    });

    setConnections((prev) => {
      let changed = false;
      const updated = prev.map((conn) => {
        if (conn.selected) {
          changed = true;
          return { ...conn, selected: false };
        }
        return conn;
      });
      return changed ? updated : prev;
    });
  }, []);

  const addSkillNode = useCallback((skillDetails) => {
    if (!skillDetails) {
      return;
    }

    const id = typeof skillDetails.id === 'string' ? skillDetails.id : `skill-${Date.now()}`;
    const normalizedOutcomeCode = skillDetails.outcomeCode ?? skillDetails.outcome_code ?? 'Unknown Outcome';
    const providedDescription =
      skillDetails.outcomeDescription
      ?? skillDetails.outcome_description
      ?? skillDetails.outcomeTitle
      ?? null;
    const normalizedPrerequisites = dedupeStrings(skillDetails.prerequisites);
    const normalizedDependents = dedupeStrings(skillDetails.dependents);
    const normalizedInstructionalContent = sanitizeContentEntries(
      skillDetails.instructionalContent ?? skillDetails.instructional_content
    );
    const normalizedPracticeQuestions = sanitizeContentEntries(
      skillDetails.practiceQuestions ?? skillDetails.practice_questions
    );
    const resolvedDescription = resolveOutcomeDescription(
      skillDetails.outcomeDescription ?? skillDetails.outcomeTitle ?? null,
      normalizedOutcomeCode
    );

    setNodes((prev) => {
      const existingIndex = prev.findIndex((node) => node.id === id);
      let workingNodes;

      if (existingIndex !== -1) {
        workingNodes = prev.map((node, index) => {
          if (index !== existingIndex) {
            return node;
          }

          const nextOutcomeDescription = resolveOutcomeDescription(
            providedDescription ?? node.outcomeDescription ?? null,
            normalizedOutcomeCode
          );

          return {
            ...node,
            x: typeof skillDetails.x === 'number' ? skillDetails.x : node.x,
            y: typeof skillDetails.y === 'number' ? skillDetails.y : node.y,
            width: typeof skillDetails.width === 'number' ? skillDetails.width : node.width,
            height: typeof skillDetails.height === 'number' ? skillDetails.height : node.height,
            skill: skillDetails.skill ?? node.skill ?? 'New Skill',
            outcomeCode: normalizedOutcomeCode,
            outcomeDescription: nextOutcomeDescription,
            draggable: skillDetails.draggable ?? node.draggable ?? true,
            metadata: skillDetails.metadata ?? node.metadata ?? null,
            prerequisites: dedupeStrings([...(node.prerequisites ?? []), ...normalizedPrerequisites]),
            dependents: dedupeStrings([...(node.dependents ?? []), ...normalizedDependents]),
            instructionalContent: mergeContentEntries(node.instructionalContent, normalizedInstructionalContent),
            practiceQuestions: mergeContentEntries(node.practiceQuestions, normalizedPracticeQuestions),
          };
        });
        lastSkillIdRef.current = id;
      } else {
        const newWidth = typeof skillDetails.width === 'number' ? skillDetails.width : DEFAULT_SKILL_WIDTH;
        const newHeight = typeof skillDetails.height === 'number' ? skillDetails.height : DEFAULT_SKILL_HEIGHT;

        let nextX = typeof skillDetails.x === 'number' ? skillDetails.x : 120;
        let nextY = typeof skillDetails.y === 'number' ? skillDetails.y : 120;

        if (typeof skillDetails.x !== 'number') {
          const stage = stageRef.current;
          const previousId = lastSkillIdRef.current;

          const resolvedPreviousNode = prev.find((candidate) => candidate?.id === previousId && candidate.variant === 'skill');

          const konvaNode = stage
            ? stage.findOne((node) => typeof node?.getAttr === 'function' && node.getAttr('nodeId') === previousId)
            : null;

          const spacing = 80;

          if (konvaNode) {
            const rect = konvaNode.getClientRect({ skipTransform: false });
            if (rect && Number.isFinite(rect.x) && Number.isFinite(rect.width)) {
              const rightEdge = rect.x + rect.width;
              const computedX = rightEdge + spacing + newWidth / 2;
              if (Number.isFinite(computedX)) {
                nextX = computedX;
              }

              if (typeof skillDetails.y !== 'number' && Number.isFinite(rect.y) && Number.isFinite(rect.height)) {
                nextY = rect.y + rect.height / 2;
              }
            }
          } else if (resolvedPreviousNode) {
            const prevWidth = typeof resolvedPreviousNode.width === 'number' ? resolvedPreviousNode.width : DEFAULT_SKILL_WIDTH;
            const computedX = resolvedPreviousNode.x + prevWidth / 2 + spacing + newWidth / 2;
            if (Number.isFinite(computedX)) {
              nextX = computedX;
            }
            if (typeof skillDetails.y !== 'number' && typeof resolvedPreviousNode.y === 'number') {
              nextY = resolvedPreviousNode.y;
            }
          }
        }

        const newNode = {
          id,
          x: nextX,
          y: nextY,
          width: newWidth,
          height: newHeight,
          skill: skillDetails.skill ?? 'New Skill',
          outcomeCode: normalizedOutcomeCode,
          outcomeDescription: resolvedDescription,
          hovered: false,
          selected: false,
          draggable: skillDetails.draggable ?? true,
          clicks: 0,
          variant: 'skill',
          metadata: skillDetails.metadata ?? null,
          prerequisites: normalizedPrerequisites,
          dependents: normalizedDependents,
          instructionalContent: normalizedInstructionalContent,
          practiceQuestions: normalizedPracticeQuestions,
        };

        lastSkillIdRef.current = id;
        workingNodes = [...prev, newNode];
      }

      const nodesWithDependents = attachDependentsToNodes(workingNodes);
      setConnections((prevConnections) => deriveConnectionsFromNodes(nodesWithDependents, prevConnections));
      return nodesWithDependents;
    });
  }, []);

  const updateSkillNode = useCallback((nodeId, updates) => {
    if (!nodeId || !updates) {
      return false;
    }

    let didUpdate = false;
    setNodes((prevNodes) => {
      let changed = false;

      const nextNodes = prevNodes.map((node) => {
        if (node.id !== nodeId || node.variant !== 'skill') {
          return node;
        }

        const changeSet = typeof updates === 'function' ? updates(node) : updates;
        if (!changeSet || typeof changeSet !== 'object') {
          return node;
        }

        const nextNode = {
          ...node,
          ...changeSet,
        };

        if ('prerequisites' in changeSet) {
          nextNode.prerequisites = dedupeStrings(changeSet.prerequisites);
        } else {
          nextNode.prerequisites = dedupeStrings(nextNode.prerequisites);
        }

        if ('dependents' in changeSet) {
          nextNode.dependents = dedupeStrings(changeSet.dependents);
        } else {
          nextNode.dependents = dedupeStrings(nextNode.dependents);
        }

        if ('instructionalContent' in changeSet) {
          nextNode.instructionalContent = sanitizeContentEntries(changeSet.instructionalContent);
        } else {
          nextNode.instructionalContent = sanitizeContentEntries(nextNode.instructionalContent);
        }

        if ('practiceQuestions' in changeSet) {
          nextNode.practiceQuestions = sanitizeContentEntries(changeSet.practiceQuestions);
        } else {
          nextNode.practiceQuestions = sanitizeContentEntries(nextNode.practiceQuestions);
        }

        changed = true;
        return nextNode;
      });

      if (!changed) {
        return prevNodes;
      }

      didUpdate = true;
      const nodesWithDependents = attachDependentsToNodes(nextNodes);
      setConnections((prevConnections) => deriveConnectionsFromNodes(nodesWithDependents, prevConnections));
      return nodesWithDependents;
    });

    return didUpdate;
  }, []);

  const cancelPendingSkillPlacement = useCallback((reason) => {
    const pending = pendingPlacementRef.current;
    if (!pending) {
      return;
    }

    pendingPlacementRef.current = null;
    setPendingPlacement(null);

    if (typeof pending.reject === 'function') {
      const error = reason instanceof Error ? reason : new Error(reason ?? 'Skill placement cancelled.');
      pending.reject(error);
    }
  }, []);

  const completePendingSkillPlacement = useCallback((position) => {
    const pending = pendingPlacementRef.current;
    if (!pending) {
      return false;
    }

    pendingPlacementRef.current = null;
    setPendingPlacement(null);

    const placementDetails = {
      ...pending.skillDetails,
      x: position.x,
      y: position.y,
    };

    addSkillNode(placementDetails);

    if (typeof pending.resolve === 'function') {
      pending.resolve({
        id: placementDetails.id,
        position: { ...position },
      });
    }

    return true;
  }, [addSkillNode]);

  const beginSkillPlacement = useCallback((skillDetails) => {
    if (!skillDetails) {
      return Promise.reject(new Error('Skill details are required to begin placement.'));
    }

    if (pendingPlacementRef.current) {
      cancelPendingSkillPlacement(new Error('A skill placement is already pending.'));
    }

    return new Promise((resolve, reject) => {
      pendingPlacementRef.current = {
        skillDetails,
        resolve,
        reject,
      };

      setPendingPlacement({
        id: skillDetails.id ?? null,
        label: skillDetails.skill ?? 'New Skill',
      });

      clearSelection();
    });
  }, [cancelPendingSkillPlacement, clearSelection]);

  const linkNodes = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) {
      return;
    }

    setNodes((prevNodes) => {
      const fromExists = prevNodes.some((node) => node.id === fromId);
      const toIndex = prevNodes.findIndex((node) => node.id === toId);
      if (!fromExists || toIndex === -1) {
        return prevNodes;
      }

      let changed = false;
      const updatedNodes = prevNodes.map((node, index) => {
        if (index !== toIndex) {
          return node;
        }
        const currentPrereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
        if (currentPrereqs.includes(fromId)) {
          return node;
        }
        changed = true;
        return {
          ...node,
          prerequisites: [...currentPrereqs, fromId],
        };
      });

      if (!changed) {
        return prevNodes;
      }

      const nodesWithDependents = attachDependentsToNodes(updatedNodes);
      setConnections((prevConnections) => deriveConnectionsFromNodes(nodesWithDependents, prevConnections));
      return nodesWithDependents;
    });
  }, []);

  const unlinkNodes = useCallback((fromId, toId) => {
    if (!fromId || !toId) {
      return;
    }

    setNodes((prevNodes) => {
      let changed = false;
      const updatedNodes = prevNodes.map((node) => {
        if (node.id !== toId) {
          return node;
        }
        const currentPrereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
        if (!currentPrereqs.includes(fromId)) {
          return node;
        }
        changed = true;
        return {
          ...node,
          prerequisites: currentPrereqs.filter((value) => value !== fromId),
        };
      });

      if (!changed) {
        return prevNodes;
      }

      const nodesWithDependents = attachDependentsToNodes(updatedNodes);
      setConnections((prevConnections) => deriveConnectionsFromNodes(nodesWithDependents, prevConnections));
      return nodesWithDependents;
    });
  }, []);

  const removeNode = useCallback((nodeId) => {
    if (!nodeId) {
      return;
    }

    setNodes((prevNodes) => {
      if (!prevNodes.some((node) => node.id === nodeId)) {
        return prevNodes;
      }

      const filteredNodes = prevNodes
        .filter((node) => node.id !== nodeId)
        .map((node) => {
          const nextPrereqs = Array.isArray(node.prerequisites)
            ? node.prerequisites.filter((value) => value !== nodeId)
            : [];
          if (!node.prerequisites || nextPrereqs.length === node.prerequisites.length) {
            return node;
          }
          return {
            ...node,
            prerequisites: nextPrereqs,
          };
        });

      if (lastSkillIdRef.current === nodeId) {
        const nextLastSkill = (() => {
          for (let i = filteredNodes.length - 1; i >= 0; i -= 1) {
            const candidate = filteredNodes[i];
            if (candidate?.variant === 'skill') {
              return candidate.id;
            }
          }
          return null;
        })();
        lastSkillIdRef.current = nextLastSkill;
      }

      const nodesWithDependents = attachDependentsToNodes(filteredNodes);
      setConnections((prevConnections) => deriveConnectionsFromNodes(nodesWithDependents, prevConnections));
      return nodesWithDependents;
    });
  }, []);

  const addOutcomeNode = useCallback((outcomeDetails) => {
    if (!outcomeDetails) {
      return;
    }

    setNodes((prev) => {
      const id = outcomeDetails.id ?? `outcome-${Date.now()}`;
      const baseOutcome = {
        id,
        x: typeof outcomeDetails.x === 'number' ? outcomeDetails.x : 160,
        y: typeof outcomeDetails.y === 'number' ? outcomeDetails.y : 160,
        radius: outcomeDetails.radius ?? 60,
        color: outcomeDetails.color ?? '#2563eb',
        text: outcomeDetails.text ?? 'Outcome',
        hovered: false,
        selected: false,
        draggable: outcomeDetails.draggable ?? true,
        clicks: 0,
        type: outcomeDetails.type ?? 'circle',
        variant: 'outcome',
      };

      const existingIndex = prev.findIndex((node) => node.id === id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...baseOutcome };
        return updated;
      }

      return [...prev, baseOutcome];
    });
  }, []);

  const saveCanvasState = useCallback(async () => {
    try {
      const sanitizedNodes = attachDependentsToNodes(
        nodes
          .map(sanitizeNodeForSave)
          .filter(Boolean)
      );
      const serializedConnections = deriveConnectionsFromNodes(sanitizedNodes, connections);

      const response = await fetch('/api/canvas-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 1,
          nodes: sanitizedNodes,
          connections: serializedConnections,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save request failed with status ${response.status}`);
      }

      return { ok: true };
    } catch (error) {
      console.error('Failed to save canvas state', error);
      return { ok: false, error };
    }
  }, [nodes, connections]);

  useImperativeHandle(ref, () => ({
    addSkillNode,
    addOutcomeNode,
    saveCanvasState,
    beginSkillPlacement,
    updateSkillNode,
    clearSelection,
  }), [addSkillNode, addOutcomeNode, saveCanvasState, beginSkillPlacement, updateSkillNode, clearSelection]);

  // Set dimensions on mount and handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 100
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSavedState = async () => {
      try {
        const response = await fetch('/api/canvas-state', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load canvas state (${response.status})`);
        }

        const data = await response.json();
        if (!isMounted) {
          return;
        }

        const normalizedNodes = attachDependentsToNodes(
          (Array.isArray(data?.nodes) ? data.nodes : [])
            .map(normalizeNode)
            .filter(Boolean)
        );
        const nodeIds = normalizedNodes.map((node) => node.id);
        const normalizedConnections = normalizeConnections(data?.connections, nodeIds);
        const derivedConnections = deriveConnectionsFromNodes(normalizedNodes, normalizedConnections);

        setNodes(normalizedNodes);
        const lastSkillFromState = (() => {
          for (let i = normalizedNodes.length - 1; i >= 0; i -= 1) {
            const candidate = normalizedNodes[i];
            if (candidate?.variant === 'skill') {
              return candidate.id;
            }
          }
          return null;
        })();
        lastSkillIdRef.current = lastSkillFromState;
        setConnections(derivedConnections);
      } catch (error) {
        console.error('Failed to load saved canvas state', error);
      }
    };

    loadSavedState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleWindowPointerUp = () => {
      if (!isDraggingNodeRef.current) {
        return;
      }

      isDraggingNodeRef.current = false;
      setIsDraggingNode(false);
    };

    window.addEventListener('mouseup', handleWindowPointerUp);
    window.addEventListener('touchend', handleWindowPointerUp);
    window.addEventListener('touchcancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('mouseup', handleWindowPointerUp);
      window.removeEventListener('touchend', handleWindowPointerUp);
      window.removeEventListener('touchcancel', handleWindowPointerUp);
    };
  }, []);

  useEffect(() => () => {
    cancelPendingSkillPlacement(new Error('Canvas unmounted before placement completed.'));
  }, [cancelPendingSkillPlacement]);



  // Zoom configuration
  const SCALE_BY = 1.05;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5;


  
  const handleNodeClick = (nodeId) => {
    if (pendingPlacementRef.current) {
      const position = resolveStagePointerPosition();
      if (position) {
        const placed = completePendingSkillPlacement(position);
        if (placed) {
          return;
        }
      }
    }

    console.log(`Clicked node: ${nodeId}`);

    // If we're in connection mode
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        linkNodes(connectingFrom, nodeId);
      }
      setConnectingFrom(null);
    }

    setSelectedConnectionId(null);
    setSelectedOutcomeCode(null);
    setConnections((prev) => {
      let changed = false;
      const updated = prev.map((conn) => {
        if (conn.selected) {
          changed = true;
          return { ...conn, selected: false };
        }
        return conn;
      });
      return changed ? updated : prev;
    });

    setSelectedNodeId(nodeId);

    // Update click count
    setNodes((prev) => prev.map(node =>
      node.id === nodeId
        ? { ...node, clicks: (node.clicks || 0) + 1, selected: true }
        : { ...node, selected: false }
    ));
  };

  const handleNodeHover = (nodeId, isHovered) => {
    setNodes((prev) => prev.map(node =>
      node.id === nodeId
        ? { ...node, hovered: isHovered }
        : node
    ));
  };

  const handleNodeDragStart = (nodeId, evt) => {
    isDraggingNodeRef.current = true;
    setIsDraggingNode(true);
    setActiveDragNodeId(nodeId);

    if (evt && typeof evt.cancelBubble !== 'undefined') {
      evt.cancelBubble = true;
    }

    if (evt?.target && dragLayerRef.current) {
      evt.target.moveTo(dragLayerRef.current);
      dragLayerRef.current.batchDraw();
    }

    if (nodeLayerRef.current) {
      nodeLayerRef.current.batchDraw();
    }
  };

  const handleNodeDragEnd = (nodeId, newX, newY, evt) => {
    isDraggingNodeRef.current = false;
    setIsDraggingNode(false);
    setActiveDragNodeId(null);

    if (evt?.target && nodeLayerRef.current) {
      evt.target.moveTo(nodeLayerRef.current);
      nodeLayerRef.current.batchDraw();
    }

    if (dragLayerRef.current) {
      dragLayerRef.current.batchDraw();
    }

    setNodes((prev) => prev.map(node =>
      node.id === nodeId
        ? { ...node, x: newX, y: newY }
        : node
    ));
  };

  const handleConnectionHandleClick = (nodeId) => {
    if (pendingPlacementRef.current) {
      const position = resolveStagePointerPosition();
      if (position) {
        const placed = completePendingSkillPlacement(position);
        if (placed) {
          return;
        }
      }
    }

    setConnectingFrom(nodeId);
    setSelectedNodeId(nodeId);
    setSelectedOutcomeCode(null);
    setNodes((prev) => prev.map(node =>
      node.id === nodeId
        ? { ...node, selected: true }
        : { ...node, selected: false }
    ));
  };

  const handleArrowClick = (connectionId) => {
    setSelectedConnectionId(connectionId);
    setSelectedNodeId(null);
    setSelectedOutcomeCode(null);
    setNodes((prev) => prev.map(node => ({ ...node, selected: false })));
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === connectionId
          ? { ...conn, selected: true }
          : { ...conn, selected: false }
      )
    );
  };

  const handleArrowHover = (connectionId, isHovered) => {
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === connectionId
          ? { ...conn, hovered: isHovered }
          : conn
      )
    );
  };
  const handleOutcomeGroupClick = useCallback((group, evt) => {
    if (!group) {
      return;
    }
    if (evt && typeof evt.cancelBubble !== 'undefined') {
      evt.cancelBubble = true;
    }

    clearSelection({ outcome: false });
    setSelectedOutcomeCode(group.code);
  }, [clearSelection]);

  const handleOutcomeDragStart = useCallback((group, evt) => {
    if (!group) {
      return;
    }
    if (evt && typeof evt.cancelBubble !== 'undefined') {
      evt.cancelBubble = true;
    }

    clearSelection({ outcome: false });
    setSelectedOutcomeCode(group.code);

    const skillIds = Array.isArray(group.skillIds) ? group.skillIds : [];
    if (skillIds.length === 0) {
      return;
    }

    isDraggingNodeRef.current = true;
    setIsDraggingNode(true);

    const idsSet = new Set(skillIds);
    const snapshot = new Map();
    nodes.forEach((node) => {
      if (node.variant === 'skill' && idsSet.has(node.id)) {
        snapshot.set(node.id, { x: node.x, y: node.y });
      }
    });

    outcomeDragStateRef.current = {
      code: group.code,
      startX: evt?.target?.x?.() ?? group.x,
      startY: evt?.target?.y?.() ?? group.y,
      nodesSnapshot: snapshot,
    };

    const stage = evt?.target?.getStage?.();
    if (stage) {
      stage.container().style.cursor = 'grabbing';
    }
  }, [nodes, clearSelection]);

  const handleOutcomeDragMove = useCallback((evt) => {
    const dragState = outcomeDragStateRef.current;
    if (!dragState) {
      return;
    }
    if (evt && typeof evt.cancelBubble !== 'undefined') {
      evt.cancelBubble = true;
    }

    const target = evt?.target;
    const currentX = target?.x?.();
    const currentY = target?.y?.();

    if (typeof currentX !== 'number' || typeof currentY !== 'number') {
      return;
    }

    const deltaX = currentX - dragState.startX;
    const deltaY = currentY - dragState.startY;

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.variant !== 'skill' || node.outcomeCode !== dragState.code) {
          return node;
        }
        const original = dragState.nodesSnapshot.get(node.id);
        if (!original) {
          return node;
        }
        const nextX = original.x + deltaX;
        const nextY = original.y + deltaY;
        if (node.x === nextX && node.y === nextY) {
          return node;
        }
        return { ...node, x: nextX, y: nextY };
      })
    );
  }, []);

  const handleOutcomeDragEnd = useCallback((evt) => {
    if (evt && typeof evt.cancelBubble !== 'undefined') {
      evt.cancelBubble = true;
    }

    outcomeDragStateRef.current = null;
    isDraggingNodeRef.current = false;
    setIsDraggingNode(false);

    const stage = evt?.target?.getStage?.();
    if (stage) {
      stage.container().style.cursor = connectingFrom ? 'crosshair' : 'grab';
    }
  }, [connectingFrom]);

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

  const handleStageDragStart = (e) => {
    const stage = stageRef.current;
    if (!stage || e.target !== stage) {
      return;
    }

    if (isDraggingNodeRef.current) {
      if (typeof e.cancelBubble !== 'undefined') {
        e.cancelBubble = true;
      }
      stage.stopDrag();
      stage.position(stagePosition);
    }
  };

  const handleStageDragEnd = (e) => {
    const stage = stageRef.current;
    if (!stage || e.target !== stage) {
      return;
    }

    // Only update stored stage position when the stage itself was dragged.
    setStagePosition({
      x: stage.x(),
      y: stage.y(),
    });
  };

  const resolveStagePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      return null;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return null;
    }

    const scaleX = stage.scaleX() || 1;
    const scaleY = stage.scaleY() || 1;
    const stageX = stage.x() || 0;
    const stageY = stage.y() || 0;

    return {
      x: (pointer.x - stageX) / scaleX,
      y: (pointer.y - stageY) / scaleY,
    };
  }, []);

  const handleStageClick = useCallback((e) => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    if (pendingPlacementRef.current && e.target === stage) {
      const position = resolveStagePointerPosition();
      if (position) {
        const placed = completePendingSkillPlacement(position);
        if (placed) {
          return;
        }
      }
    }

    if (e.target === stage) {
      clearSelection();
    }
  }, [clearSelection, completePendingSkillPlacement, resolveStagePointerPosition]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedOutcomeCode) {
      clearSelection();
      return;
    }

    if (selectedNodeId) {
      removeNode(selectedNodeId);
      clearSelection();
      return;
    }

    if (selectedConnectionId) {
      const target = connections.find((conn) => conn.id === selectedConnectionId);
      if (target) {
        unlinkNodes(target.from, target.to);
      }
      clearSelection();
    }
  }, [selectedOutcomeCode, selectedNodeId, selectedConnectionId, connections, removeNode, unlinkNodes, clearSelection]);

  const handleStagePointerDown = (e) => {
    const stage = stageRef.current;
    if (pendingPlacement) {
      return;
    }

    if (!stage || e.target === stage || !e.target.draggable()) {
      return;
    }

    isDraggingNodeRef.current = true;
    setIsDraggingNode(true);
  };
  const getNodeGeometry = (node) => {
    if (!node) {
      return { type: 'circle', radius: 50 };
    }

    if (node.variant === 'skill') {
      return {
        type: 'rect',
        width: node.width || 260,
        height: node.height || 180
      };
    }

    return {
      type: 'circle',
      radius: node.radius || 50
    };
  };

  // Resolve the point where a connector should leave or enter a node shape.
  const getEdgePointForNode = (node, angle, isStartPoint) => {
    const geometry = getNodeGeometry(node);
    const direction = isStartPoint ? 1 : -1;
    const dx = Math.cos(angle) * direction;
    const dy = Math.sin(angle) * direction;

    if (geometry.type === 'circle') {
      const padding = 6;
      const radius = Math.max(geometry.radius - padding, 0);
      return {
        x: node.x + dx * radius,
        y: node.y + dy * radius
      };
    }

    const halfWidth = geometry.width / 2;
    const halfHeight = geometry.height / 2;
    const epsilon = 0.0001;

    const xFactor = Math.abs(dx) > epsilon ? halfWidth / Math.abs(dx) : Infinity;
    const yFactor = Math.abs(dy) > epsilon ? halfHeight / Math.abs(dy) : Infinity;
    let scale = Math.min(xFactor, yFactor);

    if (!Number.isFinite(scale)) {
      scale = Math.max(halfWidth, halfHeight);
    }

    const padding = 8;
    const adjustedScale = Math.max(scale - padding, 0);

    return {
      x: node.x + dx * adjustedScale,
      y: node.y + dy * adjustedScale
    };
  };

  // Determine the start and end coordinates for drawing an arrow between nodes.
  const computeConnectionPoints = (fromNode, toNode) => {
    if (!fromNode || !toNode) {
      return null;
    }

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const angle = Math.atan2(dy, dx);

    const start = getEdgePointForNode(fromNode, angle, true);
    const end = getEdgePointForNode(toNode, angle, false);

    return {
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y
    };
  };

  const viewBounds = useMemo(() => {
    if (!dimensions?.width || !dimensions?.height) {
      return null;
    }
    const scale = stageScale || 1;
    const left = (-stagePosition.x) / scale;
    const top = (-stagePosition.y) / scale;
    const width = dimensions.width / scale;
    const height = dimensions.height / scale;
    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
    };
  }, [dimensions, stagePosition, stageScale]);

  const nodeLookup = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  );

  useEffect(() => {
    if (typeof onSkillSelect !== 'function') {
      return;
    }

    if (!selectedNodeId) {
      onSkillSelect(null);
      return;
    }

    const node = nodeLookup.get(selectedNodeId);
    if (!node || node.variant !== 'skill') {
      onSkillSelect(null);
      return;
    }

    onSkillSelect(sanitizeNodeForSave(node));
  }, [selectedNodeId, nodeLookup, onSkillSelect]);

  // Get node position by id for drawing connections
  const getNodeById = useCallback((id) => nodeLookup.get(id) ?? null, [nodeLookup]);

  const visibleNodes = useMemo(() => {
    if (!viewBounds) {
      return nodes;
    }

    const extras = new Set();
    if (selectedNodeId) {
      extras.add(selectedNodeId);
    }
    if (connectingFrom) {
      extras.add(connectingFrom);
    }
    if (activeDragNodeId) {
      extras.add(activeDragNodeId);
    }
    if (selectedConnectionId) {
      const target = connections.find((conn) => conn.id === selectedConnectionId);
      if (target) {
        extras.add(target.from);
        extras.add(target.to);
      }
    }

    const filtered = nodes.filter((node) => isNodeWithinBounds(node, viewBounds, VIEW_PADDING));
    const present = new Set(filtered.map((node) => node.id));

    extras.forEach((id) => {
      if (!present.has(id)) {
        const match = nodeLookup.get(id);
        if (match) {
          filtered.push(match);
          present.add(id);
        }
      }
    });

    return filtered;
  }, [nodes, viewBounds, selectedNodeId, connectingFrom, selectedConnectionId, connections, activeDragNodeId, nodeLookup]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  );

  const visibleSkillNodes = useMemo(
    () => visibleNodes.filter((node) => node.variant === 'skill'),
    [visibleNodes]
  );

  const visibleOutcomeGroups = useMemo(() => {
    if (visibleSkillNodes.length === 0) {
      return [];
    }

    const groups = new Map();

    visibleSkillNodes.forEach((node) => {
      const width = node.width || DEFAULT_SKILL_WIDTH;
      const height = node.height || DEFAULT_SKILL_HEIGHT;
      const left = node.x - width / 2;
      const right = node.x + width / 2;
      const top = node.y - height / 2;
      const bottom = node.y + height / 2;
      const code = node.outcomeCode || 'Unknown Outcome';

      if (!groups.has(code)) {
        groups.set(code, {
          code,
          left,
          right,
          top,
          bottom,
          description: node.outcomeDescription || null,
          skillIds: [node.id],
        });
      } else {
        const entry = groups.get(code);
        entry.left = Math.min(entry.left, left);
        entry.right = Math.max(entry.right, right);
        entry.top = Math.min(entry.top, top);
        entry.bottom = Math.max(entry.bottom, bottom);
        if (!entry.skillIds.includes(node.id)) {
          entry.skillIds.push(node.id);
        }
        if (node.outcomeDescription) {
          entry.description = node.outcomeDescription;
        }
      }
    });

    const paddingX = 80;
    const paddingY = 110;
    const headerHeight = 56;

    return Array.from(groups.values()).map((entry) => {
      const width = entry.right - entry.left + paddingX * 2;
      const height = entry.bottom - entry.top + paddingY * 2;
      const x = entry.left - paddingX;
      const y = entry.top - paddingY;
      const entryDescription = entry.description ?? outcomeNameLookup[entry.code] ?? '';

      return {
        code: entry.code,
        description: entryDescription,
        x,
        y,
        width,
        height,
        headerHeight,
        skillIds: entry.skillIds.slice(),
      };
    });
  }, [visibleSkillNodes]);

  const visibleConnections = useMemo(() => {
    const base = visibleNodeIds.size === nodes.length
      ? connections
      : connections.filter((conn) => visibleNodeIds.has(conn.from) || visibleNodeIds.has(conn.to));

    if (!selectedConnectionId) {
      return base;
    }

    if (base.some((conn) => conn.id === selectedConnectionId)) {
      return base;
    }

    const selectedConnection = connections.find((conn) => conn.id === selectedConnectionId);
    if (!selectedConnection) {
      return base;
    }

    return [...base, selectedConnection];
  }, [connections, visibleNodeIds, nodes, selectedConnectionId]);

  useEffect(() => {
    if (connectionLayerRef.current) {
      connectionLayerRef.current.batchDraw();
    }
  }, [visibleConnections, stageScale, stagePosition]);

  useEffect(() => {
    if (nodeLayerRef.current) {
      nodeLayerRef.current.batchDraw();
    }
  }, [visibleNodes]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
     
      {pendingPlacement && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 18px',
            borderRadius: '12px',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            color: '#1f2933',
            fontWeight: 600,
            boxShadow: '0 12px 30px rgba(37, 99, 235, 0.18)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          Click on the canvas to place {pendingPlacement.label || 'the new skill'}.
        </div>
      )}
    
      {/* Canvas */}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
  pixelRatio={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1}
        style={{
          backgroundColor: '#f8f9fa',
          cursor: pendingPlacement ? 'copy' : connectingFrom ? 'crosshair' : isDraggingNode ? 'grabbing' : 'grab',
        }}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        onWheel={handleWheel}
        draggable={!isDraggingNode && !pendingPlacement}
        onMouseDown={handleStagePointerDown}
        onTouchStart={handleStagePointerDown}
        onDragStart={handleStageDragStart}
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
      >
        <Layer ref={backgroundLayerRef}>
          {visibleOutcomeGroups.map((group) => {
            const isSelected = selectedOutcomeCode === group.code;
            const hasChildren = Array.isArray(group.skillIds) && group.skillIds.length > 0;
            const outlineStroke = isSelected ? '#2563eb' : '#1f2933';
            const outlineDash = isSelected ? [] : [6, 4];
            const outlineFill = isSelected ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255, 255, 255, 0.05)';
            const headerFill = isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(44, 62, 80, 0.1)';

            return (
              <Group
                key={`outcome-${group.code}`}
                x={group.x}
                y={group.y}
                draggable={hasChildren}
                onClick={(evt) => handleOutcomeGroupClick(group, evt)}
                onTap={(evt) => handleOutcomeGroupClick(group, evt)}
                onDragStart={(evt) => handleOutcomeDragStart(group, evt)}
                onDragMove={handleOutcomeDragMove}
                onDragEnd={handleOutcomeDragEnd}
                onMouseEnter={(evt) => {
                  const stage = evt.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = hasChildren ? 'grab' : 'pointer';
                  }
                }}
                onMouseLeave={(evt) => {
                  const stage = evt.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = connectingFrom ? 'crosshair' : isDraggingNode ? 'grabbing' : 'grab';
                  }
                }}
              >
                <Rect
                  width={group.width}
                  height={group.height}
                  cornerRadius={20}
                  stroke={outlineStroke}
                  strokeWidth={isSelected ? 3 : 2}
                  dash={outlineDash}
                  fill={outlineFill}
                  perfectDrawEnabled={false}
                />
                <Rect
                  width={group.width}
                  height={group.headerHeight}
                  cornerRadius={[20, 20, 0, 0]}
                  fill={headerFill}
                  perfectDrawEnabled={false}
                />
                <Text
                  x={20}
                  y={20}
                  width={group.width - 40}
                  text={`${group.code}${group.description ? ` ${group.description}` : ''}`.trim()}
                  fontSize={20}
                  fontStyle="bold"
                  fill="#1f2933"
                  listening={false}
                />
                <Rect
                  width={group.width}
                  height={group.height}
                  cornerRadius={20}
                  fill="rgba(0, 0, 0, 0.01)"
                  listening={hasChildren}
                  perfectDrawEnabled={false}
                />
              </Group>
            );
          })}

        </Layer>

        <Layer ref={connectionLayerRef} listening={false}>
          {/* Draw connections */}
          {visibleConnections.map(conn => {
            const fromNode = getNodeById(conn.from);
            const toNode = getNodeById(conn.to);

            if (!fromNode || !toNode) return null;

            const points = computeConnectionPoints(fromNode, toNode);
            if (!points) {
              return null;
            }

            const isSelected = selectedConnectionId === conn.id;
            const isHovered = conn.hovered;

            return (
              <Arrow
                key={conn.id}
                points={[points.startX, points.startY, points.endX, points.endY]}
                stroke={isSelected ? '#e74c3c' : isHovered ? '#3498db' : '#34495e'}
                strokeWidth={isSelected || isHovered ? 5 : 3}
                fill={isSelected ? '#e74c3c' : isHovered ? '#3498db' : '#34495e'}
                pointerLength={15}
                pointerWidth={15}
                opacity={isSelected || isHovered ? 1 : 0.6}
                dash={[10, 5]}
                perfectDrawEnabled={false}
                onClick={() => handleArrowClick(conn.id)}
                onMouseEnter={() => handleArrowHover(conn.id, true)}
                onMouseLeave={() => handleArrowHover(conn.id, false)}
                listening={true}
              />
            );
          })}

        </Layer>

        <Layer ref={nodeLayerRef}>
          {/* Draw nodes using custom component */}
          {visibleNodes.map(node => {
            if (node.variant === 'skill') {
              return (
                <SkillCardNode
                  key={node.id}
                  id={node.id}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  skill={node.skill}
                  outcomeCode={node.outcomeCode}
                  outcomeDescription={node.outcomeDescription}
                  hovered={node.hovered}
                  selected={node.selected}
                  draggable={node.draggable}
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                  onNodeDragStart={handleNodeDragStart}
                  onNodeDragEnd={handleNodeDragEnd}
                  onStartConnection={handleConnectionHandleClick}
                  isConnectionSource={connectingFrom === node.id}
                />
              );
            }

            return (
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
                onNodeDragStart={handleNodeDragStart}
                onNodeDragEnd={handleNodeDragEnd}
              />
            );
          })}
        </Layer>

        <Layer ref={dragLayerRef} listening={false} />
      </Stage>
  {(selectedNodeId || selectedConnectionId || selectedOutcomeCode) && (
        <button
          type="button"
          onClick={handleDeleteSelected}
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: '#ef4444',
            color: '#fff',
            boxShadow: '0 12px 30px rgba(239, 68, 68, 0.35)',
            cursor: 'pointer'
          }}
          aria-label="Delete selected element"
        >
          <Trash2 size={22} color="#ffffff" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
