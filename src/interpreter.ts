import {
  AIRPORTS,
  BOOKING_CLASS_CODES,
  MONTHS,
  type AirlineCode,
  type BookingClass,
  type City,
  type Flight,
  type FlightQueryParams,
  type PNRSegment,
  type SessionState,
  type Month,
  type PNRPassengerName,
  type StateUpdater,
  type TestConstraints,
  type PNR,
  type Log,
  type StatusCode,
  RuntimeError,
} from './types';
import { generateFlights } from './scenario';
import { parse } from '@reiebenezer/gdspark-parser';
import type {
  AvailabilityCommand,
  Command,
  CommandCode,
  CancelSegmentCommand,
  NameCommand,
  ParsedCommand,
  PassengerEmailCommand,
  PassengerMobileCommand,
  SellSegmentCommand,
  TicketingLimitCommand,
  EndRecordCommand,
} from '@reiebenezer/gdspark-parser/types';
import { derived, effect, signal } from '@reiebenezer/ts-utils/signal';
import { calculateDate } from './utils';

export default function GDSparkInterpreter(
  seed?: number,
  testConstraints?: TestConstraints,
) {
  const flights = generateFlights(seed);
  const log = signal<Log>();

  // ------------------------------------------------------------------------------------
  // AN
  // ------------------------------------------------------------------------------------

  /**
   * Flight query paramerters (set using the AN command)
   * This exists as a secondary cross check for `filteredFlights[]`
   */
  const flightQueryParams = signal<FlightQueryParams>();

  /**
   * A filtered list of flights from `queryParams`
   *
   * The reason why this can be `undefined` is that there is a difference between a query returning zero values vs no filter at all.
   * Simply put, no filter = `undefined`, and filters that give 0 output = `[]`.
   */
  const displayedFlights = derived(() => {
    const params = flightQueryParams.get();

    if (!params) return undefined;

    return flights.filter(
      (f) =>
        params.dateOfFlight.getFullYear() === f.dateOfFlight.getFullYear() &&
        params.dateOfFlight.getMonth() === f.dateOfFlight.getMonth() &&
        params.dateOfFlight.getDate() === f.dateOfFlight.getDate() &&
        params.origin === f.origin &&
        params.destination === f.destination &&
        (!params.airlineBrandCode || params.airlineBrandCode === f.airlineCode),
    );
  }, [flightQueryParams]);

  // ------------------------------------------------------------------------------------
  // PNR
  // ------------------------------------------------------------------------------------
  const pnr = signal<PNR>({
    names: [],
    segments: [],
    email: undefined,
    mobile: undefined,
  });

  const stateData = derived(
    () => ({
      queryParams: flightQueryParams.get(),
      displayedFlights: displayedFlights.get(),
      pnr: pnr.get(),
    }),
    [flightQueryParams, pnr],
  );

  return {
    handleInput(commandString: string) {
      try {
        const command = parse(commandString);
        switch (command.code) {
          case 'AN':
            handleAN(command);
            break;

          case 'SS':
            handleSS(command);
            break;

          case 'NM':
            handleNM(command);
            break;

          case 'APM':
            handleAPM(command);
            break;

          case 'APE':
            handleAPE(command);
            break;

          case 'XE':
            handleXE(command);
            break;

          case 'TKTL':
            handleTKTL(command);
            break;

          case 'ER':
            handleER(command);
            break;

          case 'FXP':
          case 'FXB':
          case 'TTK':
        }
      } catch (error) {
        if (error instanceof RuntimeError)
          log.set({
            type: 'err',
            text: error.message,
          });

        else {
          throw error;
        }
      }
    },

    addListener(fn: (data: { displayedFlights?: Flight[]; pnr: PNR }) => void) {
      return effect(() => fn(stateData.get()), [stateData], false);
    },

    addLogListener(fn: (log: Log) => void) {
      return effect(
        () => {
          const _log = log.get();
          if (_log) fn(_log);
        },
        [log],
        false,
      );
    },

    addDebugMethod(fn: (flights: Flight[], displayedFlights?: Flight[], pnr?: PNR)  => void) {
      return effect(() => fn(flights, displayedFlights.get(), pnr.get()), [displayedFlights, pnr]);
    }
  };

  // ------------------------------------------------------------------------------------
  // HANDLER FUNCTIONS
  // ------------------------------------------------------------------------------------

  function handleAN(command: AvailabilityCommand) {
    const dateOfFlight = calculateDate(
      command.travelMonth as Month,
      command.travelDay,
    );

    // Check if origin and destination are valid airport entries
    if (!AIRPORTS.includes(command.origin as City))
      throw new RuntimeError('Invalid Origin City');

    if (!AIRPORTS.includes(command.destination as City))
      throw new RuntimeError('Invalid Destination City');

    // ------------------------------------------------------------------------------------
    // UPDATE FLIGHT QUERY PARAMS
    // ------------------------------------------------------------------------------------
    flightQueryParams.set({
      dateOfFlight,
      origin: command.origin as City,
      destination: command.destination as City,
      airlineBrandCode: command.airlineBrandCode as AirlineCode,
    });
  }

  function handleSS(command: SellSegmentCommand) {
    const _displayedFlights = displayedFlights.get();

    // ------------------------------------------------------------------------------------
    // COMMAND CHECKS
    // ------------------------------------------------------------------------------------
    if (!BOOKING_CLASS_CODES.includes(command.bookingClass as BookingClass))
      throw new RuntimeError('Invalid booking class');

    if (!_displayedFlights)
      throw new RuntimeError(
        'Available flights not specified. Enter the AN command first before calling SS.',
      );

    if (
      command.flightNumber <= 0 ||
      command.flightNumber > _displayedFlights.length
    )
      throw new RuntimeError('Invalid segment selection');

    // We are trying to sell this segment
    const { airlineCode, booking, dateOfFlight, origin, destination } =
      _displayedFlights[command.flightNumber - 1]!;

    // Check for status code
    let statusCode: StatusCode;

    if (booking[command.bookingClass as BookingClass] >= command.passengerCount)
      statusCode = 'HK';
    else {
      log.set({
        type: 'warn',
        text: 'Available seats is insufficient for selected booking class. Will mark as UC',
      });

      statusCode = 'UC';
    }

    pnr.update((prev) => {
      prev.segments.push({
        airlineCode,
        bookingClass: command.bookingClass as BookingClass,
        dateOfFlight,
        origin,
        destination,
        statusCode,
        passengerCount: command.passengerCount,
      });

      return { ...prev };
    });
  }

  function handleNM(command: NameCommand) {
    // Condense the name entries into one array
    pnr.update((prev) => {
      prev.names.push(...flattenNames(command));
      return { ...prev };
    });

    function flattenNames(command: NameCommand) {
      return command.entries.reduce((arr, n) => {
        if (n.count < 1)
          throw new RuntimeError(
            'Please specify a given name for the passenger',
          );

        for (const givenName of n.givenNames) {
          arr.push({
            surname: n.surname,
            givenName,
            title: command.title,
          });
        }

        return arr;
      }, [] as PNRPassengerName[]);
    }
  }

  function handleAPM(command: PassengerMobileCommand) {
    if (!/^09\d{9}$/.test(command.mobile))
      throw new RuntimeError(
        'Invalid mobile number. Use number format 09xxxxxxxxx',
      );

    pnr.update((prev) => {
      prev.mobile = command.mobile;
      return { ...prev };
    });
  }

  function handleAPE(command: PassengerEmailCommand) {
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(command.email))
      throw new RuntimeError('Invalid email format');

    pnr.update((prev) => {
      prev.email = command.email;
      return { ...prev };
    });
  }

  function handleXE(command: CancelSegmentCommand) {
    if (command.lineNumber <= 0 || command.lineNumber > pnr.get().segments.length) 
      throw new RuntimeError('Invalid segment number');

    pnr.update((prev) => {
      prev.segments.splice(command.lineNumber - 1, 1);
      if (prev.segments.length === 0) {
        log.set({
          type: 'warn',
          text: 'No itinerary segments remaining after delete.',
        });
      }

      return { ...prev };
    });
  }

  function handleTKTL(command: TicketingLimitCommand) {
    const deadline = calculateDate(command.month as Month, command.day);

    pnr.update((prev) => {
      prev.ticketingDeadline = deadline;
      return { ...prev };
    });
  }

  /** TODO: implement evaluation */
  function handleER(_command: EndRecordCommand) {
    // We evaluate here
    const finalPNR = pnr.get();
    const finalFlightQueryParams = flightQueryParams.get();
  }
}
