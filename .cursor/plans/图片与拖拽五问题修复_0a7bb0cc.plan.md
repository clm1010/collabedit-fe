---
name: 图片与拖拽五问题修复
overview: 修复 5 个编辑器问题：文字气泡菜单在图片选中时误弹、块图片对齐保存丢失、转块图多行、删除图片拖动手柄、修复编辑器全局 DragHandle 拖拽失效。
todos:
  - id: fix-bubble-menu
    content: 'TiptapEditor.vue: shouldShow 加 NodeSelection 判断，排除图片选中时显示文字气泡菜单'
    status: completed
  - id: fix-align-parsehtml
    content: 'ResizableImage.ts: parseHTML for align 增加 parentElement.style.textAlign 回退'
    status: completed
  - id: fix-align-docmodel
    content: 'htmlParser.ts: parseParagraphWithInlineImages 中两处 parseImage 调用都继承段落 style.align'
    status: completed
  - id: fix-extra-line
    content: 'TiptapEditor.vue CSS: 含块图片的段落设置 line-height:0 + font-size:0'
    status: completed
  - id: remove-image-drag
    content: ResizableImageComponent.vue 删除 image-drag-handle 模板+样式；ResizableImage.ts draggable 改 false
    status: completed
  - id: fix-draghandle-noderange
    content: 'TiptapEditor.vue: 导入注册 NodeRange 扩展到 extensions 数组'
    status: completed
  - id: verify-lint
    content: 检查所有修改文件 linter 错误
    status: completed
isProject: false
---

# 修复编辑器图片与拖拽五个问题

## 问题 1：选中图片时文字气泡菜单不应显示

### 根因

[TiptapEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\components\TiptapEditor.vue) 第 692 行 `shouldShow` 回调仅检查 `selection.$from.parent.isTextblock`，当图片被点击产生 `NodeSelection` 时，段落是 textblock 导致条件为 `true`，文字菜单错误弹出。

### 修复

在 `shouldShow` 中导入 `NodeSelection`（from `@tiptap/pm/state`），增加判断：

```typescript
if (selection instanceof NodeSelection) return false
```

图片已有独立的 `.image-toolbar`（`ResizableImageComponent.vue` 第 82-150 行），两套菜单互斥。此规则对所有 atom 节点（分页符等）同样合理。

**影响评估**：仅影响 NodeSelection 场景，TextSelection（框选含图片的文字）不受影响。

---

## 问题 2：块图片对齐方式保存后失效

### 根因

保存流程：`getHTML()` -> DOCX -> 服务端 -> 重新打开时 DOCX -> OOXML/docx4js 解析 -> HTML -> `trySetContent`。对齐在两处丢失：

**A. Tiptap parseHTML 无法从父段落继承对齐**

[ResizableImage.ts](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\extensions\ResizableImage.ts) 第 110 行 `parseHTML` 只读 `<img>` 自身属性。OOXML 解析器输出 `<p style="text-align:left"><img data-display="block"/></p>`，对齐在 `<p>` 而非 `<img>` 上，回退为 `'center'`。

**B. DocModel htmlParser 不继承段落对齐**

[htmlParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts) `parseParagraphWithInlineImages` 中两处 `parseImage(el)` 调用（第 279 行 sole image 分支 + 第 284 行 else 分支）只从 `<img>` 读属性，不继承父 `<p>` 的 `text-align`。

### 修复

**修复 A** -- `ResizableImage.ts` parseHTML 增加父元素回退：

```typescript
parseHTML: (element) => {
  return element.getAttribute('data-align')
    || element.style.textAlign
    || element.parentElement?.style?.textAlign
    || 'center'
},
```

**修复 B** -- `htmlParser.ts` 提取辅助函数，两处 `parseImage` 调用后均继承段落 align：

```typescript
const inheritParagraphAlign = (imgBlock: DocImageBlock) => {
  if (!imgBlock.style?.align && style?.align) {
    const a = style.align
    if (a === 'left' || a === 'center' || a === 'right') {
      imgBlock.style = { ...imgBlock.style, align: a }
    }
  }
}
```

**影响评估**：仅在 `<img>` 自身无 `data-align` 时才回退，不影响已有 `data-align` 的正常路径。

---

## 问题 3：转换为块图片多出一行

### 根因

段落内 `img.ProseMirror-separator`（ProseMirror NodeView 辅助元素）在块图 wrapper `display:block` 时创建额外行盒。现有 CSS（第 1212 行）已隐藏 `br.ProseMirror-trailingBreak`，但未处理 separator 的行框。

### 修复

在 [TiptapEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\components\TiptapEditor.vue) 现有块图段落 CSS 规则前追加：

```scss
&:has(> .resizable-image-wrapper:not(.is-inline)) {
  line-height: 0;
  font-size: 0;
}
```

**影响评估**：块图段落经 `appendTransaction` 拆分后仅含图片节点，`font-size:0` 不影响文字。图片工具栏/提示等均使用绝对定位+显式 font-size，不受影响。

---

## 问题 4：删除图片拖动手柄（⠿ 按钮）

### 涉及代码

[ResizableImageComponent.vue](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\extensions\ResizableImageComponent.vue)：

- 模板：第 70-76 行 `.image-drag-handle` 元素（含 `data-drag-handle` 和 `⠿` 文本）
- 样式：第 715-745 行 `.image-drag-handle` 及其 `&:hover`/`&:active` 规则

[ResizableImage.ts](e:\job-project\collabedit-fe\src\views\training\document\components\toolbar\extensions\ResizableImage.ts)：

- 第 39 行 `draggable: true`

### 修复

1. **删除模板** 第 70-76 行整块 `<div class="image-drag-handle">` 元素
2. **删除样式** 第 715-745 行 `.image-drag-handle` 及其伪类
3. **将 `draggable: true` 改为 `draggable: false`** -- 移除拖动手柄后，保留 `draggable` 反而会让用户意外触发浏览器原生拖放

**影响评估**：

- 预览弹窗中的 `startDrag`/`handleDrag`/`stopDrag` 是**图片平移功能**，与此无关，必须保留
- 全局 DragHandle（左侧拖拽手柄）使用 `NodeRangeSelection` 而非 `node.type.spec.draggable`，不依赖图片节点的 `draggable` 属性
- `.ProseMirror-selectednode:not(.resizable-image-wrapper)` 选择器中的逻辑不受影响

---

## 问题 5：编辑器全局 DragHandle 拖拽段落/图片/表格失效

### 根因

**缺少 `NodeRange` 扩展注册**

[TiptapEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\components\TiptapEditor.vue) `extensions` 数组（第 420-511 行）未注册 `NodeRange` 扩展。DragHandle 内部通过 `NodeRangeSelection.create()` 实现拖拽（见 `node_modules/@tiptap/extension-drag-handle/dist/index.js` 第 355-398 行）。`NodeRange` 扩展注册后会添加 ProseMirror 插件，提供拖拽所需的视觉反馈（decorations、`ProseMirror-selectednoderange` CSS 类）和键盘快捷键（Shift+Arrow 扩展选区、Mod-a 全选）。缺少此扩展导致拖拽操作无视觉反馈且 transaction 处理不完整。

包已安装（`package.json` 第 47 行 `"@tiptap/extension-node-range": "^3.19.0"`），但从未导入注册。

> **关于 `@node-change` 绑定**：经验证，Vue 3 中 `@node-change="fn"` 编译为 `{ onNodeChange: fn }`，与 `:on-node-change="fn"` 完全等价。DragHandle 组件将 `onNodeChange` 定义为 prop 且无 `emits` 声明，因此当前 `@node-change` 写法是正确的，无需修改。

### 修复

导入并注册 `NodeRange`：

```typescript
import NodeRange from '@tiptap/extension-node-range'

// extensions 数组中添加：
NodeRange,
```

**影响评估**：

- 注册 `NodeRange` 是官方 peerDependency 要求，属于正确性修复，不引入新行为
- 拖拽功能由插件内部处理，注册后即可工作
- 协同编辑场景下 DragHandle 内部已处理 `ySyncPluginKey` / `isChangeOrigin`，无需额外适配

---

## 涉及文件汇总

- `TiptapEditor.vue` -- shouldShow 加 NodeSelection 检查 + 导入注册 NodeRange + CSS 块图段落行高
- `ResizableImage.ts` -- align parseHTML 父元素回退 + draggable 改 false
- `ResizableImageComponent.vue` -- 删除 image-drag-handle 模板和样式
- `htmlParser.ts` -- parseParagraphWithInlineImages 两处 parseImage 继承段落对齐
