/**
 * 兼容非安全上下文（HTTP）的剪贴板写入工具。
 *
 * navigator.clipboard 仅在 Secure Context（HTTPS / localhost）下可用，
 * 通过 HTTP 局域网 IP 访问时为 undefined。本函数自动降级到
 * document.execCommand('copy') 以保证在任何环境下均可正常复制。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // 降级方案：execCommand('copy')
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (error) {
    console.error('复制到剪贴板失败:', error)
    return false
  }
}

/**
 * 将 HTML 内容写入剪贴板，同时提供 text/html 和 text/plain 两种格式。
 * Tiptap 等富文本编辑器粘贴时会优先读取 text/html 从而保留格式。
 *
 * 优先使用 ClipboardItem API；不可用时降级为隐藏 div + execCommand。
 */
export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  const plainText = htmlToPlainText(html)

  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      })
      await navigator.clipboard.write([item])
      return true
    }
  } catch {
    // ClipboardItem 失败（权限/兼容性），走降级
  }

  // 降级：用隐藏 div 承载 HTML，Selection + execCommand 复制时浏览器自动带 HTML 格式
  try {
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.style.opacity = '0'
    document.body.appendChild(container)

    const range = document.createRange()
    range.selectNodeContents(container)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    const successful = document.execCommand('copy')
    selection.removeAllRanges()
    document.body.removeChild(container)
    return successful
  } catch (error) {
    console.error('复制 HTML 到剪贴板失败:', error)
    return false
  }
}

function htmlToPlainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.innerText || div.textContent || ''
}
