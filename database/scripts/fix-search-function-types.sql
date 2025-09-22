-- Fix the search_documents function to handle correct data types
-- Run this in your Supabase SQL Editor

-- Drop the existing function
DROP FUNCTION IF EXISTS search_documents(vector,double precision,integer,uuid);

-- Create the corrected search_documents function
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,  -- Changed from text to uuid
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
        COALESCE(dc.file_name, 'unknown') as file_name,
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

-- Now test the corrected function
-- First, remove the foreign key constraint if you haven't already
ALTER TABLE document_chunks DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;

-- Test insert
INSERT INTO document_chunks (document_id, file_name, chunk_text, chunk_index, chunk_size, metadata, user_id)
VALUES (gen_random_uuid(), 'test.txt', 'This is a test document for RAG functionality.', 0, 45, '{"test": true}', NULL);

-- Test search with proper 1536-dimensional vector
SELECT * FROM search_documents(
  ARRAY_FILL(0.1, ARRAY[1536])::vector(1536), -- 1536 dimensions filled with 0.1
  0.1, -- threshold
  5, -- limit
  NULL -- user filter
);

-- Simple test without embeddings (just to verify the data was inserted)
SELECT 
    id,
    document_id,
    file_name,
    chunk_text,
    chunk_index,
    chunk_size,
    metadata
FROM document_chunks 
WHERE file_name = 'test.txt';

-- Clean up
DELETE FROM document_chunks WHERE file_name = 'test.txt';


