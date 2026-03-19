---
name: create-tiptap-extension
description: 创建新的 Tiptap 编辑器扩展的完整工作流，包括扩展定义、Vue 节点视图、工具栏注册和编辑器注册。当需要为富文本编辑器新增功能（如新的块类型、内联标记、命令等）时使用。
---

# 创建 Tiptap 扩展

## 前置确认

1. 确认目标编辑器：演训编辑器（`src/views/training/document/`）还是模板编辑器（`src/views/template/editor/`）
2. 确认扩展类型：Node（块级/行内节点）、Mark（文本标记）、Extension（功能扩展）

## 工作流步骤

### Step 1: 定义扩展文件

在对应编辑器的 extensions 目录创建 `{Name}.ts`：
- 演训编辑器：`src/views/training/document/components/toolbar/extensions/`
- 模板编辑器：`src/views/template/editor/extensions/`

```typescript
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

// 选项接口
export interface MyExtensionOptions {
  HTMLAttributes: Record<string, any>
}

// 命令类型声明
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    myExtension: {
      setMyExtension: () => ReturnType
    }
  }
}

export const MyExtension = Node.create<MyExtensionOptions>({
  name: 'myExtension',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      // 定义节点属性
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="my-extension"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'my-extension'
    })]
  },

  addCommands() {
    return {
      setMyExtension: () => ({ commands }) => {
        return commands.insertContent({ type: this.name })
      }
    }
  },

  // 如需自定义渲染，取消注释：
  // addNodeView() {
  //   return VueNodeViewRenderer(MyExtensionComponent)
  // },
})
```

### Step 2: 创建 Vue 节点视图（可选）

仅当需要自定义渲染时创建 `{Name}Component.vue`：

```vue
<template>
  <node-view-wrapper>
    <!-- 自定义渲染内容 -->
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
</script>
```

### Step 3: 注册到编辑器

在对应的编辑器组件的 `extensions` 数组中添加：
- 演训编辑器：`TiptapEditor.vue`
- 模板编辑器：`MarkdownEditor.vue`

### Step 4: 添加工具栏入口

在对应的工具栏组件中添加按钮：
- 演训编辑器：`InsertToolbar.vue` 或 `StartToolbar.vue` 等
- 模板编辑器：`MarkdownEditor.vue` 内的工具栏区域

使用 `useEditor()` 获取编辑器实例，调用 `editor.commands.xxx()` 执行命令。

### Step 5: 验证

- 检查扩展在编辑器中正常工作
- 检查 `parseHTML`/`renderHTML` 的 HTML 序列化/反序列化正确
- 如果是协同编辑器，确认 Y.js 同步正常
