import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import {
  UserRole,
  UserStatus,
  CafeStatus,
  SeatType,
  BookingStatus,
} from '../../src/generated/prisma/client';
import { testPrisma } from './db';

const DEFAULT_HOURS = {
  monday: { open: '08:00', close: '22:00' },
  tuesday: { open: '08:00', close: '22:00' },
  wednesday: { open: '08:00', close: '22:00' },
  thursday: { open: '08:00', close: '22:00' },
  friday: { open: '08:00', close: '22:00' },
  saturday: { open: '08:00', close: '22:00' },
  sunday: { open: '08:00', close: '22:00' },
};

export async function createTestUser(
  role: UserRole = UserRole.CUSTOMER,
  password = 'Test1234!',
) {
  const email = `${role.toLowerCase()}-${nanoid(6)}@test.com`;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await testPrisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      fullName: `Test ${role}`,
      emailVerifiedAt: new Date(),
      ...(role === UserRole.CUSTOMER
        ? { customerProfile: { create: {} } }
        : {}),
    },
  });

  return { user, password };
}

export async function createTestCafe(ownerId: string) {
  const slug = `test-cafe-${nanoid(6)}`;

  const cafe = await testPrisma.cafe.create({
    data: {
      ownerId,
      name: 'Test Cafe',
      slug,
      address: '123 Test St',
      city: 'Hanoi',
      status: CafeStatus.ACTIVE,
      approvedAt: new Date(),
      operatingHours: DEFAULT_HOURS,
      amenities: ['wifi'],
      zones: {
        create: {
          name: 'Zone A',
          seats: {
            create: [
              { seatNumber: 'A1', seatType: SeatType.STANDARD },
              { seatNumber: 'A2', seatType: SeatType.STANDARD },
            ],
          },
        },
      },
    },
    include: {
      zones: { include: { seats: true } },
    },
  });

  return cafe;
}

export async function createTestBooking(
  customerId: string,
  seatId: string,
  cafeId: string,
) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 2);
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 2);

  return testPrisma.booking.create({
    data: {
      confirmationNumber: `BK-${nanoid(8)}`,
      customerId,
      seatId,
      cafeId,
      startTime,
      endTime,
      status: BookingStatus.CONFIRMED,
    },
  });
}