import { describe, expect, it } from 'vitest'
import { mergeAgentWorkflowChunk } from './agent-stream'
import type { ChatMessage } from '../types/chat'

function assistantMessage(): ChatMessage {
  return { role: 'assistant', content: '' }
}

describe('智能体 SSE 事件归并', () => {
  it('将节点开始与完成事件合并为同一条轨迹', () => {
    const message = assistantMessage()

    expect(mergeAgentWorkflowChunk(message, {
      type: 'agent_node_start', nodeId: 'llm-1', nodeType: 'llm', label: '撰写答案',
    })).toBe(true)
    mergeAgentWorkflowChunk(message, {
      type: 'agent_node_finish', nodeId: 'llm-1', nodeType: 'llm', durationMs: 120, summary: '已生成文本',
    })

    expect(message.agentTrace).toEqual([{
      nodeId: 'llm-1', nodeType: 'llm', label: '撰写答案', status: 'success', durationMs: 120, summary: '已生成文本', error: undefined,
    }])
  })

  it('以运行完成事件中的服务端轨迹和引用为最终结果', () => {
    const message = assistantMessage()
    const trace = [{ nodeId: 'answer', nodeType: 'answer' as const, label: '回答', status: 'success' as const }]
    const citations = [{ documentId: 1, documentName: '手册', chunkId: 2, chunkIndex: 0, source: 'manual.pdf', content: '引用内容' }]

    mergeAgentWorkflowChunk(message, { type: 'agent_run_finish', trace, citations })

    expect(message.agentTrace).toEqual(trace)
    expect(message.citations).toEqual(citations)
  })
})
