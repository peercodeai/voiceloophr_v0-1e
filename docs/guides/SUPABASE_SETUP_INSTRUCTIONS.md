# Supabase Setup Instructions for VoiceLoop HR

## Current Status ✅
- **Supabase Connection**: ✅ Working
- **Environment Variables**: ✅ Configured
- **Database Schema**: ❌ Needs to be created

## What You Need to Do

### 1. Go to Your Supabase Project Dashboard
1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to the **SQL Editor** tab

### 2. Run the Database Schema
Copy and paste the following SQL into the SQL Editor and run it:

```sql
-- Enable the pg_vector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing table if it exists (to start fresh)
DROP TABLE IF EXISTS document_chunks CASCADE;

-- Document chunks table for storing text segments
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_size INTEGER NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at ON document_chunks(created_at);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to search documents using vector similarity
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id text,
    file_name text,
    chunk_text text,
    chunk_index int,
    chunk_size int,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.document_id,
        dc.file_name,
        dc.chunk_text,
        dc.chunk_index,
        dc.chunk_size,
        1 - (dc.embedding <=> query_embedding) as similarity,
        dc.metadata
    FROM document_chunks dc
    WHERE 
        (user_id_filter IS NULL OR dc.user_id = user_id_filter)
        AND dc.embedding IS NOT NULL
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats(user_id_filter uuid DEFAULT NULL)
RETURNS TABLE (
    total_documents bigint,
    total_chunks bigint,
    total_embeddings bigint,
    avg_chunk_size float,
    oldest_document timestamp with time zone,
    newest_document timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT dc.document_id) as total_documents,
        COUNT(*) as total_chunks,
        COUNT(dc.embedding) as total_embeddings,
        AVG(dc.chunk_size) as avg_chunk_size,
        MIN(dc.created_at) as oldest_document,
        MAX(dc.created_at) as newest_document
    FROM document_chunks dc
    WHERE user_id_filter IS NULL OR dc.user_id = user_id_filter;
END;
$$;

-- Enable Row Level Security
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own document chunks" ON document_chunks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document chunks" ON document_chunks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document chunks" ON document_chunks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document chunks" ON document_chunks
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_stats TO authenticated;
```

### 3. Verify the Setup
After running the SQL, run this command to test:

```bash
node check-supabase-config.js
```

You should see:
- ✅ All environment variables found
- ✅ Supabase connection successful
- ✅ Database schema exists
- ✅ RAG functionality working

## What This Enables

Once the schema is set up, your VoiceLoop HR app will have:

1. **Semantic Search**: Search documents using natural language
2. **Document Chunking**: Automatically split large documents into searchable chunks
3. **Vector Embeddings**: Use OpenAI embeddings for intelligent search
4. **User Isolation**: Each user only sees their own documents
5. **Performance**: Optimized indexes for fast search

## Troubleshooting

If you encounter issues:

1. **"pg_vector extension not found"**: Enable the pg_vector extension in your Supabase project settings
2. **Permission errors**: Make sure your service role key has admin privileges
3. **RLS errors**: The Row Level Security policies ensure users only see their own data

## Next Steps

After setting up the database:
1. Upload some documents through the app
2. Try the semantic search feature
3. Check that documents are being processed and stored correctly


