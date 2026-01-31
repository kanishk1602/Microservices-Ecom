const dbConnect = require('./config/database');
const { seedAdmin } = require('./config/seedAdmin');

async function run() {
  try {
    await dbConnect.connect();
    console.log('Connected. Seeding...');
    await seedAdmin();
    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

run();
