import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export interface ProcessingOptions {
  useTextract: boolean;
  forceTextract?: boolean;
  costWarning?: boolean;
}

export interface DocumentInfo {
  type: 'text' | 'image' | 'pdf' | 'mixed';
  size: number;
  estimatedCost?: number;
  recommendedProcessing: 'direct' | 'textract' | 'user-choice';
}

export interface ProcessingResult {
  success: boolean;
  content: string;
  confidence?: number;
  processingMethod: 'direct' | 'textract' | 'fallback';
  cost?: number;
  error?: string;
}

export class SmartDocumentProcessor {
  private textractClient: TextractClient;
  private s3Client: S3Client;

  constructor() {
    this.textractClient = new TextractClient({ region: 'us-east-1' });
    this.s3Client = new S3Client({ region: 'us-east-1' });
  }

  /**
   * Analyze document to determine best processing method
   */
  async analyzeDocument(bucket: string, key: string): Promise<DocumentInfo> {
    try {
      const headResponse = await this.s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );

      const contentType = headResponse.ContentType || '';
      const size = headResponse.ContentLength || 0;
      
      // Determine document type and processing recommendation
      if (contentType.startsWith('text/') || key.endsWith('.txt') || key.endsWith('.md')) {
        return {
          type: 'text',
          size,
          recommendedProcessing: 'direct',
          estimatedCost: 0
        };
      }
      
      if (contentType.startsWith('image/') || key.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i)) {
        return {
          type: 'image',
          size,
          recommendedProcessing: 'textract',
          estimatedCost: 0.0015 // $0.0015 per page for images
        };
      }
      
      if (contentType === 'application/pdf' || key.endsWith('.pdf')) {
        return {
          type: 'pdf',
          size,
          recommendedProcessing: 'user-choice',
          estimatedCost: 0.0015 // $0.0015 per page for PDFs
        };
      }

      // Mixed or unknown type
      return {
        type: 'mixed',
        size,
        recommendedProcessing: 'user-choice',
        estimatedCost: 0.0015
      };
    } catch (error) {
      throw new Error(`Failed to analyze document: ${error}`);
    }
  }

  /**
   * Process document with smart routing based on type and user preference
   */
  async processDocument(
    bucket: string, 
    key: string, 
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    try {
      // Analyze document first
      const docInfo = await this.analyzeDocument(bucket, key);
      
      // Show cost warning if Textract is expensive
      if (options.costWarning && docInfo.estimatedCost && docInfo.estimatedCost > 0.01) {
        console.warn(`⚠️  Textract processing will cost approximately $${docInfo.estimatedCost.toFixed(4)}`);
      }

      // Route to appropriate processing method
      if (docInfo.recommendedProcessing === 'direct' && !options.forceTextract) {
        return await this.processTextDirect(bucket, key);
      }
      
      if (options.useTextract || options.forceTextract) {
        return await this.processWithTextract(bucket, key);
      }
      
      // Fallback to direct processing for text files
      if (docInfo.type === 'text') {
        return await this.processTextDirect(bucket, key);
      }
      
      // For images/PDFs without Textract, return error
      return {
        success: false,
        content: '',
        processingMethod: 'fallback',
        error: `Textract required for ${docInfo.type} documents. Enable Textract processing or upload a text file.`
      };
      
    } catch (error) {
      return {
        success: false,
        content: '',
        processingMethod: 'fallback',
        error: `Processing failed: ${error}`
      };
    }
  }

  /**
   * Process text documents directly (no cost)
   */
  private async processTextDirect(bucket: string, key: string): Promise<ProcessingResult> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      
      const content = await response.Body?.transformToString() || '';
      
      return {
        success: true,
        content,
        processingMethod: 'direct',
        cost: 0
      };
    } catch (error) {
      throw new Error(`Failed to process text directly: ${error}`);
    }
  }

  /**
   * Process documents with AWS Textract (cost per page)
   */
  private async processWithTextract(bucket: string, key: string): Promise<ProcessingResult> {
    try {
      const command = new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key
          }
        }
      });

      const response = await this.textractClient.send(command);
      
      if (!response.Blocks) {
        throw new Error('No text blocks detected');
      }

      // Extract text from blocks
      const textBlocks = response.Blocks
        .filter(block => block.BlockType === 'LINE')
        .sort((a, b) => (a.Geometry?.BoundingBox?.Top || 0) - (b.Geometry?.BoundingBox?.Top || 0))
        .map(block => block.Text)
        .filter(Boolean);

      const content = textBlocks.join('\n');
      const confidence = response.Blocks
        .filter(block => block.Confidence !== undefined)
        .reduce((sum, block) => sum + (block.Confidence || 0), 0) / 
        response.Blocks.filter(block => block.Confidence !== undefined).length;

      return {
        success: true,
        content,
        confidence,
        processingMethod: 'textract',
        cost: 0.0015 // $0.0015 per page
      };
    } catch (error) {
      throw new Error(`Textract processing failed: ${error}`);
    }
  }

  /**
   * Get cost estimate for Textract processing
   */
  async getCostEstimate(bucket: string, key: string): Promise<{ cost: number; pages: number }> {
    try {
      const docInfo = await this.analyzeDocument(bucket, key);
      
      if (docInfo.recommendedProcessing === 'direct') {
        return { cost: 0, pages: 1 };
      }
      
      // Estimate pages based on file size (rough approximation)
      const estimatedPages = Math.max(1, Math.ceil(docInfo.size / (1024 * 1024))); // 1MB per page estimate
      const cost = estimatedPages * 0.0015; // $0.0015 per page
      
      return { cost, pages: estimatedPages };
    } catch (error) {
      throw new Error(`Failed to estimate cost: ${error}`);
    }
  }
}
