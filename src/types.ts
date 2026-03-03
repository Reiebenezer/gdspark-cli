export const COMMAND_CODES = [
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
] as const;

export type CommandCode = (typeof COMMAND_CODES)[number];

export const TOKEN_TYPES = [
  ...COMMAND_CODES,
  'WS',
  'SLASH',
  'STAR',
  'DASH',
  'AREA_LETTER',
  'DUTY_CODE',
  'AGENT_SIGN',
  'REC_LOCATOR',
  'INTEGER',
  'FREETEXT',
  'EOF',
  'UNKNOWN',
] as const;

export type TokenType = (typeof TOKEN_TYPES)[number];

export type SourcePosition = {
  offset: number;
  line: number;
  column: number;
}

export type SourceSpan = {
  start: SourcePosition;
  end: SourcePosition;
}

export type AreaLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type DutyCode = 'AS' | 'CE' | 'GS' | 'PD' | 'PR' | 'RC' | 'SU' | 'TR';

type TokenBase<TType extends TokenType> = {
  type: TType;
  lexeme: string;
  span: SourceSpan;
}

export type CommandToken = TokenBase<CommandCode>;
export type WsToken = TokenBase<'WS'>;
export type SlashToken = TokenBase<'SLASH'>;
export type StarToken = TokenBase<'STAR'>;
export type DashToken = TokenBase<'DASH'>;
export type AreaLetterToken = TokenBase<'AREA_LETTER'> & { value: AreaLetter };
export type DutyCodeToken = TokenBase<'DUTY_CODE'> & { value: DutyCode };
export type AgentSignToken = TokenBase<'AGENT_SIGN'> & { value: string };
export type RecLocatorToken = TokenBase<'REC_LOCATOR'> & { value: string };
export type IntegerToken = TokenBase<'INTEGER'> & { value: number };
export type FreeTextToken = TokenBase<'FREETEXT'> & { value: string };
export type EofToken = TokenBase<'EOF'>;
export type UnknownToken = TokenBase<'UNKNOWN'>;

export type Token =
  | CommandToken
  | WsToken
  | SlashToken
  | StarToken
  | DashToken
  | AreaLetterToken
  | DutyCodeToken
  | AgentSignToken
  | RecLocatorToken
  | IntegerToken
  | FreeTextToken
  | EofToken
  | UnknownToken;

export type LexError = {
  message: string;
  span: SourceSpan;
  lexeme?: string;
}

export type LexerResult = {
  tokens: Token[];
  errors: LexError[];
}

// ------------------------------------------------------------------------------------
// PARSER / AST
// ------------------------------------------------------------------------------------
export type CommandParam = {
  name: string,
  value: string
}
export type Command = {
  code: CommandCode;
  params: CommandParam[];
  span?: SourceSpan;
}

export type AreaList = AreaLetter[];
export type AreaSelector = '*' | AreaLetter | AreaList;

export type AgentAndDuty = {
  agentSign: string;
  dutyCode: DutyCode;
}

export type SignInArgs = AgentAndDuty & {
  area?: AreaSelector;
  password?: string;
}

export type SignIn = Command & {
  code: 'JI' | 'JJ';
  args?: SignInArgs;
}

export type SignOut = Command & {
  code: 'JO';
  area?: '*' | AreaLetter | AreaList;
}

export type AreaMove = Command & {
  code: 'JM';
  area: AreaLetter;
}

export type AreaStatus = Command & {
  code: 'JD';
}

export type SignInRedisplay = Command & {
  code: 'JB';
}

export type PnrReceivedFrom = Command & {
  code: 'RF';
  text: string;
}

export type PnrEnd = Command & {
  code: 'ET' | 'ER' | 'ETK' | 'ERK';
}

export type PnrIgnore = Command & {
  code: 'IG' | 'IR';
}

export type PnrCancel = Command & (
  | {
      code: 'XE';
      lineNumber: number;
    }
  | {
      code: 'XI';
    }
  | {
      code: 'SX';
      segmentNumber: number;
    }
);

export type PnrRetrieve = Command & {
  code: 'RT';
  recordLocator: string;
}

export type ParsedCommand =
  | SignIn
  | SignOut
  | AreaMove
  | AreaStatus
  | SignInRedisplay
  | PnrReceivedFrom
  | PnrEnd
  | PnrIgnore
  | PnrCancel
  | PnrRetrieve;
