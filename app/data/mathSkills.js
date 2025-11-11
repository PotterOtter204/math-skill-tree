// Math curriculum skill tree data structure

export const initialSkills = [
  {
    id: 'counting',
    name: 'Counting',
    description: 'Count from 1 to 100',
    x: 100,
    y: 100,
    prerequisites: []
  },
  {
    id: 'addition',
    name: 'Addition',
    description: 'Basic addition operations',
    x: 300,
    y: 100,
    prerequisites: ['counting']
  },
  {
    id: 'subtraction',
    name: 'Subtraction',
    description: 'Basic subtraction operations',
    x: 300,
    y: 250,
    prerequisites: ['counting']
  },
  {
    id: 'multiplication',
    name: 'Multiplication',
    description: 'Times tables and multiplication',
    x: 500,
    y: 100,
    prerequisites: ['addition']
  },
  {
    id: 'division',
    name: 'Division',
    description: 'Division operations',
    x: 500,
    y: 250,
    prerequisites: ['multiplication', 'subtraction']
  },
  {
    id: 'fractions',
    name: 'Fractions',
    description: 'Understanding fractions',
    x: 700,
    y: 175,
    prerequisites: ['division']
  },
  {
    id: 'decimals',
    name: 'Decimals',
    description: 'Decimal numbers',
    x: 900,
    y: 100,
    prerequisites: ['fractions']
  },
  {
    id: 'percentages',
    name: 'Percentages',
    description: 'Percentage calculations',
    x: 900,
    y: 250,
    prerequisites: ['fractions']
  },
  {
    id: 'algebra',
    name: 'Algebra Basics',
    description: 'Variables and equations',
    x: 1100,
    y: 175,
    prerequisites: ['decimals', 'percentages']
  }
];

export const skillLevels = {
  locked: 'locked',
  available: 'available',
  completed: 'completed'
};
