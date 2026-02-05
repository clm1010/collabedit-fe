---
name: Word导入修复
overview: 定位 Word 导入后编辑器报错的根因，统一图片 URL 处理与 DocModel/HTML 规范化链路，修复导入确认后的内容损坏与表格/标题异常。
todos:
  - id: trace-import-flow
    content: 梳理导入确认链路与图片URL变化
    status: pending
  - id: image-url-policy
    content: 实现图片URL持久化策略
    status: pending
  - id: normalize-pipeline
    content: 修复Html解析与序列化的图片字段
    status: pending
  - id: regress-check
    content: 用诊断导出样本回归验证
    status: pending
isProject: false
---

# Word 导入错误修复方案

## 关键发现

- 导出的 `docmodel`/`editor`/`normalized` 都包含 `blob:` 图片 URL，且数量与 `data:image` 不一致：`editor/normalized` 中 `blobImages=31`、`dataImages=25`，`preload` 只有 `dataImages=31`。这会导致“确认导入”后仍保存 `blob:`，后续恢复或规范化时失效，引发内容错误（图片断裂、结构异常）。
- `normalizeHtmlThroughDocModel` 只做 HTML ⇄ DocModel 往返，不会处理图片来源；如果输入是 `blob:`，会被原样写入 DocModel，继续污染导入结果。
- 当前“确认导入”流程在 `StartToolbar.vue` 中使用 `globalThis.__replaceDataImages` 将 `data:image` → `blob:`，但没有保存稳定的图片来源，且 `wordImportDocModel`/`normalized` 仍以 `blob:` 导出。

## 变更范围

- `E:/job-project/collabedit-fe/src/views/training/document/components/toolbar/StartToolbar.vue`
- `E:/job-project/collabedit-fe/src/views/training/document/utils/imageStore.ts`
- `E:/job-project/collabedit-fe/src/views/training/document/utils/docModel/htmlParser.ts`
- `E:/job-project/collabedit-fe/src/views/training/document/utils/docModel/serializer.ts`

## 计划步骤

1. **确定导入确认链路**：梳理 `StartToolbar.vue` 中 `wordImportPreview/wordImportRawHtml/wordImportNormalizedHtml` 的来源和“确认导入”前后的图片 URL 变化，标记 `blob:` 渗透点并记录复现场景（与现有诊断导出一致）。
2. **图片 URL 统一策略**：在导入确认时保持“持久来源”不丢失（优先保留 `data:image`，或同时写入 `data-origin-src`/`data-image-id` 以便后续恢复）。
3. **规范化链路修复**：在 `htmlParser.ts` 解析 `img` 时读取 `data-origin-src`（或 `data-image-id` 映射），在 `serializer.ts` 输出时保留稳定字段，避免 `blob:` 被固化到 DocModel。
4. **ImageStore 增强**：为 `ImageStore` 增加可选的“保留原始 data URL”能力，生成 `blob:` 时附加 `data-origin-src`，并支持回写到 HTML。
5. **回归检查**：用现有导出样本对比 `editor/normalized` 的图片计数与 URL 形式，确认 `blob:` 不再进入持久化；同时检查表格渲染是否仍能解析（`<table>` 结构需保持）。

## 需要确认的默认假设

- 默认以 `data:image` 作为持久化来源，`blob:` 仅用于运行时渲染优化。
- 导入确认后进入编辑器的 HTML 应可被 `normalizeHtmlThroughDocModel` 往返且不丢失图片。

## 参考代码片段

```104:170:E:/job-project/collabedit-fe/src/views/training/document/utils/docModel/serializer.ts
  if (block.type === 'image') {
    const attrs: string[] = [`src="${block.src}"`, 'class="editor-image"']
    if (block.alt) attrs.push(`alt="${escapeHtml(block.alt)}"`)
    if (block.width) attrs.push(`width="${block.width}"`)
    if (block.height) attrs.push(`height="${block.height}"`)
    if (block.style?.align) attrs.push(`data-align="${block.style.align}"`)
    const styleParts: string[] = []
    if (block.style?.marginLeft !== undefined)
      styleParts.push(`margin-left: ${block.style.marginLeft}px`)
    // ...
    return `<img ${attrs.join(' ')} />`
  }
```

```275:306:E:/job-project/collabedit-fe/src/views/training/document/utils/docModel/htmlParser.ts
const parseImage = (element: Element): DocImageBlock => {
  const src = element.getAttribute('src') || ''
  const alt = element.getAttribute('alt') || undefined
  const styleText = element.getAttribute('style') || ''
  // ...
  return { type: 'image', src, alt, width, height, style }
}
```

```1988:2003:E:/job-project/collabedit-fe/src/views/training/document/components/toolbar/StartToolbar.vue
    // 将 data:image 转为 blob URL，避免 URL 过长导致渲染报错
    const replaceDataImages = (globalThis as any).__replaceDataImages
    if (typeof replaceDataImages === 'function') {
      content = await replaceDataImages(content)
    }
```

