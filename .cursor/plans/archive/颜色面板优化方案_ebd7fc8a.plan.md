---
name: 颜色面板优化方案
overview: 参考 umo-editor 优化颜色面板 UI，在气泡菜单中增加字体颜色和背景颜色选择器，并实现工具栏/气泡菜单与编辑器选中文本的颜色联动。
todos:
  - id: color-picker-hsv-cmyk
    content: ColorPicker.vue 添加 HSV/CMYK 颜色模式及转换函数
    status: completed
  - id: bubble-menu-color
    content: MarkdownEditor.vue 气泡菜单替换高亮按钮为字体颜色和背景颜色选择器
    status: completed
  - id: color-sync
    content: 实现工具栏/气泡菜单与编辑器选中文本的颜色联动
    status: completed
isProject: false
---

# 颜色面板与联动优化方案

## 一、现状分析

### 当前实现

- [ColorPicker.vue](e:\job-project\collabedit-fe\src\views\template\editor\components\ColorPicker.vue): 已有默认颜色网格、标准色、自定义颜色选择器，支持 RGB/HSL/HEX 模式
- [MarkdownEditor.vue](e:\job-project\collabedit-fe\src\views\template\editor\components\MarkdownEditor.vue):
  - 工具栏有 ColorPicker 组件用于字体颜色和背景颜色
  - 气泡菜单只有简单的高亮 toggle 按钮（第 529-536 行）
  - 颜色状态固定，未与选中文本联动（第 713-714 行）

### 参考设计（umo-editor）

- 默认颜色 + 标准色 + 自定义颜色选择器
- 颜色模式切换：HEX、RGB、HSL、HSV、CMYK（不含 CSS）
- 无"最近使用"功能

---

## 二、修改方案

### 1. ColorPicker.vue 优化

**新增颜色模式**：添加 HSV 和 CMYK 模式

```typescript
// 颜色模式类型
type ColorMode = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk'

// 新增状态
const hsv = reactive({ h: 0, s: 100, v: 100 })
const cmyk = reactive({ c: 0, m: 0, y: 0, k: 0 })
```

**新增转换函数**：

- `rgbToHsv()` / `hsvToRgb()`
- `rgbToCmyk()` / `cmykToRgb()`

**UI 调整**：

- 移除 alpha 透明度输入（可选）
- 颜色模式选择器增加 HSV、CMYK 选项

### 2. 气泡菜单增加颜色选择器

**修改位置**：`MarkdownEditor.vue` 第 528-536 行

**当前代码**：

```vue
<button class="bubble-menu-btn" @click="editor?.chain().focus().toggleHighlight().run()">
  <Icon icon="mdi:format-color-highlight" />
</button>
```

**修改为**：

```vue
<!-- 字体颜色 -->
<ColorPicker
  v-model="textColor"
  icon="mdi:format-color-text"
  title="字体颜色"
  :show-clear="true"
  @change="handleTextColor"
/>
<!-- 字体背景颜色 -->
<ColorPicker
  v-model="highlightColor"
  icon="mdi:format-color-highlight"
  title="字体背景颜色"
  :show-clear="true"
  @change="handleHighlightColor"
/>
```

**气泡菜单样式调整**：需要调整 ColorPicker 在气泡菜单中的样式，使其更紧凑

### 3. 颜色联动实现

**监听选择变化**：在编辑器 `onUpdate` 或 `onSelectionUpdate` 中检测当前选中文本的颜色

```typescript
// 更新选中文本的颜色到工具栏
const updateColorFromSelection = () => {
  if (!editor.value) return

  // 获取字体颜色
  const color = editor.value.getAttributes('textStyle').color
  if (color) {
    textColor.value = color
  } else {
    textColor.value = '#000000'
  }

  // 获取背景颜色
  const highlight = editor.value.getAttributes('highlight').color
  if (highlight) {
    highlightColor.value = highlight
  } else {
    highlightColor.value = ''
  }
}

// 在编辑器配置中添加
onSelectionUpdate: () => {
  updateColorFromSelection()
}
```

---

## 三、文件修改清单

| 文件                 | 修改内容                                 |
| -------------------- | ---------------------------------------- |
| `ColorPicker.vue`    | 添加 HSV/CMYK 模式、优化 UI              |
| `MarkdownEditor.vue` | 气泡菜单增加颜色选择器、添加颜色联动逻辑 |

---

## 四、实现步骤

1. **ColorPicker.vue**

- 添加 HSV/CMYK 颜色模式及转换函数
- 更新颜色模式选择器 UI
- 确保所有模式之间的值同步

1. **MarkdownEditor.vue**

- 在气泡菜单中替换高亮按钮为两个 ColorPicker 组件
- 添加 `updateColorFromSelection()` 函数
- 在编辑器 `onSelectionUpdate` 回调中调用该函数
- 调整气泡菜单中 ColorPicker 的样式

1. **测试验证**

- 选中有颜色的文本，验证工具栏/气泡菜单颜色同步
- 在气泡菜单中修改颜色，验证文本样式正确应用
- 测试所有颜色模式切换功能
