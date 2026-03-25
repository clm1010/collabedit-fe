---
name: 表格Grid列宽修复
overview: 修复导入 Word 文档保存后表格完全错乱的问题。根因是 buildTable 未传 columnWidths 给 docx 库的 Table 构造函数，导致 w:tblGrid 全部默认为 100 twips，Word 按此等比分配列宽，表格结构完全失真。同时修复 colIndex 未计算 rowspan 占位的问题。
todos:
  - id: fix-table-grid-columnWidths
    content: buildTable 传入 columnWidths 给 Table 构造函数，确保 w:tblGrid 正确
    status: completed
  - id: fix-rowspan-colindex
    content: buildTable 中添加 rowspanTracker 追踪，修复 rowspan 时 colIndex 偏移
    status: completed
isProject: false
---

# 表格 Grid 列宽修复方案

## 根因分析

### Bug 1 (主因): `buildTable` 未传 `columnWidths` 给 `Table` 构造函数

`docx` 库 v9 的 `Table` 构造函数（[index.iife.js:15190](node_modules/docx/dist/index.iife.js)）：

```typescript
columnWidths = Array(Math.max(...rows.map((row) => row.CellCount))).fill(100)
```

当不传 `columnWidths` 参数时，所有 grid column 默认为 **100 twips**。这导致 `w:tblGrid` 与实际 `w:tcW`（cell 宽度）严重不一致：

- `w:tblGrid`: `[100, 100]` (200 twips 总计)
- `w:tcW`: `[2250, 7500]` (按实际 px15 计算)
- `w:tblW`: `9750` (DXA) 或 `100%` (PERCENTAGE)

在 FIXED layout 模式下，**Word/WPS 以 `w:tblGrid` 为列宽的主要依据**，将所有列等比分配。由于 grid 全是 100，所有列变成等宽。对于列宽差异大的表格（如"功能"窄列 + "功能描述"宽列），表格结构完全失真。

### Bug 2 (潜在): `colIndex` 未计算 rowspan 占位

[docModelToDocx.ts:473](src/views/training/document/utils/docModel/docModelToDocx.ts) 中 `colIndex` 只根据当前行的 cell 递增，不跳过被上方 rowspan 占据的列。当表格有纵向合并时，后续行的 cell 会取到错误列的宽度。

示例：2 列表格，colWidths = [100, 500]

- Row 0: [Cell A (rowspan=2), Cell B] → colIndex 正确: A=0, B=1
- Row 1: [Cell D] → colIndex=0, 取 colWidths[0]=100 → 实际应在 column 1, 应取 colWidths[1]=500

## 修复方案

### Fix 1: 传入 `columnWidths` 给 `Table` 构造函数

修改 [docModelToDocx.ts buildTable](src/views/training/document/utils/docModel/docModelToDocx.ts) 的 `new Table({...})`：

```typescript
return new Table({
  rows,
  width: tableWidth,
  columnWidths:
    block.colWidths?.length && block.colWidths.every((w) => w > 0)
      ? block.colWidths.map((w) => pxToTwip(w))
      : undefined,
  layout: TableLayoutType.FIXED
})
```

这样 `w:tblGrid` 会使用实际列宽值（如 `[2250, 7500]`），与 `w:tcW` 和 `w:tblW` 保持一致。Word/WPS 按正确比例渲染列宽。

### Fix 2: rowspan 占位追踪

在 `buildTable` 中添加 rowspan 追踪数组，让 `colIndex` 正确跳过被上方 rowspan 占据的列：

```typescript
const columnCount = block.colWidths?.length || 0
const rowspanTracker: number[] = new Array(columnCount).fill(0)

block.rows.forEach((row) => {
  let colIndex = 0
  row.cells.map((cell) => {
    // 跳过被 rowspan 占据的列
    while (colIndex < rowspanTracker.length && rowspanTracker[colIndex] > 0) {
      rowspanTracker[colIndex]--
      colIndex++
    }
    const span = cell.colspan || 1
    // ... 取 colWidths[colIndex..colIndex+span] ...
    if (cell.rowspan && cell.rowspan > 1) {
      for (let i = 0; i < span; i++) {
        if (colIndex + i < rowspanTracker.length) rowspanTracker[colIndex + i] = cell.rowspan - 1
      }
    }
    colIndex += span
  })
  // 行末：递减未处理的 rowspan
  while (colIndex < rowspanTracker.length) {
    if (rowspanTracker[colIndex] > 0) rowspanTracker[colIndex]--
    colIndex++
  }
})
```

## 涉及文件

- [docModelToDocx.ts](src/views/training/document/utils/docModel/docModelToDocx.ts) -- `buildTable` 函数
