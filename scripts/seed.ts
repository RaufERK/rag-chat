import 'dotenv/config';
import { seedDatabase } from '../src/data/seed';

async function main() {
  try {
    console.log('🌱 Starting database seeding...')
    await seedDatabase()
    console.log('✅ Seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

main()
