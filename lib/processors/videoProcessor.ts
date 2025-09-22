import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

export interface VideoMetadata {
  duration: number
  resolution: string
  frameRate: number
  audioCodec: string
  videoCodec: string
  bitrate: number
  format: string
}

export interface VideoFrame {
  timestamp: number
  frameNumber: number
  path: string
}

export class VideoProcessor {
  private static readonly SUPPORTED_VIDEO_TYPES = [
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'
  ]

  /**
   * Check if file type is supported for video processing
   */
  static isSupported(mimeType: string, fileName: string): boolean {
    const hasSupportedMimeType = this.SUPPORTED_VIDEO_TYPES.includes(mimeType)
    const hasSupportedExtension = fileName.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)
    
    return hasSupportedMimeType || !!hasSupportedExtension
  }

  /**
   * Extract video metadata using ffprobe
   */
  static async extractMetadata(videoFile: string): Promise<VideoMetadata> {
    try {
      // Check if ffprobe is installed
      try {
        await execAsync('ffprobe -version')
      } catch {
        throw new Error('ffprobe not found. Please install ffmpeg')
      }
      
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoFile}"`)
      const metadata = JSON.parse(stdout)
      
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio')
      
      return {
        duration: parseFloat(metadata.format.duration) || 0,
        resolution: `${videoStream?.width || 0}x${videoStream?.height || 0}`,
        frameRate: parseFloat(videoStream?.r_frame_rate?.split('/')[0] || '0') / parseFloat(videoStream?.r_frame_rate?.split('/')[1] || '1'),
        audioCodec: audioStream?.codec_name || 'unknown',
        videoCodec: videoStream?.codec_name || 'unknown',
        bitrate: parseInt(metadata.format.bit_rate) || 0,
        format: metadata.format.format_name || 'unknown'
      }
      
    } catch (error) {
      console.warn('Video metadata extraction failed:', error)
      return {
        duration: 0,
        resolution: 'unknown',
        frameRate: 0,
        audioCodec: 'unknown',
        videoCodec: 'unknown',
        bitrate: 0,
        format: 'unknown'
      }
    }
  }

  /**
   * Extract audio from video using ffmpeg
   */
  static async extractAudioFromVideo(videoFile: string, audioFile: string): Promise<void> {
    try {
      // Check if ffmpeg is installed
      try {
        await execAsync('ffmpeg -version')
      } catch {
        throw new Error('ffmpeg not found. Please install ffmpeg')
      }
      
      await execAsync(`ffmpeg -i "${videoFile}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioFile}" -y`)
      
    } catch (error) {
      throw new Error(`Audio extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract frames from video at specified intervals
   */
  static async extractFrames(videoFile: string, outputDir: string, interval: number = 1): Promise<VideoFrame[]> {
    try {
      // Check if ffmpeg is installed
      try {
        await execAsync('ffmpeg -version')
      } catch {
        throw new Error('ffmpeg not found. Please install ffmpeg')
      }
      
      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      
      // Extract frames
      const framePattern = path.join(outputDir, 'frame_%04d.jpg')
      await execAsync(`ffmpeg -i "${videoFile}" -vf "fps=1/${interval}" -q:v 2 "${framePattern}" -y`)
      
      // Get list of extracted frames
      const frames: VideoFrame[] = []
      const files = fs.readdirSync(outputDir).filter(file => file.startsWith('frame_') && file.endsWith('.jpg'))
      
      files.forEach((file, index) => {
        frames.push({
          timestamp: index * interval,
          frameNumber: index + 1,
          path: path.join(outputDir, file)
        })
      })
      
      return frames
      
    } catch (error) {
      throw new Error(`Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert video to different format
   */
  static async convertVideo(inputFile: string, outputFile: string, format: string): Promise<void> {
    try {
      // Check if ffmpeg is installed
      try {
        await execAsync('ffmpeg -version')
      } catch {
        throw new Error('ffmpeg not found. Please install ffmpeg')
      }
      
      // Convert video format
      await execAsync(`ffmpeg -i "${inputFile}" -c:v libx264 -c:a aac "${outputFile}" -y`)
      
    } catch (error) {
      throw new Error(`Video conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create video thumbnail
   */
  static async createThumbnail(videoFile: string, outputFile: string, time: number = 0): Promise<void> {
    try {
      // Check if ffmpeg is installed
      try {
        await execAsync('ffmpeg -version')
      } catch {
        throw new Error('ffmpeg not found. Please install ffmpeg')
      }
      
      // Create thumbnail
      await execAsync(`ffmpeg -i "${videoFile}" -ss ${time} -vframes 1 -q:v 2 "${outputFile}" -y`)
      
    } catch (error) {
      throw new Error(`Thumbnail creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get supported video types
   */
  static getSupportedTypes(): string[] {
    return [...this.SUPPORTED_VIDEO_TYPES]
  }

  /**
   * Validate video file
   */
  static async validateVideoFile(videoFile: string): Promise<boolean> {
    try {
      const metadata = await this.extractMetadata(videoFile)
      return metadata.duration > 0 && metadata.resolution !== '0x0'
    } catch {
      return false
    }
  }
}
