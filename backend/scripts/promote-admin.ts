import { PrismaClient, Role } from '@prisma/client';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const role = process.argv[3] as Role | undefined;
  const allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.SUPPORT];
  if (!email || !role || !allowed.includes(role)) throw new Error('Usage: pnpm admin:promote email@example.com SUPER_ADMIN|ADMIN|MODERATOR|SUPPORT');
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({ where: { email }, data: { role }, select: { id: true, email: true, role: true } });
    console.log(`Updated ${user.email} to ${user.role}`);
  } finally { await prisma.$disconnect(); }
}
void main();
