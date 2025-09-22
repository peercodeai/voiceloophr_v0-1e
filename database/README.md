# VoiceLoop HR Database

This directory contains all database-related files organized by category.

## 📁 **Directory Structure**

### 🚀 **Migrations** (`/migrations`)
Database schema migrations and version control.

- **`rag_schema.sql`**: Original database schema (legacy)
- **`updated_schema.sql`**: Complete database schema with all tables
- **`migration_script.sql`**: Full migration from old to new schema
- **`step_by_step_migration.sql`**: Safe, step-by-step migration process

### 🔧 **Scripts** (`/scripts`)
Database maintenance, testing, and utility scripts.

- **`check-tables.sql`**: Verify table structure and relationships
- **`check-saved-document.sql`**: Test document saving functionality
- **`test-rag-with-proper-vector.sql`**: Test RAG functionality
- **`test-real-document.sql`**: Test with real document data
- **`fix-*.sql`**: Various database fixes and patches

## 🗄️ **Database Schema**

### **Core Tables**
- **`documents`**: Main document storage with metadata
- **`document_chunks`**: Text chunks for semantic search
- **`document_embeddings`**: Vector embeddings for AI search

### **Key Features**
- **Row Level Security (RLS)**: User-based data access control
- **Vector Search**: PostgreSQL with pg_vector extension
- **Full-Text Search**: Built-in PostgreSQL search capabilities
- **Audit Trail**: Created/updated timestamps on all records

## 🚀 **Quick Start**

### **1. Initial Setup**
```sql
-- Run the complete migration
\i migrations/step_by_step_migration.sql
```

### **2. Verify Installation**
```sql
-- Check tables exist
\i scripts/check-tables.sql

-- Test document saving
\i scripts/check-saved-document.sql
```

### **3. Test RAG Functionality**
```sql
-- Test semantic search
\i scripts/test-rag-with-proper-vector.sql
```

## 🔧 **Migration Process**

### **Step 1: Backup**
```bash
pg_dump your_database > backup_before_migration.sql
```

### **Step 2: Run Migration**
```sql
-- Use the step-by-step migration for safety
\i migrations/step_by_step_migration.sql
```

### **Step 3: Verify**
```sql
-- Check all tables and functions
\i scripts/check-tables.sql
```

## 📊 **Database Functions**

### **Search Functions**
- **`search_documents()`**: Semantic similarity search
- **`get_document_stats()`**: User document statistics

### **Utility Functions**
- **`vector_similarity()`**: Calculate vector similarity
- **`chunk_text()`**: Split text into searchable chunks

## 🔒 **Security**

- **RLS Policies**: Users can only access their own documents
- **Guest Users**: Limited access with UUID-based identification
- **API Keys**: Stored in environment variables, not database

## 🧪 **Testing**

### **Unit Tests**
```sql
-- Test document insertion
INSERT INTO documents (user_id, file_name, content) 
VALUES ('test-user', 'test.txt', 'Test content');

-- Test chunk creation
INSERT INTO document_chunks (document_id, chunk_text, chunk_index) 
VALUES (1, 'Test chunk', 0);
```

### **Integration Tests**
```sql
-- Test full RAG pipeline
\i scripts/test-real-document.sql
```

## 📈 **Performance**

- **Indexes**: Optimized for common queries
- **Pagination**: Built-in pagination for large datasets
- **Vector Search**: Efficient similarity search with pg_vector
- **Caching**: Query result caching for frequently accessed data

## 🔄 **Maintenance**

### **Regular Tasks**
- Monitor database size and performance
- Clean up old document chunks
- Update vector embeddings as needed
- Backup database regularly

### **Troubleshooting**
- Check `scripts/` directory for common fixes
- Review migration logs for errors
- Verify RLS policies are working correctly

---

**Last Updated**: September 2025  
**Database Version**: 2.0.0  
**PostgreSQL Version**: 15+ (with pg_vector extension)
