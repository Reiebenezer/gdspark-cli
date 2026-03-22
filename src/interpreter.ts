import type {
  AvailabilityCommand,
  Command,
  DeleteLineCommand,
  EndRecordCommand,
  NameCommand,
  PassengerEmailCommand,
  PassengerMobileCommand,
  SellCommand,
  TicketingLimitCommand,
} from '@reiebenezer/gdspark-parser/types';
import type { Context, PassengerData } from './context';
import type { BookingClass, Flight } from './scenario';
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
  command: Command,
  context: Context,
  flights: Flight[],
) {
  switch (command.code) {
    case 'AN':
      return handleAvailability(command as AvailabilityCommand);
      break;

    case 'SS':
      handleSelectFlight(command as SellCommand);
      break;

    case 'NM':
      handleAddName(command as NameCommand);
      break;

    case 'APM':
      handleAddPassengerMobile(command as PassengerMobileCommand);
      break;

    case 'APE':
      handleAddPassengerEmail(command as PassengerEmailCommand);
      break;

    case 'TKTL':
      handleSetTicketLimit(command as TicketingLimitCommand);
      break;

    case 'ER':
      handleSaveRecord();
      break;

    case 'XE':
      handleDeleteLine(command as DeleteLineCommand);
      break;

    case 'FXP':
    case 'FXB':
    case 'TTK':
      break;
  }

  function handleAvailability(command: AvailabilityCommand) {
    let month = MONTHS[command.travelMonth as keyof typeof MONTHS];

    if (!month) {
      throw new Error(`Invalid month code ${command.travelMonth}`); // this should not happen as the incorrect code is filtered out at parser level
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

    return filteredFlights;
  }

  function handleSelectFlight({
    bookingClass,
    flightNumber,
    passengerCount,
  }: SellCommand) {
    context.pnrData = {
      bookingClass: bookingClass as BookingClass,
      flightNumber,
      passengerCount,
    };
  }

  function handleAddName(command: NameCommand) {
    command.entries.forEach((v) => {
      if (v.count === 1) {
        context.addPassenger({
          surname: v.surname,
          givenName: v.givenNames[0]!,
          title: command.title,
        });
      } else
        for (const givenName of v.givenNames) {
          context.addPassenger({
            surname: v.surname,
            givenName,
            title: command.title,
          });
        }
    });
  }

  function handleAddPassengerMobile(command: PassengerMobileCommand) {
    context.setPassengerMobile(command.mobile);
  }

  function handleAddPassengerEmail(command: PassengerEmailCommand) {
    context.setPassengerEmail(command.email);
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
  }

  function handleSaveRecord() {
    // Do a check of everything

    /**
     * Compares registered passenger count from the NM command
     * to the passenger count projected in SS
     */
    if (context.pnrData?.passengerCount !== context.passengerCount) {
      throw new Error(
        `Passenger count mismatch. Registered ${context.pnrData?.passengerCount} passengers, but found ${context.passengerCount} names`,
      );
    }
  }

  function handleDeleteLine(command: DeleteLineCommand) {
    context.purgeFromCommandStack(command.lineNumber);
  }
}
