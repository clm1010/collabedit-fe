---
name: 修复Loading自定义Spinner
overview: 移除无效的 spinner HTML 属性，改用纯 CSS 伪元素（::before / ::after）在 .el-loading-spinner 上创建双环旋转动画，完全不依赖 spinner/svg 选项。
todos:
  - id: rewrite-scss
    content: 重写 loading.scss，用 ::before/::after 伪元素实现双环旋转动画
    status: completed
  - id: fix-perf
    content: performance/index.vue 移除无效的 spinner 属性
    status: completed
  - id: fix-tmpl
    content: template/management/index.vue 移除无效的 spinner 属性
    status: completed
isProject: false
---

# 修复 Loading 自定义 Spinner 不生效问题

## 根因分析

`ElLoading.service()` 的 `spinner` 属性只接受 **CSS 类名**（如 `'el-icon-loading'`），不支持 HTML 字符串。当前代码传入了 HTML div 内容，被当作类名处理，自然无效。`svg` 属性也只接受 SVG 元素，不适用于 div + CSS 的双环动画。

## 解决方案：纯 CSS 伪元素

不依赖 `spinner` / `svg` 属性，改用 `customClass` + CSS 伪元素实现：

- 通过 `customClass: 'custom-writing-loading'` 添加自定义类
- 用 CSS 隐藏默认 SVG spinner（`svg.circular`）
- 用 `::before` 伪元素创建外环（60x60，顺时针旋转）
- 用 `::after` 伪元素创建内环（40x40，逆时针旋转，绝对定位居中于外环）

### 1. 修改两个组件的 `ElLoading.service` 调用

移除 `spinner` 属性，只保留 `customClass`：

```typescript
ElLoading.service({
  lock: true,
  text: '正在校验权限...',
  background: 'rgba(255, 255, 255, 0.7)',
  customClass: 'custom-writing-loading'
})
```

涉及文件：

- [src/views/training/performance/index.vue](src/views/training/performance/index.vue) 第 540-546 行
- [src/views/template/management/index.vue](src/views/template/management/index.vue) 第 742-748 行

### 2. 重写 `loading.scss`

[src/lmStyles/loading.scss](src/lmStyles/loading.scss) 重写为纯 CSS 伪元素实现：

```scss
.custom-writing-loading {
  .el-loading-spinner {
    margin-top: -50px;

    svg.circular {
      display: none !important;
    }

    // 外环
    &::before {
      content: '';
      display: block;
      width: 60px;
      height: 60px;
      margin: 0 auto 15px;
      border: 4px solid #2d8cf0;
      border-bottom-width: 0;
      border-left-color: transparent;
      border-radius: 50%;
      box-sizing: border-box;
      animation: loader-outter 1s cubic-bezier(0.42, 0.61, 0.58, 0.41) infinite;
    }

    // 内环 - 绝对定位居中于外环
    &::after {
      content: '';
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      border: 4px solid #87bdff;
      border-right-width: 0;
      border-top-color: transparent;
      border-radius: 50%;
      box-sizing: border-box;
      animation: loader-inner 1s cubic-bezier(0.42, 0.61, 0.58, 0.41) infinite;
    }
  }

  .el-loading-text {
    color: #303133;
  }
}

@keyframes loader-outter { ... }
@keyframes loader-inner { ... }
```

## 需修改的文件

- `src/lmStyles/loading.scss` -- 重写为纯 CSS 伪元素双环动画
- `src/views/training/performance/index.vue` -- 移除 `spinner` 属性
- `src/views/template/management/index.vue` -- 移除 `spinner` 属性
