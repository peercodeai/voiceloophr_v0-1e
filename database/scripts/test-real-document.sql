-- Test RAG system with your real uploaded document
-- Run this in your Supabase SQL Editor

-- Check what documents were uploaded
SELECT 
    document_id,
    file_name,
    chunk_text,
    chunk_index,
    chunk_size,
    CASE WHEN embedding IS NULL THEN 'No embedding' ELSE 'Has embedding' END as embedding_status,
    created_at
FROM document_chunks 
ORDER BY created_at DESC
LIMIT 10;

-- Count total chunks and embeddings
SELECT 
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embeddings,
    COUNT(DISTINCT document_id) as unique_documents
FROM document_chunks;

-- Test semantic search with a real query
-- Try searching for something related to your document content
SELECT * FROM search_documents(
  ARRAY_FILL(0.1, ARRAY[1536])::vector(1536), -- Dummy embedding for testing
  0.1, -- threshold
  5,   -- limit
  NULL -- user filter
);

-- If you want to test with a more realistic search, try this:
-- (Replace 'your search term' with something from your document)
SELECT 
    file_name,
    chunk_text,
    similarity
FROM document_chunks 
WHERE chunk_text ILIKE '%your search term%'
LIMIT 5;


