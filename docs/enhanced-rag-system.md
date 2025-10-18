# Enhanced RAG System with Intelligent Chunking and User Isolation

## Overview

This enhanced RAG (Retrieval Augmented Generation) system implements intelligent document chunking with strict user isolation to create a smart, secure, and scalable solution.

## Key Features

### 🧠 Intelligent Chunking
- **Multiple Chunking Strategies**: Sentence-based, paragraph-based, fixed-size, and semantic chunking
- **Smart Overlap**: Configurable overlap between chunks to preserve context
- **Boundary Respect**: Maintains sentence and paragraph boundaries for better semantic coherence
- **Size Optimization**: Configurable chunk sizes optimized for different LLM models

### 🔒 Security & User Isolation
- **Row-Level Security (RLS)**: Database-level isolation ensuring users only access their own data
- **Multi-Layer Validation**: Authentication checks at service and database levels
- **Secure Chunk Access**: Each chunk is tied to a user ID preventing cross-user data leakage
- **Policy Enforcement**: Supabase policies automatically filter data by user

### 📊 Rich Metadata
- **Chunk Statistics**: Word count, sentence count, chunk size tracking
- **Source Tracking**: Links back to original document and file information
- **Chunking Method**: Records which algorithm was used for reproducibility
- **Positional Data**: Start/end offsets for precise document reconstruction

## How It Works

### 1. File Upload Process
```typescript
// User uploads a file
const result = await DocumentService.uploadAndProcessFile(file, userId, progressCallback);

// System automatically:
// 1. Validates file type and size
// 2. Extracts text content
// 3. Uploads to secure storage bucket
// 4. Creates document record with user association
// 5. Intelligently chunks the content
// 6. Stores chunks with full metadata and user isolation
```

### 2. Chunking Strategies

#### Sentence-Based (Recommended)
- Preserves sentence boundaries for better semantic coherence
- Ideal for most text documents and articles
- Default chunk size: 1000 characters (~150-200 words)
- 20% overlap for context preservation

#### Paragraph-Based
- Maintains paragraph structure
- Good for documents with clear paragraph divisions
- Preserves logical document flow

#### Fixed-Size
- Simple word-boundary chunking
- Fallback method for edge cases
- Consistent chunk sizes

#### Semantic (Advanced)
- Groups related content by topic
- Future implementation with NLP models
- Currently falls back to sentence-based

### 3. User Isolation Architecture

```sql
-- Every chunk is tied to a user
CREATE POLICY "Users can only access their own chunks" ON document_chunks
    FOR ALL USING (auth.uid() = user_id);

-- Service-level validation
if (authCheck.userId !== userId) {
    return []; // No cross-user access
}
```

### 4. RAG Query Process

```typescript
// When user queries the RAG system:
const relevantChunks = await DocumentService.searchUserChunks(userId, query, limit);

// System:
// 1. Only searches chunks owned by the user
// 2. Uses vector similarity or full-text search
// 3. Returns contextually relevant chunks
// 4. Maintains complete user isolation
```

## Database Schema

### Documents Table
```sql
documents (
    id,
    user_id,        -- Owner isolation
    content,        -- Full document text
    metadata,       -- File info, upload date, etc.
    embedding,      -- Document-level embedding
    bucket_id       -- Storage reference
)
```

### Document Chunks Table
```sql
document_chunks (
    id,
    document_id,    -- Reference to parent document
    user_id,        -- Critical: Owner isolation
    content,        -- Chunk text content
    chunk_index,    -- Position within document
    start_offset,   -- Character position start
    end_offset,     -- Character position end
    embedding,      -- Vector for similarity search
    metadata        -- Rich chunk metadata
)
```

## Security Features

### 1. Row-Level Security (RLS)
- Database automatically filters data by user
- Prevents unauthorized access at the database level
- Policy enforcement for all CRUD operations

### 2. Service-Level Validation
```typescript
const authCheck = await this.checkAuthentication();
if (!authCheck.isAuthenticated || authCheck.userId !== userId) {
    return []; // Immediate rejection
}
```

### 3. Multi-Layer Protection
- Authentication check
- User ID validation
- Database policy enforcement
- Query-level filtering

## Performance Optimizations

### 1. Indexed Queries
```sql
-- Fast user-specific lookups
CREATE INDEX idx_document_chunks_user_id ON document_chunks(user_id);

-- Efficient document chunk retrieval
CREATE INDEX idx_document_chunks_user_document ON document_chunks(user_id, document_id);

-- Vector similarity search
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding);
```

### 2. Efficient Chunking
- Optimized algorithms for different content types
- Configurable parameters for performance tuning
- Memory-efficient processing for large documents

## Usage Examples

### Upload and Process Document
```typescript
const handleFileUpload = async (file: File) => {
    const result = await DocumentService.uploadAndProcessFile(
        file,
        user.id,
        (progress) => setUploadProgress(progress)
    );
    
    if (result.success) {
        console.log(`Document created with ${result.chunks?.length} chunks`);
    }
};
```

### Search User's Documents
```typescript
const searchResults = await DocumentService.searchUserChunks(
    user.id,
    "search query",
    10 // limit
);
```

### Get User Statistics
```typescript
const stats = await DocumentService.getUserChunkStats(user.id);
console.log(`User has ${stats.totalChunks} chunks across ${stats.totalDocuments} documents`);
```

## Configuration Options

### Chunking Parameters
```typescript
const chunkingOptions: ChunkingOptions = {
    method: 'sentence',     // chunking strategy
    chunkSize: 1000,        // target characters per chunk
    overlapSize: 200,       // overlap for context
    minChunkSize: 100,      // minimum chunk size
    maxChunkSize: 2000      // maximum chunk size
};
```

## Benefits for RAG Performance

1. **Better Context**: Intelligent chunking preserves semantic boundaries
2. **Improved Retrieval**: Optimized chunk sizes improve embedding quality
3. **Contextual Overlap**: Overlap ensures important context isn't lost
4. **User Isolation**: Secure, personalized knowledge base per user
5. **Scalability**: Efficient indexing and querying for large document collections
6. **Flexibility**: Multiple chunking strategies for different content types

## Integration with n8n

The system is designed to work seamlessly with n8n workflows:

1. **Document Upload**: Triggers n8n workflow via webhook
2. **Chunk Processing**: n8n processes each chunk for embeddings
3. **Vector Storage**: n8n updates embedding fields in database
4. **Query Processing**: n8n uses chunks for RAG responses
5. **User Context**: All operations maintain user isolation

This enhanced system transforms your RAG bot from a simple document processor into an intelligent, secure, and scalable knowledge management system that respects user boundaries while delivering superior performance.