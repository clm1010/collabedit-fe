import { generatePreviewHtml } from './preview'

export const exportMarkdown = (markdown: string, filename: string): void => {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, `${filename}.md`)
}

export const exportHtml = (html: string, filename: string): void => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  downloadBlob(blob, `${filename}.html`)
}

export const exportFullHtml = (
  content: string,
  title: string,
  filename: string
): void => {
  const html = generatePreviewHtml(content, title)
  exportHtml(html, filename)
}

export const exportText = (text: string, filename: string): void => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, `${filename}.txt`)
}

export const exportJson = (data: unknown, filename: string): void => {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  downloadBlob(blob, `${filename}.json`)
}

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
