/**
 * Copies the static site into _site/ for GitHub Pages, excluding dev-only paths.
 * Run after generate-manifest.js: npm run build:pages
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_site');

const EXCLUDE_NAMES = new Set([
    '.git',
    '.github',
    'node_modules',
    '_site',
    '.cursor',
    'terminals',
]);

function shouldCopyName(name) {
    if (EXCLUDE_NAMES.has(name)) return false;
    if (name === '.env' || name === '.env.local') return false;
    return true;
}

function copyRecursive(srcDir, destDir) {
    fs.mkdirSync(destDir, { recursive: true });
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const ent of entries) {
        if (!shouldCopyName(ent.name)) continue;
        const from = path.join(srcDir, ent.name);
        const to = path.join(destDir, ent.name);
        if (ent.isDirectory()) {
            copyRecursive(from, to);
        } else if (ent.isSymbolicLink()) {
            continue;
        } else {
            fs.copyFileSync(from, to);
        }
    }
}

fs.rmSync(OUT, { recursive: true, force: true });
copyRecursive(ROOT, OUT);

// Ensure Jekyll is disabled on Pages
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log('GitHub Pages output:', OUT);
