import dotenv from 'dotenv'
import { PDFProcessor } from '../src/lib/document-processors'

// Load environment variables
dotenv.config()

async function testPDF() {
  console.log('🧪 Testing PDF processing...')

  try {
    // Create a simple test PDF content (this is just for testing the processor)
    const testBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test PDF Content) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n364\n%%EOF'
    )

    const processor = new PDFProcessor()

    // Test validation
    console.log('📝 Testing PDF validation...')
    const isValid = processor.validateFile(testBuffer)
    console.log(`✅ PDF validation: ${isValid}`)

    if (isValid) {
      // Test text extraction
      console.log('📄 Testing PDF text extraction...')
      const text = await processor.extractText('test.pdf', testBuffer)
      console.log(`✅ PDF text extracted: "${text}"`)
    }

    console.log('🎉 PDF test completed!')
  } catch (error) {
    console.error('❌ PDF test failed:', error)
  }
}

testPDF()
