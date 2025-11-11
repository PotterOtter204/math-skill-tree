const fs = require('fs');
const path = require('path');

// Configuration
const GRADE_SPACING = 2000; // Horizontal spacing between grades
const OUTCOME_SPACING = 400; // Vertical spacing between outcomes
const SKILL_SPACING = 180; // Spacing between skills within an outcome
const SKILLS_PER_ROW = 5; // Max skills per row in an outcome cluster

// Read the skills JSON
const skillsPath = path.join(__dirname, '../app/api/get-skills/skills.json');
const skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));

// Group skills by outcome_code
const outcomeGroups = {};
skills.forEach(skill => {
  const outcomeCode = skill.outcome_code;
  if (!outcomeGroups[outcomeCode]) {
    outcomeGroups[outcomeCode] = [];
  }
  outcomeGroups[outcomeCode].push(skill);
});

// Sort outcome codes by grade and strand
const sortedOutcomeCodes = Object.keys(outcomeGroups).sort((a, b) => {
  // Extract grade from outcome code (e.g., "1.N.1" -> 1)
  const gradeA = parseInt(a.split('.')[0]);
  const gradeB = parseInt(b.split('.')[0]);

  if (gradeA !== gradeB) return gradeA - gradeB;

  // If same grade, sort by strand and number
  return a.localeCompare(b);
});

// Position skills
let currentGrade = 1;
let gradeX = 100; // Starting X position for grade 1
let outcomeY = 100; // Y position within current grade

sortedOutcomeCodes.forEach((outcomeCode, outcomeIndex) => {
  const skillsInOutcome = outcomeGroups[outcomeCode];
  const grade = parseInt(outcomeCode.split('.')[0]);

  // Move to next grade column if grade changed
  if (grade !== currentGrade) {
    currentGrade = grade;
    gradeX += GRADE_SPACING;
    outcomeY = 100; // Reset Y for new grade
  }

  // Calculate outcome center position
  const outcomeX = gradeX;
  const outcomeYStart = outcomeY;

  // Position skills within this outcome in a grid
  skillsInOutcome.forEach((skill, index) => {
    const row = Math.floor(index / SKILLS_PER_ROW);
    const col = index % SKILLS_PER_ROW;

    skill.x = outcomeX + (col * SKILL_SPACING);
    skill.y = outcomeYStart + (row * SKILL_SPACING);
  });

  // Calculate the height of this outcome cluster
  const numRows = Math.ceil(skillsInOutcome.length / SKILLS_PER_ROW);
  const clusterHeight = numRows * SKILL_SPACING;

  // Move Y down for next outcome
  outcomeY += clusterHeight + OUTCOME_SPACING;
});

// Write updated skills back to JSON
fs.writeFileSync(skillsPath, JSON.stringify(skills, null, 2));

console.log('Successfully repositioned skills!');
console.log(`Total skills: ${skills.length}`);
console.log(`Total outcomes: ${Object.keys(outcomeGroups).length}`);
console.log(`Grades: 1-${currentGrade}`);
