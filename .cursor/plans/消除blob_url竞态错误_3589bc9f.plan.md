---
name: 消除blob URL竞态错误
overview: 两项修改：1) applyPreloadedContent 跳过 blob URL 转换，直接使用 data URL 写入编辑器，消除 Y.js DOM 重建竞态导致的 ERR_FILE_NOT_FOUND 错误；2) sanitizeImagesIfNeeded 图片大小限制从 2MB 调整为 10MB，覆盖 99% 的文档图片场景。
todos:
  - id: skip-blob-convert
    content: 'TiptapCollaborativeEditor.vue: applyPreloadedContent 跳过 blob URL 转换，直接使用 data URL'
    status: pending
  - id: raise-image-limit
    content: 'wordParser.shared.ts: sanitizeImagesIfNeeded 图片限制从 2MB 调整为 10MB'
    status: pending
isProject: false
---

# 消除 blob URL 竞态错误 + 调整图片大小限制

## 修改 1: 跳过 blob URL 转换

`[TiptapCollaborativeEditor.vue](src/views/training/document/TiptapCollaborativeEditor.vue)` 的 `applyPreloadedContent` 函数第 703-707 行：

```typescript
// 改前：
const contentToApply = /data:image\//i.test(safeHtml)
  ? await replaceDataImagesWithBlobUrls(safeHtml)
  : safeHtml

// 改后：
const contentToApply = safeHtml
```

## 修改 2: 图片大小限制调整

`[wordParser.shared.ts](src/views/training/document/utils/wordParser.shared.ts)` 第 552 行：

```typescript
// 改前：
if (base64Data.length > 2_000_000) {

// 改后：
if (base64Data.length > 10_000_000) {
```

10MB base64 约等于 7.5MB 原始图片，覆盖普通文档图片、高分辨率 Logo、手机拍照等 99% 场景。

## 涉及文件（2 个）

- `[src/views/training/document/TiptapCollaborativeEditor.vue](src/views/training/document/TiptapCollaborativeEditor.vue)`
- `[src/views/training/document/utils/wordParser.shared.ts](src/views/training/document/utils/wordParser.shared.ts)`
