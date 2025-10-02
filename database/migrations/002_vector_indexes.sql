-- VoiceLoopHR Open-Source AI Backend - Vector Indexes Migration
-- This migration creates optimized vector indexes for semantic search

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create optimized vector similarity search index
-- This index uses HNSW (Hierarchical Navigable Small World) for better performance
DROP INDEX IF EXISTS idx_document_embeddings_vector;

CREATE INDEX idx_document_embeddings_vector_hnsw 
ON document_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create additional vector indexes for different distance metrics
CREATE INDEX idx_document_embeddings_vector_l2 
ON document_embeddings USING hnsw (embedding vector_l2_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_document_embeddings_vector_ip 
ON document_embeddings USING hnsw (embedding vector_ip_ops)
WITH (m = 16, ef_construction = 64);

-- Create composite indexes for common query patterns
CREATE INDEX idx_document_embeddings_document_chunk 
ON document_embeddings (document_id, chunk_index);

CREATE INDEX idx_document_embeddings_created_at 
ON document_embeddings (created_at);

-- Create partial indexes for active documents
CREATE INDEX idx_document_embeddings_active_documents 
ON document_embeddings (embedding vector_cosine_ops)
WHERE document_id IN (
    SELECT id FROM documents 
    WHERE processing_status = 'completed' 
    AND created_at > NOW() - INTERVAL '1 year'
);

-- Create function for advanced vector search with filters
CREATE OR REPLACE FUNCTION search_documents_advanced(
    query_embedding VECTOR(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    user_filter UUID DEFAULT NULL,
    document_type_filter VARCHAR(50) DEFAULT NULL,
    date_from TIMESTAMP DEFAULT NULL,
    date_to TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    document_id UUID,
    document_title VARCHAR(500),
    chunk_text TEXT,
    similarity FLOAT,
    chunk_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.document_id,
        d.title,
        de.chunk_text,
        1 - (de.embedding <=> query_embedding) AS similarity,
        de.chunk_metadata
    FROM document_embeddings de
    JOIN documents d ON de.document_id = d.id
    WHERE 
        1 - (de.embedding <=> query_embedding) > similarity_threshold
        AND (user_filter IS NULL OR d.user_id = user_filter)
        AND (document_type_filter IS NULL OR d.file_type = document_type_filter)
        AND (date_from IS NULL OR d.created_at >= date_from)
        AND (date_to IS NULL OR d.created_at <= date_to)
        AND d.processing_status = 'completed'
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for hybrid search (vector + text)
CREATE OR REPLACE FUNCTION hybrid_search_documents(
    query_embedding VECTOR(1536),
    query_text TEXT,
    similarity_threshold FLOAT DEFAULT 0.7,
    text_weight FLOAT DEFAULT 0.3,
    vector_weight FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    document_id UUID,
    document_title VARCHAR(500),
    chunk_text TEXT,
    similarity FLOAT,
    text_score FLOAT,
    combined_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.document_id,
        d.title,
        de.chunk_text,
        1 - (de.embedding <=> query_embedding) AS similarity,
        ts_rank(to_tsvector('english', de.chunk_text), plainto_tsquery('english', query_text)) AS text_score,
        (vector_weight * (1 - (de.embedding <=> query_embedding))) + 
        (text_weight * ts_rank(to_tsvector('english', de.chunk_text), plainto_tsquery('english', query_text))) AS combined_score
    FROM document_embeddings de
    JOIN documents d ON de.document_id = d.id
    WHERE 
        (1 - (de.embedding <=> query_embedding) > similarity_threshold)
        OR (to_tsvector('english', de.chunk_text) @@ plainto_tsquery('english', query_text))
        AND d.processing_status = 'completed'
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for document clustering
CREATE OR REPLACE FUNCTION cluster_documents(
    cluster_count INT DEFAULT 5,
    min_documents INT DEFAULT 2
)
RETURNS TABLE (
    cluster_id INT,
    document_id UUID,
    document_title VARCHAR(500),
    distance_to_centroid FLOAT
) AS $$
DECLARE
    centroid_embeddings VECTOR(1536)[];
    i INT;
    j INT;
    min_distance FLOAT;
    closest_cluster INT;
    current_distance FLOAT;
BEGIN
    -- Simple k-means clustering implementation
    -- This is a basic implementation - for production, consider using more sophisticated algorithms
    
    -- Initialize centroids randomly
    FOR i IN 1..cluster_count LOOP
        SELECT embedding INTO centroid_embeddings[i]
        FROM document_embeddings 
        ORDER BY RANDOM() 
        LIMIT 1;
    END LOOP;
    
    -- Assign documents to clusters
    FOR de IN 
        SELECT de.document_id, de.embedding, d.title
        FROM document_embeddings de
        JOIN documents d ON de.document_id = d.id
        WHERE d.processing_status = 'completed'
    LOOP
        min_distance := 1.0;
        closest_cluster := 1;
        
        FOR i IN 1..cluster_count LOOP
            current_distance := de.embedding <=> centroid_embeddings[i];
            IF current_distance < min_distance THEN
                min_distance := current_distance;
                closest_cluster := i;
            END IF;
        END LOOP;
        
        RETURN QUERY SELECT 
            closest_cluster,
            de.document_id,
            de.title,
            min_distance;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function for semantic document recommendations
CREATE OR REPLACE FUNCTION get_document_recommendations(
    user_id UUID,
    document_id UUID,
    recommendation_count INT DEFAULT 5
)
RETURNS TABLE (
    recommended_document_id UUID,
    recommended_title VARCHAR(500),
    similarity FLOAT,
    reason TEXT
) AS $$
DECLARE
    target_embedding VECTOR(1536);
BEGIN
    -- Get the embedding of the target document
    SELECT embedding INTO target_embedding
    FROM document_embeddings
    WHERE document_id = $2
    ORDER BY chunk_index
    LIMIT 1;
    
    -- Find similar documents from other users
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        1 - (de.embedding <=> target_embedding) AS similarity,
        'Similar content found in other documents'::TEXT AS reason
    FROM document_embeddings de
    JOIN documents d ON de.document_id = d.id
    WHERE 
        d.user_id != user_id
        AND d.processing_status = 'completed'
        AND 1 - (de.embedding <=> target_embedding) > 0.7
    ORDER BY de.embedding <=> target_embedding
    LIMIT recommendation_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for vector search analytics
CREATE OR REPLACE FUNCTION get_search_analytics(
    days_back INT DEFAULT 30
)
RETURNS TABLE (
    total_searches BIGINT,
    avg_similarity FLOAT,
    most_searched_documents BIGINT,
    search_trends JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) AS total_searches,
        AVG(1 - (de.embedding <=> query_embedding)) AS avg_similarity,
        COUNT(DISTINCT de.document_id) AS most_searched_documents,
        jsonb_build_object(
            'daily_searches', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'date', search_date,
                        'count', search_count
                    )
                )
                FROM (
                    SELECT 
                        DATE(created_at) as search_date,
                        COUNT(*) as search_count
                    FROM ai_service_logs
                    WHERE service_name = 'vector_search'
                    AND created_at >= NOW() - INTERVAL '1 day' * days_back
                    GROUP BY DATE(created_at)
                    ORDER BY search_date
                ) daily_stats
            )
        ) AS search_trends
    FROM document_embeddings de
    JOIN ai_service_logs al ON de.document_id::TEXT = al.request_data->>'document_id'
    WHERE al.service_name = 'vector_search'
    AND al.created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for search performance monitoring
CREATE MATERIALIZED VIEW IF NOT EXISTS search_performance_stats AS
SELECT 
    DATE(created_at) as search_date,
    service_name,
    COUNT(*) as total_requests,
    AVG(processing_time_ms) as avg_processing_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_time_ms) as median_processing_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95_processing_time,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_requests
FROM ai_service_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), service_name
ORDER BY search_date DESC, service_name;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_search_performance_stats_date 
ON search_performance_stats (search_date);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_search_performance_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY search_performance_stats;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled refresh (if pg_cron is available)
-- SELECT cron.schedule('refresh-search-stats', '0 */6 * * *', 'SELECT refresh_search_performance_stats();');

-- Create function for vector index maintenance
CREATE OR REPLACE FUNCTION maintain_vector_indexes()
RETURNS VOID AS $$
BEGIN
    -- Reindex vector indexes if they become too fragmented
    -- This is a simplified maintenance function
    REINDEX INDEX CONCURRENTLY idx_document_embeddings_vector_hnsw;
    REINDEX INDEX CONCURRENTLY idx_document_embeddings_vector_l2;
    REINDEX INDEX CONCURRENTLY idx_document_embeddings_vector_ip;
    
    -- Update table statistics
    ANALYZE document_embeddings;
    ANALYZE documents;
END;
$$ LANGUAGE plpgsql;

-- Create function for vector search optimization
CREATE OR REPLACE FUNCTION optimize_vector_search()
RETURNS VOID AS $$
BEGIN
    -- Update PostgreSQL configuration for vector search optimization
    -- Note: These settings should be configured at the database level
    -- This function provides recommendations
    
    RAISE NOTICE 'Vector search optimization recommendations:';
    RAISE NOTICE '1. Set shared_preload_libraries = ''vector'' in postgresql.conf';
    RAISE NOTICE '2. Set max_parallel_workers_per_gather = 4';
    RAISE NOTICE '3. Set effective_cache_size = 75%% of available RAM';
    RAISE NOTICE '4. Set work_mem = 256MB for vector operations';
    RAISE NOTICE '5. Set maintenance_work_mem = 1GB for index creation';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION get_document_similarity TO postgres;
GRANT EXECUTE ON FUNCTION search_documents_advanced TO postgres;
GRANT EXECUTE ON FUNCTION hybrid_search_documents TO postgres;
GRANT EXECUTE ON FUNCTION cluster_documents TO postgres;
GRANT EXECUTE ON FUNCTION get_document_recommendations TO postgres;
GRANT EXECUTE ON FUNCTION get_search_analytics TO postgres;
GRANT EXECUTE ON FUNCTION refresh_search_performance_stats TO postgres;
GRANT EXECUTE ON FUNCTION maintain_vector_indexes TO postgres;
GRANT EXECUTE ON FUNCTION optimize_vector_search TO postgres;

-- Add comments for documentation
COMMENT ON FUNCTION get_document_similarity IS 'Performs vector similarity search on document embeddings';
COMMENT ON FUNCTION search_documents_advanced IS 'Advanced vector search with multiple filters';
COMMENT ON FUNCTION hybrid_search_documents IS 'Combines vector and text search for better results';
COMMENT ON FUNCTION cluster_documents IS 'Groups similar documents using vector clustering';
COMMENT ON FUNCTION get_document_recommendations IS 'Recommends similar documents to users';
COMMENT ON FUNCTION get_search_analytics IS 'Provides analytics on search performance and usage';
COMMENT ON MATERIALIZED VIEW search_performance_stats IS 'Cached search performance statistics for monitoring';
