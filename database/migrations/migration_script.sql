-- Migration Script for VoiceLoop HR Database
-- Run this script in your Supabase SQL editor to update the existing schema

-- Step 1: Create the main documents table if it doesn't exist
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

-- Step 2: Create document_embeddings table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    embedding vector(1536),
    model TEXT DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Update document_chunks table to reference documents table
-- First, add the document_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' 
        AND column_name = 'document_id'
    ) THEN
        ALTER TABLE document_chunks ADD COLUMN document_id UUID REFERENCES documents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name);
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Step 5: Drop and recreate the search_documents function to work with the new schema
DROP FUNCTION IF EXISTS search_documents(vector,double precision,integer,uuid);

CREATE FUNCTION search_documents(
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

-- Step 6: Enable Row Level Security on the new tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for documents table
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Create RLS policies for document_embeddings table
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

-- Step 9: Grant necessary permissions
GRANT ALL ON documents TO authenticated;
GRANT ALL ON document_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents TO authenticated;

-- Grant permissions to service role for admin operations
GRANT ALL ON documents TO service_role;
GRANT ALL ON document_embeddings TO service_role;
GRANT EXECUTE ON FUNCTION search_documents TO service_role;

-- Step 10: Create a function to migrate existing data (if needed)
-- This function will help migrate any existing document_chunks data to the new structure
CREATE OR REPLACE FUNCTION migrate_existing_chunks_to_documents()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    chunk_record RECORD;
    doc_id UUID;
    migrated_count int := 0;
BEGIN
    -- For each unique document_id in document_chunks, create a document record
    FOR chunk_record IN 
        SELECT DISTINCT document_id, file_name, user_id, created_at
        FROM document_chunks 
        WHERE document_id IS NOT NULL
    LOOP
        -- Check if document already exists
        SELECT id INTO doc_id FROM documents WHERE id = chunk_record.document_id;
        
        IF doc_id IS NULL THEN
            -- Create a new document record
            INSERT INTO documents (
                id, 
                user_id, 
                file_name, 
                content, 
                uploaded_at,
                created_at
            ) VALUES (
                chunk_record.document_id,
                chunk_record.user_id,
                chunk_record.file_name,
                '', -- Empty content, will be populated from chunks
                chunk_record.created_at,
                chunk_record.created_at
            );
            
            migrated_count := migrated_count + 1;
        END IF;
    END LOOP;
    
    RETURN migrated_count;
END;
$$;

-- Step 11: Run the migration (uncomment the line below to execute)
-- SELECT migrate_existing_chunks_to_documents();

-- Step 12: Drop and recreate the get_document_stats function
DROP FUNCTION IF EXISTS get_document_stats(uuid);

CREATE FUNCTION get_document_stats(user_id_filter uuid DEFAULT NULL)
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

GRANT EXECUTE ON FUNCTION get_document_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_stats TO service_role;
