import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const file = path.join(process.cwd(), 'app', 'api', 'get-skills', 'skills.json');
    const raw = await fs.promises.readFile(file, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Failed to read skills.json', err);
    return NextResponse.json({ error: 'Failed to read skills' }, { status: 500 });
  }
}
