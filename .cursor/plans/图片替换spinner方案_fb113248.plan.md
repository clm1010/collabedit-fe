---
name: 图片替换spinner方案
overview: 将 loading.scss 中的 CSS 双环动画替换为图片，只需修改一个文件，两个 Vue 组件无需任何改动。
todos:
  - id: rewrite-scss-img
    content: 用户提供图片后，重写 loading.scss 替换为图片方案
    status: pending
isProject: false
---

# 图片替换 Loading Spinner

## 前置条件

将 loading 动画图片（如 `loading.gif`）放入 `public/` 目录。

## 修改方案

**只需修改 [src/lmStyles/loading.scss](src/lmStyles/loading.scss) 一个文件**，两个 Vue 组件无需任何改动。

将当前 71 行的双环 CSS 动画替换为以下内容（约 20 行）：

```scss
.custom-writing-loading {
  .el-loading-spinner {
    margin-top: -50px;

    svg.circular {
      display: none !important;
    }

    &::before {
      content: '';
      display: block;
      width: 80px;
      height: 80px;
      margin: 0 auto 15px;
      background: url('/loading.gif') no-repeat center / contain;
    }

    // 不再需要 ::after
  }

  .el-loading-text {
    color: #303133;
  }
}

// 不再需要 @keyframes
```

核心变化：

- `::before` 的 `border` + `animation` 全部替换为 `background: url('/loading.gif')`
- 删除 `::after` 伪元素（内环不再需要）
- 删除 `@keyframes loader-outter` 和 `@keyframes loader-inner`
- 图片尺寸通过 `width`/`height` 控制，路径中 `/loading.gif` 替换为实际文件名

## 等待用户提供

- loading 动画图片文件名（放到 `public/` 后告诉我即可）

