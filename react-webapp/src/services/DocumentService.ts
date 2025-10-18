import { supabase } from '../lib/supabase';

export interface Document {
  id: number;
  content: string | null;
  metadata: any | null;
  embedding: number[] | null;
  userId: string | null;
  bucketId: string | null;
  created_at?: string;
}

export interface DocumentChunk {
  id: number;
  documentId: number;
  userId: string;
  content: string;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  embedding: number[] | null;
  metadata: {
    chunkSize: number;
    overlapSize: number;
    chunkingMethod: string;
    wordCount: number;
    sentences: number;
    parentDocument: string;
    created_at: string;
  };
  created_at?: string;
}

export interface ChunkingOptions {
  method: 'sentence' | 'paragraph' | 'fixed' | 'semantic';
  chunkSize: number; // Target characters per chunk
  overlapSize: number; // Overlap characters between chunks
  minChunkSize: number; // Minimum chunk size
  maxChunkSize: number; // Maximum chunk size
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'chunking' | 'completed' | 'error';
  message?: string;
}

export class DocumentService {
  private static readonly BUCKET_NAME = 'files';
  
  // Default chunking configuration optimized for RAG
  private static readonly DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
    method: 'sentence',
    chunkSize: 1000, // ~150-200 words, good for most LLMs
    overlapSize: 200, // 20% overlap for context preservation
    minChunkSize: 100, // Avoid tiny chunks
    maxChunkSize: 2000 // Prevent overly large chunks
  };
  
  /**
   * Intelligent text chunking with multiple strategies
   */
  private static chunkText(text: string, options: ChunkingOptions = this.DEFAULT_CHUNKING_OPTIONS): string[] {
    const chunks: string[] = [];
    
    switch (options.method) {
      case 'sentence':
        return this.chunkBySentence(text, options);
      case 'paragraph':
        return this.chunkByParagraph(text, options);
      case 'semantic':
        return this.chunkBySemantic(text, options);
      case 'fixed':
      default:
        return this.chunkByFixedSize(text, options);
    }
  }
  
  /**
   * Sentence-based chunking (recommended for RAG)
   * Preserves sentence boundaries for better semantic coherence
   */
  private static chunkBySentence(text: string, options: ChunkingOptions): string[] {
    const chunks: string[] = [];
    
    // Split by sentences (handles multiple sentence endings)
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    
    let currentChunk = '';
    let i = 0;
    
    while (i < sentences.length) {
      const sentence = sentences[i].trim();
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      // If adding this sentence would exceed max size, finalize current chunk
      if (potentialChunk.length > options.maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Create overlap by including some previous content
        const overlapText = this.createOverlap(currentChunk, options.overlapSize);
        currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
      } else if (potentialChunk.length >= options.chunkSize) {
        // Chunk is at target size, finalize it
        chunks.push(potentialChunk.trim());
        
        // Create overlap for next chunk
        const overlapText = this.createOverlap(potentialChunk, options.overlapSize);
        currentChunk = overlapText;
      } else {
        // Add sentence to current chunk
        currentChunk = potentialChunk;
      }
      
      i++;
    }
    
    // Add remaining content if it meets minimum size
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push(currentChunk.trim());
    } else if (chunks.length > 0 && currentChunk.trim().length > 0) {
      // Merge small remainder with last chunk
      chunks[chunks.length - 1] += ' ' + currentChunk.trim();
    }
    
    return chunks.filter(chunk => chunk.length >= options.minChunkSize);
  }
  
  /**
   * Paragraph-based chunking
   * Good for documents with clear paragraph structure
   */
  private static chunkByParagraph(text: string, options: ChunkingOptions): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph.trim();
      
      if (potentialChunk.length > options.maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        const overlapText = this.createOverlap(currentChunk, options.overlapSize);
        currentChunk = overlapText + (overlapText ? '\n\n' : '') + paragraph.trim();
      } else if (potentialChunk.length >= options.chunkSize) {
        chunks.push(potentialChunk.trim());
        
        const overlapText = this.createOverlap(potentialChunk, options.overlapSize);
        currentChunk = overlapText;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length >= options.minChunkSize);
  }
  
  /**
   * Fixed-size chunking with word boundaries
   * Simple but effective fallback method
   */
  private static chunkByFixedSize(text: string, options: ChunkingOptions): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    
    let currentChunk = '';
    
    for (const word of words) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + word;
      
      if (potentialChunk.length > options.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Create overlap
        const overlapText = this.createOverlap(currentChunk, options.overlapSize);
        currentChunk = overlapText + (overlapText ? ' ' : '') + word;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length >= options.minChunkSize);
  }
  
  /**
   * Semantic chunking (advanced)
   * Groups related content together based on topic coherence
   */
  private static chunkBySemantic(text: string, options: ChunkingOptions): string[] {
    // For now, fall back to sentence-based chunking
    // In a production system, this would use NLP libraries or AI models
    // to identify semantic boundaries
    return this.chunkBySentence(text, options);
  }
  
  /**
   * Create overlap text from the end of a chunk
   */
  private static createOverlap(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;
    
    // Try to create overlap at word boundaries
    const words = text.split(/\s+/);
    let overlap = '';
    
    for (let i = words.length - 1; i >= 0; i--) {
      const potentialOverlap = words.slice(i).join(' ');
      if (potentialOverlap.length <= overlapSize) {
        overlap = potentialOverlap;
        break;
      }
    }
    
    return overlap || text.slice(-overlapSize);
  }
  
  /**
   * Create document chunks with full metadata and user association
   */
  private static createDocumentChunks(
    documentId: number,
    userId: string,
    content: string,
    originalFileName: string,
    chunkingOptions: ChunkingOptions = this.DEFAULT_CHUNKING_OPTIONS
  ): any[] { // Use any[] to match database schema exactly
    const chunks = this.chunkText(content, chunkingOptions);
    const documentChunks: any[] = [];
    
    let currentOffset = 0;
    
    chunks.forEach((chunkContent, index) => {
      // Calculate proper start and end offsets
      const startOffset = currentOffset;
      const endOffset = currentOffset + chunkContent.length;
      
      // Count words and sentences for metadata
      const wordCount = chunkContent.split(/\s+/).filter(word => word.length > 0).length;
      const sentences = (chunkContent.match(/[\.!?]+/g) || []).length;
      
      // Validate offsets before creating chunk
      if (startOffset < 0 || endOffset <= startOffset) {
        console.error('Invalid chunk offsets:', {
          index,
          startOffset,
          endOffset,
          chunkLength: chunkContent.length
        });
        return; // Skip this chunk
      }
      
      documentChunks.push({
        document_id: documentId,    // Use snake_case for database
        user_id: userId,           // Use snake_case for database
        content: chunkContent,
        chunk_index: index,        // Use snake_case for database
        start_offset: startOffset,  // Always valid now
        end_offset: endOffset,      // Always valid now
        embedding: null, // Will be populated by n8n
        metadata: {
          chunkSize: chunkContent.length,
          overlapSize: chunkingOptions.overlapSize,
          chunkingMethod: chunkingOptions.method,
          wordCount,
          sentences,
          parentDocument: originalFileName,
          created_at: new Date().toISOString()
        }
      });
      
      // Move offset forward for next chunk (accounting for overlap)
      currentOffset += Math.max(1, chunkContent.length - chunkingOptions.overlapSize);
    });
    
    return documentChunks;
  }
  
  /**
   * Ensure the files bucket exists, create if it doesn't
   */
  static async ensureBucketExists(): Promise<void> {
    try {
      // Try to get bucket info
      const { data, error } = await supabase.storage.getBucket(this.BUCKET_NAME);
      
      if (error && error.message.includes('not found')) {
        // Bucket doesn't exist, create it
        console.log('Creating files bucket...');
        const { data: createData, error: createError } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false, // Set to true if you want files to be publicly accessible
          allowedMimeTypes: ['text/plain', 'text/markdown', 'application/json', 'text/csv', 'application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (createError) {
          console.error('Error creating bucket:', createError);
          throw new Error(`Failed to create storage bucket: ${createError.message}`);
        }
        
        console.log('Files bucket created successfully');
      } else if (error) {
        console.error('Error checking bucket:', error);
        throw new Error(`Failed to check storage bucket: ${error.message}`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw error;
    }
  }
  
  /**
   * Check if user is authenticated and can access documents
   */
  static async checkAuthentication(): Promise<{ isAuthenticated: boolean; userId?: string; error?: string }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return { isAuthenticated: false, error: error.message };
      }
      
      if (!session || !session.user) {
        return { isAuthenticated: false, error: 'No active session' };
      }
      
      return { isAuthenticated: true, userId: session.user.id };
    } catch (error) {
      return { 
        isAuthenticated: false, 
        error: error instanceof Error ? error.message : 'Authentication check failed' 
      };
    }
  }

  /**
   * Upload file to Supabase storage
   */
  static async uploadFile(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      // Check authentication
      const authCheck = await this.checkAuthentication();
      if (!authCheck.isAuthenticated) {
        throw new Error(authCheck.error || 'Authentication required');
      }

      if (authCheck.userId !== userId) {
        throw new Error('User ID mismatch');
      }

      // Ensure bucket exists
      await this.ensureBucketExists();

      onProgress?.({ progress: 10, status: 'uploading', message: 'Starting upload...' });

      // Generate unique filename
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${userId}/${timestamp}_${cleanFileName}`;

      onProgress?.({ progress: 30, status: 'uploading', message: 'Uploading file...' });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      onProgress?.({ progress: 70, status: 'uploading', message: 'Upload completed' });

      return { success: true, path: data.path };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Extract text content from file based on type
   */
  static async extractTextContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        
        if (file.type === 'text/plain' || file.type === 'text/markdown') {
          resolve(content);
        } else if (file.type === 'application/json') {
          try {
            const json = JSON.parse(content);
            resolve(JSON.stringify(json, null, 2));
          } catch {
            resolve(content);
          }
        } else {
          // For other file types, return as-is or implement specific parsers
          resolve(content);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file content'));
      reader.readAsText(file);
    });
  }

  /**
   * Create document record and chunks in database
   */
  static async createDocumentWithChunks(
    userId: string,
    filePath: string,
    content: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ document: Document; chunks: DocumentChunk[] }> {
    try {
      onProgress?.({ progress: 80, status: 'processing', message: 'Creating document record...' });

      const metadata = {
        originalName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        filePath: filePath
      };

      // Create main document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert([
          {
            userId,
            bucketId: this.BUCKET_NAME,
            content,
            metadata,
            embedding: null // Will be updated by n8n workflow
          }
        ])
        .select()
        .single();

      if (docError) {
        console.error('Database error:', docError);
        throw new Error(`Failed to create document record: ${docError.message}`);
      }

      onProgress?.({ progress: 85, status: 'chunking', message: 'Creating document chunks...' });

      // Create chunks with user association
      const chunkData = this.createDocumentChunks(
        document.id,
        userId, // Ensure user ownership
        content,
        file.name
      );

      console.log('About to insert chunks:', {
        chunkCount: chunkData.length,
        firstChunk: chunkData[0],
        userId,
        documentId: document.id
      });

      // Insert chunks into database
      const { data: chunks, error: chunkError } = await supabase
        .from('document_chunks')
        .insert(chunkData)
        .select();

      if (chunkError) {
        console.error('Chunk creation error:', chunkError);
        console.error('Chunk data that failed:', chunkData);
        // If chunks fail, we should probably delete the document too
        await supabase.from('documents').delete().eq('id', document.id);
        throw new Error(`Failed to create document chunks: ${chunkError.message}`);
      }

      console.log('Chunks created successfully:', chunks);
      onProgress?.({ progress: 100, status: 'completed', message: `Document processed with ${chunks?.length || 0} chunks` });

      return { document, chunks: chunks || [] };
    } catch (error) {
      console.error('Error creating document with chunks:', error);
      throw error;
    }
  }

  /**
   * Complete file upload and processing workflow with chunking
   */
  static async uploadAndProcessFile(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; document?: Document; chunks?: DocumentChunk[]; error?: string }> {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Check file type
      const allowedTypes = [
        'text/plain',
        'text/markdown',
        'application/json',
        'text/csv',
        'application/pdf' // You might want to add PDF parsing later
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Unsupported file type. Please upload text, markdown, JSON, or CSV files.');
      }

      onProgress?.({ progress: 5, status: 'processing', message: 'Validating file...' });

      // Extract text content
      let content: string;
      try {
        content = await this.extractTextContent(file);
      } catch (error) {
        throw new Error('Failed to extract text content from file');
      }

      if (!content.trim()) {
        throw new Error('File appears to be empty');
      }

      // Upload file to storage
      const uploadResult = await this.uploadFile(file, userId, onProgress);
      
      if (!uploadResult.success || !uploadResult.path) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Create document record with intelligent chunking
      const result = await this.createDocumentWithChunks(
        userId,
        uploadResult.path,
        content,
        file,
        onProgress
      );

      return { 
        success: true, 
        document: result.document, 
        chunks: result.chunks 
      };
    } catch (error) {
      console.error('Error in upload and process workflow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload and processing failed'
      };
    }
  }

  /**
   * Get user's documents with chunk information
   */
  static async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      const authCheck = await this.checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return [];
      }

      // Security: Only return documents owned by the authenticated user
      if (authCheck.userId !== userId) {
        console.warn('User ID mismatch in getUserDocuments');
        return [];
      }

      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_chunks(count)
        `)
        .eq('userId', authCheck.userId)
        .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user documents:', error);
      return [];
    }
  }

  /**
   * Get document chunks for a specific user and document
   * Critical: Ensures user can only access their own chunks
   */
  static async getUserDocumentChunks(userId: string, documentId?: number): Promise<DocumentChunk[]> {
    try {
      const authCheck = await this.checkAuthentication();
      if (!authCheck.isAuthenticated || authCheck.userId !== userId) {
        return [];
      }

      let query = supabase
        .from('document_chunks')
        .select('*')
        .eq('userId', userId) // Critical security filter
        .order('documentId', { ascending: true })
        .order('chunkIndex', { ascending: true });

      if (documentId) {
        query = query.eq('documentId', documentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user document chunks:', error);
      return [];
    }
  }

  /**
   * Search chunks by content for a specific user (for RAG queries)
   * This is where the magic happens - user-isolated semantic search
   */
  static async searchUserChunks(
    userId: string, 
    searchQuery: string, 
    limit: number = 10
  ): Promise<DocumentChunk[]> {
    try {
      const authCheck = await this.checkAuthentication();
      if (!authCheck.isAuthenticated || authCheck.userId !== userId) {
        return [];
      }

      // Use Supabase's full-text search on user's chunks only
      const { data, error } = await supabase
        .from('document_chunks')
        .select('*')
        .eq('userId', userId) // Critical: Only search user's chunks
        .textSearch('content', searchQuery)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching user chunks:', error);
      return [];
    }
  }

  /**
   * Get chunk statistics for a user
   */
  static async getUserChunkStats(userId: string): Promise<{
    totalChunks: number;
    totalDocuments: number;
    avgChunksPerDocument: number;
    totalWordCount: number;
  }> {
    try {
      const authCheck = await this.checkAuthentication();
      if (!authCheck.isAuthenticated || authCheck.userId !== userId) {
        return { totalChunks: 0, totalDocuments: 0, avgChunksPerDocument: 0, totalWordCount: 0 };
      }

      // Get chunk statistics
      const { data: chunks, error: chunkError } = await supabase
        .from('document_chunks')
        .select('metadata')
        .eq('userId', userId);

      if (chunkError) throw chunkError;

      // Get document count
      const { count: documentCount, error: docError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId);

      if (docError) throw docError;

      const totalChunks = chunks?.length || 0;
      const totalDocuments = documentCount || 0;
      const totalWordCount = chunks?.reduce((sum, chunk) => 
        sum + (chunk.metadata?.wordCount || 0), 0) || 0;

      return {
        totalChunks,
        totalDocuments,
        avgChunksPerDocument: totalDocuments > 0 ? totalChunks / totalDocuments : 0,
        totalWordCount
      };
    } catch (error) {
      console.error('Error getting user chunk stats:', error);
      return { totalChunks: 0, totalDocuments: 0, avgChunksPerDocument: 0, totalWordCount: 0 };
    }
  }

  /**
   * Delete document and all associated chunks and files
   */
  static async deleteDocument(documentId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const authCheck = await this.checkAuthentication();
      if (!authCheck.isAuthenticated || authCheck.userId !== userId) {
        throw new Error('Authentication required');
      }

      // Get document to verify ownership and find file path
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('metadata, userId')
        .eq('id', documentId)
        .eq('userId', userId) // Security: Ensure user owns the document
        .single();

      if (fetchError) {
        throw new Error('Document not found or access denied');
      }

      // Delete associated chunks first (cascading delete)
      const { error: chunksDeleteError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('documentId', documentId)
        .eq('userId', userId); // Double security check

      if (chunksDeleteError) {
        console.error('Error deleting chunks:', chunksDeleteError);
        // Continue with document deletion even if chunks fail
      }

      // Delete file from storage if exists
      if (document.metadata?.filePath) {
        const { error: storageError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([document.metadata.filePath]);
        
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Delete document record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('userId', userId); // Security: Ensure user owns the document

      if (deleteError) {
        throw new Error(`Failed to delete document: ${deleteError.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }
}