import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const row = await prisma.shopSetting.findUnique({ where: { key: 'onlinePaymentEnabled' } });
  console.log('DB row:', JSON.stringify(row));

  // If it's explicitly stored as false and Razorpay is configured, update it to true.
  if (row && row.value === 'false') {
    await prisma.shopSetting.update({
      where: { key: 'onlinePaymentEnabled' },
      data: { value: 'true' },
    });
    console.log('Updated onlinePaymentEnabled to true in database.');
  } else if (!row) {
    console.log('No row in DB – will auto-enable via code logic.');
  }
} finally {
  await prisma.$disconnect();
}
