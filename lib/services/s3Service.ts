// S3 Service for Document Storage
// This service handles file uploads, downloads, and management in AWS S3

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

// Configuration schema
const S3ConfigSchema = z.object({
  region: z.string().default('us-east-1'),
  bucket: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  maxFileSize: z.number().default(50 * 1024 * 1024), // 50MB
  allowedTypes: z.array(z.string()).default(['pdf', 'docx', 'xlsx', 'txt', 'md', 'jpg', 'png', 'mp3', 'mp4']),
});

export type S3Config = z.infer<typeof S3ConfigSchema>;

// File upload schema
const FileUploadSchema = z.object({
  key: z.string(),
  body: z.union([z.string(), z.instanceof(Buffer), z.instanceof(Uint8Array)]),
  contentType: z.string(),
  metadata: z.record(z.string()).optional(),
  tags: z.record(z.string()).optional(),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;

// File metadata schema
const FileMetadataSchema = z.object({
  key: z.string(),
  size: z.number(),
  lastModified: z.date(),
  contentType: z.string(),
  etag: z.string(),
  metadata: z.record(z.string()).optional(),
  tags: z.record(z.string()).optional(),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;

// Error types
export class S3ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public operation: string
  ) {
    super(message);
    this.name = 'S3ServiceError';
  }
}

// S3 Service Class
export class S3Service {
  private client: S3Client;
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = S3ConfigSchema.parse(config);
    
    this.client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  // Upload file to S3
  async uploadFile(file: FileUpload): Promise<{ key: string; url: string; etag: string }> {
    try {
      const validatedFile = FileUploadSchema.parse(file);
      
      // Validate file size
      const fileSize = Buffer.isBuffer(validatedFile.body) 
        ? validatedFile.body.length 
        : new TextEncoder().encode(validatedFile.body as string).length;
        
      if (fileSize > this.config.maxFileSize) {
        throw new S3ServiceError(
          `File size ${fileSize} exceeds maximum allowed size ${this.config.maxFileSize}`,
          400,
          'upload'
        );
      }

      // Validate file type
      const fileExtension = validatedFile.key.split('.').pop()?.toLowerCase();
      if (fileExtension && !this.config.allowedTypes.includes(fileExtension)) {
        throw new S3ServiceError(
          `File type ${fileExtension} is not allowed. Allowed types: ${this.config.allowedTypes.join(', ')}`,
          400,
          'upload'
        );
      }

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: validatedFile.key,
        Body: validatedFile.body,
        ContentType: validatedFile.contentType,
        Metadata: validatedFile.metadata,
        TagSet: validatedFile.tags ? Object.entries(validatedFile.tags).map(([Key, Value]) => ({ Key, Value })) : undefined,
      });

      const result = await this.client.send(command);
      
      return {
        key: validatedFile.key,
        url: `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${validatedFile.key}`,
        etag: result.ETag || '',
      };
    } catch (error) {
      if (error instanceof S3ServiceError) {
        throw error;
      }
      throw new S3ServiceError(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'upload'
      );
    }
  }

  // Download file from S3
  async downloadFile(key: string): Promise<{ body: Buffer; contentType: string; metadata: Record<string, string> }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const result = await this.client.send(command);
      
      if (!result.Body) {
        throw new S3ServiceError('File not found', 404, 'download');
      }

      const body = await result.Body.transformToByteArray();
      
      return {
        body: Buffer.from(body),
        contentType: result.ContentType || 'application/octet-stream',
        metadata: result.Metadata || {},
      };
    } catch (error) {
      if (error instanceof S3ServiceError) {
        throw error;
      }
      throw new S3ServiceError(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'download'
      );
    }
  }

  // Generate presigned URL for upload
  async generateUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw new S3ServiceError(
        `Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'generateUploadUrl'
      );
    }
  }

  // Generate presigned URL for download
  async generateDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw new S3ServiceError(
        `Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'generateDownloadUrl'
      );
    }
  }

  // Delete file from S3
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      throw new S3ServiceError(
        `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'delete'
      );
    }
  }

  // List files in S3
  async listFiles(prefix: string = '', maxKeys: number = 1000): Promise<FileMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const result = await this.client.send(command);
      
      if (!result.Contents) {
        return [];
      }

      const files: FileMetadata[] = [];
      
      for (const object of result.Contents) {
        if (object.Key) {
          try {
            const headCommand = new HeadObjectCommand({
              Bucket: this.config.bucket,
              Key: object.Key,
            });
            
            const headResult = await this.client.send(headCommand);
            
            files.push({
              key: object.Key,
              size: object.Size || 0,
              lastModified: object.LastModified || new Date(),
              contentType: headResult.ContentType || 'application/octet-stream',
              etag: object.ETag || '',
              metadata: headResult.Metadata,
              tags: headResult.TagSet ? 
                Object.fromEntries(headResult.TagSet.map(tag => [tag.Key, tag.Value])) : 
                undefined,
            });
          } catch (headError) {
            // Skip files that can't be accessed
            console.warn(`Failed to get metadata for ${object.Key}:`, headError);
          }
        }
      }

      return files;
    } catch (error) {
      throw new S3ServiceError(
        `List files failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'listFiles'
      );
    }
  }

  // Get file metadata
  async getFileMetadata(key: string): Promise<FileMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const result = await this.client.send(command);
      
      return {
        key,
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
        contentType: result.ContentType || 'application/octet-stream',
        etag: result.ETag || '',
        metadata: result.Metadata,
        tags: result.TagSet ? 
          Object.fromEntries(result.TagSet.map(tag => [tag.Key, tag.Value])) : 
          undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFound') {
        throw new S3ServiceError('File not found', 404, 'getFileMetadata');
      }
      throw new S3ServiceError(
        `Get metadata failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'getFileMetadata'
      );
    }
  }

  // Check if file exists
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error) {
      if (error instanceof S3ServiceError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  // Copy file within S3
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: destinationKey,
        CopySource: `${this.config.bucket}/${sourceKey}`,
      });

      await this.client.send(command);
    } catch (error) {
      throw new S3ServiceError(
        `Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'copy'
      );
    }
  }

  // Get storage usage statistics
  async getStorageStats(prefix: string = ''): Promise<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    fileTypes: Record<string, { count: number; size: number }>;
  }> {
    try {
      const files = await this.listFiles(prefix);
      
      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        averageSize: 0,
        fileTypes: {} as Record<string, { count: number; size: number }>,
      };

      stats.averageSize = stats.totalFiles > 0 ? stats.totalSize / stats.totalFiles : 0;

      // Group by file type
      for (const file of files) {
        const extension = file.key.split('.').pop()?.toLowerCase() || 'unknown';
        if (!stats.fileTypes[extension]) {
          stats.fileTypes[extension] = { count: 0, size: 0 };
        }
        stats.fileTypes[extension].count++;
        stats.fileTypes[extension].size += file.size;
      }

      return stats;
    } catch (error) {
      throw new S3ServiceError(
        `Get storage stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'getStorageStats'
      );
    }
  }
}

// Factory function to create service instance
export function createS3Service(): S3Service {
  const config: S3Config = {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024,
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,xlsx,txt,md,jpg,png,mp3,mp4').split(','),
  };

  return new S3Service(config);
}

// Export default instance
export const s3Service = createS3Service();
