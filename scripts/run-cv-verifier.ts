import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { writeCvExpectations } from './export-cv-expectations.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const pythonFlag = process.argv.find(arg => arg.startsWith('--python='));
const python = pythonFlag?.slice('--python='.length) ?? process.env.PYTHON ?? 'python';
await writeCvExpectations();
const args = process.argv.slice(2).filter(arg => arg !== pythonFlag);
const result = spawnSync(python, [resolve(root, 'scripts/verify-cv-pdfs.py'), ...args], { cwd: root, stdio: 'inherit', shell: false });
if (result.error) throw new Error(`Cannot run Python verifier (${python}). Install Python with pypdf/pdfplumber/Pillow, or use --python=<executable>. ${result.error.message}`);
if (result.status !== 0) process.exit(result.status ?? 1);
