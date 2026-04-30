import type { Request } from 'express'

export function getClientIp(req: Request): string {
  // 1. 从代理 header 获取真实 IP
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const firstIp = (typeof forwarded === 'string' ? forwarded : forwarded[0])
      .split(',')[0]
      .trim()
    if (firstIp) return normalizeIp(firstIp)
  }

  const realIp = req.headers['x-real-ip']
  if (realIp) {
    const ip = typeof realIp === 'string' ? realIp : realIp[0]
    if (ip) return normalizeIp(ip)
  }

  // 2. Express 处理后的 ip（配置了 trust proxy 后有效）
  if (req.ip) return normalizeIp(req.ip)

  // 3. 原始 socket 地址
  const remote = req.socket?.remoteAddress
  if (remote) return normalizeIp(remote)

  return ''
}

function normalizeIp(ip: string): string {
  // IPv6 localhost -> IPv4 localhost
  if (ip === '::1') return '127.0.0.1'
  // IPv4-mapped IPv6 address -> IPv4
  if (ip.startsWith('::ffff:')) return ip.slice(7)
  return ip
}
