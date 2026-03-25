---
name: 表格背景色导出修复
overview: '导入含彩色单元格的 Word 文档后保存失败，根因是表格单元格背景色以 `rgb()` 格式存入 DocModel，导出 DOCX 时未经转换直接传给 `docx` 库，触发 "Invalid box value: expected 6 digits" 错误。需在导入侧和导出侧同时修复。'
todos:
  - id: fix-buildtable-bgcolor
    content: docModelToDocx.ts 第 483 行：将 `cell.backgroundColor?.replace(/^#/, '')` 替换为 `parseColor(cell.backgroundColor)`
    status: completed
  - id: fix-htmlparser-cell-bgcolor
    content: htmlParser.ts 第 434 行：将 `cellStyleMap['background-color'] || undefined` 改为经 `normalizeColor()` 归一化后赋值
    status: completed
  - id: fix-docx4js-cell-bgcolor
    content: docx4jsParser.ts 第 565 行：getCellStyles 返回的 backgroundColor 加 normalizeColor 归一化
    status: completed
isProject: false
---

# 表格单元格背景色 rgb() 格式导致保存失败

## 根因分析

**错误信息**：`Error: Invalid box value 'rgb(205, 196, 225)': expected 6 digits`

**数据流**：

```mermaid
flowchart LR
    A["Word 导入"] --> B["htmlParser.ts parseTable()"]
    B -->|"background-color: rgb(205,196,225) 未归一化"| C["DocModel cell.backgroundColor"]
    C --> D["docModelToDocx.ts buildTable()"]
    D -->|"replace(#, '') 对 rgb() 无效"| E["docx 库 shading.fill"]
    E -->|"rgb(...) 不是 6 位 hex"| F["Error!"]
```

**核心问题**：表格单元格的 `backgroundColor` 在整个管线中缺少颜色格式归一化，而文本 run 的颜色处理是完整的。具体有 3 处遗漏：

## 遗漏点 1（崩溃点）：docModelToDocx.ts buildTable - 导出时未用 parseColor

`[docModelToDocx.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\docModelToDocx.ts)` 第 483 行：

```483:483:e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\docModelToDocx.ts
      const bgColor = cell.backgroundColor?.replace(/^#/, '')
```

同文件中已有 `parseColor` 函数（第 44-58 行），能正确处理 `#hex` 和 `rgb()` 两种格式。其他所有 `backgroundColor` 使用处（第 110、653、785 行）都调用了 `parseColor()`，唯独 `buildTable` 遗漏了。

**修复**：`const bgColor = parseColor(cell.backgroundColor)`

## 遗漏点 2（数据源）：htmlParser.ts parseTable - 导入时未归一化

`[htmlParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts)` 第 434 行：

```434:434:e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\htmlParser.ts
        backgroundColor: cellStyleMap['background-color'] || undefined,
```

对比同文件第 112-114 行，run 级别的 `backgroundColor` 通过 `normalizeColor()` 归一化为 `#RRGGBB` 格式后才写入 DocModel，但表格单元格的 `backgroundColor` 直接取原始 CSS 值（可能是 `rgb()`）。

**修复**：

```
const rawBg = cellStyleMap['background-color']
backgroundColor: rawBg ? normalizeColor(rawBg) || undefined : undefined,
```

## 遗漏点 3（另一入口）：docx4jsParser.ts getCellStyles - 同样未归一化

`[docx4jsParser.ts](e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\docx4jsParser.ts)` 第 565 行：

```565:565:e:\job-project\collabedit-fe\src\views\training\document\utils\docModel\docx4jsParser.ts
    backgroundColor: props.backgroundColor || props['background-color'] || styleMap['background-color'] || undefined,
```

`getCellStyles` 从 DOCX 解析的 props/style 中取颜色值，也未做格式归一化。

**修复**：取值后包一层 `normalizeColor()`（需先 import）。

## 修复总结

3 处修改，纵深防御：导入时归一化颜色格式，导出时用 `parseColor` 安全转换。修复后即使已有的协同文档中存储了 `rgb()` 格式的颜色值，导出侧也能正确处理。
