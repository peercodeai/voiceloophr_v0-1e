-- Updated Database Schema for VoiceLoop HR
-- This file contains the complete database structure needed for document storage and RAG

-- Enable the pg_vector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Main documents table for storing document metadata and content
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    content TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    word_count INTEGER DEFAULT 0,
    page_count INTEGER DEFAULT 0,
    processing_method TEXT DEFAULT 'direct',
    processing_version TEXT DEFAULT '2.0.0',
    confidence_score FLOAT DEFAULT 1.0,
    processing_notes TEXT,
    storage_path TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table for storing text segments and embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_size INTEGER NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document embeddings table for storing full document embeddings
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    embedding vector(1536),
    model TEXT DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name);
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to search documents using vector similarity
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    file_name text,
    content text,
    similarity float,
    uploaded_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.user_id,
        d.file_name,
        d.content,
        1 - (de.embedding <=> query_embedding) as similarity,
        d.uploaded_at
    FROM documents d
    JOIN document_embeddings de ON d.id = de.document_id
    WHERE 
        (user_id_filter IS NULL OR d.user_id = user_id_filter)
        AND de.embedding IS NOT NULL
        AND 1 - (de.embedding <=> query_embedding) > match_threshold
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to search document chunks using vector similarity
CREATE OR REPLACE FUNCTION search_document_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    file_name text,
    chunk_text text,
    chunk_index int,
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
        d.file_name,
        dc.chunk_text,
        dc.chunk_index,
        1 - (dc.embedding <=> query_embedding) as similarity,
        dc.metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 
        (user_id_filter IS NULL OR d.user_id = user_id_filter)
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
    total_size bigint,
    avg_word_count float,
    oldest_document timestamp with time zone,
    newest_document timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(dc.id) as total_chunks,
        COUNT(de.id) as total_embeddings,
        COALESCE(SUM(d.file_size), 0) as total_size,
        AVG(d.word_count) as avg_word_count,
        MIN(d.uploaded_at) as oldest_document,
        MAX(d.uploaded_at) as newest_document
    FROM documents d
    LEFT JOIN document_chunks dc ON d.id = dc.document_id
    LEFT JOIN document_embeddings de ON d.id = de.document_id
    WHERE user_id_filter IS NULL OR d.user_id = user_id_filter;
END;
$$;

-- Function to clean up old documents (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_documents(days_old int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count int;
BEGIN
    DELETE FROM documents 
    WHERE uploaded_at < NOW() - INTERVAL '1 day' * days_old
    AND user_id IS NULL; -- Only delete documents without user association
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for document_chunks table
CREATE POLICY "Users can view chunks of their own documents" ON document_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_chunks.document_id 
            AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chunks for their own documents" ON document_chunks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_chunks.document_id 
            AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update chunks of their own documents" ON document_chunks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_chunks.document_id 
            AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete chunks of their own documents" ON document_chunks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_chunks.document_id 
            AND d.user_id = auth.uid()
        )
    );

-- RLS Policies for document_embeddings table
CREATE POLICY "Users can view embeddings of their own documents" ON document_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_embeddings.document_id 
            AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert embeddings for their own documents" ON document_embeddings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_embeddings.document_id 
            AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update embeddings of their own documents" ON document_embeddings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_embeddings.document_id 
            AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete embeddings of their own documents" ON document_embeddings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_embeddings.document_id 
            AND d.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON documents TO authenticated;
GRANT ALL ON document_chunks TO authenticated;
GRANT ALL ON document_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION search_document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_documents TO authenticated;

-- Grant permissions to service role for admin operations
GRANT ALL ON documents TO service_role;
GRANT ALL ON document_chunks TO service_role;
GRANT ALL ON document_embeddings TO service_role;
GRANT EXECUTE ON FUNCTION search_documents TO service_role;
GRANT EXECUTE ON FUNCTION search_document_chunks TO service_role;
GRANT EXECUTE ON FUNCTION get_document_stats TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_documents TO service_role;
