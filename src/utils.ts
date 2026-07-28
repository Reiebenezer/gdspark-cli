import type { Flight } from "../dist/types";
import {
  MONTHS,
  type Month,
  RuntimeError,
  type Log,
  type FlightQueryParams,
} from "./types";

/**
 * Compares two dates if they're equal, regardless of time
 */
export function isDateEqual(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

/**
 * Creates a future-based date object.
 * Auto-advances 1 year if `month` and `day` result to a past date
 */
export function calculateDate(month: Month, day: number) {
  const monthIdx = MONTHS.indexOf(month);
  if (monthIdx === -1) throw new RuntimeError("Invalid month");

  const now = new Date();
  const year = now.getFullYear();

  let candidate = new Date(year, monthIdx, day);

  // Throw error here if date has auto-rolled
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== monthIdx ||
    candidate.getDate() !== day
  )
    throw new Error("Invalid date");

  // Normalize for dates
  candidate.setHours(0, 0, 0, 0);

  // Create new date object from now with hours stripped
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (candidate < today) {
    candidate.setFullYear(year + 1);
  }

  return candidate;
}

export function createLog(text: string, type: Log["type"] = "info"): Log {
  return { type, text };
}

export function filterFlights(flights: Flight[], params: FlightQueryParams) {
  return flights.filter(
    (f) =>
      params.dateOfFlight.getFullYear() === f.dateOfFlight.getFullYear() &&
      params.dateOfFlight.getMonth() === f.dateOfFlight.getMonth() &&
      params.dateOfFlight.getDate() === f.dateOfFlight.getDate() &&
      params.origin === f.origin &&
      params.destination === f.destination &&
      (!params.airlineBrandCode || params.airlineBrandCode === f.airlineCode),
  );
}
