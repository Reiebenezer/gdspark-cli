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

export function generateRandomFlightDetails(seeder: Seeder, numberOfFlights: number, index: number): Flight {
  const airlineCode = seeder.pickFrom(AIRLINE_IATA_CODES);
  const flightNumber = seeder.nextFromIntRange(100, 1000);

  const dateOfFlight = new Date();
  
  // Deterministic date to ensure equal distribution
  dateOfFlight.setDate(dateOfFlight.getDate() + Math.floor(index / numberOfFlights * 5));
  
  // Made hours random though
  dateOfFlight.setHours(seeder.nextFromIntRange(1, 25), seeder.nextFromIntRange(1, 60), 0, 0);

  // origin
  const from = seeder.pickFrom(AIRPORTS);

  // destination
  const to = seeder.pickFrom(AIRPORTS.filter((c) => c !== from)); // filtered to ensure that there is no same from-to city
  const seats: Flight['booking'] = {
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
    origin: from,
    destination: to,
    booking: seats,
  };
}
