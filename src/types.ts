import type { Command } from '@reiebenezer/gdspark-parser/types';

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
  dateOfFlight: Date;
  from: City;
  to: City;
  booking: Record<BookingClass, number>;
}

// ------------------------------------------------------------------------------------
// CONTEXT TYPES
// ------------------------------------------------------------------------------------
export interface Context {
  addToCommandStack(command: Command, reverse?: () => void): number;
  purgeFromCommandStack(line: number): Command | undefined;

  pnrData: PNRData;
  unsetPNRData(): void;

  addPassenger(...passengers: PassengerData[]): void;
  removePassenger(...passengers: PassengerData[]): void;

  readonly passengerCount: number;

  setPassengerMobile(mobile: string): void;
  setPassengerEmail(email: string): void;
  setTicketExpiry(date: Date): void;

  unsetPassengerMobile(): void;
  unsetPassengerEmail(): void;
  unsetTicketExpiry(): void;

  getReadonlyData(): ReadonlyContextData;

  addListener(listener: ContextListener): void;
}

export interface PNRData {
  passengerCount: number;
  bookingClass: BookingClass;
  flightNumber: number;
  passengerMobile?: string;
  passengerEmail?: string;
  ticketExpiry?: Date;
}

export interface PassengerData {
  surname: string;
  givenName: string;
  title?: string;
}

export interface ReadonlyContextData {
  pnrData: PNRData;
  passengers: readonly PassengerData[];
}

export type ContextListener = (updateData: {
  pnrData?: PNRData;
  passengers: readonly PassengerData[];
}) => void;

export class InterpreterError extends Error {
  constructor(message?: string, errorOptions?: ErrorOptions) {
    super(`Interpreter Error: ${message}`, errorOptions);
  }
}
