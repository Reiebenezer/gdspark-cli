import { describe, expect, test } from 'bun:test';
import { parse } from '../src/parser';
import { tokenize } from '../src/lexer';

describe('parse', () => {
  test('parses sign-in with area, duty, and password', () => {
    const parsed = parse('JI * ABC123/GS - secret');
    expect(parsed.code).toBe('JI');
    expect(parsed).toMatchObject({
      args: {
        area: '*',
        agentSign: 'ABC123',
        dutyCode: 'GS',
        password: 'secret',
      },
    });
  });

  test('parses sign-out area list', () => {
    const parsed = parse('JO A/B/C');
    expect(parsed.code).toBe('JO');
    if (parsed.code === 'JO') {
      expect(parsed.area).toEqual(['A', 'B', 'C']);
    }
  });

  test('parses area status and redisplay', () => {
    expect(parse('JD').code).toBe('JD');
    expect(parse('JB').code).toBe('JB');
  });

  test('parses area move', () => {
    const parsed = parse('JM F');
    expect(parsed.code).toBe('JM');
    if (parsed.code === 'JM') {
      expect(parsed.area).toBe('F');
    }
  });

  test('parses RF free text', () => {
    const parsed = parse('RF JOHN DOE');
    expect(parsed.code).toBe('RF');
    if (parsed.code === 'RF') {
      expect(parsed.text).toBe('JOHN DOE');
    }
  });

  test('parses pnr end commands', () => {
    expect(parse('ET').code).toBe('ET');
    expect(parse('ER').code).toBe('ER');
    expect(parse('ETK').code).toBe('ETK');
    expect(parse('ERK').code).toBe('ERK');
  });

  test('parses pnr ignore commands', () => {
    expect(parse('IG').code).toBe('IG');
    expect(parse('IR').code).toBe('IR');
  });

  test('parses pnr cancel variants', () => {
    const xe = parse('XE 12');
    expect(xe.code).toBe('XE');
    if (xe.code === 'XE') {
      expect(xe.lineNumber).toBe(12);
    }

    const xi = parse('XI');
    expect(xi.code).toBe('XI');

    const sx = parse('SX6');
    expect(sx.code).toBe('SX');
    if (sx.code === 'SX') {
      expect(sx.segmentNumber).toBe(6);
    }
  });

  test('parses RT retrieve', () => {
    const parsed = parse('RT ABC123');
    expect(parsed.code).toBe('RT');
    if (parsed.code === 'RT') {
      expect(parsed.recordLocator).toBe('ABC123');
    }
  });

  test('accepts token array input', () => {
    const tokens = tokenize('JO *').tokens;
    const parsed = parse(tokens);
    expect(parsed.code).toBe('JO');
  });

  test('throws on invalid command', () => {
    expect(() => parse('ZZ')).toThrow('Expected command code');
  });

  test('throws when RF is missing required whitespace', () => {
    expect(() => parse('RFJOHN')).toThrow('Expected whitespace after RF');
  });

  test('throws when XE has no whitespace separator', () => {
    expect(() => parse('XE12')).toThrow('Expected whitespace after XE');
  });

  test('throws when SX has whitespace separator', () => {
    expect(() => parse('SX 6')).toThrow('SX must be followed directly by an integer');
  });

  test('throws for invalid RT locator', () => {
    expect(() => parse('RT ABC12')).toThrow('Record locator must be 6 alphanumeric characters');
  });

  test('throws for invalid area selector in JO', () => {
    expect(() => parse('JO Z')).toThrow('Expected area selector for sign-out');
  });

  test('throws for invalid area move', () => {
    expect(() => parse('JM Z')).toThrow('Expected area letter after JM');
  });

  test('throws for incomplete sign-in', () => {
    expect(() => parse('JI *')).toThrow('Expected agent sign and duty code for sign-in');
    expect(() => parse('JI A12/GS')).toThrow('Invalid agent sign');
  });

  test('throws on unexpected trailing token', () => {
    expect(() => parse('IG extra')).toThrow('Unexpected token "extra"');
  });

  test('terminates on long invalid payload (no infinite loop guard)', () => {
    const bad = `JM ${'Z'.repeat(20000)}`;
    expect(() => parse(bad)).toThrow();
  });
});
