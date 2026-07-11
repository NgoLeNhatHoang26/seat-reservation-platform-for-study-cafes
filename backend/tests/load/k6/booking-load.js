import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import {
  createBooking,
  futureSlot,
  getAvailability,
  getFirstCafeId,
  listAvailableSeats,
  pickSeatForVu,
} from './helpers.js';

export const bookingExpectedStatus = new Rate('booking_expected_status');
export const availabilitySuccess = new Rate('availability_success');

const loadVus = Number(__ENV.LOAD_VUS || 20);
const users = JSON.parse(open('./load-users.json'));

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP || '30s', target: loadVus },
    { duration: __ENV.LOAD_DURATION || '2m', target: loadVus },
    { duration: __ENV.RAMP_DOWN || '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    availability_success: ['rate>0.95'],
    booking_expected_status: ['rate>0.95'],
    checks: ['rate>0.95'],
  },
};

export function setup() {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('load-users.json is missing or empty. Run `npx tsx tests/load/issue-load-tokens.ts` first.');
  }

  if (users.length < loadVus) {
    throw new Error(
      `Need at least ${loadVus} load-test users, found ${users.length}. Increase seed count or lower LOAD_VUS.`,
    );
  }

  const cafeId = getFirstCafeId();
  const slot = futureSlot();
  const availability = getAvailability(cafeId, slot);

  const availabilityOk = check(availability, {
    'setup availability returns 200': (res) => res.status === 200,
    'setup availability has zones': (res) =>
      res.status === 200 && (res.json('data.zones') || []).length > 0,
  });

  if (!availabilityOk) {
    throw new Error(`Cannot prepare booking load data: ${availability.status} ${availability.body}`);
  }

  const seats = listAvailableSeats(availability);
  if (seats.length === 0) {
    throw new Error(`No available seats for slot ${slot.startTime} -> ${slot.endTime}`);
  }

  return {
    cafeId,
    slot,
    seats,
  };
}

export default function (data) {
  const user = users[(__VU - 1) % users.length];

  const availability = getAvailability(data.cafeId, data.slot);
  const availabilityOk = availability.status === 200;
  availabilitySuccess.add(availabilityOk);
  check(availability, {
    'availability returns 200': (res) => res.status === 200,
  });

  const seatId = pickSeatForVu(availability, __VU, data.seats);
  const booking = createBooking(user.accessToken, data.cafeId, seatId, data.slot);
  const expectedBookingStatus = booking.status === 201 || booking.status === 409;
  bookingExpectedStatus.add(expectedBookingStatus);

  check(booking, {
    'booking returns 201 or 409': (res) => res.status === 201 || res.status === 409,
    'booking conflict uses expected code': (res) =>
      res.status !== 409 || (res.body && res.json('error') === 'SEAT_ALREADY_BOOKED'),
  });

  sleep(Number(__ENV.ITERATION_SLEEP_SECONDS || 3));
}

export function handleSummary(data) {
  return {
    stdout: [
      'Booking load summary',
      `booking_expected_status rate: ${data.metrics.booking_expected_status?.values.rate}`,
      `availability_success rate: ${data.metrics.availability_success?.values.rate}`,
      `http_req_duration p95: ${data.metrics.http_req_duration?.values['p(95)']} ms`,
      '',
    ].join('\n'),
  };
}
