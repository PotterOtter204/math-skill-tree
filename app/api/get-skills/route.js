import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SKILLS_FILE_PATH = path.join(process.cwd(), 'app', 'api', 'get-skills', 'skills.json');
const STATE_FILE_PATH = path.join(process.cwd(), 'app', 'api', 'canvas-state', 'state.json');

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

const readSkills = async () => {
  const raw = await fs.readFile(SKILLS_FILE_PATH, 'utf8');
  return JSON.parse(raw);
};

const readStateNodeIds = async () => {
  try {
    const raw = await fs.readFile(STATE_FILE_PATH, 'utf8');
    const data = JSON.parse(raw);

    if (Array.isArray(data?.nodes)) {
      return new Set(
        data.nodes
          .map((node) => (typeof node?.id === 'string' ? node.id : null))
          .filter(Boolean)
      );
    }

    if (data?.nodes && typeof data.nodes === 'object') {
      return new Set(
        Object.keys(data.nodes).filter((key) => typeof key === 'string' && key.trim() !== '')
      );
    }
  } catch (err) {
    console.error('Failed to read canvas state while resolving next skill.', err);
  }

  return new Set();
};

const normalizeSkill = (rawSkill) => {
  if (!rawSkill || typeof rawSkill !== 'object') {
    return null;
  }

  const id = typeof rawSkill.id === 'string' ? rawSkill.id : null;
  if (!id) {
    return null;
  }

  const prerequisites = dedupeStrings(rawSkill.prerequisites);

  return {
    id,
    skill: rawSkill.skill ?? rawSkill.name ?? id,
    outcomeCode: rawSkill.outcomeCode ?? rawSkill.outcome_code ?? null,
    outcomeDescription: rawSkill.outcomeDescription ?? rawSkill.outcome_description ?? null,
    x: typeof rawSkill.x === 'number' ? rawSkill.x : null,
    y: typeof rawSkill.y === 'number' ? rawSkill.y : null,
    width: typeof rawSkill.width === 'number' ? rawSkill.width : null,
    height: typeof rawSkill.height === 'number' ? rawSkill.height : null,
    prerequisites,
    metadata: rawSkill.metadata ?? null,
  };
};

export async function GET(request) {
  try {
    const url = request?.url ? new URL(request.url) : null;
    const mode = url?.searchParams?.get('mode');

    const skills = await readSkills();

    if (mode === 'next') {
      const existingIds = await readStateNodeIds();

      const missingSkills = skills.filter(
        (skill) => skill && typeof skill === 'object' && !existingIds.has(skill.id)
      );

      if (missingSkills.length === 0) {
        return NextResponse.json({ skill: null, done: true, remaining: 0 });
      }

      const [nextSkillRaw] = missingSkills;
      const normalized = normalizeSkill(nextSkillRaw);

      if (!normalized) {
        return NextResponse.json({ skill: null, done: true, remaining: missingSkills.length - 1 });
      }

      const remainingAfter = Math.max(missingSkills.length - 1, 0);
      const nextIndex = skills.findIndex((skill) => skill?.id === normalized.id);

      return NextResponse.json({
        skill: normalized,
        done: false,
        remaining: remainingAfter,
        totalRemaining: missingSkills.length,
        nextIndex,
        totalSkills: skills.length,
      });
    }

    return NextResponse.json(skills);
  } catch (err) {
    console.error('Failed to resolve skills listing', err);
    return NextResponse.json({ error: 'Failed to read skills' }, { status: 500 });
  }
}
