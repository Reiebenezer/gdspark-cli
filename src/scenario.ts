import { createRNG, type Seeder } from '@reiebenezer/ts-utils/random';
import { AIRLINE_IATA_CODES, AIRPORTS, type Flight } from './types';

export function generateFlights(seed?: number) {
  const seeder = createRNG(seed);

  const numberOfFlights = seeder.nextFromIntRange(10, 200);
  const flights: Flight[] = [];

  for (let i = 0; i < numberOfFlights; i++) {
    flights.push(generateRandomFlightDetails(seeder));
  }

  return flights;
}

export function generateRandomFlightDetails(seeder: Seeder): Flight {
  const dayDurationInMs = 1000 * 60 * 60 * 24;

  const airlineCode = seeder.pickFrom(AIRLINE_IATA_CODES);
  const dateOfFlight = seeder.nextDate(
    new Date(),
    new Date(Date.now() + dayDurationInMs * 5),
  );
  const from = seeder.pickFrom(AIRPORTS);
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
    dateOfFlight,
    from,
    to,
    booking: seats,
  };
}
