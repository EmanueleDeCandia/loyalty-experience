import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['server/api-server.mjs'], { stdio: 'inherit', env: process.env }),
  spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:web'], { stdio: 'inherit', env: process.env }),
];
const stop = signal => { for (const child of children) if (!child.killed) child.kill(signal); };
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
for (const child of children) child.on('exit', code => { if (code && code !== 0) { stop('SIGTERM'); process.exitCode = code; } });
