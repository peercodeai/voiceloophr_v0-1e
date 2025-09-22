-- Simple fix for document_chunks table
-- This script adds missing columns and fixes functions

-- Add missing columns (safe - won't error if they exist)
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS chunk_size INTEGER;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at ON document_chunks(created_at);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS search_documents(vector,double precision,integer,uuid);
DROP FUNCTION IF EXISTS get_document_stats(uuid);

-- Create search_documents function
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

-- Create get_document_stats function
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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own document chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can insert their own document chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can update their own document chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can delete their own document chunks" ON document_chunks;

-- Create RLS Policies
CREATE POLICY "Users can view their own document chunks" ON document_chunks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document chunks" ON document_chunks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document chunks" ON document_chunks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document chunks" ON document_chunks
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_stats TO authenticated;
