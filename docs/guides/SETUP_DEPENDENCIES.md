# 🚀 Enhanced Document Processor - Dependencies Setup Guide

## Overview

The VoiceLoop HR Platform now includes a **robust, multi-format document processor** that handles:
- **PDF files** (with OCR fallback)
- **CSV files** (structured data parsing)
- **Markdown files** (rich text analysis)
- **Audio files** (WAV, MP3 with Whisper transcription)
- **Video files** (MP4 with audio extraction + Whisper)
- **Text files** (various encodings)
- **DOCX files** (Word documents)

## 🛠️ Required Dependencies

### 1. **Node.js Dependencies** (Already in package.json)
```bash
# These are already installed via pnpm install
pdf-parse          # PDF text extraction
pdf-lib            # PDF metadata and manipulation
tesseract.js       # OCR for scanned PDFs
mammoth            # DOCX processing
csv-parser         # CSV structured data parsing
```

### 2. **System Dependencies** (Must be installed separately)

#### **For Audio/Video Processing:**
- **Whisper CLI** - Audio transcription
- **FFmpeg** - Video processing and audio extraction

#### **For Enhanced PDF Processing:**
- **Tesseract OCR** - Better OCR capabilities (optional)

## 📋 Installation Instructions

### **Windows Installation**

#### **1. Install FFmpeg**
```bash
# Using Chocolatey (recommended)
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
# Add to PATH environment variable
```

#### **2. Install Whisper CLI**
```bash
# Install Python first (if not already installed)
# Download from: https://www.python.org/downloads/

# Install Whisper
pip install openai-whisper

# Verify installation
whisper --version
```

#### **3. Install Tesseract OCR (Optional)**
```bash
# Using Chocolatey
choco install tesseract

# Or download from: https://github.com/UB-Mannheim/tesseract/wiki
# Add to PATH environment variable
```

### **macOS Installation**

#### **1. Install FFmpeg**
```bash
# Using Homebrew
brew install ffmpeg

# Verify installation
ffmpeg -version
```

#### **2. Install Whisper CLI**
```bash
# Install Python first (if not already installed)
brew install python

# Install Whisper
pip3 install openai-whisper

# Verify installation
whisper --version
```

#### **3. Install Tesseract OCR (Optional)**
```bash
# Using Homebrew
brew install tesseract

# Verify installation
tesseract --version
```

### **Linux Installation (Ubuntu/Debian)**

#### **1. Install FFmpeg**
```bash
sudo apt update
sudo apt install ffmpeg

# Verify installation
ffmpeg -version
```

#### **2. Install Whisper CLI**
```bash
# Install Python first (if not already installed)
sudo apt install python3 python3-pip

# Install Whisper
pip3 install openai-whisper

# Verify installation
whisper --version
```

#### **3. Install Tesseract OCR (Optional)**
```bash
sudo apt install tesseract-ocr tesseract-ocr-eng

# Verify installation
tesseract --version
```

## 🔧 Configuration

### **Environment Variables**
```bash
# Add to .env.local
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Custom paths for system tools
FFMPEG_PATH=/usr/local/bin/ffmpeg
WHISPER_PATH=/usr/local/bin/whisper
TESSERACT_PATH=/usr/local/bin/tesseract
```

### **Verify Installation**
```bash
# Test FFmpeg
ffmpeg -version

# Test Whisper
whisper --version

# Test Tesseract (if installed)
tesseract --version
```

## 🧪 Testing the Enhanced Processor

### **1. Test PDF Processing**
```bash
# Create a test PDF and upload it
# Should see: "Enhanced PDF processing completed"
# Check console for processing method and confidence
```

### **2. Test Audio Processing**
```bash
# Upload a WAV or MP3 file
# Should see: "Processing audio file: [filename]"
# Check for transcription results
```

### **3. Test Video Processing**
```bash
# Upload an MP4 file
# Should see: "Processing video file: [filename]"
# Check for video metadata and audio transcription
```

### **4. Test CSV Processing**
```bash
# Upload a CSV file
# Should see structured data with headers and sample data
```

## 🚨 Troubleshooting

### **Common Issues**

#### **1. "Whisper CLI not found"**
```bash
# Solution: Install Whisper
pip install openai-whisper

# Verify PATH includes Python scripts
echo $PATH | grep python
```

#### **2. "ffmpeg not found"**
```bash
# Solution: Install FFmpeg
# Windows: choco install ffmpeg
# macOS: brew install ffmpeg
# Linux: sudo apt install ffmpeg

# Verify installation
ffmpeg -version
```

#### **3. "ffprobe not found"**
```bash
# FFprobe comes with FFmpeg
# If separate installation needed:
# Windows: choco install ffmpeg
# macOS: brew install ffmpeg
# Linux: sudo apt install ffmpeg
```

#### **4. "Tesseract not found"**
```bash
# Solution: Install Tesseract
# Windows: choco install tesseract
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr

# Verify installation
tesseract --version
```

### **Performance Issues**

#### **1. Slow PDF Processing**
```bash
# Large PDFs may take time
# OCR processing is CPU-intensive
# Consider file size limits
```

#### **2. Audio/Video Processing Delays**
```bash
# Large files take time to process
# Whisper transcription is CPU-intensive
# FFmpeg operations can be slow on large videos
```

## 📊 Supported File Types

### **Documents**
- **PDF** (.pdf) - Text extraction + OCR fallback
- **DOCX** (.docx) - Word document processing
- **CSV** (.csv) - Structured data parsing
- **Markdown** (.md) - Rich text analysis
- **Text** (.txt) - Plain text processing

### **Audio**
- **WAV** (.wav) - High-quality audio
- **MP3** (.mp3) - Compressed audio
- **M4A** (.m4a) - Apple audio format
- **FLAC** (.flac) - Lossless audio

### **Video**
- **MP4** (.mp4) - H.264 video
- **AVI** (.avi) - Audio Video Interleave
- **MOV** (.mov) - QuickTime format
- **WMV** (.wmv) - Windows Media
- **FLV** (.flv) - Flash Video
- **WebM** (.webm) - Web video format

## 🎯 Next Steps

### **After Installation**
1. **Test with sample files** of each supported type
2. **Monitor console output** for processing details
3. **Check processing confidence** scores
4. **Verify transcription quality** for audio/video files

### **Performance Optimization**
1. **Adjust file size limits** based on server capacity
2. **Implement processing queues** for large files
3. **Add progress indicators** for long operations
4. **Cache processed results** to avoid reprocessing

---

## 🚀 Ready to Process!

Once all dependencies are installed, your VoiceLoop HR Platform will have a **robust, multi-format document processor** that can handle virtually any file type you throw at it!

**No more placeholder text - real content extraction and analysis for all supported formats!** 🎉
