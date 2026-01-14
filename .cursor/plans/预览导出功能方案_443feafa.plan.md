---
name: 预览导出功能方案
overview: 在演训方案和模板管理的表格中，为发布状态（applyNode === '4'）的记录增加"预览"和"导出"操作按钮，复用现有编辑器中的预览和导出功能实现。
todos:
  - id: preview-component
    content: 创建共享的文档预览对话框组件 DocumentPreviewDialog
    status: pending
  - id: performance-preview
    content: 演训方案页面：在发布状态增加预览和导出按钮及对应方法
    status: pending
  - id: template-preview
    content: 模板管理页面：在发布状态增加预览和导出按钮及对应方法
    status: pending
  - id: test-verify
    content: 测试验证：确保只在发布状态显示按钮，预览和导出功能正常
    status: pending
---

# 演训方案和模板管理预览导出功能方案

## 需求概述

- 在演训方案（performance/index.vue）和模板管理（management/index.vue）的表格操作列中增加"预览"和"导出"按钮
- 仅在发布状态（applyNode === '4'）时显示这两个按钮

## 实现方案

### 方案一：创建共享预览组件（推荐）

创建一个可复用的文档预览组件，两个模块共用：

**新建组件**：`src/lmComponents/DocumentPreviewDialog/index.vue`

- 参考 [StartToolbar.vue](e:/job-project/collabedit-fe/src/views/training/document/components/toolbar/StartToolbar.vue) 第436-501行的预览对话框实现
- 包含：全屏对话框、缩放控制、全屏切换功能
- Props：`visible`、`content`（HTML内容）、`title`（文档标题）

### 方案二：直接在各页面实现

在两个页面分别实现预览和导出功能（代码略有重复，但更独立）

## 具体修改

### 1. 演训方案 [performance/index.vue](e:/job-project/collabedit-fe/src/views/training/performance/index.vue)

**模板修改**（第167-176行，发布状态操作区）：

```vue
<!-- 发布状态(4)显示：预览、导出、审核记录 -->
<div v-else-if="scope.row.applyNode === '4'">
  <el-button link type="primary" @click="handlePreview(scope.row)">
    <Icon icon="ep:view" />
    预览
  </el-button>
  <el-button link type="primary" @click="handleExport(scope.row)">
    <Icon icon="ep:download" />
    导出
  </el-button>
  <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
    <Icon icon="ep:document" />
    审核记录
  </el-button>
</div>
```

**脚本新增**：

- `handlePreview(row)` - 获取文件流，转换为 HTML，打开预览对话框
- `handleExport(row)` - 获取文件流，导出为 Word/Markdown 文件
- 预览对话框状态变量：`previewDialogVisible`、`previewContent`、`previewTitle`、`previewZoom`

### 2. 模板管理 [management/index.vue](e:/job-project/collabedit-fe/src/views/template/management/index.vue)

**模板修改**（第193-201行，发布状态操作区）：

```vue
<!-- 发布状态(4)显示：预览、导出、审核记录 -->
<template v-else-if="scope.row.applyNode === '4'">
  <el-button link type="primary" @click="handlePreview(scope.row)">
    <Icon icon="ep:view" />
    预览
  </el-button>
  <el-button link type="primary" @click="handleExport(scope.row)">
    <Icon icon="ep:download" />
    导出
  </el-button>
  <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
    <Icon icon="ep:document" />
    审核记录
  </el-button>
</template>
```

**脚本新增**：与演训方案类似的预览和导出方法

## 核心实现逻辑

### 预览功能流程

```
1. 调用 getFileStream(id) 获取文件 Blob
2. 将 Blob 转为 Base64/Text
3. 解析 Markdown/HTML 内容
4. 打开全屏预览对话框展示
```

### 导出功能流程

```
1. 调用 getFileStream(id) 获取文件 Blob
2. 创建下载链接
3. 触发浏览器下载（支持 .md 或 .docx）
```

## 预览对话框样式

复用现有 `StartToolbar.vue` 的预览对话框样式（第2122-2456行）：

- 全屏白色背景
- A4 页面样式（794px x 1123px）
- 底部缩放控制栏（50%-200%）

## 文件变更清单

- `src/views/training/performance/index.vue` - 增加预览导出按钮和方法
- `src/views/template/management/index.vue` - 增加预览导出按钮和方法
- （可选）`src/lmComponents/DocumentPreviewDialog/index.vue` - 新建共享预览组件
