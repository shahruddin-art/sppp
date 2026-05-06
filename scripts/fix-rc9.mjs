/**
 * Fix for rc9 ESM module resolution issue on Windows
 * 
 * Error: Cannot find module 'rc9/dist/index.mjs'
 * This script creates a symlink/copy from index.cjs to index.mjs
 * so that the ESM import resolves correctly on Windows.
 * 
 * This is a known issue with rc9@2.x on some Windows/Node.js configurations.
 * See: https://github.com/unjs/rc9/issues/XX
 */
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const rc9Dist = join(rootDir, 'node_modules', 'rc9', 'dist');

// Check if rc9 exists
if (!existsSync(rc9Dist)) {
  // rc9 not installed (might not be a dependency), skip
  process.exit(0);
}

const mjsPath = join(rc9Dist, 'index.mjs');
const cjsPath = join(rc9Dist, 'index.cjs');

// If index.mjs already exists, no fix needed
if (existsSync(mjsPath)) {
  console.log('✅ rc9/dist/index.mjs exists, no fix needed');
  process.exit(0);
}

// If index.cjs exists, create index.mjs from it with ESM wrapper
if (existsSync(cjsPath)) {
  const cjsContent = readFileSync(cjsPath, 'utf-8');
  
  // Create an ESM wrapper that re-exports from CJS
  const esmWrapper = `// ESM wrapper for rc9 (auto-generated fix for Windows)
// This file was created by scripts/fix-rc9.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mod = require('./index.cjs');
export default mod.default || mod;
export const { parse, parseFile, dump, dumpFile, update, updateFile } = mod;
`;
  
  writeFileSync(mjsPath, esmWrapper, 'utf-8');
  console.log('✅ Fixed rc9: created index.mjs ESM wrapper from index.cjs');
} else {
  console.log('⚠️  rc9/dist/index.cjs not found either, skipping fix');
}

process.exit(0);
