# 🧪 File Upload Testing Guide

## 📁 Test Data Structure

Place your test files in the `test-data/` directory:

```
test-data/
├── pdf/
│   ├── sample.pdf
│   └── test-document.pdf
├── txt/
│   ├── sample.txt
│   └── test-text.txt
├── docx/
│   ├── sample.docx
│   └── test-document.docx
├── doc/
│   └── sample.doc
├── epub/
│   └── sample.epub
└── fb2/
    └── sample.fb2
```

## 🚀 Testing Modes

### 1. Normal Mode (Production)
```bash
npx tsx scripts/test-upload-api.ts normal
```
- Full duplicate checking
- Real database operations
- Production-like behavior

### 2. Test Mode (Development)
```bash
npx tsx scripts/test-upload-api.ts test
```
- Skips duplicate checking
- Allows re-uploading same files
- Perfect for iterative testing

### 3. Reset Mode (Clean Testing)
```bash
# First reset the database
npx tsx scripts/reset-test-db.ts

# Then run tests
npx tsx scripts/test-upload-api.ts test
```
- Completely clean database
- Fresh start for testing

## 🔧 Quick Test Commands

### Test All File Formats
```bash
# Clean start
npx tsx scripts/reset-test-db.ts

# Test all files
npx tsx scripts/test-upload-api.ts test
```

### Test Specific Format
```bash
# Test only PDF files
npx tsx scripts/test-upload-api.ts test | grep -A 5 -B 5 "pdf"
```

### Monitor Server Logs
```bash
# In one terminal
npm run dev

# In another terminal
npx tsx scripts/test-upload-api.ts test
```

## 📊 Expected Results

### ✅ Successful Upload
```
📤 Testing: sample.pdf
✅ sample.pdf: SUCCESS (pdf)
```

### ❌ Failed Upload
```
📤 Testing: corrupted.pdf
❌ corrupted.pdf: FAILED - PDF processing failed: Invalid PDF file
```

### 📊 Test Summary
```
📊 TEST SUMMARY
==================================================
✅ Successful: 5/6
❌ Failed: 1/6

✅ SUCCESSFUL UPLOADS:
  - sample.txt (txt)
  - sample.pdf (pdf)
  - sample.docx (docx)

❌ FAILED UPLOADS:
  - corrupted.pdf: PDF processing failed
```

## 🐛 Troubleshooting

### Environment Variables
Make sure `.env.local` is properly configured:
```bash
# Check environment
curl http://localhost:3000/api/test-env
```

### Database Issues
```bash
# Reset database
npx tsx scripts/reset-test-db.ts

# Restart server
npm run dev
```

### File Format Issues
- Check file extensions match MIME types
- Ensure files are not corrupted
- Verify file size limits

## 📝 Test File Requirements

### PDF Files
- Must be valid PDF format
- Should contain extractable text
- Max size: 10MB

### TXT Files
- UTF-8 encoding
- Plain text content
- Max size: 10MB

### DOCX Files
- Microsoft Word format
- Should contain text content
- Max size: 10MB

### Other Formats
- EPUB: Valid EPUB format
- FB2: FictionBook XML format
- DOC: Legacy Word format (temporarily disabled)

## 🔄 Continuous Testing

For automated testing, you can:

1. **Set up a test loop:**
```bash
while true; do
  npx tsx scripts/test-upload-api.ts test
  sleep 30
done
```

2. **Monitor specific formats:**
```bash
# Test PDF processing specifically
npx tsx scripts/test-upload-api.ts test | grep -E "(pdf|PDF)"
```

3. **Performance testing:**
```bash
# Test with large files
# Add large test files to test-data/ and monitor memory usage
```

## 📈 Performance Metrics

Monitor these metrics during testing:
- File processing time
- Memory usage
- API response times
- Database performance
- Vector store operations

## 🚨 Common Issues

### Memory Leaks
- Watch for increasing memory usage
- Check for unclosed file handles
- Monitor garbage collection

### API Rate Limits
- OpenAI API calls are rate-limited
- Qdrant operations may be slow
- Add delays between tests if needed

### File Processing Errors
- Check file format support
- Verify file integrity
- Monitor error logs

## 🎯 Testing Checklist

- [ ] All supported formats work
- [ ] Duplicate detection works (normal mode)
- [ ] Test mode skips duplicates
- [ ] Error handling works
- [ ] Memory usage is stable
- [ ] Database operations work
- [ ] Vector store integration works
- [ ] File cleanup works
- [ ] Logging is informative
- [ ] Performance is acceptable 
