/**
 * 编码工具
 * 处理内容的编码和解码
 */

/**
 * 将内容编码为 Base64
 * 支持 Unicode 字符
 * @param content 原始内容
 * @returns Base64 编码字符串
 */
export const encodeToBase64 = (content: string): string => {
  try {
    // 使用 TextEncoder 处理 Unicode
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    // 转换为 Base64
    const binary = Array.from(data)
      .map((byte) => String.fromCharCode(byte))
      .join('')
    return btoa(binary)
  } catch (error) {
    console.error('Base64 编码失败:', error)
    // 降级使用 encodeURIComponent + btoa
    return btoa(encodeURIComponent(content))
  }
}

/**
 * 从 Base64 解码内容
 * 支持 Unicode 字符
 * @param base64 Base64 编码字符串
 * @returns 解码后的内容
 */
export const decodeFromBase64 = (base64: string): string => {
  try {
    // 解码 Base64
    const binary = atob(base64)
    // 转换为 Uint8Array
    const data = new Uint8Array(binary.split('').map((char) => char.charCodeAt(0)))
    // 使用 TextDecoder 处理 Unicode
    const decoder = new TextDecoder()
    return decoder.decode(data)
  } catch (error) {
    console.error('Base64 解码失败:', error)
    // 降级使用 atob + decodeURIComponent
    try {
      return decodeURIComponent(atob(base64))
    } catch {
      return atob(base64)
    }
  }
}

/**
 * 将 ArrayBuffer 转换为 Base64
 * @param buffer ArrayBuffer
 * @returns Base64 编码字符串
 */
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 将 Base64 转换为 ArrayBuffer
 * @param base64 Base64 编码字符串
 * @returns ArrayBuffer
 */
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 将 Blob 转换为 Base64
 * @param blob Blob 数据
 * @returns Promise<Base64 编码字符串>
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // 移除 data:mime/type;base64, 前缀
      const base64 = result.split(',')[1] || result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 将 Base64 转换为 Blob
 * @param base64 Base64 编码字符串
 * @param mimeType MIME 类型
 * @returns Blob
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const buffer = base64ToArrayBuffer(base64)
  return new Blob([buffer], { type: mimeType })
}
