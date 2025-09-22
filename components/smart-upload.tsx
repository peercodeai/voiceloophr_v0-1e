'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface UploadState {
  isUploading: boolean;
  progress: number;
  status: string;
}

interface DocumentAnalysis {
  type: string;
  size: string;
  estimatedCost: number;
  recommendedProcessing: string;
  pages?: number;
}

export default function SmartUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    status: 'Ready to upload'
  });
  
  const [useTextract, setUseTextract] = useState(false); // Disabled by default - use our free PDF parser
  const [forceTextract, setForceTextract] = useState(false);
  const [showCostWarning, setShowCostWarning] = useState(false);
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    // Analyze file for cost estimation
    const analysis = await analyzeFile(file);
    setDocumentAnalysis(analysis);
    
    // Show cost warning for expensive files
    if (analysis.estimatedCost > 0.01) {
      setShowCostWarning(true);
    }
  }, []);

  const analyzeFile = async (file: File): Promise<DocumentAnalysis> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const sizeInMB = file.size / (1024 * 1024);
    
    let type = 'Unknown';
    let estimatedCost = 0;
    let recommendedProcessing = 'direct';
    let pages = 1;

    if (['txt', 'md', 'csv'].includes(fileExtension || '')) {
      type = 'Text Document';
      estimatedCost = 0;
      recommendedProcessing = 'direct';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(fileExtension || '')) {
      type = 'Image';
      estimatedCost = 0.0015; // $0.0015 per page
      recommendedProcessing = 'textract';
      pages = Math.max(1, Math.ceil(sizeInMB));
    } else if (fileExtension === 'pdf') {
      type = 'PDF Document';
      estimatedCost = 0; // Free with our fixed PDF parser
      recommendedProcessing = 'direct';
      pages = Math.max(1, Math.ceil(sizeInMB));
    } else {
      type = 'Unknown Format';
      estimatedCost = 0.0015;
      recommendedProcessing = 'user-choice';
    }

    return {
      type,
      size: `${sizeInMB.toFixed(2)} MB`,
      estimatedCost,
      recommendedProcessing,
      pages
    };
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setUploadState({
      isUploading: true,
      progress: 0,
      status: 'Starting upload...'
    });

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadState(prev => ({
          ...prev,
          progress: i,
          status: i < 50 ? 'Uploading to S3...' : 
                  i < 80 ? 'Processing document...' : 
                  'Finalizing...'
        }));
      }

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUploadState({
        isUploading: false,
        progress: 100,
        status: 'Upload complete!'
      });

      // Here you would call your actual upload and processing logic
      console.log('Processing options:', {
        useTextract,
        forceTextract,
        showCostWarning
      });

    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        status: `Upload failed: ${error}`
      });
    }
  };

  const getProcessingMethod = () => {
    if (!documentAnalysis) return 'Unknown';
    
    if (documentAnalysis.recommendedProcessing === 'direct') {
      return 'Fixed PDF Parser (Free)';
    }
    
    if (useTextract || forceTextract) {
      return `Textract Processing ($${documentAnalysis.estimatedCost.toFixed(4)})`;
    }
    
    return 'Manual Processing Required';
  };

  const getCostDisplay = () => {
    if (!documentAnalysis) return null;
    
    if (documentAnalysis.estimatedCost === 0) {
      return <Badge variant="secondary" className="text-green-600">Free</Badge>;
    }
    
    return (
      <Badge variant={useTextract ? "destructive" : "secondary"}>
        ${documentAnalysis.estimatedCost.toFixed(4)}
      </Badge>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Smart Document Upload</CardTitle>
          <CardDescription>
            Intelligent document processing with free PDF parser and optional Textract integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* File Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Document</label>
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".txt,.md,.csv,.pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Document Analysis */}
          {documentAnalysis && (
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {documentAnalysis.type}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span> {documentAnalysis.size}
                  </div>
                  <div>
                    <span className="font-medium">Pages:</span> {documentAnalysis.pages || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Cost:</span> {getCostDisplay()}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Recommended: {documentAnalysis.recommendedProcessing === 'direct' ? 'Direct processing (free)' : 'User choice'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useTextract"
                checked={useTextract}
                onChange={(e) => setUseTextract(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="useTextract" className="text-sm font-medium">
                Use AWS Textract for processing
              </label>
            </div>

            {useTextract && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="forceTextract"
                    checked={forceTextract}
                    onChange={(e) => setForceTextract(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="forceTextract" className="text-sm text-gray-600">
                    Force Textract even for text files (not recommended)
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showCostWarning"
                    checked={showCostWarning}
                    onChange={(e) => setShowCostWarning(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="showCostWarning" className="text-sm text-gray-600">
                    Show cost warnings before processing
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Cost Warning */}
          {showCostWarning && documentAnalysis && documentAnalysis.estimatedCost > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2 text-orange-800">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <div className="font-medium">Cost Warning</div>
                    <div className="text-sm">
                      Textract processing will cost approximately ${documentAnalysis.estimatedCost.toFixed(4)} 
                      for this {documentAnalysis.type.toLowerCase()}.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Method Display */}
          <div className="p-3 bg-blue-50 rounded-md">
            <div className="text-sm font-medium text-blue-800">Processing Method:</div>
            <div className="text-blue-600">{getProcessingMethod()}</div>
          </div>

          {/* Upload Progress */}
          {uploadState.isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{uploadState.status}</span>
                <span>{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} className="w-full" />
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!uploadedFile || uploadState.isUploading}
            className="w-full"
          >
            {uploadState.isUploading ? 'Processing...' : 'Upload & Process Document'}
          </Button>

          {/* Status Display */}
          {uploadState.status !== 'Ready to upload' && (
            <div className={`p-3 rounded-md text-sm ${
              uploadState.status.includes('failed') ? 'bg-red-50 text-red-800' :
              uploadState.status.includes('complete') ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {uploadState.status}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
