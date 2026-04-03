import { createRNG, type Seeder } from '@reiebenezer/ts-utils/random';
import { AIRLINE_IATA_CODES, AIRPORTS, type Flight } from './types';

export function generateFlights(seed?: number) {
  const seeder = createRNG(seed);

  const numberOfFlights = seeder.nextFromIntRange(100, 500);
  const flights: Flight[] = [];

  for (let i = 0; i < numberOfFlights; i++) {
    flights.push(generateRandomFlightDetails(seeder, numberOfFlights, i));
  }

  return flights;
}

export function generateRandomFlightDetails(
  seeder: Seeder,
  numberOfFlights: number,
  index: number,
): Flight {
  const airlineCode = seeder.pickFrom(AIRLINE_IATA_CODES);
  const flightNumber = seeder.nextFromIntRange(100, 1000);

  const dateOfFlight = new Date();

  // Deterministic date to ensure equal distribution (up to 5 days in the future)
  dateOfFlight.setDate(
    dateOfFlight.getDate() + 1 + Math.floor((index / numberOfFlights) * 5),
  );

  // Made hours random though
  dateOfFlight.setHours(
    seeder.nextFromIntRange(1, 25),
    seeder.nextFromIntRange(1, 60),
    0,
    0,
  );

  // origin (deterministic)
  const origin = AIRPORTS[index % AIRPORTS.length]!;

  // For destination (does not return to origin airport so from is excluded)
  const filteredAirports = AIRPORTS.filter((c) => c !== origin);

  // destination
  const destination = filteredAirports[index % filteredAirports.length]!;

  // Booking classes
  const booking: Flight['booking'] = {
    F: seeder.nextFromIntRange(0, 10),
    J: seeder.nextFromIntRange(0, 10),
    C: seeder.nextFromIntRange(0, 10),
    W: seeder.nextFromIntRange(0, 10),
    N: seeder.nextFromIntRange(0, 10),
    Y: seeder.nextFromIntRange(0, 10),
    L: seeder.nextFromIntRange(0, 10),
    Q: seeder.nextFromIntRange(0, 10),
    V: seeder.nextFromIntRange(0, 10),
    O: seeder.nextFromIntRange(0, 10),
  };

  return {
    airlineCode,
    flightNumber,
    dateOfFlight,
    origin,
    destination,
    booking,
  };
}
