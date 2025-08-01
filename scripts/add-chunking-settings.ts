#!/usr/bin/env tsx

import { getDatabase } from '../src/lib/database'

/**
 * Добавляет настройки чанкинга в базу данных
 */

interface ChunkingSetting {
  category: string
  parameter_name: string
  parameter_value: string
  default_value: string
  parameter_type: 'string' | 'number' | 'boolean' | 'json'
  display_name: string
  description?: string
  help_text?: string
  ui_component: 'input' | 'select' | 'slider' | 'toggle' | 'textarea'
  ui_options?: string
  ui_order: number
  requires_restart: boolean
  is_sensitive: boolean
  is_readonly: boolean
}

const chunkingSettings: ChunkingSetting[] = [
  {
    category: 'content',
    parameter_name: 'CHUNK_SIZE_TOKENS',
    parameter_value: '1000',
    default_value: '1000',
    parameter_type: 'number',
    display_name: 'Chunk Size (Tokens)',
    description: 'Maximum number of tokens per text chunk for embeddings',
    help_text:
      'OpenAI recommends 1000 tokens for optimal embedding quality. Larger chunks = fewer API calls but may lose context.',
    ui_component: 'slider',
    ui_options: JSON.stringify({
      min: 100,
      max: 8000,
      step: 100,
      unit: 'tokens',
    }),
    ui_order: 10,
    requires_restart: false,
    is_sensitive: false,
    is_readonly: false,
  },
  {
    category: 'content',
    parameter_name: 'CHUNK_OVERLAP_TOKENS',
    parameter_value: '200',
    default_value: '200',
    parameter_type: 'number',
    display_name: 'Chunk Overlap (Tokens)',
    description: 'Number of tokens to overlap between adjacent chunks',
    help_text:
      'Typically 20% of chunk size. Helps preserve context across chunk boundaries.',
    ui_component: 'slider',
    ui_options: JSON.stringify({
      min: 0,
      max: 1000,
      step: 50,
      unit: 'tokens',
    }),
    ui_order: 11,
    requires_restart: false,
    is_sensitive: false,
    is_readonly: false,
  },
  {
    category: 'content',
    parameter_name: 'PRESERVE_STRUCTURE',
    parameter_value: 'true',
    default_value: 'true',
    parameter_type: 'boolean',
    display_name: 'Preserve Text Structure',
    description: 'Try to split text at sentence/paragraph boundaries',
    help_text:
      'When enabled, avoids cutting sentences in the middle. May result in slightly uneven chunk sizes.',
    ui_component: 'toggle',
    ui_options: undefined,
    ui_order: 12,
    requires_restart: false,
    is_sensitive: false,
    is_readonly: false,
  },
  {
    category: 'content',
    parameter_name: 'MAX_CHUNKS_PER_FILE',
    parameter_value: '50',
    default_value: '50',
    parameter_type: 'number',
    display_name: 'Max Chunks per File',
    description: 'Maximum number of chunks to create from a single file',
    help_text:
      'Prevents memory issues with very large files. Excess content will be truncated.',
    ui_component: 'input',
    ui_options: JSON.stringify({
      type: 'number',
      min: 1,
      max: 200,
    }),
    ui_order: 13,
    requires_restart: false,
    is_sensitive: false,
    is_readonly: false,
  },
  {
    category: 'ai',
    parameter_name: 'EMBEDDING_MODEL',
    parameter_value: 'text-embedding-3-small',
    default_value: 'text-embedding-3-small',
    parameter_type: 'string',
    display_name: 'Embedding Model',
    description: 'OpenAI model used for generating embeddings',
    help_text:
      'text-embedding-3-small is faster and cheaper, text-embedding-3-large is more accurate',
    ui_component: 'select',
    ui_options: JSON.stringify([
      'text-embedding-3-small',
      'text-embedding-3-large',
      'text-embedding-ada-002',
    ]),
    ui_order: 20,
    requires_restart: false,
    is_sensitive: false,
    is_readonly: false,
  },
  {
    category: 'ai',
    parameter_name: 'EMBEDDING_BATCH_SIZE',
    parameter_value: '10',
    default_value: '10',
    parameter_type: 'number',
    display_name: 'Embedding Batch Size',
    description: 'Number of chunks to process in parallel for embeddings',
    help_text:
      'Higher values = faster processing but more API usage. Lower values = more reliable.',
    ui_component: 'slider',
    ui_options: JSON.stringify({
      min: 1,
      max: 50,
      step: 1,
      unit: 'chunks',
    }),
    ui_order: 21,
    requires_restart: false,
    is_sensitive: false,
    is_readonly: false,
  },
]

async function addChunkingSettings() {
  try {
    console.log('📝 Adding chunking settings to database...')

    const database = await getDatabase()

    // Prepare insert statement
    const insertSetting = database.prepare(`
      INSERT OR REPLACE INTO system_settings (
        category, parameter_name, parameter_value, default_value, parameter_type,
        display_name, description, help_text, ui_component, ui_options,
        ui_order, requires_restart, is_sensitive, is_readonly,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)

    let addedCount = 0

    for (const setting of chunkingSettings) {
      try {
        insertSetting.run(
          setting.category,
          setting.parameter_name,
          setting.parameter_value,
          setting.default_value,
          setting.parameter_type,
          setting.display_name,
          setting.description,
          setting.help_text,
          setting.ui_component,
          setting.ui_options,
          setting.ui_order,
          setting.requires_restart ? 1 : 0,
          setting.is_sensitive ? 1 : 0,
          setting.is_readonly ? 1 : 0
        )

        console.log(`✅ Added setting: ${setting.display_name}`)
        addedCount++
      } catch (error) {
        console.error(
          `❌ Failed to add setting ${setting.parameter_name}:`,
          error
        )
      }
    }

    console.log(
      `\n🎉 Successfully added ${addedCount}/${chunkingSettings.length} chunking settings!`
    )
    console.log('\n📋 Added settings:')
    chunkingSettings.forEach((setting) => {
      console.log(`  - ${setting.display_name} (${setting.parameter_name})`)
    })

    console.log(
      '\n💡 You can now configure these settings in the admin panel at /admin/settings'
    )
  } catch (error) {
    console.error('❌ Error adding chunking settings:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  addChunkingSettings()
}
