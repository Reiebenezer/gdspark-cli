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
  type TestDetails,
  type PNR,
  type Log,
  type StatusCode,
  RuntimeError,
  type Score,
  type InterpreterReturnType,
} from "./types";
import { generateFlights } from "./scenario";
import { parse } from "@reiebenezer/gdspark-parser";
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
} from "@reiebenezer/gdspark-parser/types";
import { calculateDate, createLog, filterFlights, isDateEqual } from "./utils";

export default function GDSparkInterpreter(seed?: number) {
  const flights = generateFlights(seed);

  /**
   * Flight query paramerters (set using the AN command)
   * This exists as a secondary cross check for `filteredFlights[]`
   */
  let flightQueryParams: FlightQueryParams | null = null;

  // ------------------------------------------------------------------------------------
  // PNR
  // ------------------------------------------------------------------------------------
  const pnr: PNR = {
    names: [],
    segments: [],
    email: undefined,
    mobile: undefined,
  };

  return {
    handleInput(
      commandString: string,
    ): readonly [InterpreterReturnType, Log | null] {
      try {
        const command = parse(commandString);
        switch (command.code) {
          case "AN":
            return handleAN(command);
            break;

          case "SS":
            return handleSS(command);
            break;

          case "NM":
            return handleNM(command);
            break;

          case "APM":
            return handleAPM(command);
            break;

          case "APE":
            return handleAPE(command);
            break;

          case "XE":
            return handleXE(command);
            break;

          case "TKTL":
            return handleTKTL(command);
            break;

          case "ER":
            return handleER(command);
            break;

          case "FXP":
          case "FXB":
          case "TTK":
            throw new RuntimeError("Unknown command");
        }
      } catch (error) {
        if (error instanceof RuntimeError)
          return [
            { type: "RuntimeError" },
            {
              type: "err",
              text: error.message,
            },
          ];
        else {
          throw error;
        }
      }
    },
  };

  // ------------------------------------------------------------------------------------
  // HANDLER FUNCTIONS
  // ------------------------------------------------------------------------------------

  function handleAN(
    command: AvailabilityCommand,
  ): readonly [InterpreterReturnType, Log | null] {
    const dateOfFlight = calculateDate(
      command.travelMonth as Month,
      command.travelDay,
    );

    // Check if origin and destination are valid airport entries
    if (!AIRPORTS.includes(command.origin as City))
      throw new RuntimeError("Invalid Origin City");

    if (!AIRPORTS.includes(command.destination as City))
      throw new RuntimeError("Invalid Destination City");

    // ------------------------------------------------------------------------------------
    // UPDATE FLIGHT QUERY PARAMS
    // ------------------------------------------------------------------------------------
    flightQueryParams = {
      dateOfFlight,
      origin: command.origin as City,
      destination: command.destination as City,
      airlineBrandCode: command.airlineBrandCode as AirlineCode,
    };

    return [
      {
        type: "AN",
        params: flightQueryParams,
        flights: filterFlights(flights, flightQueryParams)
      },
      null,
    ];
  }

  function handleSS(
    command: SellSegmentCommand,
  ): readonly [InterpreterReturnType, Log | null] {
    // ------------------------------------------------------------------------------------
    // COMMAND CHECKS
    // ------------------------------------------------------------------------------------
    if (!BOOKING_CLASS_CODES.includes(command.bookingClass as BookingClass))
      throw new RuntimeError("Invalid booking class");

    if (!flightQueryParams) {
      throw new RuntimeError(
        "Available flights not specified. Enter the AN command first before calling SS.",
      );
    }

    const filteredFlights = filterFlights(flights, flightQueryParams);

    if (
      command.flightNumber <= 0 ||
      command.flightNumber > filteredFlights.length
    ) {
      throw new RuntimeError("Invalid segment selection");
    }

    if (filteredFlights.length === 0) {
      return [{ type: "SS", segment: null }, createLog("No flights found")];
    }

    // We are trying to sell this segment
    const {
      airlineCode,
      flightNumber,
      booking,
      dateOfFlight,
      origin,
      destination,
    } = filteredFlights[command.flightNumber - 1]!;

    // Check for status code
    let statusCode: StatusCode;
    let warningLog: Log | null = null;

    if (booking[command.bookingClass as BookingClass] >= command.passengerCount)
      statusCode = "HK";
    else {
      warningLog = {
        type: "warn",
        text: "Available seats is insufficient for selected booking class. Will mark as UC",
      };
      statusCode = "UC";
    }

    const segment: PNRSegment = {
      airlineCode,
      flightNumber,
      bookingClass: command.bookingClass as BookingClass,
      dateOfFlight,
      origin,
      destination,
      statusCode,
      passengerCount: command.passengerCount,
    };

    pnr.segments.push(segment);

    return [{ type: "SS", segment: segment }, warningLog];
  }

  function handleNM(
    command: NameCommand,
  ): readonly [InterpreterReturnType, Log | null] {
    // Condense the name entries into one array
    const names = flattenNames(command);

    pnr.names.push(...names);
    return [{ type: "NM", names: names }, null];

    function flattenNames(command: NameCommand) {
      return command.entries.reduce((arr, n) => {
        if (n.count < 1)
          throw new RuntimeError(
            "Please specify a given name for the passenger",
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

  function handleAPM(
    command: PassengerMobileCommand,
  ): readonly [InterpreterReturnType, null] {
    if (!/^09\d{9}$/.test(command.mobile))
      throw new RuntimeError(
        "Invalid mobile number. Use number format 09xxxxxxxxx",
      );

    pnr.mobile = command.mobile;

    return [{ type: "APM", mobile: command.mobile }, null];
  }

  function handleAPE(
    command: PassengerEmailCommand,
  ): readonly [InterpreterReturnType, null] {
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(command.email))
      throw new RuntimeError("Invalid email format");

    pnr.email = command.email;
    return [{ type: "APE", email: command.email }, null];
  }

  function handleXE(
    command: CancelSegmentCommand,
  ): readonly [InterpreterReturnType, Log | null] {
    if (command.lineNumber <= 0 || command.lineNumber > pnr.segments.length)
      throw new RuntimeError("Invalid segment number");

    const segments = pnr.segments.splice(command.lineNumber - 1, 1);
    let log: Log | null = null;

    if (pnr.segments.length === 0) {
      log = createLog("No itinerary segments remaining after delete.", "warn");
    }

    return [{ type: "XE", segments }, log];
  }

  function handleTKTL(
    command: TicketingLimitCommand,
  ): readonly [InterpreterReturnType, null] {
    const deadline = calculateDate(command.month as Month, command.day);

    pnr.ticketingDeadline = deadline;
    return [{ type: "TKTL", date: deadline }, null];
  }

  function handleER(
    _command: EndRecordCommand,
  ): readonly [InterpreterReturnType, null] {
    if (!flightQueryParams) {
      throw new RuntimeError(
        "PNR incomplete. Add required fields first before calling ER.",
      );
    }

    // Return the results
    return [
      {
        type: "ER",
        data: {
          flightQueryParams,
          pnr,
        },
      },
      null,
    ];
  }
}
