#!/usr/bin/env node
/**
 * Runs the API and the web app in one process tree, so the whole product can deploy as
 * a single service. The web app takes the public PORT and reaches the API on localhost.
 * For two separate services, see the deployment section of the README.
 */
import { spawn } from 'node:child_process';

const publicPort = process.env.PORT ?? '3000';
const apiPort = process.env.API_PORT ?? '4000';
const children = [];

function shutdown(code) {
  for (const child of children) child.kill();
  process.exit(code);
}

function run(name, args, env) {
  const child = spawn('pnpm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  child.on('exit', (code) => {
    console.error(`[${name}] exited with code ${code}`);
    shutdown(code ?? 1);
  });
  children.push(child);
}

run('api', ['--filter', '@post-oak/api', 'start'], { PORT: apiPort });
run('web', ['--filter', '@post-oak/web', 'start'], {
  PORT: publicPort,
  API_URL: `http://127.0.0.1:${apiPort}`,
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
