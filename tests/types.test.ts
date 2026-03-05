import { describe, expect, test } from 'bun:test';
import { COMMAND_CODES, TOKEN_TYPES } from '../src/types';

describe('types contracts', () => {
  test('command codes are unique and non-empty', () => {
    const unique = new Set(COMMAND_CODES);
    expect(unique.size).toBe(COMMAND_CODES.length);
    expect(COMMAND_CODES.length).toBeGreaterThan(0);
  });

  test('token types contain all command codes and EOF', () => {
    for (const command of COMMAND_CODES) {
      expect(TOKEN_TYPES.includes(command)).toBe(true);
    }
    expect(TOKEN_TYPES.includes('EOF')).toBe(true);
  });
});
