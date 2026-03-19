---
name: 清理 auto-components 污染
overview: 修复 `build/vite/index.ts` 中 `unplugin-vue-components` 的 `globs` 配置，去掉 `.md` 扫描，并重新生成干净的 `auto-components.d.ts`。
todos:
  - id: fix-globs
    content: 修改 build/vite/index.ts：将 Components 插件的 globs 从 "src/components/**/**.{vue, md}" 改为 "src/components/**/*.vue"
    status: completed
  - id: delete-auto-components
    content: 删除 src/types/auto-components.d.ts，强制下次 Vite 启动时重新生成干净版本
    status: completed
isProject: false
---

# 清理 auto-components.d.ts 污染

## 问题根因

`[build/vite/index.ts](e:\job-project\collabedit-fe\build\vite\index.ts)` 中 `Components` 插件的 `globs` 配置存在两个问题：

```ts
globs: ['src/components/**/**.{vue, md}', '!src/components/DiyEditor/components/mobile/**']
```

- `**.{vue, md}` 中 `vue,` 后有**空格**，导致实际匹配的是 `.vue` 和 `. md`（含空格），glob 语义异常
- 包含了 `md` 后缀，理论上会尝试扫描 `.md` 文件作为组件
- `src/components/` 下**根本没有任何 `.md` 文件**（已确认）
- `.cursor/plans/*.md`、`获取token.md`、`RefreshToken` 等污染条目系历史残留（可能是早期配置更宽泛时生成的），当前配置下不会再产生
- `<RefreshToken>` 标签**没有在任何 `.vue` 模板中使用**（已确认）

## 修改内容

**文件：`[build/vite/index.ts](e:\job-project\collabedit-fe\build\vite\index.ts)`（第 67 行）**

- 将 `globs` 改为只扫描 `.vue` 文件，同时修正 glob 写法：

```ts
// 修改前
globs: ['src/components/**/**.{vue, md}', '!src/components/DiyEditor/components/mobile/**']

// 修改后
globs: ['src/components/**/*.vue', '!src/components/DiyEditor/components/mobile/**']
```

## 清理步骤

1. 修改 `build/vite/index.ts` 的 `globs` 配置（见上）
2. 删除 `src/types/auto-components.d.ts`（强制触发重新生成）
3. 运行 `vite dev` 或 `vite build`，插件自动生成干净的新文件

## 对项目的影响

**完全无影响**，理由：

- `src/components/` 内没有任何 `.md` 文件，去掉 `.md` 扫描不影响任何组件注册
- `<RefreshToken>` 未在任何模板中使用，移除该条目不影响任何功能
- `.cursor/plans/` 相关条目本就是垃圾数据，移除后反而更干净
- `auto-components.d.ts` 是纯自动生成文件，重新生成不影响业务逻辑
