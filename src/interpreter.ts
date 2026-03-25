import type {
  AvailabilityCommand,
  Command,
  DeleteLineCommand,
  NameCommand,
  PassengerEmailCommand,
  PassengerMobileCommand,
  SellCommand,
  TicketingLimitCommand,
  EndRecordCommand,
} from '@reiebenezer/gdspark-parser/types';
import {
  InterpreterError,
  type BookingClass,
  type Context,
  type Flight,
  type PassengerData,
  type ReadonlyContextData,
} from './types';
import { isDateEqual } from './utils';

const MONTHS = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
} as const;

export function handleCommand(
  command: AvailabilityCommand,
  context: Context,
  flights: Flight[],
): Flight[];
export function handleCommand(
  command: EndRecordCommand,
  context: Context,
  flights: Flight[],
): ReadonlyContextData;
export function handleCommand(
  command: Command,
  context: Context,
  flights: Flight[],
): void | Flight[] | ReadonlyContextData;
export function handleCommand(
  command: Command,
  context: Context,
  flights: Flight[],
) {
  switch (command.code) {
    case 'AN':
      return handleCheckForAvailableFlights(command as AvailabilityCommand);

    case 'SS':
      return handleSelectFlight(command as SellCommand);

    case 'NM':
      return handleAddName(command as NameCommand);

    case 'APM':
      return handleAddPassengerMobile(command as PassengerMobileCommand);

    case 'APE':
      return handleAddPassengerEmail(command as PassengerEmailCommand);

    case 'TKTL':
      return handleSetTicketLimit(command as TicketingLimitCommand);

    case 'ER':
      return handleSaveRecord();

    case 'XE':
      return handleDeleteLine(command as DeleteLineCommand);

    case 'FXP':
    case 'FXB':
    case 'TTK':
      return;
  }

  /**
   * A display function for showing available list of flights.
   * @returns A list of flights.
   */
  function handleCheckForAvailableFlights(command: AvailabilityCommand) {
    let month = MONTHS[command.travelMonth as keyof typeof MONTHS];

    if (!month) {
      throw new InterpreterError(`Invalid month code ${command.travelMonth}`); // this should not happen as the incorrect code is filtered out at parser level
    }

    // Auto-parse new year (future lookahead)
    const inputDate = new Date();

    inputDate.setMonth(month);
    inputDate.setDate(parseInt(command.travelDay));

    // Increment flight date by 1 if flight date is in the past
    if (inputDate.getTime() <= new Date().getTime()) {
      inputDate.setFullYear(inputDate.getFullYear() + 1);
    }

    // filter flights
    let filteredFlights = flights.filter((f) =>
      isDateEqual(f.dateOfFlight, inputDate),
    );

    // filter flights even further if airline code is indicated
    if (command.airlineBrandCode) {
      filteredFlights = filteredFlights.filter(
        (f) => f.airlineCode === command.airlineBrandCode,
      );
    }

    /** Add to command stack */
    context.addToCommandStack(command);

    /** Check if there are entries, throw an error if no entries */
    if (filteredFlights.length === 0) {
      throw new InterpreterError(
        'No flights are available for the selected query',
      );
    }

    return filteredFlights;
  }

  /**
   * Selects a flight from the available list of flights.
   * Flight numbers start from 1 onwards
   */
  function handleSelectFlight({
    bookingClass,
    flightNumber,
    passengerCount,
  }: SellCommand) {
    if (flightNumber < 0 || flightNumber >= flights.length) {
      throw new InterpreterError('Flight number is not on the list!');
    }

    const selectedFlight = flights[flightNumber - 1];

    // Check if selected flight exists
    if (!selectedFlight) {
      throw new InterpreterError('Flight number is not on the list!');
    }

    // Check if valid booking class and exists for the selected flight
    if (!(bookingClass in selectedFlight.booking)) {
      throw new InterpreterError('Invalid booking class for selected flight.');
    }

    // Check if there are enough seats
    if (selectedFlight.booking[bookingClass as BookingClass] < passengerCount) {
      throw new Error(
        'Not enough passenger seats available for selected booking class.',
      );
    }

    // Add to context window
    context.pnrData = {
      bookingClass: bookingClass as BookingClass,
      flightNumber,
      passengerCount,
    };

    // Command stack
    context.addToCommandStack(command, context.unsetPNRData);
  }

  /** Adds a bunch of passengers (NM command) */
  function handleAddName(command: NameCommand) {
    const passengers = command.entries.reduce((p, v) => {
      if (v.count === 1) {
        p.push({
          surname: v.surname,
          givenName: v.givenNames[0]!,
          title: command.title,
        });
      } else
        for (const givenName of v.givenNames) {
          p.push({
            surname: v.surname,
            givenName,
            title: command.title,
          });
        }

      return p;
    }, [] as PassengerData[]);

    context.addPassenger(...passengers);

    context.addToCommandStack(command, () => {
      context.removePassenger(...passengers);
    });
  }

  function handleAddPassengerMobile(command: PassengerMobileCommand) {
    context.setPassengerMobile(command.mobile);
    context.addToCommandStack(command, context.unsetPassengerMobile);
  }

  function handleAddPassengerEmail(command: PassengerEmailCommand) {
    context.setPassengerEmail(command.email);
    context.addToCommandStack(command, context.unsetPassengerEmail);
  }

  function handleSetTicketLimit(command: TicketingLimitCommand) {
    let month = MONTHS[command.month as keyof typeof MONTHS];

    // Auto-parse new year (future lookahead)
    const expiryDate = new Date();

    expiryDate.setMonth(month);
    expiryDate.setDate(command.day);

    // Increment flight date by 1 if flight date is in the past
    if (expiryDate.getTime() <= new Date().getTime()) {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    context.setTicketExpiry(expiryDate);
    context.addToCommandStack(command, context.unsetTicketExpiry);
  }

  function handleSaveRecord() {
    // Do a check of everything

    // Check if all required entries exist
    if (!context.pnrData) {
      throw new InterpreterError(`Flight number not selected.`);
    }

    if (!context.pnrData.ticketExpiry) {
      throw new InterpreterError(`Ticket expiry date not specified.`);
    }

    // Compares passenger count registered via SS vs. number of names listed via NM
    if (context.pnrData?.passengerCount !== context.passengerCount) {
      throw new InterpreterError(
        `Passenger count mismatch. Registered ${context.pnrData?.passengerCount} passengers, but found ${context.passengerCount} names`,
      );
    }

    // return a readonly copy of items
    return context.getReadonlyData();
  }

  function handleDeleteLine(command: DeleteLineCommand) {
    context.purgeFromCommandStack(command.lineNumber);
  }
}