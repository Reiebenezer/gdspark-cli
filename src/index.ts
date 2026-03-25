import { parse } from '@reiebenezer/gdspark-parser';
import ContextHandler from './context';
import type { Context, ContextListener, Flight, ReadonlyContextData } from './types';
import { handleCommand } from './interpreter';
import { generateFlights } from './scenario';

export default class GDSparkInterpreter {
  private context: Context;
  private flights: Flight[];

  private onSelectFlightHandler?: (flights: Flight[]) => void;
  private onSaveRecordHandler?: (record: ReadonlyContextData) => void;

  constructor(seed?: number) {
    this.context = ContextHandler();
    this.flights = generateFlights(seed);
  }

  execute(commandStr: string) {
    const command = parse(commandStr);
    const output = handleCommand(command, this.context, this.flights);

    if (Array.isArray(output)) {
      // This is select flight
      this.onSelectFlightHandler?.(output);
    }

    else if (output) {
      this.onSaveRecordHandler?.(output);
    }
  }

  addDataListener(listener: ContextListener) {
    this.context.addListener(listener);
  }

  onSelectFlight(handler: (flights: Flight[]) => void) {
    this.onSelectFlightHandler = handler;
  }

  onSaveRecord(handler: (record: ReadonlyContextData) => void) {
    this.onSaveRecordHandler = handler;
  }
}
