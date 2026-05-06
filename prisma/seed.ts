import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashPassword('admin123'),
        name: 'Pentadbir Sistem',
        role: 'ADMIN',
        email: 'admin@mpsp.gov.my',
        phone: '04-5550000',
        isActive: true,
      },
    });
    console.log('✅ Default admin user created (admin/admin123)');
  } else {
    console.log('ℹ️ Admin user already exists, skipping');
  }

  // Create default KPI configs
  const kpiConfigs = [
    { stepName: 'PT_FILE_OPENING', slaDays: 3, warningDays: 1 },
    { stepName: 'PPKP_PROCESSING', slaDays: 4, warningDays: 2 },
    { stepName: 'PPL_REVIEW', slaDays: 3, warningDays: 1 },
  ];

  for (const config of kpiConfigs) {
    await prisma.kpiConfig.upsert({
      where: { stepName: config.stepName },
      update: {},
      create: config,
    });
  }
  console.log('✅ KPI configs created/verified');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
