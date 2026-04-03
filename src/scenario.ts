import { createRNG, type Seeder } from '@reiebenezer/ts-utils/random';
import { AIRLINE_IATA_CODES, AIRPORTS, type Flight } from './types';

export function generateFlights(seed?: number) {
  const seeder = createRNG(seed);

  // Creates a random distribution of airport origin-destination pairs
  // This allows for even distribution amongst flights
  const airportPairs = createShuffledAirportPairs(seeder);

  const numberOfFlights = seeder.nextFromIntRange(1000, 2000);
  const flights: Flight[] = [];

  for (let i = 0; i < numberOfFlights; i++) {
    flights.push(
      generateRandomFlightDetails(seeder, numberOfFlights, i, airportPairs),
    );
  }

  return flights;
}

export function generateRandomFlightDetails(
  seeder: Seeder,
  numberOfFlights: number,
  index: number,
  airportPairs: ReadonlyArray<readonly [Flight['origin'], Flight['destination']]>,
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

  // Cycle through all valid airport pairs after a seeded shuffle so every
  // origin/destination combination appears roughly evenly across the dataset.
  const [origin, destination] = airportPairs[index % airportPairs.length]!;

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

function createShuffledAirportPairs(
  seeder: Seeder,
): Array<readonly [Flight['origin'], Flight['destination']]> {
  const pairs: Array<readonly [Flight['origin'], Flight['destination']]> = [];

  for (const origin of AIRPORTS) {
    for (const destination of AIRPORTS) {
      if (origin === destination) {
        continue;
      }

      pairs.push([origin, destination]);
    }
  }

  for (let i = pairs.length - 1; i > 0; i--) {
    const j = seeder.nextFromIntRange(0, i + 1);
    [pairs[i], pairs[j]] = [pairs[j]!, pairs[i]!];
  }

  return pairs;
}
