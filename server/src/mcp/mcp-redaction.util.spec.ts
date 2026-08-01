import { redactMcpSecrets, redactMcpTransport } from './mcp-redaction.util'

describe('MCP 敏感字段脱敏', () => {
  it('应只脱敏敏感键名对应的值', () => {
    expect(redactMcpSecrets({ API_KEY: 'secret', REGION: 'cn' })).toEqual({
      API_KEY: '***',
      REGION: 'cn',
    })
  })

  it('应同时脱敏 env 和 headers', () => {
    expect(redactMcpTransport({
      type: 'sse',
      url: 'https://example.test/mcp',
      env: { TOKEN: 'value' },
      headers: { Authorization: 'Bearer value', Accept: 'application/json' },
    })).toEqual({
      type: 'sse',
      url: 'https://example.test/mcp',
      env: { TOKEN: '***' },
      headers: { Authorization: '***', Accept: 'application/json' },
    })
  })
})
