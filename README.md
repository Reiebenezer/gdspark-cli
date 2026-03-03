# gdspark-cli

CLI parser for GDS-style commands. It tokenizes and parses input into an AST JSON output.

## Requirements

- [Bun](https://bun.com)

## Install

```bash
bun install
```

## Run

Start interactive mode:

```bash
bun run src/index.ts
```

Then enter one command per line. The CLI prints parsed AST JSON for each line. 

Exit commands:
- `exit`
- `quit`
- `:q`

## Commands Covered

The parser currently supports:

- `JI` sign in
- `JJ` sign in
- `JO` sign out
- `JM` area move
- `JD` area status
- `JB` sign-in redisplay
- `RF` received from
- `ET` end transaction
- `ER` end and redisplay
- `ETK` end transaction and keep
- `ERK` end and redisplay and keep
- `IG` ignore
- `IR` ignore and redisplay
- `XE` cancel line
- `XI` cancel itinerary
- `SX` cancel segment
- `RT` retrieve record locator

## Syntax Notes

- `JI` / `JJ`: supports optional area selector (`*`, single area, or area list like `A/B/C`), required `agentSign/dutyCode`, optional `- password`
- `JO`: requires area selector (`*`, `A`, or `A/B/C`)
- `JM`: requires one area letter `A` to `F`
- `RF`: requires whitespace after `RF`, then free text
- `XE`: requires whitespace before integer (example: `XE 12`)
- `SX`: must be compact with integer (example: `SX6`)
- `RT`: requires a 6-character alphanumeric record locator

## Examples

```text
JI * ABC123/GS - secret
JO A/B/C
JM F
RF JOHN DOE
ET
XE 12
SX6
RT ABC123
```
