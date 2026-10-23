import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Rebuild the replaceable module from the upstream preferred JavaScript sources. */
export async function rebuildHeic(sourceRoot, output) {
  const source = path.resolve(sourceRoot);
  const destination = path.resolve(output);
  const workerSource = await readFile(path.join(source, 'src/worker.js'), 'utf8');
  const patchedWorker = workerSource.replace(
    'LIB_HEIF_PATH',
    JSON.stringify(path.join(source, 'src/lib/libheif.js')),
  );
  const worker = await build({
    stdin: { contents: patchedWorker, resolveDir: source, sourcefile: 'worker.js' },
    bundle: true,
    minify: true,
    target: 'es6',
    platform: 'browser',
    external: ['fs', 'path', 'crypto'],
    write: false,
  });
  await mkdir(path.dirname(destination), { recursive: true });
  const module = await build({
    entryPoints: [path.join(source, 'src/next/index.js')],
    bundle: true,
    minify: true,
    target: 'es6',
    platform: 'browser',
    format: 'esm',
    define: { WORKER_FILE_CONTENT: JSON.stringify(worker.outputFiles[0].text) },
    write: false,
  });
  await writeFile(destination, module.outputFiles[0].contents);
  return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , source, output] = process.argv;
  if (!source || !output)
    throw new Error(
      'Usage: node scripts/vendor/rebuild-heic.mjs <heic-to-source-folder> <output.mjs>',
    );
  console.log(await rebuildHeic(source, output));
}
