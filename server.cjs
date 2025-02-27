// CommonJS version of server startup for Render
// This file is used as a fallback if there are issues with ES modules

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.NODE_NO_WARNINGS = '1';

console.log('Starting server via server.cjs (CommonJS)...');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

try {
  // Use child_process to run the server with tsx
  const { spawn } = require('child_process');
  
  const server = spawn('npx', ['tsx', 'src/server/index.ts'], {
    stdio: 'inherit',
    env: process.env
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server process:', err);
    process.exit(1);
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    server.kill('SIGTERM');
  });
  
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
} 