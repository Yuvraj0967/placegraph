// Rebuild the Neo4j graph from MySQL:  npm run db:sync
import { resyncGraph, stats } from '../lib/core.js';
console.log('Rebuilt:', await resyncGraph());
const s = await stats();
console.log(s.inSync ? 'In sync.' : 'Counts differ!', s.mysql, s.neo4j);
process.exit(0);
