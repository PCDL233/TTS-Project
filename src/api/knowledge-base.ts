import { client } from './client'

export interface KnowledgeBase {
  id: number
  userId: number
  name: string
  description: string
  documentCount: number
  chunkCount: number
  status: 'empty' | 'processing' | 'ready'
  createdAt: string
  updatedAt: string
}

export interface KnowledgeDocument {
  id: number
  knowledgeBaseId: number
  filename: string
  originalName: string
  mimetype: string
  size: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunkCount: number
  errorMessage: string | null
  createdAt: string
}

export interface KnowledgeChunk {
  id: number
  documentId: number
  knowledgeBaseId: number
  content: string
  chunkIndex: number
  metadata: Record<string, any> | null
  createdAt: string
}

export async function createKnowledgeBase(data: {
  name: string
  description?: string
}): Promise<KnowledgeBase> {
  const res = await client.post<KnowledgeBase>('/knowledge-base', data)
  return res.data
}

export async function fetchKnowledgeBases(): Promise<KnowledgeBase[]> {
  const res = await client.get<KnowledgeBase[]>('/knowledge-base')
  return res.data
}

export async function fetchKnowledgeBase(id: number): Promise<KnowledgeBase> {
  const res = await client.get<KnowledgeBase>(`/knowledge-base/${id}`)
  return res.data
}

export async function deleteKnowledgeBase(id: number): Promise<void> {
  await client.delete(`/knowledge-base/${id}`)
}

export async function uploadDocument(kbId: number, file: File): Promise<KnowledgeDocument> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await client.post<KnowledgeDocument>(`/knowledge-base/${kbId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function fetchDocuments(kbId: number): Promise<KnowledgeDocument[]> {
  const res = await client.get<KnowledgeDocument[]>(`/knowledge-base/${kbId}/documents`)
  return res.data
}

export async function deleteDocument(kbId: number, docId: number): Promise<void> {
  await client.delete(`/knowledge-base/${kbId}/documents/${docId}`)
}

export async function getDocumentStatus(kbId: number, docId: number): Promise<KnowledgeDocument> {
  const res = await client.get<KnowledgeDocument>(`/knowledge-base/${kbId}/documents/${docId}/status`)
  return res.data
}

export async function fetchChunks(kbId: number, docId: number): Promise<KnowledgeChunk[]> {
  const res = await client.get<KnowledgeChunk[]>(`/knowledge-base/${kbId}/documents/${docId}/chunks`)
  return res.data
}
