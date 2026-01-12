/**
 * 文档导出工具
 * 提供 HTML 和 JSON 格式的文档导出功能
 */

/**
 * 文档信息接口
 */
export interface DocumentExportInfo {
  id?: string
  title: string
  content: string
  createTime?: string
  updateTime?: string
  version?: string
  creatorName?: string
}

/**
 * 导出为 HTML 文件
 * @param title 文档标题
 * @param content 文档内容（HTML 格式）
 * @param isMarkdown 是否为 Markdown 文档
 */
export const exportToHtml = (title: string, content: string, isMarkdown: boolean = false): Blob => {
  const docType = isMarkdown ? '模板文档' : '文档'
  const systemName = isMarkdown ? '模板写作系统' : '协同编辑系统'

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || docType}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #333;
    }
    h1 { font-size: 2em; color: #1a1a1a; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; color: #2a2a2a; margin-top: 1.5em; }
    h3 { font-size: 1.25em; color: #3a3a3a; margin-top: 1.2em; }
    p { margin: 1em 0; }
    ul, ol { padding-left: 2em; }
    li { margin: 0.3em 0; }
    blockquote {
      border-left: 4px solid #2563eb;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
      font-style: italic;
    }
    code {
      background: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
    }
    pre code { background: transparent; color: inherit; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th { background: #f5f5f5; font-weight: 600; }
    a { color: #2563eb; text-decoration: underline; }
    img { max-width: 100%; height: auto; }
    mark { background: #fef08a; padding: 0 2px; }
    .header {
      text-align: center;
      border-bottom: 2px solid #eee;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title || docType}</h1>
    <p style="color: #666; font-size: 14px;">导出时间: ${new Date().toLocaleString('zh-CN')}</p>
  </div>
  <div class="content">
    ${content || ''}
  </div>
  <div class="footer">
    <p>本文档由${systemName}导出</p>
  </div>
</body>
</html>`

  return new Blob([html], { type: 'text/html; charset=utf-8' })
}

/**
 * 导出为 JSON 文件
 * @param doc 文档信息
 */
export const exportToJson = (doc: DocumentExportInfo): Blob => {
  const exportData = {
    ...doc,
    exportTime: new Date().toISOString()
  }

  const json = JSON.stringify(exportData, null, 2)
  return new Blob([json], { type: 'application/json; charset=utf-8' })
}

/**
 * 下载 Blob 文件
 * @param blob Blob 对象
 * @param filename 文件名
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
 * 导出并下载 HTML 文件
 * @param title 文档标题
 * @param content 文档内容
 * @param isMarkdown 是否为 Markdown 文档
 */
export const downloadHtml = (title: string, content: string, isMarkdown: boolean = false): void => {
  const blob = exportToHtml(title, content, isMarkdown)
  const filename = `${title || '文档'}.html`
  downloadBlob(blob, filename)
}

/**
 * 导出并下载 JSON 文件
 * @param doc 文档信息
 */
export const downloadJson = (doc: DocumentExportInfo): void => {
  const blob = exportToJson(doc)
  const filename = `${doc.title || '文档'}.json`
  downloadBlob(blob, filename)
}

