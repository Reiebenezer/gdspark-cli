#!/usr/bin/env bun
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

import { main as parseCommand } from './src/index';

const EXIT_COMMANDS = new Set(['exit', 'quit', ':q']);

function printParsedResult(command: string): void {
  try {
    const parsed = parseCommand(command);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
  }
}

async function runInteractive(): Promise<void> {
  const rl = createInterface({
    input,
    output,
    prompt: '> ',
  });

  rl.prompt();

  for await (const line of rl) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      rl.prompt();
      continue;
    }

    if (EXIT_COMMANDS.has(trimmed.toLowerCase())) {
      rl.close();
      break;
    }

    printParsedResult(line);
    rl.prompt();
  }
}

export async function main(): Promise<void> {
  const cliArgs = Bun.argv.slice(2);

  if (cliArgs.length > 0) {
    const command = cliArgs.join(' ');
    printParsedResult(command);
    return;
  }

  await runInteractive();
}

if (import.meta.main) {
  void main();
}
