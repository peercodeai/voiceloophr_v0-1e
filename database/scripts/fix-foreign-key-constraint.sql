-- Fix the foreign key constraint issue
-- Option 1: Remove the foreign key constraint (recommended for RAG)
-- Option 2: Create a documents table entry first

-- OPTION 1: Remove the foreign key constraint (RECOMMENDED)
-- This allows document_chunks to work independently for RAG
ALTER TABLE document_chunks DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;

-- OPTION 2: If you want to keep the constraint, create a documents table first
-- Uncomment the following lines if you prefer to keep the foreign key relationship:

/*
-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    content TEXT,
    mime_type TEXT,
    summary TEXT,
    processing_method TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents table
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);
*/

-- Now you can test the RAG system
-- Test insert (this will work after removing the foreign key constraint)
INSERT INTO document_chunks (document_id, file_name, chunk_text, chunk_index, chunk_size, metadata, user_id)
VALUES (gen_random_uuid(), 'test.txt', 'This is a test document for RAG functionality.', 0, 45, '{"test": true}', NULL);

-- Test search
SELECT * FROM search_documents(
  ARRAY[0.1, 0.2, 0.3]::vector(1536), -- Dummy embedding
  0.1, -- threshold
  5, -- limit
  NULL -- user filter
);

-- Clean up
DELETE FROM document_chunks WHERE file_name = 'test.txt';


