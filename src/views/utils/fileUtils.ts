/**
 * 文件处理工具函数
 */

/**
 * 将 Blob 转换为 Base64 字符串
 * @param blob Blob 对象
 * @returns Promise<string> Base64 字符串（data URL 格式）
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(blob)
  })
}

/**
 * 将 Base64 字符串转换为 Blob
 * @param base64 Base64 字符串（data URL 格式）
 * @param mimeType MIME 类型（可选，如果不提供则从 data URL 中提取）
 * @returns Blob 对象
 */
export const base64ToBlob = (base64: string, mimeType?: string): Blob => {
  // 从 data URL 提取 MIME 类型和数据
  const matches = base64.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid base64 data URL format')
  }

  const type = mimeType || matches[1]
  const data = matches[2]

  // 解码 base64
  const binaryString = atob(data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return new Blob([bytes], { type })
}

/**
 * 将 Base64 字符串解码为文本
 * @param base64 Base64 字符串（data URL 格式）
 * @returns Promise<string> 解码后的文本内容
 */
export const base64ToText = async (base64: string): Promise<string> => {
  try {
    // 从 data URL 提取 base64 数据
    const base64Data = base64.split(',')[1]
    if (!base64Data) {
      console.warn('无效的 base64 数据格式')
      return ''
    }

    // 解码 base64 为二进制
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // 使用 TextDecoder 解码为 UTF-8 文本
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(bytes)
  } catch (error) {
    console.error('Base64 解码失败:', error)
    return ''
  }
}

/**
 * 下载 Blob 文件
 * @param blob Blob 对象
 * @param filename 文件名
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 读取文件为 ArrayBuffer
 * @param file File 对象
 * @returns Promise<ArrayBuffer>
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 读取文件为文本
 * @param file File 对象
 * @param encoding 编码格式，默认 UTF-8
 * @returns Promise<string>
 */
export const readFileAsText = (file: File, encoding = 'utf-8'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsText(file, encoding)
  })
}
