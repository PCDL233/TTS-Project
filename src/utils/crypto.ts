const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY
if (!SECRET_KEY) {
  throw new Error('VITE_AES_SECRET_KEY 环境变量未配置')
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(SECRET_KEY))
  return crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function aesEncrypt(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = new Uint8Array(16)
  crypto.getRandomValues(iv)
  const encoder = new TextEncoder()
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any, tagLength: 128 },
    key,
    encoder.encode(plaintext),
  )
  const encrypted = new Uint8Array(encryptedBuf)
  // Web Crypto appends 16-byte authTag to ciphertext
  const ciphertext = encrypted.slice(0, encrypted.length - 16)
  const authTag = encrypted.slice(encrypted.length - 16)
  return bytesToBase64(iv) + ':' + bytesToBase64(authTag) + ':' + bytesToBase64(ciphertext)
}

export async function aesDecrypt(ciphertext: string): Promise<string> {
  const key = await getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')
  const iv = base64ToBytes(parts[0])
  const authTag = base64ToBytes(parts[1])
  const data = base64ToBytes(parts[2])
  // Reconstruct: ciphertext + authTag for Web Crypto
  const combined = new ArrayBuffer(data.length + authTag.length)
  const combinedView = new Uint8Array(combined)
  combinedView.set(data)
  combinedView.set(authTag, data.length)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any, tagLength: 128 },
    key,
    combined,
  )
  return new TextDecoder().decode(decrypted)
}
