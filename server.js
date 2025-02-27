// This is a simple wrapper to ensure Render can properly route requests
import { spawn } from 'child_process';

// Start the actual server
const server = spawn('npx', ['tsx', 'src/server/index.ts'], {
  env: { ...process.env, NODE_ENV: 'production', NODE_NO_WARNINGS: '1' },
  stdio: 'inherit'
});

// Handle process termination
process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});

server.on('close', (code) => {
  process.exit(code);
});