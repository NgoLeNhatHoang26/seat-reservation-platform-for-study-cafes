type SeatRow = {
  id: string;
  seatNumber: string;
  seatType: string;
  amenities: unknown;
};

type ZoneRow = {
  id: string;
  name: string;
  seats: SeatRow[];
};

type SeatStatus = 'AVAILABLE' | 'BOOKED';

export function buildAvailabilitySnapshot(
  zones: ZoneRow[],
  bookedSeatIds: Set<string>,
  zoneId?: string,
) {
  let totalAvailable = 0;
  let totalBooked = 0;

  const resultZones = zones
    .filter((zone) => !zoneId || zone.id === zoneId)
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      seats: zone.seats.map((seat) => {
        const status: SeatStatus = bookedSeatIds.has(seat.id) ? 'BOOKED' : 'AVAILABLE';
        if (status === 'AVAILABLE') totalAvailable++;
        else totalBooked++;
        return { ...seat, status };
      }),
    }));

  return {
    zones: resultZones,
    summary: {
      totalAvailable,
      totalBooked,
      total: totalAvailable + totalBooked,
    },
  };
}
