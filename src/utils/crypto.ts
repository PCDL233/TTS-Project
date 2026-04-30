import CryptoJS from 'crypto-js'

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY || 'default-secret-key-change-me-please'

function getKey(): CryptoJS.lib.WordArray {
  return CryptoJS.SHA256(SECRET_KEY)
}

export function aesEncrypt(plaintext: string): string {
  const key = getKey()
  const iv = CryptoJS.lib.WordArray.random(16)
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  const ivBase64 = CryptoJS.enc.Base64.stringify(iv)
  const cipherBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  return ivBase64 + ':' + cipherBase64
}

export function aesDecrypt(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted format')
  }
  const iv = CryptoJS.enc.Base64.parse(parts[0])
  const encrypted = CryptoJS.enc.Base64.parse(parts[1])
  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext: encrypted }),
    key,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  )
  return decrypted.toString(CryptoJS.enc.Utf8)
}
