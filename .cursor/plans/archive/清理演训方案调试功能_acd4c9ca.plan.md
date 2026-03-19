---
name: 清理演训方案调试功能
overview: 删除演训方案编辑器中三个开发调试功能：导入Word弹窗中的"导出DocModel"和"导出对比HTML"按钮，以及工具栏中的"诊断导出"按钮。所有修改集中在一个文件内，不影响现有业务功能。
todos:
  - id: remove-template
    content: 删除 template 中的三个按钮（诊断导出、导出DocModel、导出对比HTML）
    status: completed
  - id: remove-functions
    content: 删除 script 中的函数：exportDebugArtifacts、downloadTextFile、buildComparisonHtml、exportDocModelJson、exportComparisonHtml
    status: completed
  - id: remove-variables
    content: 删除变量声明 wordImportDocxPreviewHtml 和 wordImportDocModel，以及 clearWordImportContent 中的对应清理代码
    status: completed
  - id: remove-docx-preview-block
    content: 删除 parseWithDocxPreview 调用块及其 import
    status: completed
  - id: cleanup-assignments
    content: 清理解析流程中对已删除变量的赋值语句
    status: completed
  - id: verify-lint
    content: 检查 lint 错误确保无残留引用
    status: completed
isProject: false
---

# 清理演训方案编辑器调试导出功能

## 修改范围

所有改动仅涉及 **一个文件**：[StartToolbar.vue](src/views/training/document/components/toolbar/StartToolbar.vue)

## 分析结论

三个待删除功能均为 **开发调试辅助工具**，不参与文档导入/导出的核心业务流程：

| 功能          | 用途                                               | 是否影响核心功能 |
| ------------- | -------------------------------------------------- | ---------------- |
| 导出 DocModel | 将解析中间产物导出为 JSON 供开发人员调试           | 否               |
| 导出对比 HTML | 将 docx-preview 与 DocModel 两种渲染结果做对比导出 | 否               |
| 诊断导出      | 调用全局调试函数 `__exportDocDebug` 导出诊断文件   | 否               |

## 具体修改项

### 1. 删除"诊断导出"工具栏按钮 (template)

删除第 333-338 行的 `el-tooltip` + `button` 块：

```333:338:src/views/training/document/components/toolbar/StartToolbar.vue
      <el-tooltip content="导出诊断文件" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportDebugArtifacts">
          <Icon icon="mdi:bug-outline" class="btn-icon-large" />
          <span class="btn-text">诊断导出</span>
        </button>
      </el-tooltip>
```

### 2. 删除弹窗底部"导出 DocModel"和"导出对比 HTML"按钮 (template)

删除第 401-410 行的两个 `el-button`：

```401:410:src/views/training/document/components/toolbar/StartToolbar.vue
        <el-button text @click="exportDocModelJson" :disabled="!wordImportDocModel">
          导出 DocModel
        </el-button>
        <el-button
          text
          @click="exportComparisonHtml"
          :disabled="!wordImportNormalizedHtml && !wordImportDocxPreviewHtml"
        >
          导出对比 HTML
        </el-button>
```

### 3. 删除 `exportDebugArtifacts` 函数 (script)

删除第 587-594 行：

```587:594:src/views/training/document/components/toolbar/StartToolbar.vue
const exportDebugArtifacts = () => {
  const fn = (globalThis as any).__exportDocDebug
  if (typeof fn === 'function') {
    fn()
    return
  }
  ElMessage.warning('诊断导出未就绪，请稍后重试')
}
```

### 4. 删除变量声明 (script)

删除第 1043-1044 行的 ref 声明（仅被导出功能消费，解析流程不需要其值）：

```1043:1044:src/views/training/document/components/toolbar/StartToolbar.vue
const wordImportDocxPreviewHtml = ref('')
const wordImportDocModel = ref<any | null>(null)
```

### 5. 删除辅助函数 (script)

删除以下三个函数（第 1082-1148 行区间）：

- `downloadTextFile` (行 1082-1091) -- 仅被下面两个函数调用，无其他调用者
- `buildComparisonHtml` (行 1094-1128) -- 仅被 exportComparisonHtml 调用
- `exportDocModelJson` (行 1130-1138)
- `exportComparisonHtml` (行 1140-1148)

### 6. 删除 docx-preview 对比渲染块 (script)

删除第 1331-1336 行的 try-catch 块，该块仅为对比导出功能服务：

```1331:1336:src/views/training/document/components/toolbar/StartToolbar.vue
    try {
      const previewHtml = await parseWithDocxPreview(arrayBuffer, updateProgress)
      wordImportDocxPreviewHtml.value = cleanWordHtml(previewHtml)
    } catch (e) {
      console.warn('docx-preview 对比渲染失败:', e)
    }
```

### 7. 清理 import 语句和赋值残留

- 从 import 中移除 `parseWithDocxPreview`（第 546 行）
- 从 `clearWordImportContent` 中移除 `wordImportDocxPreviewHtml.value = ''` 和 `wordImportDocModel.value = null`（第 1068-1069 行）
- 移除解析流程中对已删除变量的赋值（第 1227-1230、1289 行的 `wordImportDocModel.value = ...`）

## 影响评估

- **文档导入功能**：不受影响。`parseDocxToDocModel` 返回的 `docModel` 变量仍在 `serializeDocModelToHtml(docModel)` 中使用，只是不再额外存入 ref
- **文档导出(Word)功能**：不受影响。导出 Word 使用的是 `TiptapCollaborativeEditor.vue` 中的流程（line 939-948），与此处无关
- **其他工具栏功能**：不受影响。删除的按钮与打印、保存等功能完全独立
- **Word 导入性能**：略有提升。移除了 `parseWithDocxPreview` 调用，减少了一次冗余的文档解析
