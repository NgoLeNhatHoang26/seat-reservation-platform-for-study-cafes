"use strict";
/// <reference types="node" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("../src/generated/prisma/client");
const prisma = new client_1.PrismaClient();
async function seedAdmin() {
    const passwordHash = await bcryptjs_1.default.hash("Admin123!", 12);
    return prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: {
            fullName: "System Admin",
            role: client_1.UserRole.ADMIN,
            status: client_1.UserStatus.ACTIVE,
            passwordHash,
            emailVerifiedAt: new Date(),
        },
        create: {
            email: "admin@example.com",
            fullName: "System Admin",
            role: client_1.UserRole.ADMIN,
            status: client_1.UserStatus.ACTIVE,
            passwordHash,
            emailVerifiedAt: new Date(),
        },
    });
}
async function seedOwnerAndCafe() {
    const passwordHash = await bcryptjs_1.default.hash("Owner123!", 12);
    const owner = await prisma.user.upsert({
        where: { email: "owner@example.com" },
        update: {
            fullName: "Cafe Owner",
            role: client_1.UserRole.OWNER,
            status: client_1.UserStatus.ACTIVE,
            passwordHash,
            emailVerifiedAt: new Date(),
        },
        create: {
            email: "owner@example.com",
            fullName: "Cafe Owner",
            role: client_1.UserRole.OWNER,
            status: client_1.UserStatus.ACTIVE,
            passwordHash,
            emailVerifiedAt: new Date(),
        },
    });
    const cafe = await prisma.cafe.upsert({
        where: { slug: "study-hub-hanoi" },
        update: {
            ownerId: owner.id,
            name: "Study Hub Hanoi",
            address: "123 Kim Ma, Ba Dinh",
            city: "Hanoi",
            status: client_1.CafeStatus.ACTIVE,
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
            status: client_1.CafeStatus.ACTIVE,
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
    // Clear old layout (dev seed only)
    await prisma.seat.deleteMany({
        where: { zone: { cafeId: cafe.id } },
    });
    await prisma.zone.deleteMany({
        where: { cafeId: cafe.id },
    });
    const zoneA = await prisma.zone.create({
        data: { cafeId: cafe.id, name: "Quiet Zone", displayOrder: 1 },
    });
    const zoneB = await prisma.zone.create({
        data: { cafeId: cafe.id, name: "Window Zone", displayOrder: 2 },
    });
    const seatsZoneA = Array.from({ length: 5 }).map((_, i) => ({
        zoneId: zoneA.id,
        seatNumber: `Q-${i + 1}`,
        seatType: client_1.SeatType.STANDARD,
        amenities: ["power_outlet"],
    }));
    const seatsZoneB = Array.from({ length: 5 }).map((_, i) => ({
        zoneId: zoneB.id,
        seatNumber: `W-${i + 1}`,
        seatType: i < 2 ? client_1.SeatType.PREMIUM : client_1.SeatType.STANDARD,
        amenities: ["power_outlet", "window_view"],
    }));
    await prisma.seat.createMany({ data: [...seatsZoneA, ...seatsZoneB] });
    return { owner, cafe };
}
async function seedCustomer() {
    const passwordHash = await bcryptjs_1.default.hash("Customer123!", 12);
    const customer = await prisma.user.upsert({
        where: { email: "customer@example.com" },
        update: {
            fullName: "Demo Customer",
            role: client_1.UserRole.CUSTOMER,
            status: client_1.UserStatus.ACTIVE,
            passwordHash,
            emailVerifiedAt: new Date(),
        },
        create: {
            email: "customer@example.com",
            fullName: "Demo Customer",
            role: client_1.UserRole.CUSTOMER,
            status: client_1.UserStatus.ACTIVE,
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
async function main() {
    console.log("Seeding...");
    await seedAdmin();
    await seedOwnerAndCafe();
    await seedCustomer();
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
//# sourceMappingURL=seed.js.map