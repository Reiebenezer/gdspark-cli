/**
 * @file ContextHandler.ts
 *
 * Holds the temporary context window for every transaction.
 * Stores PNR data, available flights, and list of commands
 */

import type { Command } from '@reiebenezer/gdspark-parser/types';
import {
  BOOKING_CLASS_CODES,
  InterpreterError,
  type Context,
  type ContextListener,
  type PassengerData,
  type PNRData,
} from './types';

export default function ContextHandler(): Context {
  const commandStack: {
    command: Command;
    reverse?: () => void;
  }[] = [];

  let pnrData: PNRData | undefined = undefined;
  let passengers: PassengerData[] = [];
  const listeners: ContextListener[] = [];

  return {
    addToCommandStack(command, reverse) {
      commandStack.push({ command, reverse });
      return commandStack.length - 1;
    },

    purgeFromCommandStack(line) {
      const stackItem = commandStack.splice(line, 1)[0];
      if (!stackItem) return;

      stackItem.reverse?.();
      return stackItem.command;
    },

    get pnrData() {
      if (!pnrData) {
        throw new InterpreterError(
          'PNR Data not defined. Use the SS command before accessing PNR data',
        );
      }

      return structuredClone(pnrData);
    },

    set pnrData(data) {
      pnrData = data;
      invokeUpdate();
    },

    unsetPNRData() {
      pnrData = undefined;
    },

    addPassenger(...data) {
      passengers.push(...data);
      invokeUpdate();
    },

    removePassenger(...data) {
      passengers = passengers.filter(
        (p) =>
          !data.some(
            (p2) =>
              p2.surname === p.surname &&
              p2.givenName === p.givenName &&
              p2.title === p.title,
          ),
      );
    },

    get passengerCount() {
      return passengers.length;
    },

    setPassengerMobile(mobile) {
      if (!pnrData) return;

      pnrData.passengerMobile = mobile;
      invokeUpdate();
    },

    setPassengerEmail(email) {
      if (!pnrData) return;

      pnrData.passengerEmail = email;
      invokeUpdate();
    },

    setTicketExpiry(date) {
      if (!pnrData) return;

      pnrData.ticketExpiry = date;
      invokeUpdate();
    },

    unsetPassengerMobile() {
      if (!pnrData) return;

      pnrData.passengerMobile = undefined;
      invokeUpdate();
    },

    unsetPassengerEmail() {
      if (!pnrData) return;

      pnrData.passengerEmail = undefined;
      invokeUpdate();
    },

    unsetTicketExpiry() {
      if (!pnrData) return;

      pnrData.ticketExpiry = undefined;
      invokeUpdate();
    },

    addListener(listener) {
      listeners.push(listener);
    },

    getReadonlyData() {
      if (!pnrData)
        throw new InterpreterError(
          'Cannot get readonly data without selecting flight.',
        );

      return {
        pnrData,
        passengers,
      };
    },
  };

  function invokeUpdate() {
    listeners.forEach(
      (l) => pnrData && l({ pnrData: structuredClone(pnrData), passengers }),
    );
  }
}
