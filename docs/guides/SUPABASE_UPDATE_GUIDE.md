# Supabase Database Update Guide

## Overview

To enable document saving for logged-in users, you need to update your Supabase database schema. The current schema only has `document_chunks` but the application expects a `documents` table.

## Quick Setup

### Option 1: Run Migration Script (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration Script**
   - Copy the contents of `database/migration_script.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

3. **Verify the Update**
   - Check that the `documents` table was created
   - Verify that Row Level Security (RLS) policies are in place
   - Confirm that the `search_documents` function is updated

### Option 2: Manual Setup

If you prefer to run commands individually:

1. **Create Documents Table**
   ```sql
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
   ```

2. **Create Document Embeddings Table**
   ```sql
   CREATE TABLE IF NOT EXISTS document_embeddings (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
       embedding vector(1536),
       model TEXT DEFAULT 'text-embedding-3-small',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **Enable Row Level Security**
   ```sql
   ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
   ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
   ```

4. **Create RLS Policies**
   ```sql
   -- Documents table policies
   CREATE POLICY "Users can view their own documents" ON documents
       FOR SELECT USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can insert their own documents" ON documents
       FOR INSERT WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can update their own documents" ON documents
       FOR UPDATE USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can delete their own documents" ON documents
       FOR DELETE USING (auth.uid() = user_id);
   ```

## What This Update Provides

### ✅ **Document Storage**
- Main `documents` table for storing document metadata and content
- Proper user association with foreign key constraints
- Support for various file types and processing methods

### ✅ **Vector Search**
- `document_embeddings` table for full-document vector search
- Updated `search_documents` function for semantic search
- Integration with OpenAI embeddings

### ✅ **Security**
- Row Level Security (RLS) policies
- Users can only access their own documents
- Proper authentication and authorization

### ✅ **Performance**
- Optimized indexes for fast queries
- Efficient pagination support
- Vector similarity search capabilities

## Testing the Update

After running the migration:

1. **Test Document Upload**
   - Log in as a user
   - Upload a document
   - Verify it appears in the dashboard

2. **Test Document Retrieval**
   - Check that documents are properly saved to the database
   - Verify pagination works correctly
   - Test search functionality

3. **Test Security**
   - Ensure users can only see their own documents
   - Verify guest users cannot save to the database

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Make sure you're running the script as a database admin
   - Check that the service role has proper permissions

2. **Vector Extension Missing**
   - Ensure the `vector` extension is enabled in your Supabase project
   - Contact Supabase support if needed

3. **RLS Policy Issues**
   - Verify that RLS policies are correctly created
   - Check that user authentication is working properly

### Verification Queries

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('documents', 'document_embeddings');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('documents', 'document_embeddings');

-- Test document insertion (replace with actual user ID)
INSERT INTO documents (user_id, file_name, content) 
VALUES ('your-user-id-here', 'test.txt', 'Test content');
```

## Next Steps

After updating the database:

1. **Update Environment Variables**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Test the Application**
   - Upload documents as a logged-in user
   - Verify they're saved to the database
   - Test search and retrieval functionality

3. **Monitor Performance**
   - Check query performance
   - Monitor database usage
   - Optimize indexes if needed

## Support

If you encounter any issues:

1. Check the Supabase logs for error messages
2. Verify your environment variables are correct
3. Ensure your Supabase project has the vector extension enabled
4. Contact support if the migration script fails

The updated schema will enable full document storage and retrieval functionality for logged-in users while maintaining security and performance.
