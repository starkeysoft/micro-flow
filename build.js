import * as esbuild from 'esbuild';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

// Recursively get all JS files from a directory
async function getJsFilesRecursive(dir) {
  const files = [];
  const entries = await readdir(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const entryStat = await stat(fullPath);
    
    if (entryStat.isDirectory()) {
      const subFiles = await getJsFilesRecursive(fullPath);
      files.push(...subFiles);
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Get all JS files from src/classes and src/helpers
async function getSourceFiles() {
  const files = [];
  
  const classFiles = await getJsFilesRecursive('./src/classes');
  files.push(...classFiles);
  
  const helperFiles = await getJsFilesRecursive('./src/helpers');
  files.push(...helperFiles);
  
  const enumFiles = await getJsFilesRecursive('./src/enums');
  files.push(...enumFiles);
  
  return files;
}

const entryPoints = await getSourceFiles();

await esbuild.build({
  entryPoints: ['./index.js', ...entryPoints],
  bundle: false,
  minify: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: 'dist',
  outbase: '.',
  sourcemap: true,
  keepNames: true,
});

console.log('✓ Build complete! Minified files in dist/');
