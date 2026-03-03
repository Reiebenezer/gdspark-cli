import { describe, expect, test } from 'bun:test';
import { tokenize } from './lexer';

describe('tokenize', () => {
  test('tokenizes compact sign-in command', () => {
    const result = tokenize('JI*ABC123/GS-secret');
    expect(result.errors).toHaveLength(0);
    expect(result.tokens.map((t) => t.type)).toEqual([
      'JI',
      'STAR',
      'REC_LOCATOR',
      'SLASH',
      'DUTY_CODE',
      'DASH',
      'REC_LOCATOR',
      'EOF',
    ]);
  });

  test('tokenizes pnr cancel compact form SX6', () => {
    const result = tokenize('SX6');
    expect(result.tokens.map((t) => t.type)).toEqual(['SX', 'INTEGER', 'EOF']);
    const intToken = result.tokens[1];
    expect(intToken?.type).toBe('INTEGER');
    if (intToken?.type === 'INTEGER') {
      expect(intToken.value).toBe(6);
    }
  });

  test('tokenizes RT compact form with record locator', () => {
    const result = tokenize('RTABC123');
    expect(result.tokens.map((t) => t.type)).toEqual(['RT', 'REC_LOCATOR', 'EOF']);
  });

  test('tokenizes with whitespace and multiline positions', () => {
    const result = tokenize('RF JOHN\nDOE');
    expect(result.tokens.map((t) => t.type)).toEqual([
      'RF',
      'WS',
      'AGENT_SIGN',
      'WS',
      'FREETEXT',
      'EOF',
    ]);
    const doe = result.tokens[4];
    expect(doe?.span.start.line).toBe(2);
    expect(doe?.span.start.column).toBe(1);
  });

  test('treats hyphen variants as DASH', () => {
    const ascii = tokenize('JI ABCD/GS-pass').tokens.map((t) => t.type);
    const en = tokenize('JI ABCD/GS–pass').tokens.map((t) => t.type);
    const em = tokenize('JI ABCD/GS—pass').tokens.map((t) => t.type);
    expect(ascii.includes('DASH')).toBe(true);
    expect(en.includes('DASH')).toBe(true);
    expect(em.includes('DASH')).toBe(true);
  });

  test('terminates on long mixed input (no infinite loop guard)', () => {
    const payload = `${'A/'.repeat(5000)}B ${'X'.repeat(5000)} -- end`;
    const result = tokenize(payload);
    expect(result.tokens.length).toBeGreaterThan(1);
    expect(result.tokens[result.tokens.length - 1]?.type).toBe('EOF');
  });
});
