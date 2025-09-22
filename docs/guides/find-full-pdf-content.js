// Find and save the full PDF content for RAG
// Run this in your browser console

async function findAndSaveFullPDFContent() {
  console.log('🔍 Searching for full PDF content...');
  
  // Get the file ID from the URL
  const fileId = window.location.pathname.split('/').pop();
  console.log('📄 File ID:', fileId);
  
  // Try to get the full document data from the server
  try {
    console.log('🚀 Fetching full document data...');
    
    const response = await fetch(`/api/upload`);
    const data = await response.json();
    
    if (data.files && data.files.length > 0) {
      const currentFile = data.files.find(f => f.id === fileId);
      if (currentFile) {
        console.log('✅ Found file data:', currentFile);
        
        // Get the full text from the server-side storage
        const textResponse = await fetch(`/api/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: fileId,
            processingMethod: 'fixed-pdf-parser'
          })
        });
        
        const textData = await textResponse.json();
        console.log('📄 Processing result:', textData);
        
        if (textData.extractedText && textData.extractedText.length > 1000) {
          console.log('✅ Found full PDF text! Length:', textData.extractedText.length);
          console.log('📄 Text preview:', textData.extractedText.substring(0, 300) + '...');
          
          // Save to RAG with full content
          const ragResponse = await fetch('/api/rag/save-for-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: crypto.randomUUID(),
              fileName: '8.25.25IPanalysis.md.pdf',
              text: textData.extractedText,
              userId: null,
              openaiKey: localStorage.getItem('voiceloop_openai_key')
            })
          });
          
          const ragResult = await ragResponse.json();
          
          if (ragResult.success) {
            console.log('✅ Full PDF saved to RAG!', ragResult);
            console.log('📊 Created chunks:', ragResult.chunks?.length || 0);
            
            // Test search
            console.log('🧪 Testing search...');
            const searchResponse = await fetch('/api/search/semantic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: 'project timeline',
                userId: null,
                limit: 5,
                threshold: 0.1
              })
            });
            
            const searchResult = await searchResponse.json();
            console.log('🔍 Search result:', searchResult);
            
          } else {
            console.log('❌ RAG save failed:', ragResult);
          }
        } else {
          console.log('❌ No full text found or text too short');
        }
      } else {
        console.log('❌ Current file not found in server data');
      }
    } else {
      console.log('❌ No files found in server data');
    }
    
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

// Alternative: Try to get the text from the page more thoroughly
async function findTextOnPage() {
  console.log('🔍 Searching page for full PDF text...');
  
  // Look for elements that might contain the full text
  const possibleElements = [
    ...document.querySelectorAll('div'),
    ...document.querySelectorAll('pre'),
    ...document.querySelectorAll('textarea'),
    ...document.querySelectorAll('p'),
    ...document.querySelectorAll('span')
  ];
  
  let bestElement = null;
  let longestText = '';
  
  for (const element of possibleElements) {
    const text = element.textContent || '';
    if (text.length > longestText.length && text.length > 1000) {
      longestText = text;
      bestElement = element;
    }
  }
  
  if (bestElement && longestText.length > 1000) {
    console.log('✅ Found longer text! Length:', longestText.length);
    console.log('📄 Text preview:', longestText.substring(0, 300) + '...');
    
    // Save to RAG
    const ragResponse = await fetch('/api/rag/save-for-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: crypto.randomUUID(),
        fileName: '8.25.25IPanalysis.md.pdf',
        text: longestText,
        userId: null,
        openaiKey: localStorage.getItem('voiceloop_openai_key')
      })
    });
    
    const ragResult = await ragResponse.json();
    console.log('✅ RAG save result:', ragResult);
    
  } else {
    console.log('❌ No long text found on page');
    console.log('📊 Longest text found:', longestText.length, 'characters');
  }
}

// Run both approaches
console.log('🚀 Starting PDF content search...');
findAndSaveFullPDFContent();
setTimeout(() => findTextOnPage(), 2000);


