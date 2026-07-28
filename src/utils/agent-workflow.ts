import type { AgentEdge, AgentGraphV1, AgentNode } from '../types/agent'

/** 将 Vue Flow 运行态数据转换为可持久化的稳定工作流快照。 */
export function toAgentGraphSnapshot(nodes: AgentNode[], edges: AgentEdge[]): AgentGraphV1 {
  return {
    schemaVersion: 1,
    nodes: nodes.map(({ id, type, position, data }) => {
      const { validationError: _validationError, ...persistedData } = data
      return { id, type, position: { ...position }, data: persistedData }
    }),
    edges: edges.map(({ id, source, target, sourceHandle }) => ({
      id,
      source,
      target,
      sourceHandle: sourceHandle ?? null,
    })),
  }
}

/** 根据编辑版本与已保存版本判断草稿是否仍有未持久化修改。 */
export function isAgentDraftDirty(editRevision: number, savedRevision: number): boolean {
  return savedRevision < editRevision
}

/** 保存成功后若期间又发生编辑，则需要继续提交最新快照。 */
export function shouldContinueAgentSave(editRevision: number, savedRevision: number, saveError: string): boolean {
  return isAgentDraftDirty(editRevision, savedRevision) && !saveError
}

/** 删除指定连线，返回一个新数组以确保 Vue Flow 和自动保存都能观察到变化。 */
export function removeAgentEdge(edges: AgentEdge[], edgeId: string): AgentEdge[] {
  return edges.filter((edge) => edge.id !== edgeId)
}
