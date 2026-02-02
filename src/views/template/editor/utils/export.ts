/**
 * 导出工具
 * 处理文件导出功能
 */

import { generatePreviewHtml } from './preview'

/**
 * 导出 Markdown 文件
 * @param markdown Markdown 内容
 * @param filename 文件名（不含扩展名）
 */
export const exportMarkdown = (markdown: string, filename: string): void => {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, `${filename}.md`)
}

/**
 * 导出 HTML 文件
 * @param html HTML 内容
 * @param filename 文件名（不含扩展名）
 */
export const exportHtml = (html: string, filename: string): void => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  downloadBlob(blob, `${filename}.html`)
}

/**
 * 导出完整 HTML 文档（包含样式）
 * @param content 编辑器内容
 * @param title 文档标题
 * @param filename 文件名（不含扩展名）
 */
export const exportFullHtml = (
  content: string,
  title: string,
  filename: string
): void => {
  const html = generatePreviewHtml(content, title)
  exportHtml(html, filename)
}

/**
 * 导出纯文本文件
 * @param text 文本内容
 * @param filename 文件名（不含扩展名）
 */
export const exportText = (text: string, filename: string): void => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, `${filename}.txt`)
}

/**
 * 导出 JSON 文件
 * @param data JSON 数据
 * @param filename 文件名（不含扩展名）
 */
export const exportJson = (data: unknown, filename: string): void => {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  downloadBlob(blob, `${filename}.json`)
}

/**
 * 下载 Blob 文件
 * @param blob Blob 数据
 * @param filename 完整文件名
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 从 URL 下载文件
 * @param url 文件 URL
 * @param filename 保存的文件名
 */
export const downloadFromUrl = async (
  url: string,
  filename: string
): Promise<void> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const blob = await response.blob()
    downloadBlob(blob, filename)
  } catch (error) {
    console.error('文件下载失败:', error)
    throw new Error('文件下载失败')
  }
}
