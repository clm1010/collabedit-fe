---
name: 素材分页加载功能
overview: 在现有素材库基础上加回可选的分页参数（pageNo/pageSize），后端支持分页查询，前端实现滚动加载更多，默认每页 10 条。不传分页参数时行为与当前一致（返回全部）。
todos:
  - id: backend-file-page
    content: 'src/routes/file.ts: 加回可选的 pageNo/pageSize 分页逻辑'
    status: completed
  - id: fe-api-params
    content: 'src/api/training/index.ts: javaApi + mockApi 参数加回 pageNo/pageSize'
    status: in_progress
  - id: fe-mock-page
    content: 'src/mock/training/performance.ts: getFilePage 加回可选分页切片'
    status: pending
  - id: fe-editor-page
    content: 'TiptapCollaborativeEditor.vue: 加回分页 ref / loadMoreMaterials / template props'
    status: pending
  - id: fe-panel-scroll
    content: 'CollaborationPanel.vue: 加回 materialTotal prop / 滚动加载 / 状态提示'
    status: pending
isProject: false
---

# 素材分页加载功能

在现有简化后的素材库基础上，加回可选的 `pageNo`/`pageSize` 分页参数。后端兼容不传（返回全部）和传（分页返回）两种模式，前端通过滚动加载实现"加载更多"。

## 涉及文件（5 个）

## 一、后端

### 1. [src/routes/file.ts](e:\job-project\collabedit-node-backend\src\routes\file.ts)

当前代码（第 7-25 行）不接收分页参数，直接 `findMany` 返回全部。

改为：解构 `pageNo`、`pageSize`（可选），有值时走分页逻辑，无值时返回全部。

```typescript
router.post('/file/page', async (req, res) => {
  const { fileTypeList, pageNo, pageSize } = req.body ?? {}
  const where: any = { delFlg: 0 }

  if (fileTypeList) {
    const types = Array.isArray(fileTypeList) ? fileTypeList : [fileTypeList]
    if (types.length > 0) {
      where.fileType = { in: types.map(String) }
    }
  }

  if (pageNo && pageSize) {
    const [list, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: { createTime: 'desc' },
        skip: (Number(pageNo) - 1) * Number(pageSize),
        take: Number(pageSize)
      }),
      prisma.material.count({ where })
    ])
    return ok(res, { records: list, total })
  }

  const list = await prisma.material.findMany({
    where,
    orderBy: { createTime: 'desc' }
  })
  return ok(res, { records: list, total: list.length })
})
```

## 二、前端

### 2. [src/api/training/index.ts](e:\job-project\collabedit-fe\src\api\training\index.ts)

**javaApi.getFilePage**（第 258 行）和 **mockApi.getFilePage**（第 381 行）参数类型加回 `pageNo?` 和 `pageSize?`：

```typescript
// javaApi（第 258 行）
getFilePage: async (params: { pageNo?: number; pageSize?: number; fileTypeList?: string[] | string }) => {

// mockApi（第 381 行）
getFilePage: async (params: { pageNo?: number; pageSize?: number; fileTypeList?: string[] | string }) => {
```

JSDoc 注释（第 479-483 行）同步更新 `@param`。

### 3. [src/mock/training/performance.ts](e:\job-project\collabedit-fe\src\mock\training\performance.ts)

**getFilePage** 函数（第 874 行起）参数加回 `pageNo?`、`pageSize?`，有值时做分页切片，无值时返回全部：

```typescript
export const getFilePage = async (params: {
  pageNo?: number
  pageSize?: number
  fileTypeList?: string[] | string
}) => {
  await mockDelay()
  let filteredList = mockMaterialList.filter((item) => item.delFlg === 0)

  if (params.fileTypeList) {
    const types = Array.isArray(params.fileTypeList) ? params.fileTypeList : [params.fileTypeList]
    if (types.length > 0) {
      filteredList = filteredList.filter((item) => types.includes(item.fileType))
    }
  }

  const total = filteredList.length
  if (params.pageNo && params.pageSize) {
    const start = (params.pageNo - 1) * params.pageSize
    filteredList = filteredList.slice(start, start + params.pageSize)
  }

  return {
    code: 200,
    data: { records: filteredList, total },
    msg: 'success'
  }
}
```

### 4. [TiptapCollaborativeEditor.vue](e:\job-project\collabedit-fe\src\views\training\document\TiptapCollaborativeEditor.vue)

#### script（第 401-420 行区域）

加回分页状态 ref 和滚动加载函数：

```typescript
// 参考素材
const referenceMaterials = ref<any[]>([])
const materialPageNo = ref(1)
const materialPageSize = ref(10)
const materialTotal = ref(0)
const materialLoading = ref(false)
const currentFileType = computed(() => documentInfo.value?.tags?.[0] || '')

const loadMaterials = async (append = false) => {
  materialLoading.value = true
  try {
    const params: any = {
      pageNo: materialPageNo.value,
      pageSize: materialPageSize.value
    }
    if (currentFileType.value) {
      params.fileTypeList = [currentFileType.value]
    }
    const res = await getFilePage(params)
    referenceMaterials.value = append
      ? [...referenceMaterials.value, ...(res.records || [])]
      : res.records || []
    materialTotal.value = res.total || 0
  } catch (error) {
    console.error('获取参考素材失败:', error)
  } finally {
    materialLoading.value = false
  }
}

const loadMoreMaterials = async () => {
  if (materialLoading.value) return
  if (referenceMaterials.value.length >= materialTotal.value) return
  materialPageNo.value++
  await loadMaterials(true)
}
```

#### template（第 48 行区域）

CollaborationPanel 传回 `material-total` prop 和 `load-more-materials` 事件：

```html
<CollaborationPanel
  mode="materials"
  :collaborators="collaborators"
  :materials="referenceMaterials"
  :properties="docProperties"
  :material-total="materialTotal"
  :material-loading="materialLoading"
  default-role="查看者"
  @click-material="handleMaterialClick"
  @load-more-materials="loadMoreMaterials"
/>
```

#### loadDocument 中（约第 1032 行）

`await loadMaterials()` 前加回页码重置：

```typescript
materialPageNo.value = 1
await loadMaterials()
```

### 5. [CollaborationPanel.vue](e:\job-project\collabedit-fe\src\lmComponents\collaboration\CollaborationPanel.vue)

#### Props（第 126-149 行）

加回 `materialTotal` prop：

```typescript
interface Props {
  // ... 现有 props ...
  /** 素材总数（用于判断是否还有更多数据） */
  materialTotal?: number
  /** 素材加载中 */
  materialLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  // ... 现有默认值 ...
  materialTotal: 0,
  materialLoading: false
})
```

#### Emit + 滚动监听（第 155-157 行）

```typescript
const emit = defineEmits<{
  (e: 'click-material', item: any): void
  (e: 'load-more-materials'): void
}>()

const handleMaterialScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
    emit('load-more-materials')
  }
}
```

#### template（第 68 行区域）

滚动容器加回 `@scroll`，列表底部加回加载状态：

```html
<div class="overflow-y-auto flex-1 custom-scrollbar -mx-2 px-2" @scroll="handleMaterialScroll">
  <!-- ... 素材卡片 ... -->
  <div v-if="materialLoading" class="text-center text-gray-400 py-2 text-xs">加载中...</div>
  <div v-else-if="materials.length >= materialTotal" class="text-center text-gray-400 py-2 text-xs"
    >已加载全部</div
  >
</div>
```
