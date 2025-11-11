import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const skills = await request.json();
    const file = path.join(process.cwd(), 'app', 'api', 'get-skills', 'skills.json');

    // Write with pretty formatting
    await fs.promises.writeFile(file, JSON.stringify(skills, null, 2), 'utf8');

    return NextResponse.json({ success: true, count: skills.length });
  } catch (err) {
    console.error('Failed to save skills.json', err);
    return NextResponse.json({ error: 'Failed to save skills' }, { status: 500 });
  }
}
