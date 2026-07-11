import { describe, expect, it } from 'vitest';
import { buildAvailabilitySnapshot } from '../../../src/modules/cafe/cafe-availability';

const zones = [
  {
    id: 'zone-1',
    name: 'Quiet Zone',
    seats: [
      {
        id: 'seat-1',
        seatNumber: 'A1',
        seatType: 'STANDARD',
        amenities: ['power'],
      },
      {
        id: 'seat-2',
        seatNumber: 'A2',
        seatType: 'STANDARD',
        amenities: [],
      },
    ],
  },
  {
    id: 'zone-2',
    name: 'Group Zone',
    seats: [
      {
        id: 'seat-3',
        seatNumber: 'B1',
        seatType: 'GROUP',
        amenities: ['monitor'],
      },
    ],
  },
];

describe('SeatAvailabilityService', () => {
  it('marks booked seats as BOOKED and other seats as AVAILABLE', () => {
    const result = buildAvailabilitySnapshot(zones, new Set(['seat-2']));

    expect(result.zones[0].seats).toEqual([
      expect.objectContaining({ id: 'seat-1', status: 'AVAILABLE' }),
      expect.objectContaining({ id: 'seat-2', status: 'BOOKED' }),
    ]);
    expect(result.summary).toEqual({
      totalAvailable: 2,
      totalBooked: 1,
      total: 3,
    });
  });

  it('handles a cafe with no zones or seats', () => {
    const result = buildAvailabilitySnapshot([], new Set());

    expect(result).toEqual({
      zones: [],
      summary: {
        totalAvailable: 0,
        totalBooked: 0,
        total: 0,
      },
    });
  });

  it('filters availability by zone', () => {
    const result = buildAvailabilitySnapshot(zones, new Set(['seat-3']), 'zone-2');

    expect(result.zones).toHaveLength(1);
    expect(result.zones[0]).toMatchObject({
      id: 'zone-2',
      seats: [expect.objectContaining({ id: 'seat-3', status: 'BOOKED' })],
    });
    expect(result.summary).toEqual({
      totalAvailable: 0,
      totalBooked: 1,
      total: 1,
    });
  });
});
