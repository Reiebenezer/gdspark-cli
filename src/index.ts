export { default as ContextHandler } from './context';
export type { Context, PassengerData } from './context';

export { handleCommand } from './interpreter';

export {
  generateFlights,
  generateRandomFlightDetails,
  BOOKING_CLASS_CODES,
} from './scenario';
export type { AirlineCode, BookingClass, City, Flight } from './scenario';

export { isDateEqual } from './utils';
