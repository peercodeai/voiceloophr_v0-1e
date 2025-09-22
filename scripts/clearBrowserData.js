/**
 * Browser Console Script to Clear All Local Data
 * Run this in your browser console to clear all localStorage data
 */

console.log('🧹 Clearing VoiceLoop HR local data...');

// List of all localStorage keys to clear
const keysToClear = [
  'voiceloop_uploaded_files',
  'voiceloop_openai_key',
  'voiceloop_elevenlabs_key',
  'voiceloop_tts_provider',
  'voiceloop_elevenlabs_voice',
  'google_drive_tokens',
  'microsoft_calendar_tokens',
  'google_calendar_tokens',
  'facebook_tokens',
  'twitter_tokens'
];

let clearedCount = 0;

// Clear each key
keysToClear.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Cleared: ${key}`);
    clearedCount++;
  } else {
    console.log(`⚪ Not found: ${key}`);
  }
});

// Clear any other keys that might contain VoiceLoop data
Object.keys(localStorage).forEach(key => {
  if (key.toLowerCase().includes('voiceloop') || 
      key.toLowerCase().includes('voice') ||
      key.toLowerCase().includes('chat') ||
      key.toLowerCase().includes('document')) {
    localStorage.removeItem(key);
    console.log(`✅ Cleared additional: ${key}`);
    clearedCount++;
  }
});

// Clear sessionStorage as well
Object.keys(sessionStorage).forEach(key => {
  if (key.toLowerCase().includes('voiceloop') || 
      key.toLowerCase().includes('voice') ||
      key.toLowerCase().includes('chat') ||
      key.toLowerCase().includes('document')) {
    sessionStorage.removeItem(key);
    console.log(`✅ Cleared sessionStorage: ${key}`);
    clearedCount++;
  }
});

console.log(`\n🎉 Data clearing complete! Cleared ${clearedCount} items.`);
console.log('🔄 Please refresh the page to see the clean state.');


