import { execSync } from "child_process";
import path from 'path';
import { PrismaClient } from '../../src/generated/prisma/client';
import { redis } from '../../src/config/redis';

const prisma = new PrismaClient();

export async function setupTestDatabase(): Promise<void> {
    execSync('npx prisma migrate deploy', {
        cwd: path.resolve(__dirname, '../..'),
        env: process.env,
        stdio: 'inherit'

    })
}

export async function cleanupTables(): Promise<void> {
    await prisma.bookingHistory.deleteMany();
    await prisma.notificationLog.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.seat.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.cafe.deleteMany();
    await prisma.customerProfile.deleteMany();
    await prisma.user.deleteMany();
    await redis.flushdb();
}

export async function disconnectTestDatabase(): Promise<void> {
    await prisma.$disconnect();
}

export async function disconnectTestRedis(): Promise<void> {
    await redis.quit();
}

export { prisma as testPrisma };