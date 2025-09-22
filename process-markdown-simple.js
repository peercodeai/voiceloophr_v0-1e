// Simple script to process Markdown files without AI analysis
// Run this in the browser console on the results page

async function processMarkdownSimple() {
  console.log('🔄 Processing Markdown file without AI analysis...');
  
  // Get the current file ID from the URL
  const fileId = window.location.pathname.split('/').pop();
  console.log('📄 File ID:', fileId);
  
  try {
    // Use the new Markdown-specific processing endpoint
    const response = await fetch('/api/process-markdown', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: fileId
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Markdown processing successful!', result);
      console.log('📊 Word count:', result.wordCount);
      console.log('📝 Character count:', result.charCount);
      console.log('📋 Summary:', result.summary);
      
      // Refresh the page to show updated status
      console.log('🔄 Refreshing page...');
      window.location.reload();
    } else {
      console.error('❌ Markdown processing failed:', result);
    }
  } catch (error) {
    console.error('❌ Error during processing:', error);
  }
}

// Run the processing
processMarkdownSimple();


