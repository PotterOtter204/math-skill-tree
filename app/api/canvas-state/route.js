import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

const DATA_FILE_PATH = path.join(process.cwd(), 'app', 'api', 'canvas-state', 'state.json');
const SCHEMA_VERSION = 1;

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

const buildConnectionId = (fromId, toId) => `conn-${fromId}-->${toId}`;

const deriveConnectionsFromNodes = (nodesMap) => {
  const nodeIds = new Set(Object.keys(nodesMap));
  const connections = [];

  Object.values(nodesMap).forEach((node) => {
    const prereqs = Array.isArray(node?.prerequisites) ? node.prerequisites : [];
    prereqs.forEach((prereqId) => {
      if (!nodeIds.has(prereqId)) {
        return;
      }
      connections.push({
        id: buildConnectionId(prereqId, node.id),
        from: prereqId,
        to: node.id,
      });
    });
  });

  return connections;
};

const attachDependentsToNodes = (nodesMap) => {
  const dependentsMap = new Map();

  Object.values(nodesMap).forEach((node) => {
    const prereqs = Array.isArray(node?.prerequisites) ? node.prerequisites : [];
    prereqs.forEach((prereqId) => {
      if (!nodesMap[prereqId]) {
        return;
      }
      if (!dependentsMap.has(prereqId)) {
        dependentsMap.set(prereqId, new Set());
      }
      dependentsMap.get(prereqId).add(node.id);
    });
  });

  const result = {};
  Object.entries(nodesMap).forEach(([id, node]) => {
    const dependents = dependentsMap.has(id)
      ? Array.from(dependentsMap.get(id))
      : [];
    result[id] = {
      ...node,
      prerequisites: dedupeStrings(node?.prerequisites ?? []),
      dependents,
    };
  });

  return result;
};

const normalizeNodeRecord = (rawNode) => {
  if (!rawNode || typeof rawNode !== 'object') {
    return null;
  }

  const id = typeof rawNode.id === 'string' ? rawNode.id : null;
  if (!id) {
    return null;
  }

  const clone = { ...rawNode };
  delete clone.hovered;
  delete clone.selected;
  delete clone.clicks;
  delete clone.isConnectionSource;

  const variant = clone.variant ?? (clone.skill || clone.name ? 'skill' : 'outcome');
  const outcomeCode = clone.outcomeCode ?? clone.outcome_code ?? null;
  const outcomeDescription = clone.outcomeDescription ?? clone.outcome_description ?? null;

  const normalized = {
    ...clone,
    id,
    variant,
    x: typeof clone.x === 'number' ? clone.x : 120,
    y: typeof clone.y === 'number' ? clone.y : 120,
    draggable: clone.draggable !== false,
    prerequisites: dedupeStrings(clone.prerequisites),
  };

  if (variant === 'skill') {
    normalized.skill = clone.skill ?? clone.name ?? id;
    normalized.outcomeCode = outcomeCode;
    if (outcomeDescription) {
      normalized.outcomeDescription = outcomeDescription;
    } else {
      delete normalized.outcomeDescription;
    }
    normalized.width = typeof clone.width === 'number' ? clone.width : undefined;
    normalized.height = typeof clone.height === 'number' ? clone.height : undefined;
  } else {
    normalized.text = clone.text ?? clone.name ?? id;
    normalized.type = clone.type ?? 'circle';
    normalized.radius = typeof clone.radius === 'number' ? clone.radius : undefined;
    if (typeof clone.color === 'string') {
      normalized.color = clone.color;
    }
  }

  delete normalized.outcome_code;
  delete normalized.outcome_description;

  return normalized;
};

const emptyState = () => ({
  version: SCHEMA_VERSION,
  nodes: {},
  savedAt: null,
});

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE_PATH);
  } catch (err) {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    const initialState = emptyState();
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(initialState, null, 2), 'utf8');
  }
}

async function readRawState() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse canvas state JSON. Resetting file.', err);
    const fallback = emptyState();
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function normalizeState(rawState) {
  if (!rawState || typeof rawState !== 'object') {
    return emptyState();
  }

  const nextState = {
    version: SCHEMA_VERSION,
    nodes: {},
    savedAt: rawState.savedAt ?? null,
  };

  const rawNodes = rawState.nodes;

  if (Array.isArray(rawNodes)) {
    rawNodes.forEach((rawNode) => {
      const normalized = normalizeNodeRecord(rawNode);
      if (normalized) {
        nextState.nodes[normalized.id] = normalized;
      }
    });
  } else if (rawNodes && typeof rawNodes === 'object') {
    Object.entries(rawNodes).forEach(([id, rawNode]) => {
      const normalized = normalizeNodeRecord({ id, ...rawNode });
      if (normalized) {
        nextState.nodes[normalized.id] = normalized;
      }
    });
  }

  nextState.nodes = attachDependentsToNodes(nextState.nodes);

  return nextState;
}

async function readState() {
  const rawState = await readRawState();
  return normalizeState(rawState);
}

async function writeState(state) {
  await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export async function GET() {
  try {
    const state = await readState();
    const nodesArray = Object.values(state.nodes ?? {});
    const connections = deriveConnectionsFromNodes(state.nodes ?? {});

    return NextResponse.json({
      version: state.version ?? SCHEMA_VERSION,
      nodes: nodesArray,
      connections,
      savedAt: state.savedAt ?? null,
    });
  } catch (err) {
    console.error('Failed to read canvas state.', err);
    return NextResponse.json({ error: 'Failed to read canvas state.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const nodesArray = Array.isArray(payload?.nodes) ? payload.nodes : [];

    const nodesMap = {};
    nodesArray.forEach((rawNode) => {
      const normalized = normalizeNodeRecord(rawNode);
      if (normalized) {
        nodesMap[normalized.id] = normalized;
      }
    });

    const canonicalNodes = attachDependentsToNodes(nodesMap);
    const nextState = {
      version: SCHEMA_VERSION,
      nodes: canonicalNodes,
      savedAt: new Date().toISOString(),
    };

    await writeState(nextState);

    return NextResponse.json({ ok: true, savedAt: nextState.savedAt });
  } catch (err) {
    console.error('Failed to persist canvas state.', err);
    return NextResponse.json({ error: 'Failed to persist canvas state.' }, { status: 500 });
  }
}
