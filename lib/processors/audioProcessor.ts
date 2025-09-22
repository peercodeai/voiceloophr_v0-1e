import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

export interface AudioMetadata {
  duration: number
  sampleRate: number
  channels: number
  bitrate: number
  format: string
}

export interface AudioTranscription {
  text: string
  confidence: number
  language: string
  segments: Array<{
    start: number
    end: number
    text: string
    confidence: number
  }>
}

export class AudioProcessor {
  private static readonly SUPPORTED_AUDIO_TYPES = [
    'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/flac'
  ]

  /**
   * Check if file type is supported for audio processing
   */
  static isSupported(mimeType: string, fileName: string): boolean {
    const hasSupportedMimeType = this.SUPPORTED_AUDIO_TYPES.includes(mimeType)
    const hasSupportedExtension = fileName.match(/\.(wav|mp3|m4a|flac)$/i)
    
    return hasSupportedMimeType || !!hasSupportedExtension
  }

  /**
   * Extract audio metadata using ffprobe
   */
  static async extractMetadata(audioFile: string): Promise<AudioMetadata> {
    try {
      // Check if ffprobe is installed
      try {
        await execAsync('ffprobe -version')
      } catch {
        throw new Error('ffprobe not found. Please install ffmpeg')
      }
      
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${audioFile}"`)
      const metadata = JSON.parse(stdout)
      
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio')
      
      return {
        duration: parseFloat(metadata.format.duration) || 0,
        sampleRate: parseInt(audioStream?.sample_rate) || 0,
        channels: parseInt(audioStream?.channels) || 0,
        bitrate: parseInt(metadata.format.bit_rate) || 0,
        format: metadata.format.format_name || 'unknown'
      }
      
    } catch (error) {
      console.warn('Audio metadata extraction failed:', error)
      return {
        duration: 0,
        sampleRate: 0,
        channels: 0,
        bitrate: 0,
        format: 'unknown'
      }
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  static async transcribeAudio(audioFile: string): Promise<AudioTranscription> {
    try {
      // Check if Whisper is installed
      try {
        await execAsync('whisper --version')
      } catch {
        throw new Error('Whisper not found. Please install OpenAI Whisper')
      }
      
      // Create output directory for transcript
      const outputDir = path.dirname(audioFile)
      const baseName = path.basename(audioFile, path.extname(audioFile))
      
      // Run Whisper transcription
      await execAsync(`whisper "${audioFile}" --output_dir "${outputDir}" --output_format txt`)
      
      // Read the transcript file
      const transcriptFile = path.join(outputDir, `${baseName}.txt`)
      const text = await fs.readFile(transcriptFile, 'utf-8')
      
      // Clean up transcript file
      await fs.unlink(transcriptFile)
      
      return {
        text: text.trim(),
        confidence: 0.9,
        language: 'en',
        segments: []
      }
      
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert audio to different format using ffmpeg
   */
  static async convertAudio(inputFile: string, outputFile: string, format: string): Promise<void> {
    try {
      // Check if ffmpeg is installed
      try {
        await execAsync('ffmpeg -version')
      } catch {
        throw new Error('ffmpeg not found. Please install ffmpeg')
      }
      
      // Convert audio format
      await execAsync(`ffmpeg -i "${inputFile}" -acodec ${format} "${outputFile}" -y`)
      
    } catch (error) {
      throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract audio segment from file
   */
  static async extractSegment(inputFile: string, outputFile: string, startTime: number, duration: number): Promise<void> {
    try {
      // Check if ffmpeg is installed
      try {
        await execAsync('ffmpeg -version')
      } catch {
        throw new Error('ffmpeg not found. Please install ffmpeg')
      }
      
      // Extract audio segment
      await execAsync(`ffmpeg -i "${inputFile}" -ss ${startTime} -t ${duration} -acodec copy "${outputFile}" -y`)
      
    } catch (error) {
      throw new Error(`Audio segment extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get supported audio types
   */
  static getSupportedTypes(): string[] {
    return [...this.SUPPORTED_AUDIO_TYPES]
  }

  /**
   * Validate audio file
   */
  static async validateAudioFile(audioFile: string): Promise<boolean> {
    try {
      const metadata = await this.extractMetadata(audioFile)
      return metadata.duration > 0 && metadata.sampleRate > 0
    } catch {
      return false
    }
  }
}
