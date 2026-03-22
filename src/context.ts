/**
 * @file ContextHandler.ts
 *
 * Holds the temporary context window for every transaction.
 * Stores PNR data, available flights, and list of commands
 */

import type { Command } from '@reiebenezer/gdspark-parser/types';
import {
  BOOKING_CLASS_CODES,
  type BookingClass,
  type Flight,
} from './scenario';

export default function ContextHandler(): Context {
  const commandStack: Command[] = [];

  /** SS command data */
  let pnrData: PNRData | undefined = undefined;

  /** Passenger data */
  const passengers: PassengerData[] = [];

  return {
    addToCommandStack(command: Command) {
      commandStack.push(command);

      return commandStack.length - 1;
    },

    purgeFromCommandStack(line: number) {
      return commandStack.splice(line, 1)[0];
    },

    get pnrData() {
      if (!pnrData) {
        throw new Error(
          'PNR Data not defined. Use the SS command before accessing PNR data',
        );
      }

      return pnrData;
    },

    set pnrData(data) {
      if (data.passengerCount === 0) {
        throw new Error('Passenger count cannot be zero on a ticket!');
      }

      if (data.flightNumber < 1) {
        throw new Error('Invalid flight number.');
      }

      if (!BOOKING_CLASS_CODES.includes(data.bookingClass)) {
        throw new Error('Invalid booking class');
      }

      pnrData = data;
    },

    addPassenger(data: PassengerData) {
      passengers.push(data);
    },

    get passengerCount() {
      return passengers.length;
    },

    setPassengerMobile(mobile) {
      if (!pnrData) return;

      pnrData.passengerMobile = mobile;
    },

    setPassengerEmail(email) {
      if (!pnrData) return;

      pnrData.passengerEmail = email;
    },

    setTicketExpiry(date) {
      if (!pnrData) return;

      pnrData.ticketExpiry = date;
    },

    getDebugString() {
      return JSON.stringify({
        currentPNRData: pnrData,
        passengerNames: passengers
      }, undefined, 3);
    },
  };
}

export interface Context {
  addToCommandStack(command: Command): number;
  purgeFromCommandStack(line: number): Command | undefined;

  pnrData?: PNRData;

  addPassenger(data: PassengerData): void;
  readonly passengerCount: number;

  setPassengerMobile(mobile: string): void;
  setPassengerEmail(email: string): void;

  setTicketExpiry(date: Date): void;

  getDebugString(): string;
}

interface PNRData {
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
