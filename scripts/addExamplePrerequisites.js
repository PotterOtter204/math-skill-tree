const fs = require('fs');
const path = require('path');

// Read the skills JSON
const skillsPath = path.join(__dirname, '../app/api/get-skills/skills.json');
const skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));

// Add some example prerequisite relationships
// These show logical progression in early math skills

// Example 1: Counting forward before counting backward
const skill1_1_1 = skills.find(s => s.id === '1.N.1.1'); // Recite forward
const skill1_1_2 = skills.find(s => s.id === '1.N.1.2'); // Recite backward
if (skill1_1_2 && skill1_1_1) {
  skill1_1_2.prerequisites = ['1.N.1.1']; // Backward requires forward first
}

// Example 2: Counting before skip counting
const skill1_1_5 = skills.find(s => s.id === '1.N.1.5'); // Skip-count by 2s
const skill1_1_6 = skills.find(s => s.id === '1.N.1.6'); // Skip-count by 5s
if (skill1_1_5 && skill1_1_1) {
  skill1_1_5.prerequisites = ['1.N.1.1']; // Skip counting requires basic counting
}
if (skill1_1_6 && skill1_1_1) {
  skill1_1_6.prerequisites = ['1.N.1.1'];
}

// Example 3: Understanding numbers before operations
const skill1_N_4 = skills.find(s => s.id === '1.N.4.1'); // Represent numbers to 20
const skill1_N_9 = skills.find(s => s.id === '1.N.9.1'); // Addition (first skill in 1.N.9)
if (skill1_N_9 && skill1_N_4) {
  skill1_N_9.prerequisites = ['1.N.4.1']; // Addition requires understanding numbers
}

// Example 4: Grade progression - Grade 2 builds on Grade 1
const skill2_N_1 = skills.find(s => s.id === '2.N.1.1'); // Say number sequence 0-100
if (skill2_N_1 && skill1_1_1) {
  skill2_N_1.prerequisites = ['1.N.1.1']; // Grade 2 counting builds on Grade 1
}

// Example 5: Place value understanding for larger numbers
const skill2_N_7 = skills.find(s => s.id === '2.N.7.1'); // Place value to 100
const skill3_N_5 = skills.find(s => s.id === '3.N.5.1'); // Place value to 1000 (first skill)
if (skill3_N_5 && skill2_N_7) {
  skill3_N_5.prerequisites = ['2.N.7.1']; // Grade 3 place value builds on Grade 2
}

// Example 6: Addition before multiplication
const skill2_N_9 = skills.find(s => s.id === '2.N.9.1'); // Addition to 100
const skill3_N_11 = skills.find(s => s.id === '3.N.11.1'); // Multiplication to 5x5
if (skill3_N_11 && skill2_N_9) {
  skill3_N_11.prerequisites = ['2.N.9.1']; // Multiplication builds on addition
}

// Write updated skills back to JSON
fs.writeFileSync(skillsPath, JSON.stringify(skills, null, 2));

console.log('Successfully added example prerequisite connections!');
console.log('Examples added:');
console.log('- 1.N.1.2 (backward counting) requires 1.N.1.1 (forward counting)');
console.log('- 1.N.1.5 (skip count by 2s) requires 1.N.1.1 (basic counting)');
console.log('- 1.N.1.6 (skip count by 5s) requires 1.N.1.1 (basic counting)');
console.log('- 1.N.9.1 (addition) requires 1.N.4.1 (understanding numbers)');
console.log('- 2.N.1.1 (counting to 100) requires 1.N.1.1 (counting basics)');
console.log('- 3.N.5.1 (place value 1000) requires 2.N.7.1 (place value 100)');
console.log('- 3.N.11.1 (multiplication) requires 2.N.9.1 (addition)');
