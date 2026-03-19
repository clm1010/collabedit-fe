---
name: 双重Loading问题排查
overview: 点击"写作"进入编辑器时出现两个 loading 的原因已定位并修复。采用方案 A + B：在 router.push 前关闭 loadingInstance，同时在 permission.ts 中对编辑器路由跳过 pageLoading，全程只保留一个遮罩式 loading。
todos:
  - id: fix-performance-edit
    content: 修改 performance/index.vue 的 handleEdit：在 router.push 之前关闭 loadingInstance
    status: completed
  - id: fix-template-edit
    content: 修改 template/management/index.vue 的 handleEdit：在 router.push 之前关闭 loadingInstance
    status: completed
  - id: fix-permission-skip
    content: 修改 permission.ts：对编辑器路由（DocumentEdit、TemplateEditor）跳过 pageLoading
    status: completed
isProject: false
---

# 双重 Loading 问题修复 - 方案 A + B

## 问题根因

点击"写作"时两套 loading 同时生效：

1. **loadingInstance** (ElLoading.service) - handleEdit 中手动创建，覆盖权限校验+文件下载
2. **pageLoading** (框架级 v-loading) - permission.ts 的 beforeEach 在 router.push 时自动触发

## 为什么不统一为 pageLoading


| 对比维度  | loadingInstance (ElLoading.service)            | pageLoading (框架级 v-loading)      |
| ----- | ---------------------------------------------- | -------------------------------- |
| 触发时机  | 点击"写作"立即显示，覆盖权限校验+文件下载全过程                      | 仅在 router.push 后的 beforeEach 中触发 |
| 文本能力  | 支持 setText() 动态切换："正在校验权限..." -> "正在加载文档内容..." | 仅布尔开关，无文本                        |
| 自定义样式 | customClass: 'custom-writing-loading'，双环旋转动画   | 只有 Element Plus 默认 spinner       |
| 作用范围  | 全屏 lock 遮罩                                     | 仅 layout 的 ElScrollbar 内容区       |
| 控制粒度  | 手动 open/close，精确控制                             | 框架自动管理，无法细粒度控制                   |


结论：保持两者共存，通过方案 A + B 消除重叠。

## 已完成的修改（3 个文件）

### 1. performance/index.vue - 方案 A（第 582 行）

在 `router.push()` 前关闭 loadingInstance：

```javascript
    sessionStorage.setItem(`doc_info_${row.id}`, JSON.stringify(documentInfo))
    loadingInstance.close()
    router.push({
      name: 'DocumentEdit',
      params: { id: row.id },
      query: { ... }
    })
```

### 2. template/management/index.vue - 方案 A（第 836 行）

在 `router.push()` 前关闭 loadingInstance：

```javascript
    sessionStorage.setItem(`markdown_info_${row.id}`, JSON.stringify(docInfo))
    loadingInstance.close()
    router.push({
      path: `/template/editor/${row.id}`,
      query: { ... }
    })
```

两处 finally 中的 `loadingInstance.close()` 均保留（ElLoading.close 是幂等的，保证 catch 分支也能正确关闭）。

### 3. permission.ts - 方案 B（第 77-80 行）

对编辑器路由跳过 pageLoading，避免 loadingInstance 关闭后 pageLoading 再闪一下默认 spinner：

```javascript
router.beforeEach(async (to, from, next) => {
  start()
  const skipPageLoading = ['DocumentEdit', 'TemplateEditor'].includes(to.name as string)
  if (!skipPageLoading) {
    loadStart()
  }
```

## 修复后的用户体验流程

```
点击"写作" → 自定义双环动画 + "正在校验权限..."
  ↓ setText("正在加载文档内容...")
  ↓ loadingInstance.close()
  ↓ router.push() → 仅 NProgress 顶部进度条（轻量过渡）
  ↓ 编辑器渲染完成 → NProgress done
```

全程只有一个遮罩式 loading，路由切换由 NProgress 顶部进度条提供轻量反馈。