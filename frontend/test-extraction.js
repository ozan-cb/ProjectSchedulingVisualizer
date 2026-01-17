import { extractProblemDefinition } from './src/problemExtractor.ts';
import { readFileSync } from 'fs';

const events = JSON.parse(readFileSync('./public/events-software.json', 'utf-8'));
const problem = extractProblemDefinition(events);

console.log('Tasks:', problem.tasks.length);
console.log('Resources:', problem.resources);
console.log('Optimal makespan:', problem.optimalMakespan);
console.log('Optimal schedule:', Object.fromEntries(problem.optimalSchedule));
