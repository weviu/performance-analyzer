const { spawn } = require('child_process');
const path = require('path');

const nextBin = path.join(__dirname, 'node_modules/next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, 'dev'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname,
});

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

// Never end child.stdin — so Next.js never sees EOF and never self-exits
child.on('exit', (code) => process.exit(code ?? 1));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT',  () => child.kill('SIGINT'));
