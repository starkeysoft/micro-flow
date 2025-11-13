import * as esbuild from 'esbuild';
import { readdir } from 'fs/promises';
import { join } from 'path';

// Get all JS files from src/classes and src/helpers
async function getSourceFiles() {
  const files = [];
  
  const classFiles = await readdir('./src/classes');
  classFiles.forEach(file => {
    if (file.endsWith('.js')) {
      files.push(`./src/classes/${file}`);
    }
  });
  
  const helperFiles = await readdir('./src/helpers');
  helperFiles.forEach(file => {
    if (file.endsWith('.js')) {
      files.push(`./src/helpers/${file}`);
    }
  });
  
  const enumFiles = await readdir('./src/enums');
  enumFiles.forEach(file => {
    if (file.endsWith('.js')) {
      files.push(`./src/enums/${file}`);
    }
  });
  
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
