import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

// Load environment variables
dotenv.config()

async function resetTestDatabase() {
  console.log('🧹 Resetting test database...')

  try {
    // Database file paths
    const dbPaths = ['./data/rag-chat.db', './database.sqlite']

    for (const dbPath of dbPaths) {
      try {
        await fs.access(dbPath)
        console.log(`🗑️  Removing database: ${dbPath}`)
        await fs.unlink(dbPath)
        console.log(`✅ Removed: ${dbPath}`)
      } catch (error) {
        console.log(`ℹ️  Database not found: ${dbPath}`)
      }
    }

    // Clean up uploads directory
    const uploadsPath = './uploads'
    try {
      const uploadsStats = await fs.stat(uploadsPath)
      if (uploadsStats.isDirectory()) {
        console.log('🗑️  Cleaning uploads directory...')

        // Remove temp processing directories
        const tempPath = path.join(uploadsPath, 'temp', 'processing')
        try {
          await fs.rm(tempPath, { recursive: true, force: true })
          console.log('✅ Cleaned temp processing directories')
        } catch (error) {
          console.log('ℹ️  No temp directories to clean')
        }

        // Remove files from uploads (but keep directory structure)
        const uploadsEntries = await fs.readdir(uploadsPath, {
          withFileTypes: true,
        })
        for (const entry of uploadsEntries) {
          if (entry.isFile()) {
            const filePath = path.join(uploadsPath, entry.name)
            await fs.unlink(filePath)
            console.log(`🗑️  Removed file: ${entry.name}`)
          }
        }
      }
    } catch (error) {
      console.log('ℹ️  Uploads directory not found')
    }

    console.log('🎉 Test database reset completed!')
    console.log('💡 Next steps:')
    console.log('   1. Restart the development server: npm run dev')
    console.log('   2. Run tests: npx tsx scripts/test-upload-api.ts test')
  } catch (error) {
    console.error('❌ Error resetting test database:', error)
    process.exit(1)
  }
}

resetTestDatabase()
