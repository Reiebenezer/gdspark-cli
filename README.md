# GDSpark Interpreter

Internal interpreter package for GDSpark frontend flows.

## Usage

Generate a scenario from a seed by calling `generateFlights(seed)`, then initialize the working context with `ContextHandler()`.

```ts
import { ContextHandler, generateFlights, handleCommand } from 'gdspark-interpreter';
import { parse } from '@reiebenezer/gdspark-parser';

const seed = 12345;
const flights = generateFlights(seed);
const context = ContextHandler();
```

Whenever the frontend sends a command string:

1. Parse the command with `parse()`.
2. Add the parsed command to the command stack with `context.addToCommandStack(command)`.
3. Handle the command with `handleCommand(command, context, flights)`.

```ts
const command = parse(input);
context.addToCommandStack(command);
handleCommand(command, context, flights);
```

## Frontend flow

```ts
import { ContextHandler, generateFlights, handleCommand } from 'gdspark-interpreter';
import { parse } from '@reiebenezer/gdspark-parser';

const flights = generateFlights(seed);
const context = ContextHandler();

function onCommand(input: string) {
  const command = parse(input);
  context.addToCommandStack(command);
  handleCommand(command, context, flights);
}
```

This package is intended for internal use with GDSpark.
