/// <reference types="node" />

import bcrypt from "bcryptjs";
import {
  PrismaClient,
  UserRole,
  UserStatus,
  CafeStatus,
  SeatType,
  OwnerVerificationStatus,
} from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function seedAdmin() {
  const passwordHash = await bcrypt.hash("Admin123!", 12);

  return prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      fullName: "System Admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "admin@example.com",
      fullName: "System Admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
}

async function seedOwnerAndCafe() {
  const passwordHash = await bcrypt.hash("Owner123!", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {
      fullName: "Cafe Owner",
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "owner@example.com",
      fullName: "Cafe Owner",
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.ownerProfile.upsert({
    where: { userId: owner.id },
    update: {
      businessLicenseUrl: "https://example.com/seed/business-license.pdf",
      idCardUrl: "https://example.com/seed/id-card.pdf",
      verificationStatus: OwnerVerificationStatus.APPROVED,
      rejectionReason: null,
      reviewedAt: new Date(),
    },
    create: {
      userId: owner.id,
      businessLicenseUrl: "https://example.com/seed/business-license.pdf",
      idCardUrl: "https://example.com/seed/id-card.pdf",
      verificationStatus: OwnerVerificationStatus.APPROVED,
      reviewedAt: new Date(),
    },
  });

  const cafe = await prisma.cafe.upsert({
    where: { slug: "study-hub-hanoi" },
    update: {
      ownerId: owner.id,
      name: "Study Hub Hanoi",
      address: "123 Kim Ma, Ba Dinh",
      city: "Hanoi",
      status: CafeStatus.ACTIVE,
      approvedAt: new Date(),
      operatingHours: {
        monday: { open: "08:00", close: "22:00" },
        tuesday: { open: "08:00", close: "22:00" },
        wednesday: { open: "08:00", close: "22:00" },
        thursday: { open: "08:00", close: "22:00" },
        friday: { open: "08:00", close: "22:00" },
        saturday: { open: "08:00", close: "22:00" },
        sunday: { open: "08:00", close: "22:00" },
      },
      amenities: ["wifi", "power_outlets", "quiet_space"],
    },
    create: {
      ownerId: owner.id,
      name: "Study Hub Hanoi",
      slug: "study-hub-hanoi",
      description: "Quiet study cafe in Hanoi",
      address: "123 Kim Ma, Ba Dinh",
      city: "Hanoi",
      phone: "0900000001",
      email: "owner@example.com",
      status: CafeStatus.ACTIVE,
      approvedAt: new Date(),
      operatingHours: {
        monday: { open: "08:00", close: "22:00" },
        tuesday: { open: "08:00", close: "22:00" },
        wednesday: { open: "08:00", close: "22:00" },
        thursday: { open: "08:00", close: "22:00" },
        friday: { open: "08:00", close: "22:00" },
        saturday: { open: "08:00", close: "22:00" },
        sunday: { open: "08:00", close: "22:00" },
      },
      amenities: ["wifi", "power_outlets", "quiet_space"],
    },
  });

  const existingSeats = await prisma.seat.count({
    where: { zone: { cafeId: cafe.id } },
  });

  if (existingSeats > 0) {
    console.log(
      `Cafe "${cafe.name}" already has ${existingSeats} seats — skipping layout reset.`,
    );
    return { owner, cafe };
  }

  const zoneA = await prisma.zone.create({
    data: { cafeId: cafe.id, name: "Quiet Zone", displayOrder: 1 },
  });

  const zoneB = await prisma.zone.create({
    data: { cafeId: cafe.id, name: "Window Zone", displayOrder: 2 },
  });

  const seatsZoneA = Array.from({ length: 5 }).map((_, i) => ({
    zoneId: zoneA.id,
    seatNumber: `Q-${i + 1}`,
    seatType: SeatType.STANDARD,
    amenities: ["power_outlet"],
  }));

  const seatsZoneB = Array.from({ length: 5 }).map((_, i) => ({
    zoneId: zoneB.id,
    seatNumber: `W-${i + 1}`,
    seatType: i < 2 ? SeatType.PREMIUM : SeatType.STANDARD,
    amenities: ["power_outlet", "window_view"],
  }));

  await prisma.seat.createMany({ data: [...seatsZoneA, ...seatsZoneB] });

  return { owner, cafe };
}

async function seedLoadTestCustomers(count = 30) {
  const passwordHash = await bcrypt.hash("Customer123!", 12);

  for (let i = 1; i <= count; i += 1) {
    const email = `load-customer-${String(i).padStart(2, "0")}@example.com`;

    const customer = await prisma.user.upsert({
      where: { email },
      update: {
        fullName: `Load Customer ${i}`,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      create: {
        email,
        fullName: `Load Customer ${i}`,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.customerProfile.upsert({
      where: { userId: customer.id },
      update: {
        preferredCity: "Hanoi",
        emailNotifications: true,
        smsNotifications: false,
      },
      create: {
        userId: customer.id,
        preferredCity: "Hanoi",
        emailNotifications: true,
        smsNotifications: false,
      },
    });
  }
}

async function seedCustomer() {
  const passwordHash = await bcrypt.hash("Customer123!", 12);

  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {
      fullName: "Demo Customer",
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "customer@example.com",
      fullName: "Demo Customer",
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.customerProfile.upsert({
    where: { userId: customer.id },
    update: {
      preferredCity: "Hanoi",
      emailNotifications: true,
      smsNotifications: false,
    },
    create: {
      userId: customer.id,
      preferredCity: "Hanoi",
      emailNotifications: true,
      smsNotifications: false,
    },
  });

  return customer;
}

function assertSeedAllowed(): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === "true";

  if (nodeEnv === "production" && !allowDemoSeed) {
    console.error(
      "Refusing to seed in production. Demo accounts use well-known passwords.",
    );
    console.error(
      "Set ALLOW_DEMO_SEED=true only for explicit local/demo deployments.",
    );
    process.exit(1);
  }
}

async function main() {
  assertSeedAllowed();
  console.log("Seeding...");
  await seedAdmin();
  await seedOwnerAndCafe();
  await seedCustomer();
  await seedLoadTestCustomers(30);
  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
});