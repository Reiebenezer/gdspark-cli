import { tokenize } from './lexer';
import type {
  AreaLetter,
  AreaSelector,
  CommandCode,
  CommandParam,
  ParsedCommand,
  SourceSpan,
  Token,
} from './types';

class ParseError extends Error {
  readonly span?: SourceSpan;

  constructor(message: string, span?: SourceSpan) {
    super(message);
    this.name = 'ParseError';
    this.span = span;
  }
}

type ParseInput = string | Token[];

const isCommandCode = (type: Token['type']): type is CommandCode =>
  [
    'JI',
    'JJ',
    'JO',
    'JM',
    'JD',
    'JB',
    'RF',
    'ET',
    'ER',
    'ETK',
    'ERK',
    'IG',
    'IR',
    'XE',
    'XI',
    'SX',
    'RT',
  ].includes(type);

const isAlnum = (value: string): boolean => /^[A-Za-z0-9]+$/.test(value);
const isAgentSign = (value: string): boolean => isAlnum(value) && value.length >= 4 && value.length <= 8;
const isRecLocator = (value: string): boolean => isAlnum(value) && value.length === 6;

class Parser {
  private readonly tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ParsedCommand {
    this.skipWs();
    const commandToken = this.peek();
    if (!commandToken || !isCommandCode(commandToken.type)) {
      throw new ParseError('Expected command code', commandToken?.span);
    }

    this.index += 1;
    const code = commandToken.type;
    const params: CommandParam[] = [];

    const parsed = this.parseByCode(code, params);
    parsed.span = this.buildCommandSpan(commandToken.span, parsed.span);

    this.skipWs();
    const tail = this.peek();
    if (tail && tail.type !== 'EOF') {
      throw new ParseError(`Unexpected token "${tail.lexeme}"`, tail.span);
    }

    return parsed;
  }

  private parseByCode(code: CommandCode, params: CommandParam[]): ParsedCommand {
    switch (code) {
      case 'JI':
      case 'JJ':
        return this.parseSignIn(code, params);
      case 'JO':
        return this.parseSignOut(params);
      case 'JM':
        return this.parseAreaMove(params);
      case 'JD':
        return { code: 'JD', params };
      case 'JB':
        return { code: 'JB', params };
      case 'RF':
        return this.parsePnrReceivedFrom(params);
      case 'ET':
      case 'ER':
      case 'ETK':
      case 'ERK':
        return { code, params };
      case 'IG':
      case 'IR':
        return { code, params };
      case 'XE':
      case 'XI':
      case 'SX':
        return this.parsePnrCancel(code, params);
      case 'RT':
        return this.parsePnrRetrieve(params);
    }
  }

  private parseSignIn(code: 'JI' | 'JJ', params: CommandParam[]): ParsedCommand {
    this.skipWs();
    if (this.isAtEnd()) {
      return { code, params };
    }

    let area: AreaSelector | undefined;
    const areaSelector = this.tryParseAreaSelector();
    if (areaSelector !== undefined) {
      area = areaSelector;
      params.push({ name: 'area', value: Array.isArray(area) ? area.join('/') : area });
      this.skipWs();
    }

    if (this.isAtEnd()) {
      throw new ParseError('Expected agent sign and duty code for sign-in', this.peek(-1)?.span);
    }

    const agentToken = this.peek();
    if (!agentToken || !['AGENT_SIGN', 'REC_LOCATOR', 'FREETEXT'].includes(agentToken.type)) {
      throw new ParseError('Expected agent sign', agentToken?.span);
    }
    const agentSign = agentToken.lexeme;
    if (!isAgentSign(agentSign)) {
      throw new ParseError('Invalid agent sign; expected 4-8 alphanumeric characters', agentToken.span);
    }
    this.index += 1;
    params.push({ name: 'agentSign', value: agentSign });

    this.skipWs();
    this.expect('SLASH', 'Expected "/" before duty code');
    this.skipWs();

    const dutyToken = this.peek();
    if (!dutyToken || dutyToken.type !== 'DUTY_CODE') {
      throw new ParseError('Expected duty code', dutyToken?.span);
    }
    this.index += 1;
    const dutyCode = dutyToken.value;
    params.push({ name: 'dutyCode', value: dutyCode });

    this.skipWs();
    let password: string | undefined;
    if (this.match('DASH')) {
      this.skipWs();
      password = this.collectRemainingText(true);
      if (password.length === 0) {
        throw new ParseError('Expected password text after dash', this.peek()?.span);
      }
      params.push({ name: 'password', value: password });
    }

    const args = {
      agentSign,
      dutyCode,
      ...(area !== undefined ? { area } : {}),
      ...(password !== undefined ? { password } : {}),
    };

    return { code, params, args };
  }

  private parseSignOut(params: CommandParam[]): ParsedCommand {
    this.skipWs();
    if (this.isAtEnd()) {
      return { code: 'JO', params };
    }

    const area = this.tryParseAreaSelector();
    if (area === undefined) {
      throw new ParseError('Expected area selector for sign-out', this.peek()?.span);
    }

    params.push({ name: 'area', value: Array.isArray(area) ? area.join('/') : area });
    return { code: 'JO', params, area };
  }

  private parseAreaMove(params: CommandParam[]): ParsedCommand {
    this.skipWs();
    const token = this.peek();
    if (!token || token.type !== 'AREA_LETTER') {
      throw new ParseError('Expected area letter after JM', token?.span);
    }
    this.index += 1;
    params.push({ name: 'area', value: token.value });
    return { code: 'JM', params, area: token.value };
  }

  private parsePnrReceivedFrom(params: CommandParam[]): ParsedCommand {
    const ws = this.peek();
    if (!ws || ws.type !== 'WS') {
      throw new ParseError('Expected whitespace after RF', ws?.span);
    }
    this.index += 1;
    const text = this.collectRemainingText(true);
    if (text.length === 0) {
      throw new ParseError('Expected free text after RF', this.peek()?.span);
    }
    params.push({ name: 'text', value: text });
    return { code: 'RF', params, text };
  }

  private parsePnrCancel(code: 'XE' | 'XI' | 'SX', params: CommandParam[]): ParsedCommand {
    if (code === 'XI') {
      return { code: 'XI', params };
    }

    if (code === 'XE') {
      const ws = this.peek();
      if (!ws || ws.type !== 'WS') {
        throw new ParseError('Expected whitespace after XE', ws?.span);
      }
      this.index += 1;
    } else if (code === 'SX' && this.peek()?.type === 'WS') {
      throw new ParseError('SX must be followed directly by an integer (e.g. SX6)', this.peek()?.span);
    }

    const numberToken = this.peek();
    if (!numberToken || numberToken.type !== 'INTEGER') {
      throw new ParseError(`Expected integer after ${code}`, numberToken?.span);
    }
    this.index += 1;

    if (code === 'XE') {
      params.push({ name: 'lineNumber', value: String(numberToken.value) });
      return { code: 'XE', params, lineNumber: numberToken.value };
    }

    params.push({ name: 'segmentNumber', value: String(numberToken.value) });
    return { code: 'SX', params, segmentNumber: numberToken.value };
  }

  private parsePnrRetrieve(params: CommandParam[]): ParsedCommand {
    this.skipWs();
    const token = this.peek();
    if (!token || !['REC_LOCATOR', 'AGENT_SIGN', 'FREETEXT'].includes(token.type)) {
      throw new ParseError('Expected record locator after RT', token?.span);
    }

    if (!isRecLocator(token.lexeme)) {
      throw new ParseError('Record locator must be 6 alphanumeric characters', token.span);
    }

    this.index += 1;
    params.push({ name: 'recordLocator', value: token.lexeme });
    return { code: 'RT', params, recordLocator: token.lexeme };
  }

  private tryParseAreaSelector(): AreaSelector | undefined {
    const first = this.peek();
    if (!first) {
      return undefined;
    }

    if (first.type === 'STAR') {
      this.index += 1;
      return '*';
    }

    if (first.type !== 'AREA_LETTER') {
      return undefined;
    }

    const checkpoint = this.index;
    const letters: AreaLetter[] = [first.value];
    this.index += 1;

    while (true) {
      const slash = this.peek();
      if (!slash || slash.type !== 'SLASH') {
        break;
      }
      const next = this.peek(1);
      if (!next || next.type !== 'AREA_LETTER') {
        throw new ParseError('Expected area letter after "/" in area selector', next?.span ?? slash.span);
      }
      this.index += 2;
      letters.push(next.value);
    }

    if (letters.length > 1) {
      return letters;
    }

    const next = this.peek();
    if (!next || next.type === 'WS' || next.type === 'EOF') {
      return letters[0];
    }

    this.index = checkpoint;
    return undefined;
  }

  private expect(type: Token['type'], message: string): Token {
    const token = this.peek();
    if (!token || token.type !== type) {
      throw new ParseError(message, token?.span);
    }
    this.index += 1;
    return token;
  }

  private match(type: Token['type']): boolean {
    const token = this.peek();
    if (token?.type === type) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private collectRemainingText(trimLeadingWs: boolean): string {
    let text = '';
    while (!this.isAtEnd()) {
      const token = this.peek();
      if (!token || token.type === 'EOF') {
        break;
      }
      text += token.lexeme;
      this.index += 1;
    }

    return trimLeadingWs ? text.replace(/^\s+/, '') : text;
  }

  private skipWs(): void {
    while (this.peek()?.type === 'WS') {
      this.index += 1;
    }
  }

  private isAtEnd(): boolean {
    return this.peek()?.type === 'EOF';
  }

  private peek(offset = 0): Token | undefined {
    const index = this.index + offset;
    if (index < 0 || index >= this.tokens.length) {
      return undefined;
    }
    return this.tokens[index];
  }

  private buildCommandSpan(start: SourceSpan, existing?: SourceSpan): SourceSpan {
    if (existing) {
      return existing;
    }
    let end: SourceSpan = start;
    for (let i = this.tokens.length - 1; i >= 0; i -= 1) {
      const token = this.tokens[i];
      if (!token) {
        continue;
      }
      if (token.type !== 'EOF' && token.type !== 'WS') {
        end = token.span;
        break;
      }
    }
    return { start: start.start, end: end.end };
  }
}

export function parse(input: ParseInput): ParsedCommand {
  const sourceTokens = typeof input === 'string' ? tokenize(input).tokens : input;
  const parser = new Parser(sourceTokens);
  return parser.parse();
}
