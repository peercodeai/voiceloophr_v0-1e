# Developer Instructions: Document Storage and Semantic Search

## 1. Database Schema and Vector Storage Solution

To enable efficient storage and semantic search of documents, we will leverage Supabase with its `pg_vector` extension. This section outlines the necessary database schema and considerations for vector storage.

### Document Storage Table

We will create a `documents` table to store the raw document content and metadata. Each document will have a unique ID, the actual text content, and any other relevant information such as the original filename, upload date, and user ID.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Assuming Supabase Auth is used
    file_name TEXT NOT NULL,
    content TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Vector Embeddings Table

To facilitate semantic search, we will store the vector embeddings of the document content in a separate table, linked to the `documents` table. This table will utilize the `vector` data type provided by the `pg_vector` extension.

First, ensure the `pg_vector` extension is enabled in your Supabase project:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then, create the `document_embeddings` table:

```sql
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL, -- Assuming OpenAI's text-embedding-ada-002 which produces 1536-dimensional vectors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Note:** The `VECTOR(1536)` type assumes you are using an embedding model that produces 1536-dimensional vectors (e.g., OpenAI's `text-embedding-ada-002`). Adjust the dimension as per your chosen embedding model.

### Indexing for Semantic Search

To optimize semantic search queries, an index should be created on the `embedding` column. For `pg_vector`, a `HNSW` (Hierarchical Navigable Small World) or `IVFFlat` index is recommended for approximate nearest neighbor (ANN) search.

```sql
CREATE INDEX ON document_embeddings USING HNSW (embedding vector_cosine_ops);
-- Or for IVFFlat:
-- CREATE INDEX ON document_embeddings USING IVFFlat (embedding vector_cosine_ops) WITH (lists = 100);
```

Choose the index type based on your performance and accuracy requirements. `HNSW` generally offers a better balance of speed and accuracy.

### Relationship and Data Flow

When a document is uploaded:
1. The document's raw content and metadata are stored in the `documents` table.
2. The document content is then sent to an embedding model (e.g., OpenAI API) to generate a vector embedding.
3. The generated embedding, along with a reference to the `documents.id`, is stored in the `document_embeddings` table.

For semantic search:
1. A user's query is also converted into a vector embedding.
2. This query embedding is then used to find the most similar document embeddings in the `document_embeddings` table using vector similarity search (e.g., cosine similarity).
3. The `document_id` from the matching embeddings is used to retrieve the full document content from the `documents` table.

This setup ensures that raw document content is separated from its embeddings, allowing for flexible management and efficient semantic search operations.



## 2. Backend Implementation for Document Vectorization

The backend implementation involves creating API endpoints to handle document storage and vectorization. This section provides detailed instructions for integrating these features into the existing VoiceLoopHR application.

### Environment Setup

First, ensure your environment has the necessary dependencies. Add these to your `package.json` or install them directly:

```bash
npm install @supabase/supabase-js openai
```

For Python-based processing (if needed), ensure you have:

```bash
pip install supabase openai python-dotenv
```

### Environment Variables

Add the following environment variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### Supabase Client Configuration

Create a utility file for Supabase client configuration at `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Use anon key for client-side operations
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Document Storage API Endpoint

Create a new API endpoint at `app/api/documents/store/route.ts` to handle document storage and vectorization:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { content, fileName, userId } = await request.json()

    if (!content || !fileName) {
      return NextResponse.json(
        { error: 'Content and fileName are required' },
        { status: 400 }
      )
    }

    // Store document in documents table
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: userId,
        file_name: fileName,
        content: content
      })
      .select()
      .single()

    if (docError) {
      console.error('Error storing document:', docError)
      return NextResponse.json(
        { error: 'Failed to store document' },
        { status: 500 }
      )
    }

    // Generate embedding for the document content
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content
    })

    const embedding = embeddingResponse.data[0].embedding

    // Store embedding in document_embeddings table
    const { error: embeddingError } = await supabaseAdmin
      .from('document_embeddings')
      .insert({
        document_id: document.id,
        embedding: embedding
      })

    if (embeddingError) {
      console.error('Error storing embedding:', embeddingError)
      // Consider whether to delete the document if embedding fails
      return NextResponse.json(
        { error: 'Failed to store document embedding' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      message: 'Document stored and vectorized successfully'
    })

  } catch (error) {
    console.error('Error in document storage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Integration with Existing Upload Flow

Modify the existing upload route at `app/api/upload/route.ts` to include an option for saving documents to the database. Add a checkbox or toggle in the frontend that allows users to choose whether to save the document for future retrieval.

Here's how to modify the existing upload handler:

```typescript
// Add this import at the top
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Add this function to handle document saving
async function saveDocumentToDatabase(content: string, fileName: string, userId?: string) {
  try {
    // Store document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: userId,
        file_name: fileName,
        content: content
      })
      .select()
      .single()

    if (docError) throw docError

    // Generate and store embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content
    })

    const embedding = embeddingResponse.data[0].embedding

    const { error: embeddingError } = await supabaseAdmin
      .from('document_embeddings')
      .insert({
        document_id: document.id,
        embedding: embedding
      })

    if (embeddingError) throw embeddingError

    return { success: true, documentId: document.id }
  } catch (error) {
    console.error('Error saving document:', error)
    return { success: false, error: error.message }
  }
}

// In your existing POST function, after processing the document:
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const saveToDatabase = formData.get("saveToDatabase") === "true"
    const userId = formData.get("userId") as string // Get from auth context

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // ... existing file processing logic ...

    // After successful processing, if user wants to save:
    let saveResult = null
    if (saveToDatabase && processedContent) {
      saveResult = await saveDocumentToDatabase(
        processedContent, 
        file.name, 
        userId
      )
    }

    return NextResponse.json({
      // ... existing response data ...
      saved: saveResult?.success || false,
      documentId: saveResult?.documentId || null
    })

  } catch (error) {
    // ... existing error handling ...
  }
}
```

### Batch Processing for Large Documents

For large documents, consider implementing batch processing to handle vectorization efficiently. Create a utility function for chunking documents:

```typescript
// lib/documentChunking.ts
export function chunkDocument(content: string, maxChunkSize: number = 1000): string[] {
  const sentences = content.split(/[.!?]+/)
  const chunks: string[] = []
  let currentChunk = ""

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      }
    } else {
      currentChunk += sentence + ". "
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(chunk => chunk.length > 0)
}
```

For chunked documents, modify the database schema to include a `chunk_index` field in the `document_embeddings` table:

```sql
ALTER TABLE document_embeddings ADD COLUMN chunk_index INTEGER DEFAULT 0;
ALTER TABLE document_embeddings ADD COLUMN chunk_content TEXT;
```

Then update the storage logic to handle chunks:

```typescript
async function saveChunkedDocument(content: string, fileName: string, userId?: string) {
  const chunks = chunkDocument(content)
  
  // Store main document
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .insert({
      user_id: userId,
      file_name: fileName,
      content: content
    })
    .select()
    .single()

  if (docError) throw docError

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunk
    })

    const embedding = embeddingResponse.data[0].embedding

    await supabaseAdmin
      .from('document_embeddings')
      .insert({
        document_id: document.id,
        embedding: embedding,
        chunk_index: i,
        chunk_content: chunk
      })
  }

  return { success: true, documentId: document.id, chunksProcessed: chunks.length }
}
```

### Error Handling and Retry Logic

Implement robust error handling and retry logic for API calls to OpenAI, as embedding generation can sometimes fail due to rate limits or temporary issues:

```typescript
async function generateEmbeddingWithRetry(content: string, maxRetries: number = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: content
      })
      return embeddingResponse.data[0].embedding
    } catch (error) {
      console.error(`Embedding generation attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  throw new Error('Max retries exceeded for embedding generation')
}
```

### Background Processing with Queues

For production environments, consider implementing a queue system for document processing to avoid blocking the upload response. You can use services like Redis with Bull Queue or implement a simple database-based queue:

```typescript
// Create a processing queue table
/*
CREATE TABLE document_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id),
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);
*/

// Queue a document for processing
async function queueDocumentForProcessing(documentId: string) {
  const { error } = await supabaseAdmin
    .from('document_processing_queue')
    .insert({
      document_id: documentId,
      status: 'pending'
    })
  
  if (error) {
    console.error('Error queuing document:', error)
  }
}

// Background worker to process queued documents
async function processQueuedDocuments() {
  const { data: queuedItems, error } = await supabaseAdmin
    .from('document_processing_queue')
    .select('*, documents(*)')
    .eq('status', 'pending')
    .limit(10)

  if (error || !queuedItems) return

  for (const item of queuedItems) {
    try {
      // Mark as processing
      await supabaseAdmin
        .from('document_processing_queue')
        .update({ status: 'processing' })
        .eq('id', item.id)

      // Generate embedding
      const embedding = await generateEmbeddingWithRetry(item.documents.content)

      // Store embedding
      await supabaseAdmin
        .from('document_embeddings')
        .insert({
          document_id: item.document_id,
          embedding: embedding
        })

      // Mark as completed
      await supabaseAdmin
        .from('document_processing_queue')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', item.id)

    } catch (error) {
      console.error('Error processing document:', error)
      
      // Mark as failed
      await supabaseAdmin
        .from('document_processing_queue')
        .update({ status: 'failed' })
        .eq('id', item.id)
    }
  }
}
```

This comprehensive backend implementation provides a robust foundation for document storage and vectorization, with considerations for scalability, error handling, and performance optimization.


## 3. Frontend Integration Instructions

The frontend integration involves creating user interface components that allow users to save documents to the database and interact with the semantic search functionality. This section provides detailed instructions for implementing these features in the existing VoiceLoopHR React application.

### User Interface Components

#### Save Document Toggle Component

Create a reusable component for the document save toggle at `components/ui/save-document-toggle.tsx`:

```typescript
import React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Database, HardDrive } from 'lucide-react'

interface SaveDocumentToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function SaveDocumentToggle({ value, onChange, disabled = false }: SaveDocumentToggleProps) {
  return (
    <div className="flex items-center space-x-3 p-4 border rounded-lg bg-card">
      <div className="flex items-center space-x-2">
        <Database className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <Label htmlFor="save-document" className="text-sm font-medium">
            Save to Database
          </Label>
          <p className="text-xs text-muted-foreground">
            Store document for future semantic search and retrieval
          </p>
        </div>
      </div>
      <Switch
        id="save-document"
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}
```

#### Hard Copy Storage Option

Create a component for hard copy storage option at `components/ui/hard-copy-toggle.tsx`:

```typescript
import React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { HardDrive, Archive } from 'lucide-react'

interface HardCopyToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function HardCopyToggle({ value, onChange, disabled = false }: HardCopyToggleProps) {
  return (
    <div className="flex items-center space-x-3 p-4 border rounded-lg bg-card">
      <div className="flex items-center space-x-2">
        <HardDrive className="h-5 w-5 text-secondary" />
        <div className="flex flex-col">
          <Label htmlFor="hard-copy" className="text-sm font-medium">
            Keep Hard Copy
          </Label>
          <p className="text-xs text-muted-foreground">
            Retain original file in local storage for backup
          </p>
        </div>
      </div>
      <Switch
        id="hard-copy"
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}
```

#### Document Storage Options Panel

Create a comprehensive options panel at `components/document-storage-options.tsx`:

```typescript
import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SaveDocumentToggle } from '@/components/ui/save-document-toggle'
import { HardCopyToggle } from '@/components/ui/hard-copy-toggle'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DocumentStorageOptionsProps {
  onSavePreferencesChange: (preferences: StoragePreferences) => void
  isProcessing?: boolean
  saveResult?: SaveResult | null
}

interface StoragePreferences {
  saveToDatabase: boolean
  keepHardCopy: boolean
}

interface SaveResult {
  success: boolean
  message: string
  documentId?: string
}

export function DocumentStorageOptions({ 
  onSavePreferencesChange, 
  isProcessing = false,
  saveResult = null 
}: DocumentStorageOptionsProps) {
  const [preferences, setPreferences] = useState<StoragePreferences>({
    saveToDatabase: false,
    keepHardCopy: false
  })

  const handlePreferenceChange = (key: keyof StoragePreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    onSavePreferencesChange(newPreferences)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Archive className="h-5 w-5" />
          <span>Document Storage Options</span>
        </CardTitle>
        <CardDescription>
          Choose how you want to store and manage your processed documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SaveDocumentToggle
          value={preferences.saveToDatabase}
          onChange={(value) => handlePreferenceChange('saveToDatabase', value)}
          disabled={isProcessing}
        />
        
        <HardCopyToggle
          value={preferences.keepHardCopy}
          onChange={(value) => handlePreferenceChange('keepHardCopy', value)}
          disabled={isProcessing}
        />

        {saveResult && (
          <Alert className={saveResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {saveResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={saveResult.success ? "text-green-800" : "text-red-800"}>
              {saveResult.message}
              {saveResult.documentId && (
                <span className="block text-xs mt-1 font-mono">
                  Document ID: {saveResult.documentId}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {preferences.saveToDatabase && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Semantic Search Enabled:</strong> Your document will be processed for AI-powered 
              semantic search, allowing you to find relevant content using natural language queries.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Integration with Upload Component

Modify the existing upload component to include the storage options. Update your main upload component (likely in `app/upload/page.tsx` or similar):

```typescript
import React, { useState } from 'react'
import { DocumentStorageOptions } from '@/components/document-storage-options'
import { useAuth } from '@/hooks/useAuth' // Assuming you have auth context

interface StoragePreferences {
  saveToDatabase: boolean
  keepHardCopy: boolean
}

interface SaveResult {
  success: boolean
  message: string
  documentId?: string
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [storagePreferences, setStoragePreferences] = useState<StoragePreferences>({
    saveToDatabase: false,
    keepHardCopy: false
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
  const { user } = useAuth()

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return

    setIsProcessing(true)
    setSaveResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('saveToDatabase', storagePreferences.saveToDatabase.toString())
      formData.append('keepHardCopy', storagePreferences.keepHardCopy.toString())
      
      if (user) {
        formData.append('userId', user.id)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setSaveResult({
          success: true,
          message: storagePreferences.saveToDatabase 
            ? 'Document processed and saved to database successfully!'
            : 'Document processed successfully!',
          documentId: result.documentId
        })
      } else {
        setSaveResult({
          success: false,
          message: result.error || 'Failed to process document'
        })
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: 'An error occurred while processing the document'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Document Upload</h1>
      
      {/* Your existing file upload component */}
      <FileUploadComponent 
        onFileSelect={setFile}
        onUpload={handleFileUpload}
        isProcessing={isProcessing}
      />

      {/* Storage options */}
      <DocumentStorageOptions
        onSavePreferencesChange={setStoragePreferences}
        isProcessing={isProcessing}
        saveResult={saveResult}
      />
    </div>
  )
}
```

### Semantic Search Interface

Create a comprehensive search interface at `components/semantic-search.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, FileText, Calendar, User, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface SearchResult {
  id: string
  fileName: string
  content: string
  uploadedAt: string
  similarity: number
  userId: string
}

interface SemanticSearchProps {
  className?: string
}

export function SemanticSearch({ className }: SemanticSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { user } = useAuth()

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      const response = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          userId: user?.id,
          limit: 10
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data.results || [])
      } else {
        console.error('Search failed:', data.error)
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity > 0.8) return 'bg-green-100 text-green-800'
    if (similarity > 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>Semantic Document Search</span>
        </CardTitle>
        <CardDescription>
          Search your saved documents using natural language queries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Search for documents using natural language..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {hasSearched && (
          <div className="space-y-4">
            {results.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Found {results.length} relevant document{results.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-3">
                  {results.map((result) => (
                    <Card key={result.id} className="p-4">
                      <div className="flex items-start justify-between space-x-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium">{result.fileName}</h4>
                            <Badge 
                              variant="secondary" 
                              className={getSimilarityColor(result.similarity)}
                            >
                              {Math.round(result.similarity * 100)}% match
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {truncateContent(result.content)}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(result.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Navigate to document details or open document
                            window.open(`/documents/${result.id}`, '_blank')
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No documents found matching your query.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try using different keywords or phrases.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Document Management Dashboard

Create a dashboard component for managing saved documents at `components/document-dashboard.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  Calendar, 
  Trash2, 
  Download, 
  Search,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { SemanticSearch } from './semantic-search'

interface Document {
  id: string
  fileName: string
  content: string
  uploadedAt: string
  userId: string
}

interface DocumentDashboardProps {
  className?: string
}

export function DocumentDashboard({ className }: DocumentDashboardProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { user } = useAuth()

  useEffect(() => {
    fetchDocuments()
  }, [user])

  useEffect(() => {
    filterAndSortDocuments()
  }, [documents, searchTerm, sortOrder])

  const fetchDocuments = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/documents?userId=${user.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortDocuments = () => {
    let filtered = documents.filter(doc =>
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase())
    )

    filtered.sort((a, b) => {
      const dateA = new Date(a.uploadedAt).getTime()
      const dateB = new Date(b.uploadedAt).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    setFilteredDocuments(filtered)
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDocuments(docs => docs.filter(doc => doc.id !== documentId))
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const handleDownload = (document: Document) => {
    const blob = new Blob([document.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = document.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Semantic Search */}
      <SemanticSearch />

      {/* Document Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>My Documents</span>
            <Badge variant="secondary">{documents.length}</Badge>
          </CardTitle>
          <CardDescription>
            Manage your saved documents and their storage settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Sort Controls */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
              Date
            </Button>
          </div>

          {/* Documents List */}
          {filteredDocuments.length > 0 ? (
            <div className="space-y-3">
              {filteredDocuments.map((document) => (
                <Card key={document.id} className="p-4">
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">{document.fileName}</h4>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {truncateContent(document.content)}
                      </p>
                      
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(document.uploadedAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(document.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No documents match your search.' : 'No documents saved yet.'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm ? 'Try different search terms.' : 'Upload and save documents to see them here.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Navigation Integration

Update your navigation to include links to the document management features. Add these routes to your navigation component:

```typescript
// In your navigation component
const navigationItems = [
  // ... existing items
  {
    name: 'My Documents',
    href: '/documents',
    icon: FileText
  },
  {
    name: 'Search',
    href: '/search',
    icon: Search
  }
]
```

Create corresponding pages:

1. `app/documents/page.tsx` - Document management dashboard
2. `app/search/page.tsx` - Dedicated search page
3. `app/documents/[id]/page.tsx` - Individual document view

### Responsive Design Considerations

Ensure all components are responsive and work well on mobile devices. Use Tailwind CSS classes for responsive design:

```typescript
// Example responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>

<div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
  {/* Buttons */}
</div>
```

### Error Handling and Loading States

Implement comprehensive error handling and loading states throughout the frontend:

```typescript
// Loading state component
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

// Error state component
export function ErrorMessage({ message, onRetry }: { message: string, onRetry?: () => void }) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <p className="text-red-600 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  )
}
```

This comprehensive frontend integration provides a complete user interface for document storage, management, and semantic search functionality, with proper error handling, responsive design, and user experience considerations.


## 4. Semantic Search Implementation

The semantic search functionality is the core feature that enables users to find relevant documents using natural language queries. This section provides comprehensive implementation details for building an efficient and accurate semantic search system using vector embeddings and similarity matching.

### Semantic Search API Endpoint

Create the main search endpoint at `app/api/search/semantic/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface SearchRequest {
  query: string
  userId?: string
  limit?: number
  threshold?: number
}

interface SearchResult {
  id: string
  fileName: string
  content: string
  uploadedAt: string
  similarity: number
  userId: string
  chunkIndex?: number
  chunkContent?: string
}

export async function POST(request: NextRequest) {
  try {
    const { query, userId, limit = 10, threshold = 0.5 }: SearchRequest = await request.json()

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateQueryEmbedding(query)

    // Perform vector similarity search
    const searchResults = await performVectorSearch(
      queryEmbedding,
      userId,
      limit,
      threshold
    )

    return NextResponse.json({
      success: true,
      results: searchResults,
      query: query,
      totalResults: searchResults.length
    })

  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json(
      { error: 'Internal server error during search' },
      { status: 500 }
    )
  }
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    })

    return embeddingResponse.data[0].embedding
  } catch (error) {
    console.error('Error generating query embedding:', error)
    throw new Error('Failed to generate query embedding')
  }
}

async function performVectorSearch(
  queryEmbedding: number[],
  userId?: string,
  limit: number = 10,
  threshold: number = 0.5
): Promise<SearchResult[]> {
  try {
    // Build the query with optional user filtering
    let query = supabaseAdmin
      .from('document_embeddings')
      .select(`
        id,
        document_id,
        chunk_index,
        chunk_content,
        documents!inner (
          id,
          file_name,
          content,
          uploaded_at,
          user_id
        )
      `)
      .order('similarity', { ascending: false })
      .limit(limit)

    // Add user filtering if userId is provided
    if (userId) {
      query = query.eq('documents.user_id', userId)
    }

    // Perform similarity search using RPC function
    const { data: searchResults, error } = await supabaseAdmin.rpc(
      'search_documents',
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        user_id_filter: userId
      }
    )

    if (error) {
      console.error('Vector search error:', error)
      throw error
    }

    // Transform results to match expected format
    return searchResults.map((result: any) => ({
      id: result.document_id,
      fileName: result.file_name,
      content: result.chunk_content || result.content,
      uploadedAt: result.uploaded_at,
      similarity: result.similarity,
      userId: result.user_id,
      chunkIndex: result.chunk_index
    }))

  } catch (error) {
    console.error('Error performing vector search:', error)
    throw new Error('Failed to perform vector search')
  }
}
```

### Database Functions for Vector Search

Create a PostgreSQL function to handle the vector similarity search efficiently. Execute this SQL in your Supabase SQL editor:

```sql
-- Create a function for semantic document search
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  user_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  document_id UUID,
  file_name TEXT,
  content TEXT,
  uploaded_at TIMESTAMPTZ,
  user_id UUID,
  chunk_index INT,
  chunk_content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS document_id,
    d.file_name,
    d.content,
    d.uploaded_at,
    d.user_id,
    de.chunk_index,
    de.chunk_content,
    (1 - (de.embedding <=> query_embedding)) AS similarity
  FROM document_embeddings de
  JOIN documents d ON de.document_id = d.id
  WHERE 
    (1 - (de.embedding <=> query_embedding)) > match_threshold
    AND (user_id_filter IS NULL OR d.user_id = user_id_filter)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Advanced Search Features

#### Multi-Modal Search

Implement support for different types of search queries and content types:

```typescript
// lib/searchTypes.ts
export enum SearchType {
  SEMANTIC = 'semantic',
  KEYWORD = 'keyword',
  HYBRID = 'hybrid'
}

export interface AdvancedSearchRequest {
  query: string
  searchType: SearchType
  userId?: string
  limit?: number
  threshold?: number
  dateRange?: {
    start: string
    end: string
  }
  fileTypes?: string[]
  sortBy?: 'relevance' | 'date' | 'filename'
}

// Enhanced search endpoint
export async function POST(request: NextRequest) {
  try {
    const searchRequest: AdvancedSearchRequest = await request.json()
    
    let results: SearchResult[] = []
    
    switch (searchRequest.searchType) {
      case SearchType.SEMANTIC:
        results = await performSemanticSearch(searchRequest)
        break
      case SearchType.KEYWORD:
        results = await performKeywordSearch(searchRequest)
        break
      case SearchType.HYBRID:
        results = await performHybridSearch(searchRequest)
        break
      default:
        results = await performSemanticSearch(searchRequest)
    }

    // Apply additional filters
    results = applyFilters(results, searchRequest)
    
    // Sort results
    results = sortResults(results, searchRequest.sortBy || 'relevance')

    return NextResponse.json({
      success: true,
      results: results,
      searchType: searchRequest.searchType,
      query: searchRequest.query,
      totalResults: results.length
    })

  } catch (error) {
    console.error('Advanced search error:', error)
    return NextResponse.json(
      { error: 'Internal server error during search' },
      { status: 500 }
    )
  }
}

async function performKeywordSearch(request: AdvancedSearchRequest): Promise<SearchResult[]> {
  const { query, userId, limit = 10 } = request
  
  let searchQuery = supabaseAdmin
    .from('documents')
    .select('*')
    .textSearch('content', query, {
      type: 'websearch',
      config: 'english'
    })
    .limit(limit)

  if (userId) {
    searchQuery = searchQuery.eq('user_id', userId)
  }

  const { data, error } = await searchQuery

  if (error) throw error

  return data.map(doc => ({
    id: doc.id,
    fileName: doc.file_name,
    content: doc.content,
    uploadedAt: doc.uploaded_at,
    similarity: 1.0, // Keyword search doesn't provide similarity scores
    userId: doc.user_id
  }))
}

async function performHybridSearch(request: AdvancedSearchRequest): Promise<SearchResult[]> {
  // Combine semantic and keyword search results
  const semanticResults = await performSemanticSearch(request)
  const keywordResults = await performKeywordSearch(request)
  
  // Merge and deduplicate results
  const combinedResults = new Map<string, SearchResult>()
  
  // Add semantic results with higher weight for similarity
  semanticResults.forEach(result => {
    combinedResults.set(result.id, {
      ...result,
      similarity: result.similarity * 0.7 // Weight semantic results
    })
  })
  
  // Add keyword results, boosting similarity if already exists
  keywordResults.forEach(result => {
    const existing = combinedResults.get(result.id)
    if (existing) {
      combinedResults.set(result.id, {
        ...existing,
        similarity: Math.min(1.0, existing.similarity + 0.3) // Boost hybrid matches
      })
    } else {
      combinedResults.set(result.id, {
        ...result,
        similarity: 0.6 // Base score for keyword-only matches
      })
    }
  })
  
  return Array.from(combinedResults.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, request.limit || 10)
}

function applyFilters(results: SearchResult[], request: AdvancedSearchRequest): SearchResult[] {
  let filtered = results

  // Date range filter
  if (request.dateRange) {
    const startDate = new Date(request.dateRange.start)
    const endDate = new Date(request.dateRange.end)
    
    filtered = filtered.filter(result => {
      const uploadDate = new Date(result.uploadedAt)
      return uploadDate >= startDate && uploadDate <= endDate
    })
  }

  // File type filter
  if (request.fileTypes && request.fileTypes.length > 0) {
    filtered = filtered.filter(result => {
      const fileExtension = result.fileName.split('.').pop()?.toLowerCase()
      return fileExtension && request.fileTypes!.includes(fileExtension)
    })
  }

  return filtered
}

function sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
  switch (sortBy) {
    case 'date':
      return results.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
    case 'filename':
      return results.sort((a, b) => a.fileName.localeCompare(b.fileName))
    case 'relevance':
    default:
      return results.sort((a, b) => b.similarity - a.similarity)
  }
}
```

#### Search Analytics and Optimization

Implement search analytics to track query performance and user behavior:

```sql
-- Create search analytics table
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    search_type TEXT NOT NULL,
    results_count INTEGER NOT NULL,
    response_time_ms INTEGER,
    clicked_result_id UUID REFERENCES documents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for analytics queries
CREATE INDEX idx_search_analytics_user_created ON search_analytics(user_id, created_at);
CREATE INDEX idx_search_analytics_query ON search_analytics USING gin(to_tsvector('english', query));
```

```typescript
// lib/searchAnalytics.ts
export async function logSearchQuery(
  query: string,
  searchType: string,
  resultsCount: number,
  responseTime: number,
  userId?: string
) {
  try {
    await supabaseAdmin
      .from('search_analytics')
      .insert({
        user_id: userId,
        query: query,
        search_type: searchType,
        results_count: resultsCount,
        response_time_ms: responseTime
      })
  } catch (error) {
    console.error('Error logging search analytics:', error)
  }
}

export async function logResultClick(searchId: string, resultId: string) {
  try {
    await supabaseAdmin
      .from('search_analytics')
      .update({ clicked_result_id: resultId })
      .eq('id', searchId)
  } catch (error) {
    console.error('Error logging result click:', error)
  }
}
```

### Search Result Ranking and Relevance

Implement advanced ranking algorithms to improve search result relevance:

```typescript
// lib/searchRanking.ts
interface RankingFactors {
  semanticSimilarity: number
  recency: number
  userInteraction: number
  documentLength: number
  titleMatch: number
}

export function calculateRelevanceScore(
  result: SearchResult,
  query: string,
  userHistory?: any[]
): number {
  const factors: RankingFactors = {
    semanticSimilarity: result.similarity,
    recency: calculateRecencyScore(result.uploadedAt),
    userInteraction: calculateUserInteractionScore(result.id, userHistory),
    documentLength: calculateDocumentLengthScore(result.content),
    titleMatch: calculateTitleMatchScore(result.fileName, query)
  }

  // Weighted combination of factors
  const weights = {
    semanticSimilarity: 0.4,
    recency: 0.15,
    userInteraction: 0.2,
    documentLength: 0.1,
    titleMatch: 0.15
  }

  return Object.entries(factors).reduce((score, [factor, value]) => {
    return score + (value * weights[factor as keyof typeof weights])
  }, 0)
}

function calculateRecencyScore(uploadedAt: string): number {
  const now = new Date().getTime()
  const uploadTime = new Date(uploadedAt).getTime()
  const daysSinceUpload = (now - uploadTime) / (1000 * 60 * 60 * 24)
  
  // Decay function: more recent documents get higher scores
  return Math.exp(-daysSinceUpload / 30) // 30-day half-life
}

function calculateUserInteractionScore(documentId: string, userHistory?: any[]): number {
  if (!userHistory) return 0.5 // Neutral score
  
  const interactions = userHistory.filter(h => h.documentId === documentId)
  const clickCount = interactions.length
  const recentClicks = interactions.filter(h => 
    new Date(h.timestamp).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
  ).length
  
  return Math.min(1.0, (clickCount * 0.1) + (recentClicks * 0.2))
}

function calculateDocumentLengthScore(content: string): number {
  const length = content.length
  // Optimal length around 1000-5000 characters
  if (length < 100) return 0.3
  if (length < 1000) return 0.7
  if (length < 5000) return 1.0
  if (length < 10000) return 0.8
  return 0.6 // Very long documents might be less focused
}

function calculateTitleMatchScore(fileName: string, query: string): number {
  const titleWords = fileName.toLowerCase().split(/[\s\-_\.]+/)
  const queryWords = query.toLowerCase().split(/\s+/)
  
  const matches = queryWords.filter(qWord => 
    titleWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))
  )
  
  return matches.length / queryWords.length
}
```

### Search Performance Optimization

#### Caching Strategy

Implement caching for frequently searched queries:

```typescript
// lib/searchCache.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function getCachedSearchResults(
  query: string,
  userId?: string
): Promise<SearchResult[] | null> {
  try {
    const cacheKey = `search:${userId || 'global'}:${hashQuery(query)}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    console.error('Cache retrieval error:', error)
    return null
  }
}

export async function setCachedSearchResults(
  query: string,
  results: SearchResult[],
  userId?: string,
  ttl: number = 300 // 5 minutes
): Promise<void> {
  try {
    const cacheKey = `search:${userId || 'global'}:${hashQuery(query)}`
    await redis.setex(cacheKey, ttl, JSON.stringify(results))
  } catch (error) {
    console.error('Cache storage error:', error)
  }
}

function hashQuery(query: string): string {
  // Simple hash function for cache keys
  return Buffer.from(query.toLowerCase().trim()).toString('base64')
}
```

#### Database Optimization

Optimize database queries for better search performance:

```sql
-- Create additional indexes for better query performance
CREATE INDEX idx_documents_user_uploaded ON documents(user_id, uploaded_at DESC);
CREATE INDEX idx_documents_content_gin ON documents USING gin(to_tsvector('english', content));
CREATE INDEX idx_document_embeddings_document_chunk ON document_embeddings(document_id, chunk_index);

-- Create materialized view for frequently accessed document metadata
CREATE MATERIALIZED VIEW document_search_metadata AS
SELECT 
    d.id,
    d.user_id,
    d.file_name,
    d.uploaded_at,
    LENGTH(d.content) as content_length,
    array_agg(de.id) as embedding_ids
FROM documents d
LEFT JOIN document_embeddings de ON d.id = de.document_id
GROUP BY d.id, d.user_id, d.file_name, d.uploaded_at, d.content;

-- Create index on materialized view
CREATE INDEX idx_document_search_metadata_user ON document_search_metadata(user_id);

-- Refresh materialized view periodically (can be automated)
-- REFRESH MATERIALIZED VIEW document_search_metadata;
```

### Search Query Expansion and Suggestions

Implement query expansion to improve search results:

```typescript
// lib/queryExpansion.ts
export async function expandQuery(originalQuery: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a search query expansion assistant. Given a search query, provide 3-5 related terms or phrases that could help find relevant documents. Return only the expanded terms, one per line.'
        },
        {
          role: 'user',
          content: `Expand this search query: "${originalQuery}"`
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    })

    const expandedTerms = response.choices[0].message.content
      ?.split('\n')
      .filter(term => term.trim().length > 0)
      .slice(0, 5) || []

    return [originalQuery, ...expandedTerms]
  } catch (error) {
    console.error('Query expansion error:', error)
    return [originalQuery] // Fallback to original query
  }
}

export async function getSearchSuggestions(partialQuery: string): Promise<string[]> {
  try {
    // Get suggestions from search history
    const { data: recentSearches } = await supabaseAdmin
      .from('search_analytics')
      .select('query')
      .ilike('query', `${partialQuery}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    const suggestions = recentSearches?.map(s => s.query) || []
    
    // Remove duplicates and return
    return [...new Set(suggestions)]
  } catch (error) {
    console.error('Search suggestions error:', error)
    return []
  }
}
```

### Real-time Search with Debouncing

Implement real-time search with proper debouncing for better user experience:

```typescript
// hooks/useSearch.ts
import { useState, useEffect, useCallback } from 'react'
import { debounce } from 'lodash'

export function useSearch(initialQuery: string = '') {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        return
      }

      setIsSearching(true)
      
      try {
        const response = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery })
        })

        const data = await response.json()
        
        if (response.ok) {
          setResults(data.results || [])
        } else {
          console.error('Search failed:', data.error)
          setResults([])
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300),
    []
  )

  // Debounced suggestions function
  const debouncedSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([])
        return
      }

      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
        const data = await response.json()
        
        if (response.ok) {
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error('Suggestions error:', error)
        setSuggestions([])
      }
    }, 150),
    []
  )

  useEffect(() => {
    debouncedSearch(query)
    debouncedSuggestions(query)
  }, [query, debouncedSearch, debouncedSuggestions])

  return {
    query,
    setQuery,
    results,
    isSearching,
    suggestions
  }
}
```

This comprehensive semantic search implementation provides a robust, scalable, and user-friendly search experience with advanced features like query expansion, caching, analytics, and real-time suggestions. The system is designed to handle large document collections efficiently while providing accurate and relevant search results.


## 5. Deployment and Testing Instructions

This section provides comprehensive guidance for deploying the document storage and semantic search functionality to production environments, along with testing strategies to ensure system reliability and performance.

### Environment Configuration

#### Production Environment Variables

Create a comprehensive environment configuration for production deployment:

```env
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_BASE=https://api.openai.com/v1

# Redis Configuration (for caching)
REDIS_URL=redis://your-redis-instance:6379

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# Security Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-app-domain.com

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_WINDOW_MS=60000

# File Upload Configuration
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,md

# Search Configuration
DEFAULT_SEARCH_LIMIT=10
MAX_SEARCH_LIMIT=50
SEARCH_CACHE_TTL_SECONDS=300
```

#### Database Migration Scripts

Create migration scripts to set up the production database:

```sql
-- migrations/001_initial_setup.sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    content TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    chunk_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    search_type TEXT NOT NULL DEFAULT 'semantic',
    results_count INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER,
    clicked_result_id UUID REFERENCES documents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document processing queue table
CREATE TABLE IF NOT EXISTS document_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);
```

```sql
-- migrations/002_indexes_and_functions.sql
-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_uploaded ON documents(user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_content_gin ON documents USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_hnsw ON document_embeddings USING HNSW (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_created ON search_analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON document_processing_queue(status, created_at);

-- Create search function
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  user_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  document_id UUID,
  file_name TEXT,
  content TEXT,
  uploaded_at TIMESTAMPTZ,
  user_id UUID,
  chunk_index INT,
  chunk_content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS document_id,
    d.file_name,
    d.content,
    d.uploaded_at,
    d.user_id,
    de.chunk_index,
    de.chunk_content,
    (1 - (de.embedding <=> query_embedding)) AS similarity
  FROM document_embeddings de
  JOIN documents d ON de.document_id = d.id
  WHERE 
    (1 - (de.embedding <=> query_embedding)) > match_threshold
    AND (user_id_filter IS NULL OR d.user_id = user_id_filter)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for documents table
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### Testing Strategy

#### Unit Tests

Create comprehensive unit tests for core functionality:

```typescript
// __tests__/lib/searchRanking.test.ts
import { calculateRelevanceScore } from '@/lib/searchRanking'
import { SearchResult } from '@/types/search'

describe('Search Ranking', () => {
  const mockResult: SearchResult = {
    id: 'test-id',
    fileName: 'test-document.pdf',
    content: 'This is a test document with relevant content.',
    uploadedAt: new Date().toISOString(),
    similarity: 0.8,
    userId: 'user-id'
  }

  test('should calculate relevance score correctly', () => {
    const score = calculateRelevanceScore(mockResult, 'test query')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  test('should give higher scores to more recent documents', () => {
    const recentResult = { ...mockResult, uploadedAt: new Date().toISOString() }
    const oldResult = { 
      ...mockResult, 
      uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() 
    }

    const recentScore = calculateRelevanceScore(recentResult, 'test')
    const oldScore = calculateRelevanceScore(oldResult, 'test')

    expect(recentScore).toBeGreaterThan(oldScore)
  })

  test('should boost scores for title matches', () => {
    const titleMatchResult = { ...mockResult, fileName: 'test-query-document.pdf' }
    const noMatchResult = { ...mockResult, fileName: 'unrelated-document.pdf' }

    const titleScore = calculateRelevanceScore(titleMatchResult, 'test query')
    const noMatchScore = calculateRelevanceScore(noMatchResult, 'test query')

    expect(titleScore).toBeGreaterThan(noMatchScore)
  })
})
```

```typescript
// __tests__/api/search/semantic.test.ts
import { POST } from '@/app/api/search/semantic/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('openai')

describe('/api/search/semantic', () => {
  test('should return 400 for empty query', async () => {
    const request = new NextRequest('http://localhost:3000/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query: '' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Query parameter is required')
  })

  test('should return search results for valid query', async () => {
    // Mock successful search
    const mockResults = [
      {
        id: 'doc-1',
        fileName: 'test.pdf',
        content: 'Test content',
        uploadedAt: new Date().toISOString(),
        similarity: 0.9,
        userId: 'user-1'
      }
    ]

    // Setup mocks here...

    const request = new NextRequest('http://localhost:3000/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query: 'test query' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.results).toHaveLength(1)
  })
})
```

#### Integration Tests

Create integration tests for end-to-end functionality:

```typescript
// __tests__/integration/document-workflow.test.ts
import { testClient } from '@/lib/testUtils'

describe('Document Workflow Integration', () => {
  test('should complete full document upload and search workflow', async () => {
    // 1. Upload document
    const uploadResponse = await testClient.post('/api/upload', {
      file: new File(['Test document content'], 'test.txt', { type: 'text/plain' }),
      saveToDatabase: true,
      userId: 'test-user'
    })

    expect(uploadResponse.status).toBe(200)
    const uploadData = await uploadResponse.json()
    expect(uploadData.saved).toBe(true)
    expect(uploadData.documentId).toBeDefined()

    // 2. Wait for processing (in real scenario, this would be handled by queue)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 3. Search for document
    const searchResponse = await testClient.post('/api/search/semantic', {
      query: 'test document',
      userId: 'test-user'
    })

    expect(searchResponse.status).toBe(200)
    const searchData = await searchResponse.json()
    expect(searchData.results).toHaveLength(1)
    expect(searchData.results[0].id).toBe(uploadData.documentId)

    // 4. Cleanup
    await testClient.delete(`/api/documents/${uploadData.documentId}`)
  })
})
```

#### Performance Tests

Create performance tests to ensure system scalability:

```typescript
// __tests__/performance/search-performance.test.ts
describe('Search Performance', () => {
  test('should handle concurrent search requests', async () => {
    const concurrentRequests = 10
    const promises = Array.from({ length: concurrentRequests }, () =>
      fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test query' })
      })
    )

    const startTime = Date.now()
    const responses = await Promise.all(promises)
    const endTime = Date.now()

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })

    // Should complete within reasonable time (adjust based on requirements)
    expect(endTime - startTime).toBeLessThan(5000) // 5 seconds
  })

  test('should handle large result sets efficiently', async () => {
    const startTime = Date.now()
    
    const response = await fetch('/api/search/semantic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: 'common term',
        limit: 100 // Large result set
      })
    })

    const endTime = Date.now()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(endTime - startTime).toBeLessThan(2000) // 2 seconds
    expect(data.results.length).toBeLessThanOrEqual(100)
  })
})
```

### Monitoring and Observability

#### Application Monitoring

Set up comprehensive monitoring for the document storage and search system:

```typescript
// lib/monitoring.ts
import { createClient } from '@supabase/supabase-js'

interface MetricData {
  name: string
  value: number
  timestamp: Date
  metadata?: Record<string, any>
}

export class MetricsCollector {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  async recordMetric(metric: MetricData) {
    try {
      await this.supabase
        .from('system_metrics')
        .insert({
          metric_name: metric.name,
          metric_value: metric.value,
          timestamp: metric.timestamp.toISOString(),
          metadata: metric.metadata
        })
    } catch (error) {
      console.error('Failed to record metric:', error)
    }
  }

  async recordSearchLatency(query: string, latency: number, resultCount: number) {
    await this.recordMetric({
      name: 'search_latency',
      value: latency,
      timestamp: new Date(),
      metadata: {
        query_length: query.length,
        result_count: resultCount
      }
    })
  }

  async recordEmbeddingGeneration(documentId: string, processingTime: number, chunkCount: number) {
    await this.recordMetric({
      name: 'embedding_generation',
      value: processingTime,
      timestamp: new Date(),
      metadata: {
        document_id: documentId,
        chunk_count: chunkCount
      }
    })
  }

  async recordStorageUsage(userId: string, documentCount: number, totalSize: number) {
    await this.recordMetric({
      name: 'storage_usage',
      value: totalSize,
      timestamp: new Date(),
      metadata: {
        user_id: userId,
        document_count: documentCount
      }
    })
  }
}

export const metrics = new MetricsCollector()
```

#### Health Check Endpoints

Create health check endpoints for monitoring system status:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function GET() {
  const checks = {
    database: false,
    openai: false,
    embeddings: false,
    search: false
  }

  try {
    // Check database connection
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('count')
      .limit(1)
    
    checks.database = !error

    // Check OpenAI API
    try {
      await openai.models.list()
      checks.openai = true
    } catch (error) {
      console.error('OpenAI health check failed:', error)
    }

    // Check embedding generation
    try {
      const testEmbedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: 'health check test'
      })
      checks.embeddings = testEmbedding.data.length > 0
    } catch (error) {
      console.error('Embedding health check failed:', error)
    }

    // Check search function
    try {
      const { data: searchResult, error: searchError } = await supabaseAdmin.rpc(
        'search_documents',
        {
          query_embedding: new Array(1536).fill(0.1),
          match_threshold: 0.1,
          match_count: 1
        }
      )
      checks.search = !searchError
    } catch (error) {
      console.error('Search health check failed:', error)
    }

    const allHealthy = Object.values(checks).every(check => check)
    const status = allHealthy ? 200 : 503

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    }, { status })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks
    }, { status: 503 })
  }
}
```

### Deployment Scripts

#### Docker Configuration

Create Docker configuration for containerized deployment:

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

#### Deployment Automation

Create deployment scripts for automated deployment:

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "Starting deployment..."

# Build and test
echo "Running tests..."
npm test

echo "Building application..."
npm run build

# Database migrations
echo "Running database migrations..."
npx supabase db push

# Deploy to production
echo "Deploying to production..."
docker-compose -f docker-compose.prod.yml up -d --build

# Health check
echo "Performing health check..."
sleep 30
curl -f http://localhost:3000/api/health || exit 1

echo "Deployment completed successfully!"
```

### Security Considerations

#### Rate Limiting

Implement rate limiting for API endpoints:

```typescript
// lib/rateLimit.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function rateLimit(
  identifier: string,
  limit: number = 60,
  window: number = 60000
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate_limit:${identifier}`
  const now = Date.now()
  const windowStart = now - window

  try {
    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart)
    
    // Count current requests
    const current = await redis.zcard(key)
    
    if (current >= limit) {
      return { success: false, remaining: 0 }
    }
    
    // Add current request
    await redis.zadd(key, now, now)
    await redis.expire(key, Math.ceil(window / 1000))
    
    return { success: true, remaining: limit - current - 1 }
  } catch (error) {
    console.error('Rate limiting error:', error)
    return { success: true, remaining: limit } // Fail open
  }
}
```

#### Input Validation

Implement comprehensive input validation:

```typescript
// lib/validation.ts
import { z } from 'zod'

export const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  userId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.5)
})

export const documentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  content: z.string().min(1).max(1000000), // 1MB text limit
  saveToDatabase: z.boolean().default(false),
  keepHardCopy: z.boolean().default(false),
  userId: z.string().uuid().optional()
})

export function validateSearchRequest(data: unknown) {
  return searchRequestSchema.parse(data)
}

export function validateDocumentUpload(data: unknown) {
  return documentUploadSchema.parse(data)
}
```

This comprehensive deployment and testing guide ensures that the document storage and semantic search functionality can be reliably deployed to production environments with proper monitoring, security, and performance considerations.


## 6. Troubleshooting and Maintenance

This section provides guidance for troubleshooting common issues and maintaining the document storage and semantic search system in production environments.

### Common Issues and Solutions

#### Database Connection Issues

**Problem**: Application cannot connect to Supabase database
```
Error: connect ECONNREFUSED
```

**Solutions**:
1. Verify environment variables are correctly set
2. Check Supabase project status in dashboard
3. Ensure IP allowlisting is configured correctly
4. Verify network connectivity from deployment environment

```typescript
// Debug database connection
async function testDatabaseConnection() {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database connection failed:', error)
      return false
    }
    
    console.log('Database connection successful')
    return true
  } catch (error) {
    console.error('Database connection error:', error)
    return false
  }
}
```

#### OpenAI API Issues

**Problem**: Embedding generation fails with rate limit or API errors
```
Error: Rate limit exceeded for requests
```

**Solutions**:
1. Implement exponential backoff retry logic
2. Use batch processing for multiple documents
3. Consider upgrading OpenAI API tier
4. Implement request queuing system

```typescript
// Enhanced retry logic for OpenAI API
async function generateEmbeddingWithRetry(
  content: string, 
  maxRetries: number = 5
): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: content
      })
      return response.data[0].embedding
    } catch (error) {
      if (error.status === 429) { // Rate limit
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
        console.log(`Rate limited, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      if (attempt === maxRetries) {
        throw error
      }
      
      console.error(`Attempt ${attempt} failed:`, error.message)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  throw new Error('Max retries exceeded')
}
```

#### Vector Search Performance Issues

**Problem**: Slow search response times or timeouts
```
Error: Query timeout after 30 seconds
```

**Solutions**:
1. Optimize database indexes
2. Implement result caching
3. Reduce embedding dimensions if possible
4. Use approximate search algorithms

```sql
-- Optimize vector search performance
-- Check index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM search_documents(
  ARRAY[0.1, 0.2, ...]::vector(1536),
  0.5,
  10,
  'user-id'
);

-- Rebuild indexes if needed
REINDEX INDEX idx_document_embeddings_hnsw;

-- Update table statistics
ANALYZE document_embeddings;
```

#### Memory and Storage Issues

**Problem**: High memory usage or storage space exhaustion
```
Error: Out of memory
Error: No space left on device
```

**Solutions**:
1. Implement document cleanup policies
2. Compress old embeddings
3. Archive inactive documents
4. Monitor storage usage

```typescript
// Cleanup old documents
async function cleanupOldDocuments(daysOld: number = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)
  
  const { data: oldDocuments, error } = await supabaseAdmin
    .from('documents')
    .select('id')
    .lt('uploaded_at', cutoffDate.toISOString())
    .eq('user_id', null) // Only cleanup documents without user association
  
  if (error) {
    console.error('Error finding old documents:', error)
    return
  }
  
  for (const doc of oldDocuments) {
    await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', doc.id)
  }
  
  console.log(`Cleaned up ${oldDocuments.length} old documents`)
}
```

### Monitoring and Alerting

#### Key Metrics to Monitor

1. **Search Performance Metrics**
   - Average search response time
   - Search success rate
   - Query volume per hour/day
   - Cache hit rate

2. **Document Processing Metrics**
   - Upload success rate
   - Embedding generation time
   - Processing queue length
   - Failed processing count

3. **System Resource Metrics**
   - Database connection pool usage
   - Memory usage
   - CPU utilization
   - Storage space usage

4. **Business Metrics**
   - Active users
   - Documents stored per user
   - Search queries per user
   - User retention rate

```typescript
// Monitoring dashboard data collection
export async function getSystemMetrics() {
  const metrics = {
    searchMetrics: await getSearchMetrics(),
    processingMetrics: await getProcessingMetrics(),
    systemMetrics: await getSystemMetrics(),
    businessMetrics: await getBusinessMetrics()
  }
  
  return metrics
}

async function getSearchMetrics() {
  const { data } = await supabaseAdmin
    .from('search_analytics')
    .select('response_time_ms, results_count, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  
  return {
    averageResponseTime: data?.reduce((sum, item) => sum + item.response_time_ms, 0) / data?.length || 0,
    totalQueries: data?.length || 0,
    averageResults: data?.reduce((sum, item) => sum + item.results_count, 0) / data?.length || 0
  }
}
```

#### Alert Configuration

Set up alerts for critical system events:

```typescript
// Alert system
interface AlertConfig {
  metric: string
  threshold: number
  comparison: 'gt' | 'lt' | 'eq'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const alertConfigs: AlertConfig[] = [
  {
    metric: 'search_response_time',
    threshold: 5000, // 5 seconds
    comparison: 'gt',
    severity: 'high'
  },
  {
    metric: 'embedding_generation_failures',
    threshold: 10,
    comparison: 'gt',
    severity: 'critical'
  },
  {
    metric: 'database_connection_failures',
    threshold: 5,
    comparison: 'gt',
    severity: 'critical'
  }
]

export async function checkAlerts() {
  for (const config of alertConfigs) {
    const currentValue = await getMetricValue(config.metric)
    
    if (shouldAlert(currentValue, config.threshold, config.comparison)) {
      await sendAlert({
        metric: config.metric,
        currentValue,
        threshold: config.threshold,
        severity: config.severity,
        timestamp: new Date()
      })
    }
  }
}
```

### Maintenance Tasks

#### Regular Maintenance Schedule

**Daily Tasks**:
- Monitor system health endpoints
- Check error logs for anomalies
- Verify backup completion
- Review performance metrics

**Weekly Tasks**:
- Analyze search query patterns
- Review user feedback and support tickets
- Update database statistics
- Clean up temporary files

**Monthly Tasks**:
- Review and optimize database indexes
- Analyze storage usage trends
- Update dependencies and security patches
- Performance testing and optimization

**Quarterly Tasks**:
- Comprehensive security audit
- Disaster recovery testing
- Capacity planning review
- User experience analysis

#### Database Maintenance

```sql
-- Monthly database maintenance script
-- Update table statistics
ANALYZE documents;
ANALYZE document_embeddings;
ANALYZE search_analytics;

-- Reindex if needed (check fragmentation first)
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename IN ('documents', 'document_embeddings');

-- Clean up old analytics data (keep 6 months)
DELETE FROM search_analytics 
WHERE created_at < NOW() - INTERVAL '6 months';

-- Vacuum to reclaim space
VACUUM ANALYZE documents;
VACUUM ANALYZE document_embeddings;
VACUUM ANALYZE search_analytics;
```

#### Performance Optimization

```typescript
// Performance optimization utilities
export class PerformanceOptimizer {
  async optimizeSearchCache() {
    // Identify frequently searched queries
    const { data: frequentQueries } = await supabaseAdmin
      .from('search_analytics')
      .select('query, COUNT(*) as frequency')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .group('query')
      .order('frequency', { ascending: false })
      .limit(100)
    
    // Pre-warm cache for frequent queries
    for (const queryData of frequentQueries || []) {
      try {
        await this.preWarmSearchCache(queryData.query)
      } catch (error) {
        console.error(`Failed to pre-warm cache for query: ${queryData.query}`, error)
      }
    }
  }
  
  async preWarmSearchCache(query: string) {
    // Generate embedding and cache it
    const embedding = await generateQueryEmbedding(query)
    const results = await performVectorSearch(embedding)
    await setCachedSearchResults(query, results, undefined, 3600) // Cache for 1 hour
  }
  
  async optimizeEmbeddingStorage() {
    // Identify and remove duplicate embeddings
    const { data: duplicates } = await supabaseAdmin.rpc('find_duplicate_embeddings')
    
    for (const duplicate of duplicates || []) {
      await supabaseAdmin
        .from('document_embeddings')
        .delete()
        .eq('id', duplicate.id)
    }
    
    console.log(`Removed ${duplicates?.length || 0} duplicate embeddings`)
  }
}
```

### Backup and Recovery

#### Backup Strategy

```bash
#!/bin/bash
# scripts/backup.sh

# Database backup
pg_dump $DATABASE_URL > "backup_$(date +%Y%m%d_%H%M%S).sql"

# Upload to cloud storage
aws s3 cp backup_*.sql s3://your-backup-bucket/database/

# Clean up local backups older than 7 days
find . -name "backup_*.sql" -mtime +7 -delete

# Verify backup integrity
pg_restore --list backup_$(date +%Y%m%d)_*.sql > /dev/null
if [ $? -eq 0 ]; then
    echo "Backup verification successful"
else
    echo "Backup verification failed" >&2
    exit 1
fi
```

#### Disaster Recovery

```typescript
// Disaster recovery procedures
export class DisasterRecovery {
  async createSystemSnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      documentCount: await this.getDocumentCount(),
      embeddingCount: await this.getEmbeddingCount(),
      userCount: await this.getUserCount(),
      systemHealth: await this.getSystemHealth()
    }
    
    // Store snapshot metadata
    await supabaseAdmin
      .from('system_snapshots')
      .insert(snapshot)
    
    return snapshot
  }
  
  async restoreFromBackup(backupDate: string) {
    console.log(`Starting restore from backup: ${backupDate}`)
    
    // 1. Stop application traffic
    await this.enableMaintenanceMode()
    
    try {
      // 2. Restore database
      await this.restoreDatabase(backupDate)
      
      // 3. Rebuild indexes
      await this.rebuildIndexes()
      
      // 4. Verify data integrity
      const isValid = await this.verifyDataIntegrity()
      
      if (!isValid) {
        throw new Error('Data integrity check failed')
      }
      
      // 5. Re-enable application
      await this.disableMaintenanceMode()
      
      console.log('Restore completed successfully')
    } catch (error) {
      console.error('Restore failed:', error)
      // Rollback if possible
      await this.rollbackRestore()
      throw error
    }
  }
}
```

### Scaling Considerations

#### Horizontal Scaling

```typescript
// Load balancing configuration
export const loadBalancerConfig = {
  algorithm: 'round_robin',
  healthCheck: {
    path: '/api/health',
    interval: 30000,
    timeout: 5000,
    retries: 3
  },
  servers: [
    { host: 'app1.example.com', weight: 1 },
    { host: 'app2.example.com', weight: 1 },
    { host: 'app3.example.com', weight: 1 }
  ]
}

// Database read replicas
export const databaseConfig = {
  primary: {
    host: 'primary.db.example.com',
    role: 'write'
  },
  replicas: [
    { host: 'replica1.db.example.com', role: 'read' },
    { host: 'replica2.db.example.com', role: 'read' }
  ]
}
```

#### Vertical Scaling

Monitor resource usage and scale vertically when needed:

```typescript
// Resource monitoring
export async function checkResourceUsage() {
  const metrics = {
    cpu: await getCpuUsage(),
    memory: await getMemoryUsage(),
    disk: await getDiskUsage(),
    network: await getNetworkUsage()
  }
  
  // Auto-scaling triggers
  if (metrics.cpu > 80) {
    await scaleUp('cpu')
  }
  
  if (metrics.memory > 85) {
    await scaleUp('memory')
  }
  
  return metrics
}
```

This comprehensive troubleshooting and maintenance guide ensures that the document storage and semantic search system can be effectively maintained in production environments with proper monitoring, alerting, and recovery procedures.


## 7. Implementation Checklist and Next Steps

This final section provides a comprehensive checklist for implementing the document storage and semantic search functionality, along with recommendations for future enhancements.

### Implementation Checklist

#### Phase 1: Database Setup
- [ ] Enable `pg_vector` extension in Supabase
- [ ] Create `documents` table with proper schema
- [ ] Create `document_embeddings` table with vector column
- [ ] Create `search_analytics` table for monitoring
- [ ] Create `document_processing_queue` table for background processing
- [ ] Set up database indexes for optimal performance
- [ ] Create PostgreSQL functions for vector search
- [ ] Configure Row Level Security (RLS) policies
- [ ] Test database connectivity and basic operations

#### Phase 2: Backend Implementation
- [ ] Set up environment variables for all services
- [ ] Install required dependencies (`@supabase/supabase-js`, `openai`)
- [ ] Create Supabase client configuration
- [ ] Implement document storage API endpoint
- [ ] Integrate document saving with existing upload flow
- [ ] Create semantic search API endpoint
- [ ] Implement vector embedding generation
- [ ] Add error handling and retry logic
- [ ] Create background processing queue system
- [ ] Implement rate limiting and input validation
- [ ] Add comprehensive logging and monitoring

#### Phase 3: Frontend Integration
- [ ] Create document storage options components
- [ ] Update upload interface with save toggles
- [ ] Implement semantic search interface
- [ ] Create document management dashboard
- [ ] Add search suggestions and auto-complete
- [ ] Implement real-time search with debouncing
- [ ] Create responsive design for mobile devices
- [ ] Add loading states and error handling
- [ ] Integrate with existing navigation
- [ ] Test user experience flows

#### Phase 4: Testing and Quality Assurance
- [ ] Write unit tests for core functionality
- [ ] Create integration tests for end-to-end workflows
- [ ] Implement performance tests for search operations
- [ ] Set up automated testing pipeline
- [ ] Conduct security testing and vulnerability assessment
- [ ] Perform load testing with concurrent users
- [ ] Test disaster recovery procedures
- [ ] Validate data integrity and consistency
- [ ] Review code quality and documentation

#### Phase 5: Deployment and Monitoring
- [ ] Set up production environment configuration
- [ ] Configure Docker containers for deployment
- [ ] Implement health check endpoints
- [ ] Set up monitoring and alerting systems
- [ ] Configure backup and recovery procedures
- [ ] Deploy to staging environment for final testing
- [ ] Perform production deployment
- [ ] Monitor system performance and user adoption
- [ ] Collect user feedback and iterate

### Future Enhancement Opportunities

#### Advanced Search Features

**Multi-language Support**: Extend the system to handle documents in multiple languages by using language-specific embedding models and implementing language detection.

```typescript
// Future enhancement: Multi-language support
interface LanguageConfig {
  code: string
  name: string
  embeddingModel: string
  textProcessor: string
}

const supportedLanguages: LanguageConfig[] = [
  { code: 'en', name: 'English', embeddingModel: 'text-embedding-ada-002', textProcessor: 'english' },
  { code: 'es', name: 'Spanish', embeddingModel: 'text-embedding-ada-002', textProcessor: 'spanish' },
  { code: 'fr', name: 'French', embeddingModel: 'text-embedding-ada-002', textProcessor: 'french' }
]
```

**Visual Document Search**: Implement image-based search for documents containing charts, diagrams, or other visual elements using vision-language models.

**Contextual Search**: Enhance search results by considering user context, search history, and document relationships to provide more personalized results.

#### AI-Powered Features

**Document Summarization**: Automatically generate summaries for long documents to help users quickly understand content before diving deeper.

**Question Answering**: Implement a question-answering system that can provide direct answers to user queries based on document content.

**Content Recommendations**: Suggest related documents based on user reading patterns and document similarity.

#### Collaboration Features

**Shared Collections**: Allow users to create and share document collections with team members or specific user groups.

**Collaborative Annotations**: Enable users to add comments, highlights, and notes to documents that can be shared with others.

**Version Control**: Implement document versioning to track changes and allow users to revert to previous versions.

#### Advanced Analytics

**Usage Analytics Dashboard**: Create comprehensive analytics showing search patterns, popular documents, and user engagement metrics.

**Content Gap Analysis**: Identify topics or areas where users frequently search but find limited results, indicating content gaps.

**Search Quality Metrics**: Implement click-through rates, dwell time, and user satisfaction scores to continuously improve search relevance.

### Performance Optimization Roadmap

#### Short-term Optimizations (1-3 months)
- Implement Redis caching for frequently accessed search results
- Optimize database queries and add missing indexes
- Implement lazy loading for large document lists
- Add compression for stored document content

#### Medium-term Optimizations (3-6 months)
- Implement document chunking for better search granularity
- Add support for approximate nearest neighbor search algorithms
- Implement search result personalization based on user behavior
- Optimize embedding storage with dimensionality reduction techniques

#### Long-term Optimizations (6-12 months)
- Migrate to specialized vector databases (e.g., Pinecone, Weaviate)
- Implement distributed search across multiple regions
- Add support for real-time document indexing
- Implement advanced ranking algorithms with machine learning

### Security and Compliance Enhancements

#### Data Privacy
- Implement end-to-end encryption for sensitive documents
- Add data retention policies and automated deletion
- Provide user data export and deletion capabilities (GDPR compliance)
- Implement audit logging for all document access and modifications

#### Access Control
- Implement role-based access control (RBAC) for document management
- Add document-level permissions and sharing controls
- Implement single sign-on (SSO) integration
- Add multi-factor authentication for sensitive operations

### Integration Opportunities

#### Third-party Integrations
- Google Drive, Dropbox, and OneDrive integration for document import
- Slack and Microsoft Teams integration for document sharing
- CRM system integration for customer document management
- Email integration for automatic document extraction and storage

#### API Development
- Create public APIs for third-party developers
- Implement webhook support for real-time notifications
- Add GraphQL support for flexible data querying
- Create SDK libraries for popular programming languages

### Cost Optimization Strategies

#### Embedding Cost Reduction
- Implement smart caching to avoid re-generating embeddings
- Use smaller, more efficient embedding models where appropriate
- Implement batch processing to reduce API call overhead
- Consider using open-source embedding models for cost savings

#### Storage Optimization
- Implement tiered storage for frequently vs. rarely accessed documents
- Add document compression and deduplication
- Implement automatic archiving of old documents
- Use content delivery networks (CDN) for static assets

### Success Metrics and KPIs

#### Technical Metrics
- Search response time (target: < 500ms for 95th percentile)
- System uptime (target: 99.9%)
- Document processing success rate (target: > 99%)
- Cache hit rate (target: > 80%)

#### Business Metrics
- User adoption rate
- Documents stored per active user
- Search queries per user session
- User retention and engagement rates

#### User Experience Metrics
- Search result relevance scores
- User satisfaction ratings
- Time to find relevant information
- Feature usage and adoption rates

### Conclusion

The implementation of document storage and semantic search functionality represents a significant enhancement to the VoiceLoopHR platform, providing users with powerful tools for managing and discovering relevant information. This comprehensive guide provides all the necessary components for a successful implementation, from database design to production deployment.

The modular architecture and detailed implementation instructions ensure that the system can be built incrementally, tested thoroughly, and scaled effectively as user needs grow. The emphasis on monitoring, maintenance, and continuous improvement ensures long-term success and user satisfaction.

By following this guide and implementing the suggested enhancements over time, the VoiceLoopHR platform will provide a world-class document management and search experience that significantly improves user productivity and information accessibility.

The key to success lies in careful attention to user experience, robust error handling, comprehensive testing, and continuous monitoring and optimization based on real-world usage patterns and user feedback.

---

**Author**: Manus AI  
**Version**: 1.0  
**Last Updated**: September 2025  
**Target Audience**: AI Developers and Technical Teams

