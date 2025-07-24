import 'dotenv/config';
import { createCollection } from '../src/lib/qdrant';

async function main() {
  try {
    console.log('🌱 Creating Qdrant collection...')
    await createCollection()
    console.log('✅ Collection created successfully!')
    console.log(
      '📝 Note: You can now run the full seed script to add documents'
    )
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to create collection:', error)
    process.exit(1)
  }
}

main()
