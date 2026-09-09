import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const args of [
  ['local-server/server.mjs'],
  ['node_modules/@angular/cli/bin/ng.js', 'serve', '--host', '127.0.0.1', '--proxy-config', 'proxy.conf.json'],
]) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit' });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('Crédito Barrio: interfaz http://127.0.0.1:4200 — API http://127.0.0.1:3000. Ctrl+C detiene ambos.');
