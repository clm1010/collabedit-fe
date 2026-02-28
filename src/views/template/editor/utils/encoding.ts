export const encodeToBase64 = (content: string): string => {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const binary = Array.from(data)
      .map((byte) => String.fromCharCode(byte))
      .join('')
    return btoa(binary)
  } catch (error) {
    console.error('Base64 编码失败:', error)
    return btoa(encodeURIComponent(content))
  }
}

export const decodeFromBase64 = (base64: string): string => {
  try {
    const binary = atob(base64)
    const data = new Uint8Array(binary.split('').map((char) => char.charCodeAt(0)))
    const decoder = new TextDecoder()
    return decoder.decode(data)
  } catch (error) {
    console.error('Base64 解码失败:', error)
    try {
      return decodeURIComponent(atob(base64))
    } catch {
      return atob(base64)
    }
  }
}

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
    const base64 = result.split(',')[1] || result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const buffer = base64ToArrayBuffer(base64)
  return new Blob([buffer], { type: mimeType })
}
