import { tokenize } from './lexer';
import { parse } from './parser';
import type { ParsedCommand } from './types';

export function main(input: string): ParsedCommand {
  return parse(input);
}

export { tokenize, parse };
export type { ParsedCommand };
