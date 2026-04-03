import type { Command, ParsedCommand } from '@reiebenezer/gdspark-parser/types';

export const AIRLINE_IATA_CODES = [
  'PR', // Philippine Airlines
  '5J', // Cebu Pacific
  'Z2', // Air Asia Philippines
  '2P', // PAL Express
  'DG', // CebGo
  'T6', // Airswift
] as const; // ICAO

export const AIRPORTS = [
  'MNL', // Ninoy Aquino International Airport
  'CEB', // Mactan-Cebu International Airport
  'ILO', // Iloilo International Airport
  'CRK', // Clark International Airport
  'DVO', // Francisco Bangoy International Airport (Davao)
  'PPS', // Puerto Princesa National Airport
  'MPH', // Godofredo P. Ramos Airport (Caticlan/Boracay)
  'KLO', // Kalibo International Airport
  'ZBO', // Zamboanga Airport
  'BCD', // Bacolod-Silay International Airport
] as const;

/** This set of flight classes is a trimmed-down version of the Philippine Airlines (PAL) list of Booking Class Codes (BCCs) */
export const BOOKING_CLASS_CODES = [
  // ------------------------------------------------------------------------------------
  // FIRST CLASS
  // ------------------------------------------------------------------------------------
  'F',

  // ------------------------------------------------------------------------------------
  // BUSINESS CLASS
  // ------------------------------------------------------------------------------------
  'J',
  'C',

  // ------------------------------------------------------------------------------------
  // ECONOMY PREMIUM (Upgrades or premium seating)
  // ------------------------------------------------------------------------------------
  'W',
  'N',

  // ------------------------------------------------------------------------------------
  // ECONOMY FLEX (100% accrual, lower change fees)
  // ------------------------------------------------------------------------------------
  'Y',
  'L',

  // ------------------------------------------------------------------------------------
  // ECONOMY DISCOUNTED/SAVER (lower accrual, higher fees, no baggage)
  // ------------------------------------------------------------------------------------
  'Q',
  'V',
  'O',
] as const;

export type AirlineCode = (typeof AIRLINE_IATA_CODES)[number];
export type City = (typeof AIRPORTS)[number];
export type BookingClass = (typeof BOOKING_CLASS_CODES)[number];

export interface Flight {
  airlineCode: AirlineCode;
  flightNumber: number;
  dateOfFlight: Date;
  origin: City;
  destination: City;
  booking: Record<BookingClass, number>;
}

// ------------------------------------------------------------------------------------
// CONTEXT TYPES
// ------------------------------------------------------------------------------------
export interface FlightQueryParams {
  airlineBrandCode?: AirlineCode;
  dateOfFlight: Date;
  origin: City;
  destination: City;
}

export interface PNRSegment {
  airlineCode: AirlineCode;
  flightNumber: number;
  bookingClass: BookingClass;
  dateOfFlight: Date;
  origin: City;
  destination: City;
  statusCode: StatusCode;
  passengerCount: number;
}

export type StatusCode = 'HK' | 'UC'; // simplified, no need for asynchronous flight simulation changes

export interface PNRPassengerName {
  surname: string;
  givenName: string;
  title?: string;
}

export interface PNR {
  names: PNRPassengerName[];
  segments: PNRSegment[];
  mobile?: string;
  email?: string;
  ticketingDeadline?: Date;
}

export interface TestConstraints {
  expectedANQuery: FlightQueryParams;
  expectedPNR: PNR;
}

export type StateUpdater = (newState: SessionState) => void;

export interface SessionState {
  flightQueryParams?: FlightQueryParams;
  flightSelectionParams?: PNRSegment;
  passengers: PNRPassengerName[];
  mobile?: string;
  email?: string;
}

export const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export type Month = (typeof MONTHS)[number];

// ------------------------------------------------------------------------------------
// Logging (for listening via frontend)
// ------------------------------------------------------------------------------------
export interface Log {
  type: 'warn' | 'err' | 'info';
  text: string;
}

export class RuntimeError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
