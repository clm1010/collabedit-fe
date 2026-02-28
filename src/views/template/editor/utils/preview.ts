const previewStyles = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  line-height: 1.8;
  color: #333;
  background: #fff;
}
h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; color: #111; }
h2 { font-size: 1.5em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; color: #222; }
h3 { font-size: 1.25em; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.5em; color: #333; }
p { margin: 1em 0; }
ul, ol { padding-left: 2em; margin: 1em 0; }
ul { list-style-type: disc; }
ol { list-style-type: decimal; }
li { margin: 0.3em 0; }
blockquote {
  border-left: 4px solid #2563eb;
  padding-left: 1em;
  margin: 1em 0;
  color: #666;
  font-style: italic;
  background: #f8f9fa;
  padding: 1em 1em 1em 1.5em;
  border-radius: 0 4px 4px 0;
}
code {
  background: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  color: #e83e8c;
}
pre {
  background: #1f2937;
  color: #f9fafb;
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
}
pre code { background: transparent; color: inherit; padding: 0; }
table { 
  border-collapse: collapse; 
  width: 100%; 
  margin: 1em 0; 
  table-layout: auto;
}
th, td { 
  border: 1px solid #e5e7eb; 
  padding: 10px 14px; 
  text-align: left; 
  vertical-align: top; 
}
th { 
  background: #f9fafb; 
  font-weight: 600; 
  color: #374151; 
}
tr:nth-child(even) { background: #fafafa; }
a { color: #2563eb; text-decoration: underline; }
a:hover { color: #1d4ed8; }
img { 
  max-width: 100%; 
  height: auto; 
  display: block; 
  margin: 1em auto;
  border-radius: 4px;
}
mark { background: #fef08a; padding: 0 2px; border-radius: 2px; }
strong { font-weight: 600; }
em { font-style: italic; }
s { text-decoration: line-through; color: #888; }
u { text-decoration: underline; }
hr { 
  border: none; 
  border-top: 2px solid #e5e7eb; 
  margin: 2em 0; 
}
/* 任务列表样式 */
ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}
ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
ul[data-type="taskList"] li input[type="checkbox"] {
  margin-top: 5px;
}
/* AI 模块块级样式 */
.ai-block-node,
div[data-type="ai-block-node"] {
  display: block;
  width: 100%;
  margin: 16px 0;
  padding: 16px;
  border: 1px solid #e8a849;
  border-radius: 4px;
  background-color: #fff;
  position: relative;
}
.ai-block-node p,
div[data-type="ai-block-node"] p {
  margin: 0.5em 0;
  line-height: 1.75;
  text-indent: 2em;
}
.ai-block-node strong,
div[data-type="ai-block-node"] strong {
  font-weight: 700;
  color: #333;
}
/* AI 模块行内样式 */
.ai-block,
span[data-type="ai-block"] {
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  padding: 2px 6px;
}
`

export const generatePreviewHtml = (content: string, title: string): string => {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${previewStyles}</style>
</head>
<body>
${content}
</body>
</html>`
}

export const openPreviewWindow = (content: string, title: string): void => {
  const html = generatePreviewHtml(content, title)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const previewWindow = window.open(url, '_blank')
  
  // 清理 URL 对象
  if (previewWindow) {
    previewWindow.onload = () => {
      URL.revokeObjectURL(url)
    }
  } else {
    // 如果弹窗被阻止，延迟清理
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export const getPreviewStyles = (): string => {
  return previewStyles
}
