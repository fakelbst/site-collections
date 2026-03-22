import { spawn } from 'node:child_process';

const taskArgs = process.argv.slice(2);

if (taskArgs.length === 0) {
  console.error('Usage: node scripts/run-parallel.mjs "name:command" ...');
  process.exit(1);
}

const children = [];
let shuttingDown = false;

const shutdown = (code = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(code), 100);
};

for (const taskArg of taskArgs) {
  const separatorIndex = taskArg.indexOf(':');

  if (separatorIndex === -1) {
    console.error(`Invalid task definition: ${taskArg}`);
    process.exit(1);
  }

  const name = taskArg.slice(0, separatorIndex).trim();
  const command = taskArg.slice(separatorIndex + 1).trim();

  if (!name || !command) {
    console.error(`Invalid task definition: ${taskArg}`);
    process.exit(1);
  }

  const child = spawn(command, {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  const writeOutput = (stream, chunk) => {
    const text = chunk.toString();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      if (line) {
        stream.write(`[${name}] ${line}\n`);
      }
    }
  };

  child.stdout.on('data', (chunk) => writeOutput(process.stdout, chunk));
  child.stderr.on('data', (chunk) => writeOutput(process.stderr, chunk));
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal || code) {
      console.error(`[${name}] exited with ${signal ?? code}`);
      shutdown(typeof code === 'number' ? code : 1);
      return;
    }

    shutdown(0);
  });

  children.push(child);
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));
