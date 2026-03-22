import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, '..', 'lib', 'data', 'sample-scenarios.ts');
const raw = await readFile(file, 'utf8');
const scenarios = (raw.match(/id: \"/g) || []).length;

console.log(`Sample scenarios placeholder file loaded (${scenarios} id fields found).`);
