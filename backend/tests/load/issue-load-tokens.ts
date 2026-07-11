import 'dotenv/config';
import { writeFileSync } from 'fs';
import path from 'path';
import { PrismaClient, UserRole, UserStatus } from '../../src/generated/prisma/client';
import { signAccessToken } from '../../src/modules/auth/jwt.service';

const prisma = new PrismaClient();
const count = Number(process.env.LOAD_USER_COUNT || 30);

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      email: { startsWith: 'load-customer-' },
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    },
    orderBy: { email: 'asc' },
    take: count,
  });

  if (users.length === 0) {
    throw new Error('No load-customer-* users found. Run `npx prisma db seed` first.');
  }

  const tokens = users.map((user) => ({
    email: user.email,
    accessToken: signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    }),
  }));

  const outPath = path.resolve(__dirname, 'k6/load-users.json');
  writeFileSync(outPath, JSON.stringify(tokens, null, 2));
  console.log(`Issued ${tokens.length} load-test access tokens -> ${outPath}`);
}

main()
  .catch((error) => {
    console.error('Failed to issue load-test tokens:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
