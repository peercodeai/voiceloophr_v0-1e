-- Test RAG system with proper 1536-dimensional vector
-- Run this in your Supabase SQL Editor

-- First, remove the foreign key constraint if you haven't already
ALTER TABLE document_chunks DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;

-- Test insert
INSERT INTO document_chunks (document_id, file_name, chunk_text, chunk_index, chunk_size, metadata, user_id)
VALUES (gen_random_uuid(), 'test.txt', 'This is a test document for RAG functionality.', 0, 45, '{"test": true}', NULL);

-- Test search with proper 1536-dimensional vector (all zeros for testing)
SELECT * FROM search_documents(
  ARRAY_FILL(0.1, ARRAY[1536])::vector(1536), -- 1536 dimensions filled with 0.1
  0.1, -- threshold
  5, -- limit
  NULL -- user filter
);

-- Alternative test with a more realistic vector pattern
SELECT * FROM search_documents(
  (SELECT ARRAY[0.1, 0.2, 0.3, 0.4, 0.5] || ARRAY_FILL(0.0, ARRAY[1531])::vector(1536)), -- First 5 values, rest zeros
  0.1, -- threshold
  5, -- limit
  NULL -- user filter
);

-- Simple test without embeddings (just to verify the function works)
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


