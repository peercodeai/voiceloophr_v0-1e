-- Check if your PDF was saved to the RAG database
-- Run this in your Supabase SQL Editor

-- Check all documents in document_chunks table
SELECT 
    document_id,
    file_name,
    LEFT(chunk_text, 100) as preview_text,
    chunk_index,
    chunk_size,
    CASE WHEN embedding IS NULL THEN 'No embedding' ELSE 'Has embedding' END as embedding_status,
    created_at
FROM document_chunks 
ORDER BY created_at DESC
LIMIT 10;

-- Count total documents and chunks
SELECT 
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embeddings,
    COUNT(DISTINCT document_id) as unique_documents,
    COUNT(DISTINCT file_name) as unique_files
FROM document_chunks;

-- Check specifically for your PDF file
SELECT 
    document_id,
    file_name,
    chunk_index,
    chunk_size,
    CASE WHEN embedding IS NULL THEN 'No embedding' ELSE 'Has embedding' END as embedding_status
FROM document_chunks 
WHERE file_name LIKE '%8.25.25IPanalysis%' 
   OR file_name LIKE '%IPanalysis%'
   OR file_name LIKE '%8.25.25%'
ORDER BY chunk_index;

-- Check if there are any documents with the word "LinkedIn" (from your analysis)
SELECT 
    file_name,
    chunk_index,
    LEFT(chunk_text, 150) as preview_text
FROM document_chunks 
WHERE chunk_text ILIKE '%linkedin%' 
   OR chunk_text ILIKE '%action items%'
   OR chunk_text ILIKE '%api key%'
LIMIT 5;


