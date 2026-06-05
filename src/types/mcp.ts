export type McpTransportType = 'stdio' | 'sse'

export interface McpTransport {
  type: McpTransportType
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
}

export interface McpCachedTool {
  name: string
  description: string
  inputSchema: Record<string, any>
  updatedAt: string
}

export interface McpServerConfig {
  id: number
  userId: number
  name: string
  description: string
  transport: McpTransport
  enabled: boolean
  cachedTools: McpCachedTool[] | null
  createdAt: string
  updatedAt: string
}

export interface McpServerForm {
  name: string
  description: string
  transportType: McpTransportType
  command: string
  args: string
  env: string
  url: string
  headers: string
  enabled: boolean
}
