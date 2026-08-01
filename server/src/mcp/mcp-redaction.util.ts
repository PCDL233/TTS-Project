import type { McpServerConfig } from './mcp-server-config.entity'

const SENSITIVE_KEY_PATTERN = /key|token|secret|password|api|auth|credential|private/i

export function redactMcpSecrets(values?: Record<string, string>): Record<string, string> | undefined {
  if (!values) return undefined
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, SENSITIVE_KEY_PATTERN.test(key) ? '***' : value]),
  )
}

export function redactMcpTransport(
  transport: McpServerConfig['transport'],
): McpServerConfig['transport'] {
  return {
    ...transport,
    env: redactMcpSecrets(transport.env),
    headers: redactMcpSecrets(transport.headers),
  }
}
