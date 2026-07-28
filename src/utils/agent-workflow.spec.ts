import { describe, expect, it } from 'vitest'
import {
  isAgentDraftDirty,
  removeAgentEdge,
  shouldContinueAgentSave,
  toAgentGraphSnapshot,
} from './agent-workflow'
import type { AgentEdge, AgentNode } from '../types/agent'

describe('智能体图数据转换', () => {
  it('移除仅用于编辑器展示的校验状态并规范化端口', () => {
    const nodes: AgentNode[] = [{
      id: 'start',
      type: 'start',
      position: { x: 10, y: 20 },
      data: { label: '开始', validationError: true },
    }]
    const edges: AgentEdge[] = [{ id: 'e1', source: 'start', target: 'answer' }]

    const snapshot = toAgentGraphSnapshot(nodes, edges)

    expect(snapshot.nodes[0]?.data).toEqual({ label: '开始' })
    expect(snapshot.edges[0]?.sourceHandle).toBeNull()
    expect(snapshot.nodes[0]?.position).not.toBe(nodes[0]?.position)
  })

  it('按连线 ID 删除连接且不修改原数组', () => {
    const edges: AgentEdge[] = [
      { id: 'e1', source: 'start', target: 'llm' },
      { id: 'e2', source: 'llm', target: 'answer' },
    ]

    const result = removeAgentEdge(edges, 'e1')

    expect(result).toEqual([{ id: 'e2', source: 'llm', target: 'answer' }])
    expect(edges).toHaveLength(2)
  })
})

describe('智能体草稿自动保存状态', () => {
  it('保存期间产生新编辑时保持脏状态并继续保存', () => {
    expect(isAgentDraftDirty(3, 2)).toBe(true)
    expect(shouldContinueAgentSave(3, 2, '')).toBe(true)
  })

  it('保存失败时保留脏状态但避免无限自动重试', () => {
    expect(isAgentDraftDirty(3, 2)).toBe(true)
    expect(shouldContinueAgentSave(3, 2, '网络错误')).toBe(false)
    expect(isAgentDraftDirty(3, 3)).toBe(false)
  })
})
