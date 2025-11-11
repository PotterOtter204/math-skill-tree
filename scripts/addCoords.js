const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'api', 'get-skills', 'skills.json');

try {
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);

  // Grid layout: 5 columns, spacing tuned for a simple tree view
  const cols = 5;
  const xSpacing = 200;
  const ySpacing = 140;
  const xStart = 100;
  const yStart = 100;

  data.forEach((item, i) => {
    // If x/y already exist, keep them; otherwise compute
    if (typeof item.x === 'number' && typeof item.y === 'number') return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    item.x = xStart + col * xSpacing;
    item.y = yStart + row * ySpacing;
  });

  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${data.length} skills with x/y coordinates in ${file}`);
} catch (err) {
  console.error('Error updating skills.json:', err);
  process.exit(1);
}
