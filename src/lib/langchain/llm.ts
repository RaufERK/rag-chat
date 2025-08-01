import { ChatOpenAI } from '@langchain/openai'
import { RAGSettings } from '@/lib/settings-service'

/**
 * OpenAI Chat Model configuration for RAG system
 * Using dynamic settings from database
 */
export async function createLLM(): Promise<ChatOpenAI> {
  const modelName = await RAGSettings.getAIModel()
  const temperature = await RAGSettings.getTemperature()
  const maxTokens = await RAGSettings.getMaxTokens()

  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName,
    temperature,
    maxTokens,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  })
}

/**
 * Default LLM instance for backward compatibility
 * Note: This uses default values, use createLLM() for dynamic settings
 */
export const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  modelName: 'gpt-4o',
  temperature: 0.4,
  maxTokens: 4000,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
})

/**
 * Create LLM instance with custom parameters
 * @param options - Custom LLM options
 * @returns ChatOpenAI instance
 */
export function createCustomLLM(
  options: {
    modelName?: string
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  } = {}
) {
  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: options.modelName || process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
    temperature: options.temperature ?? 0.4,
    maxTokens: options.maxTokens ?? 4000,
    topP: options.topP ?? 1.0,
    frequencyPenalty: options.frequencyPenalty ?? 0.0,
    presencePenalty: options.presencePenalty ?? 0.0,
  })
}

/**
 * Test LLM connection and basic functionality
 * @returns Promise<boolean> - True if LLM is working
 */
export async function testLLMConnection(): Promise<boolean> {
  try {
    const response = await llm.invoke([
      {
        role: 'user',
        content: "Отвечь просто: 'Соединение установлено'",
      },
    ])

    console.log('✅ LLM Connection Test:', response.content)
    return true
  } catch (error) {
    console.error('❌ LLM Connection Test Failed:', error)
    return false
  }
}
