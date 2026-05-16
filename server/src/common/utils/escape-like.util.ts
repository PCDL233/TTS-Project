/**
 * 转义 LIKE 查询中的通配符，防止 SQL 注入
 */
export function escapeLike(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_');
}
