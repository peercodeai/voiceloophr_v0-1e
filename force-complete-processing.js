// Force complete the processing status
// Run this in the browser console on the results page

async function forceCompleteProcessing() {
  console.log('🔄 Forcing processing completion...');
  
  // Get the current file ID from the URL
  const fileId = window.location.pathname.split('/').pop();
  console.log('📄 File ID:', fileId);
  
  try {
    // First, let's check the current status
    console.log('🔍 Checking current status...');
    const statusResponse = await fetch(`/api/files/${fileId}`);
    const statusData = await statusResponse.json();
    console.log('📊 Current status data:', statusData);
    
    // If the file is actually processed but UI shows processing, force update
    if (statusData.extractedText && statusData.extractedText.length > 100) {
      console.log('✅ File is actually processed! Forcing UI update...');
      
      // Update the global storage to mark as completed
      const updateResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileId,
          status: 'completed',
          processed: true
        })
      });
      
      if (updateResponse.ok) {
        console.log('✅ Status updated successfully!');
        // Refresh the page
        window.location.reload();
      } else {
        console.log('⚠️ Update failed, but file is processed. Refreshing anyway...');
        window.location.reload();
      }
    } else {
      console.log('❌ File not actually processed yet. Trying to process...');
      
      // Try to process the file
      const openaiKey = localStorage.getItem('voiceloop_openai_key');
      if (openaiKey) {
        const processResponse = await fetch('/api/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: fileId,
            openaiKey: openaiKey
          })
        });
        
        const processResult = await processResponse.json();
        console.log('🔄 Processing result:', processResult);
        
        if (processResponse.ok) {
          console.log('✅ Processing completed! Refreshing...');
          window.location.reload();
        } else {
          console.log('❌ Processing failed:', processResult);
        }
      } else {
        console.log('❌ No OpenAI key found. Please set your OpenAI key first.');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the force complete
forceCompleteProcessing();


