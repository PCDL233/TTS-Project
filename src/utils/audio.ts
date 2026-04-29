/**
 * Base64字符串转Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteArrays: Uint8Array[] = []

  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512)
    const byteNumbers = new Array(slice.length)
    for (let j = 0; j < slice.length; j++) {
      byteNumbers[j] = slice.charCodeAt(j)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }

  return new Blob(byteArrays, { type: mimeType })
}

/**
 * Blob转Base64字符串
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // result 是 data URL，如 data:audio/wav;base64,xxxx
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Base64字符串转ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * PCM16数据转WAV Blob
 * 采样率: 24kHz, 单声道, 16bit
 */
export function pcm16ToWav(pcmData: ArrayBuffer): Blob {
  const sampleRate = 24000
  const numChannels = 1
  const bitsPerSample = 16

  const pcmView = new DataView(pcmData)
  const pcmLength = pcmData.byteLength

  const wavHeaderLength = 44
  const wavBuffer = new ArrayBuffer(wavHeaderLength + pcmLength)
  const wavView = new DataView(wavBuffer)

  // RIFF chunk
  writeString(wavView, 0, 'RIFF')
  wavView.setUint32(4, 36 + pcmLength, true)
  writeString(wavView, 8, 'WAVE')

  // fmt chunk
  writeString(wavView, 12, 'fmt ')
  wavView.setUint32(16, 16, true) // Subchunk1Size
  wavView.setUint16(20, 1, true) // AudioFormat (PCM)
  wavView.setUint16(22, numChannels, true)
  wavView.setUint32(24, sampleRate, true)
  wavView.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true) // ByteRate
  wavView.setUint16(32, numChannels * bitsPerSample / 8, true) // BlockAlign
  wavView.setUint16(34, bitsPerSample, true)

  // data chunk
  writeString(wavView, 36, 'data')
  wavView.setUint32(40, pcmLength, true)

  // PCM data
  const wavBytes = new Uint8Array(wavBuffer)
  const pcmBytes = new Uint8Array(pcmData)
  wavBytes.set(pcmBytes, 44)

  return new Blob([wavBuffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * 文件转Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 读取文本文件内容
 */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

/**
 * 获取Base64的data URL前缀
 */
export function getBase64DataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`
}

/**
 * 下载Blob文件
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
