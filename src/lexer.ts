import {
  COMMAND_CODES,
  type AreaLetter,
  type CommandCode,
  type DutyCode,
  type LexError,
  type LexerResult,
  type SourcePosition,
  type SourceSpan,
  type Token,
} from './types';

const AREA_LETTER_SET = new Set<AreaLetter>(['A', 'B', 'C', 'D', 'E', 'F']);
const DUTY_CODE_SET = new Set<DutyCode>(['AS', 'CE', 'GS', 'PD', 'PR', 'RC', 'SU', 'TR']);
const COMMAND_CODE_SET = new Set<string>(COMMAND_CODES);
const COMMAND_CODES_LONGEST_FIRST = [...COMMAND_CODES].sort((a, b) => b.length - a.length);

const ALNUM_RE = /^[A-Za-z0-9]+$/;
const REC_LOCATOR_RE = /^[A-Za-z0-9]{6}$/;
const AGENT_SIGN_RE = /^[A-Za-z0-9]{4,8}$/;
const INTEGER_RE = /^\d+$/;

const isWhitespace = (ch: string): boolean => /\s/.test(ch);
const isTokenBoundary = (ch: string): boolean =>
  ch === '/' || ch === '*' || ch === '-' || ch === '–' || ch === '—' || isWhitespace(ch);

const clonePos = (pos: SourcePosition): SourcePosition => ({
  offset: pos.offset,
  line: pos.line,
  column: pos.column,
});

const spanFrom = (start: SourcePosition, end: SourcePosition): SourceSpan => ({
  start,
  end,
});

export function tokenize(input: string): LexerResult {
  const tokens: Token[] = [];
  const errors: LexError[] = [];
  let emittedNonWsToken = false;

  let index = 0;
  const pos: SourcePosition = { offset: 0, line: 1, column: 1 };

  const advance = (text: string): void => {
    for (const ch of text) {
      pos.offset += 1;
      if (ch === '\n') {
        pos.line += 1;
        pos.column = 1;
      } else {
        pos.column += 1;
      }
    }
  };

  const emit = (token: Token): void => {
    tokens.push(token);
    if (token.type !== 'WS' && token.type !== 'EOF') {
      emittedNonWsToken = true;
    }
  };

  const classifyLexeme = (lexeme: string, span: SourceSpan): void => {
    if (COMMAND_CODE_SET.has(lexeme)) {
      emit({ type: lexeme as CommandCode, lexeme, span });
    } else if (DUTY_CODE_SET.has(lexeme as DutyCode)) {
      emit({ type: 'DUTY_CODE', lexeme, value: lexeme as DutyCode, span });
    } else if (AREA_LETTER_SET.has(lexeme as AreaLetter)) {
      emit({ type: 'AREA_LETTER', lexeme, value: lexeme as AreaLetter, span });
    } else if (INTEGER_RE.test(lexeme)) {
      emit({ type: 'INTEGER', lexeme, value: Number(lexeme), span });
    } else if (ALNUM_RE.test(lexeme) && REC_LOCATOR_RE.test(lexeme)) {
      emit({ type: 'REC_LOCATOR', lexeme, value: lexeme, span });
    } else if (ALNUM_RE.test(lexeme) && AGENT_SIGN_RE.test(lexeme)) {
      emit({ type: 'AGENT_SIGN', lexeme, value: lexeme, span });
    } else if (lexeme.length > 0) {
      emit({ type: 'FREETEXT', lexeme, value: lexeme, span });
    } else {
      emit({ type: 'UNKNOWN', lexeme, span });
      errors.push({ message: 'Unknown token', span, lexeme });
    }
  };

  const positionAfter = (start: SourcePosition, text: string): SourcePosition => {
    const end = clonePos(start);
    for (const ch of text) {
      end.offset += 1;
      if (ch === '\n') {
        end.line += 1;
        end.column = 1;
      } else {
        end.column += 1;
      }
    }
    return end;
  };

  while (index < input.length) {
    const ch = input[index];
    if (ch === undefined) {
      break;
    }

    if (isWhitespace(ch)) {
      const start = clonePos(pos);
      let endIndex = index + 1;
      while (endIndex < input.length && isWhitespace(input[endIndex] ?? '')) {
        endIndex += 1;
      }
      const lexeme = input.slice(index, endIndex);
      advance(lexeme);
      emit({ type: 'WS', lexeme, span: spanFrom(start, clonePos(pos)) });
      index = endIndex;
      continue;
    }

    if (ch === '/') {
      const start = clonePos(pos);
      advance(ch);
      emit({ type: 'SLASH', lexeme: ch, span: spanFrom(start, clonePos(pos)) });
      index += 1;
      continue;
    }

    if (ch === '*') {
      const start = clonePos(pos);
      advance(ch);
      emit({ type: 'STAR', lexeme: ch, span: spanFrom(start, clonePos(pos)) });
      index += 1;
      continue;
    }

    if (ch === '-' || ch === '–' || ch === '—') {
      const start = clonePos(pos);
      advance(ch);
      emit({ type: 'DASH', lexeme: ch, span: spanFrom(start, clonePos(pos)) });
      index += 1;
      continue;
    }

    const start = clonePos(pos);
    let endIndex = index + 1;
    while (endIndex < input.length) {
      const next = input[endIndex];
      if (next === undefined || isTokenBoundary(next)) {
        break;
      }
      endIndex += 1;
    }

    const lexeme = input.slice(index, endIndex);
    advance(lexeme);
    const end = clonePos(pos);

    if (!emittedNonWsToken) {
      const commandPrefix = COMMAND_CODES_LONGEST_FIRST.find((code) => lexeme.startsWith(code));
      if (commandPrefix && lexeme.length > commandPrefix.length) {
        const commandEnd = positionAfter(start, commandPrefix);
        classifyLexeme(commandPrefix, spanFrom(start, commandEnd));
        const remainder = lexeme.slice(commandPrefix.length);
        classifyLexeme(remainder, spanFrom(commandEnd, end));
        index = endIndex;
        continue;
      }
    }
    classifyLexeme(lexeme, spanFrom(start, end));

    index = endIndex;
  }

  const eofPos = clonePos(pos);
  emit({
    type: 'EOF',
    lexeme: '',
    span: spanFrom(eofPos, eofPos),
  });

  return { tokens, errors };
}
