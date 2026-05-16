import CryptoJS from 'crypto-js'

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY
if (!SECRET_KEY) {
  throw new Error('VITE_AES_SECRET_KEY 环境变量未配置')
}

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
