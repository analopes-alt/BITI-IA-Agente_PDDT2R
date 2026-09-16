export interface PDDDocument {
  id: string;
  conversationId?: string;
  name: string;
  clientId: string;
  clientName: string;
  robotId: string;
  robotName: string;
  modifiedTime: string;
  size: string;
  chunkCount?: number;
  indexedAt?: string;
  status: 'pending' | 'indexing' | 'indexed' | 'failed';
  error?: string;
}

export interface ClientGroup {
  id: string;
  name: string;
  robots: RobotGroup[];
}

export interface RobotGroup {
  id: string;
  name: string;
  documents: PDDDocument[];
}

export interface VectorChunk {
  id: string;
  fileId: string;
  conversationId?: string;
  fileName: string;
  clientId: string;
  clientName: string;
  robotId: string;
  robotName: string;
  text: string;
  embedding?: number[];
}

export interface IndexingStatus {
  isIndexing: boolean;
  currentFile?: string;
  processedCount: number;
  totalCount: number;
  logs: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
  attachment?: {
    name: string;
    type: string;
    base64?: string;
  };
  attachments?: Array<{
    name: string;
    type: string;
    base64?: string;
  }>;
  sources?: Array<{
    fileName: string;
    clientName: string;
    robotName: string;
    text: string;
    score: number;
  }>;
}

export interface SessionMemory {
  sessionId: string;
  learnedFacts: string[];
  messages: Array<{
    sender: 'user' | 'assistant';
    text: string;
    timestamp?: string;
  }>;
}

export interface VectorDatabase {
  indexedFiles: Record<string, {
    fileId: string;
    conversationId?: string;
    fileName: string;
    clientId: string;
    clientName: string;
    robotId: string;
    robotName: string;
    modifiedTime: string;
    size: string;
    chunkCount: number;
    indexedAt: string;
  }>;
  chunks: VectorChunk[];
  rootFolderId: string;
  rootFolderName: string;
  mode: 'real' | 'demo';
  sessions?: Record<string, SessionMemory>;
  embeddingCache?: Record<string, number[]>;
}
