/**
 * Word 文档解析工具函数
 */

import type { WordFileFormat } from './types'

/**
 * 检测文件是否为旧版 .doc 格式（OLE/CFB 复合文档）
 * OLE 文件头: D0 CF 11 E0 A1 B1 1A E1
 * @param bytes 文件字节数组
 * @returns 是否为 .doc 格式
 */
export const isDocFormat = (bytes: Uint8Array): boolean => {
  if (bytes.length < 8) return false
  // OLE/CFB 文件头魔数
  return (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  )
}

/**
 * 检测文件是否为 ZIP 格式（.docx 文件）
 * @param bytes 文件字节数组
 * @returns 是否为 ZIP 格式
 */
export const isZipFormat = (bytes: Uint8Array): boolean => {
  if (bytes.length < 4) return false
  // ZIP 文件头 PK (0x50, 0x4B, 0x03, 0x04)
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

/**
 * 检测 Word 文件格式
 * @param bytes 文件字节数组
 * @param filename 文件名（可选，用于辅助判断）
 * @returns 文件格式
 */
export const detectWordFormat = (bytes: Uint8Array, filename?: string): WordFileFormat => {
  // 检查 ZIP 格式 (.docx)
  if (isZipFormat(bytes)) {
    return 'docx'
  }
  // 检查 OLE 格式 (.doc)
  if (isDocFormat(bytes)) {
    return 'doc'
  }
  // 通过文件扩展名辅助判断
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext === 'docx') return 'docx'
    if (ext === 'doc') return 'doc'
  }
  return 'unknown'
}

/**
 * Base64 字符串转 Uint8Array
 * @param base64 Base64 字符串
 * @returns Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * 清理 Word 导出的 HTML - 保持更好的排版
 * @param html 原始 HTML
 * @returns 清理后的 HTML
 */
export const cleanWordHtml = (html: string): string => {
  // 移除多余的连续空段落（保留单个空段落用于间距）
  html = html.replace(/(<p>\s*<\/p>\s*){2,}/g, '<p></p>')

  // 清理多余的空格，但保留必要的空格
  html = html.replace(/&nbsp;&nbsp;+/g, ' ')

  // 移除 Word 特有的 mso- 样式，但保留其他有用的样式
  html = html.replace(/mso-[^;:"]+:[^;:"]+;?/gi, '')

  // 移除空的 style 属性
  html = html.replace(/style="\s*"/g, '')

  // 清理多余的 class 属性
  html = html.replace(/class=""/g, '')

  // 清理 XML 命名空间相关属性
  html = html.replace(/\s*xmlns:[^=]+="[^"]*"/g, '')

  // 清理 Office 特有的条件注释
  html = html.replace(/<!--\[if[^\]]*\][\s\S]*?<!\[endif\]-->/g, '')

  return html.trim()
}
