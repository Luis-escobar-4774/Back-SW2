require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  console.log('[validate] Connecting to DB...');
  try {
    await prisma.$connect();
  } catch (e) {
    console.error('[validate] Connection failed:', e.message || e);
    process.exit(1);
  }

  try {
    const count = await prisma.user.count();
    console.log('[validate] Connected. User count:', count);
  } catch (e) {
    console.error('[validate] Query failed:', e.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[validate] Unexpected error:', e);
  process.exit(1);
});
