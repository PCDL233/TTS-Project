import type { ChatMessage, StreamChunk } from '../types/chat'

/** 合并智能体工作流 SSE 事件；返回 true 表示该事件已被消费。 */
export function mergeAgentWorkflowChunk(message: ChatMessage, chunk: StreamChunk): boolean {
  if (chunk.type === 'agent_node_start' && chunk.nodeId && chunk.nodeType) {
    if (!message.agentTrace) message.agentTrace = []
    const existing = message.agentTrace.find((item) => item.nodeId === chunk.nodeId)
    const runningStep = {
      nodeId: chunk.nodeId,
      nodeType: chunk.nodeType,
      label: chunk.label || chunk.nodeId,
      status: 'running' as const,
    }
    if (existing) Object.assign(existing, runningStep)
    else message.agentTrace.push(runningStep)
    return true
  }

  if ((chunk.type === 'agent_node_finish' || chunk.type === 'agent_node_error') && chunk.nodeId) {
    if (!message.agentTrace) message.agentTrace = []
    const existing = message.agentTrace.find((item) => item.nodeId === chunk.nodeId)
    const finishedStep = {
      nodeId: chunk.nodeId,
      nodeType: chunk.nodeType || existing?.nodeType || ('template' as const),
      label: chunk.label || existing?.label || chunk.nodeId,
      status: chunk.type === 'agent_node_error' ? ('error' as const) : ('success' as const),
      durationMs: chunk.durationMs,
      summary: chunk.summary,
      error: chunk.error,
    }
    if (existing) Object.assign(existing, finishedStep)
    else message.agentTrace.push(finishedStep)
    return true
  }

  if (chunk.type === 'agent_run_finish') {
    if (chunk.trace) message.agentTrace = chunk.trace
    if (chunk.citations) message.citations = chunk.citations
    return true
  }

  return chunk.type === 'agent_run_start' || chunk.type === 'agent_selected'
}
