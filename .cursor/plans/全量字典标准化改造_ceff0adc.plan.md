---
name: 全量字典标准化改造
overview: 将模板管理"模板子类"和演训方案中所有硬编码字典（文档分类、演训等级、所属学院、演训类型、演训城市）统一改为调用 Java 后端 /sjrh/dict/dataList 接口，前端 Mock/API/视图层全量适配，Node 后端同步新增路由和种子数据。
todos:
  - id: fe-api-training
    content: 'api/training/index.ts: getDocCategories 改为 /sjrh/dict/dataList?dictType=tb_file_type，新增 getLevelOptions/getAcademyOptions/getExerciseTypeOptions/getCityOptions 四个字典 API'
    status: completed
  - id: fe-api-template
    content: 'api/template/index.ts: getTemplateSubclass 改为 /sjrh/dict/dataList?dictType=tb_file_type，返回 DocCategoryVO[]，删除 TemplateSubclassVO 引用'
    status: completed
  - id: fe-type-cleanup
    content: 'types/management.ts: 删除 TemplateSubclassVO 接口定义及旧注释'
    status: completed
  - id: fe-config-categories
    content: 'config/categories.ts: 更新 performanceCategories 作为 fallback，新增 levelCategories/academyCategories/exerciseTypeCategories/cityCategories 常量'
    status: completed
  - id: fe-mock-training
    content: 'mock/training/performance.ts: 新增 getLevelOptions/getAcademyOptions/getExerciseTypeOptions/getCityOptions Mock 函数'
    status: completed
  - id: fe-mock-template
    content: 'mock/template/management.ts: mockTemplateSubclassList 改为 { value, label } 格式，编码统一，temSubclass 编码修正'
    status: completed
  - id: fe-view-index
    content: 'views/training/performance/index.vue: 删除硬编码选项数组，onMounted 加载全部字典，传给子组件'
    status: completed
  - id: fe-view-search
    content: 'views/training/performance/components/PerformanceSearch.vue: 删除硬编码，改为 props 接收 levelOptions/academyOptions'
    status: completed
  - id: fe-view-form
    content: 'views/training/performance/components/PerformanceForm.vue: 删除硬编码，改为 props 接收字典选项'
    status: completed
  - id: fe-view-drill
    content: 'views/training/performance/components/DrillSelector.vue: 删除硬编码，改为 props 接收字典选项'
    status: completed
  - id: fe-hook-cleanup
    content: 'hooks/usePerformanceList.ts: 删除硬编码选项，label 转换函数改为接收动态数据'
    status: completed
  - id: fe-template-view
    content: 'views/template/management/index.vue: subClassOptions 类型改 DocCategoryVO[]，category_id->value、category_name->label'
    status: completed
  - id: be-dict-route
    content: '后端 routes/dict.ts: 新增 /sjrh/dict/dataList 路由（复用 listDict 服务），删除旧 /dict/list'
    status: completed
  - id: be-template-route
    content: '后端 routes/template.ts: 删除 /tbTemplate/getTemTypeData 路由'
    status: completed
  - id: be-seed-update
    content: '后端 seed.ts: FILE_TYPE 改 tb_file_type，新增 tb_level_type/tb_academy_type/tb_exercise_type/tb_city_type 种子数据，删除 templateSubclass 种子'
    status: completed
  - id: test-verify
    content: 验证模板管理和演训方案的查询/新建/编辑/表格显示功能在 Mock 和 Java 模式下均正常
    status: pending
isProject: false
---

# 全量字典标准化改造方案

## 一、改造目标

将模板管理和演训方案中**所有硬编码字典选项**统一改为调用 Java 后端字典接口 `GET /sjrh/dict/dataList?dictType=XXX`，数据结构统一为 `{ value, label }`。

涉及 5 类字典：

| 字典类型 | dictType | 当前状态 |
| --- | --- | --- |
| 文档分类/模板子类 | `tb_file_type` | 原调用 `/dict/list?dictType=FILE_TYPE` + `/tbTemplate/getTemTypeData` |
| 演训等级 | `tb_level_type` | 前端硬编码 (5处重复) |
| 所属学院 | `tb_academy_type` | 前端硬编码 (5处重复) |
| 演训类型 | `tb_exercise_type` | 前端硬编码 (4处重复) |
| 演训城市 | `tb_city_type` | 前端硬编码 (1处) |

---

## 二、字典数据参照（以 Java 后端截图为准）

### tb_file_type (文档分类)

```
ZCQB=侦察情报, QTLA=企图立案, ZZJH=作战计划, YXFA=演训方案, ZZWS=作战文书,
DDJH=导调计划, ZJZB=战绩战报, ZZXT=作战想定, ZJBG=总结报告, TZ=通知,
TG=通告, PGJG=评估结果, QT=其它
```

### tb_level_type (演训等级)

```
1=战术级, 2=战役级, 3=战略级
```

### tb_academy_type (所属学院)

```
GFDX=国防大学, LHZZ=联合作战学院, GJAQ=国家安全学院, JSGL=军事管理学院,
ZZ=政治学院, LHQW=联合勤务学院, JSWH=军事文化学院, GJFW=国际防务学院, YJSY=研究生院
```

### tb_exercise_type (演训类型)

```
1=政治类, 2=作战类, 3=战略类, 4=联合类, 5=文化类, 6=经济类, 7=后勤装备类,
8=大学年度演训, 9=认知类, 10=后装类, 11=国际防务类, 12=网络类, 13=电磁类,
14=太空类, 15=管理类, 16=情报类, 17=国防动员类
```

### tb_city_type (演训城市)

```
BJ=北京, SH=上海, SJZ=石家庄, XA=西安, NJ=南京
```

---

## 三、前端修改（collabedit-fe）

### 3.1 字典配置 - [src/views/training/performance/config/categories.ts](src/views/training/performance/config/categories.ts)

新增所有字典的 fallback 常量（API 请求失败时使用），并统一导出类型 `DocCategoryVO`：

```typescript
export interface DocCategoryVO {
  value: string
  label: string
  count?: number
}

export const performanceCategories: DocCategoryVO[] = [
  { value: 'ZCQB', label: '侦察情报' },  // 修正: 去掉尾部 "1"
  ...
]

export const levelCategories: DocCategoryVO[] = [
  { value: '1', label: '战术级' },
  { value: '2', label: '战役级' },
  { value: '3', label: '战略级' }
]

export const academyCategories: DocCategoryVO[] = [
  { value: 'GFDX', label: '国防大学' },
  ...9项
]

export const exerciseTypeCategories: DocCategoryVO[] = [
  { value: '1', label: '政治类' },
  ...17项
]

export const cityCategories: DocCategoryVO[] = [
  { value: 'BJ', label: '北京' },
  ...5项
]
```

### 3.2 API 层 - [src/api/training/index.ts](src/api/training/index.ts)

**3.2.1 getDocCategories** - 修改接口路径：

```typescript
// 原: javaRequest.get('/dict/list', { dictType: 'FILE_TYPE' })
// 改:
const res = await javaRequest.get('/sjrh/dict/dataList', { dictType: 'tb_file_type' })
```

**3.2.2 新增 4 个字典 API**（javaApi + mockApi 各一套）：

```typescript
// Java API:
getLevelOptions: async (): Promise<DocCategoryVO[]> => {
  const res = await javaRequest.get('/sjrh/dict/dataList', { dictType: 'tb_level_type' })
  return (res || []).map((item: any) => ({ value: item.value, label: item.label }))
},
getAcademyOptions: async (): Promise<DocCategoryVO[]> => {
  const res = await javaRequest.get('/sjrh/dict/dataList', { dictType: 'tb_academy_type' })
  return (res || []).map(...)
},
getExerciseTypeOptions: async (): Promise<DocCategoryVO[]> => {
  const res = await javaRequest.get('/sjrh/dict/dataList', { dictType: 'tb_exercise_type' })
  return (res || []).map(...)
},
getCityOptions: async (): Promise<DocCategoryVO[]> => {
  const res = await javaRequest.get('/sjrh/dict/dataList', { dictType: 'tb_city_type' })
  return (res || []).map(...)
}
```

每个函数都有 try/catch，失败时回退到 categories.ts 中的 fallback 常量。

**3.2.3 导出新增函数**。

### 3.3 API 层 - [src/api/template/index.ts](src/api/template/index.ts)

**javaApi.getTemplateSubclass**（L44-51）改为：

```typescript
import type { DocCategoryVO } from '@/views/training/performance/config/categories'

getTemplateSubclass: async (): Promise<{ data: DocCategoryVO[] }> => {
  const res = await javaRequest.get('/sjrh/dict/dataList', { dictType: 'tb_file_type' })
  const data: DocCategoryVO[] = (res || []).map((item: any) => ({
    value: item.value,
    label: item.label
  }))
  return { data }
}
```

- 删除 `TemplateSubclassVO` 的 import（L24）
- mockApi 同步修改返回类型为 `DocCategoryVO[]`

### 3.4 类型清理 - [src/types/management.ts](src/types/management.ts)

删除 `TemplateSubclassVO` 接口（L15-21，含旧注释 L17-18）。

### 3.5 Mock 数据 - [src/mock/training/performance.ts](src/mock/training/performance.ts)

新增 4 个 Mock 函数，数据从 categories.ts 导入：

```typescript
import {
  levelCategories,
  academyCategories,
  exerciseTypeCategories,
  cityCategories
} from '@/views/training/performance/config/categories'

export const getLevelOptions = async (): Promise<DocCategoryVO[]> => {
  await mockDelay(100)
  return levelCategories
}
// ... getAcademyOptions, getExerciseTypeOptions, getCityOptions 同理
```

更新 default export 添加新函数。

### 3.6 Mock 数据 - [src/mock/template/management.ts](src/mock/template/management.ts)

**mockTemplateSubclassList** 改为 `DocCategoryVO[]` 格式（L15-28）：

```typescript
import type { DocCategoryVO } from '@/views/training/performance/config/categories'
import { performanceCategories } from '@/views/training/performance/config/categories'

const mockTemplateSubclassList: DocCategoryVO[] = performanceCategories
```

- 删除 `TemplateSubclassVO` 的 import（L12）
- `getTemplateSubclass` 返回类型改为 `DocCategoryVO[]`
- **mockDataList** 中 `temSubclass: 'DTJH'`（L138）改为 `'DDJH'`

### 3.7 演训方案主页 - [src/views/training/performance/index.vue](src/views/training/performance/index.vue)

**删除硬编码数组**（L375-411）：`exerciseTypeOptions`、`levelOptions`、`collegeOptions`。

**新增 onMounted 加载字典**：

```typescript
const levelOptions = ref<DocCategoryVO[]>([])
const academyOptions = ref<DocCategoryVO[]>([])
const exerciseTypeOptions = ref<DocCategoryVO[]>([])
const cityOptions = ref<DocCategoryVO[]>([])

onMounted(async () => {
  await getCategories()
  const [levels, academies, types, cities] = await Promise.all([
    PerformanceApi.getLevelOptions(),
    PerformanceApi.getAcademyOptions(),
    PerformanceApi.getExerciseTypeOptions(),
    PerformanceApi.getCityOptions()
  ])
  levelOptions.value = levels
  academyOptions.value = academies
  exerciseTypeOptions.value = types
  cityOptions.value = cities
  getList()
})
```

**修改 label 转换函数**（`getAcademyLabel`、`getLevelLabel`、`getExerciseTypeLabel` 等）改为从 ref 中查找。

**传递 props 给子组件**：

```html
<PerformanceSearch
  v-model="queryParams"
  :categories="categories"
  :level-options="levelOptions"
  :academy-options="academyOptions"
  @search="handleQuery"
  @reset="resetQuery"
/>

<PerformanceForm
  ...
  :file-type-options="fileTypeOptions"
  :exercise-type-options="exerciseTypeOptions"
  :level-options="levelOptions"
  :academy-options="academyOptions"
/>

<DrillSelector
  ...
  :exercise-type-options="exerciseTypeOptions"
  :level-options="levelOptions"
  :academy-options="academyOptions"
  :city-options="cityOptions"
/>
```

### 3.8 搜索组件 - [src/views/training/performance/components/PerformanceSearch.vue](src/views/training/performance/components/PerformanceSearch.vue)

- **删除**硬编码 `collegeOptions`（L133-143）
- **删除**硬编码 level `<el-option>` 标签（L38-40），改为 `v-for="item in levelOptions"`
- **新增 Props**：`levelOptions`、`academyOptions`（类型 `DocCategoryVO[]`，默认 `[]`）
- 模板中 `collegeOptions` 引用改为 `academyOptions`

### 3.9 表单组件 - [src/views/training/performance/components/PerformanceForm.vue](src/views/training/performance/components/PerformanceForm.vue)

- **删除**硬编码 `exerciseTypeOptions`（L230-248）、`levelOptions`（L250-254）、`collegeOptions`（L256-266）、`exerciseThemeOptions`（L220-228，未使用）
- **新增 Props**：`exerciseTypeOptions`、`levelOptions`、`academyOptions`
- 模板中 `collegeOptions` 引用改为 `academyOptions`

### 3.10 演训数据选择弹窗 - [src/views/training/performance/components/DrillSelector.vue](src/views/training/performance/components/DrillSelector.vue)

- **删除**硬编码 `exerciseTypeOptions`（L178-196）、`levelOptions`（L198-202）、`collegeOptions`（L204-214）、`cityOptions`（L216-222）
- **新增 Props**：`exerciseTypeOptions`、`levelOptions`、`academyOptions`、`cityOptions`
- 模板中 `collegeOptions` 引用改为 `academyOptions`

### 3.11 Hooks - [src/views/training/performance/hooks/usePerformanceList.ts](src/views/training/performance/hooks/usePerformanceList.ts)

- **删除**硬编码 `collegeOptions`（L125-135）、`exerciseThemeOptions`（L137-145）、`exerciseTypeOptions`（L147-165）、`levelOptions`（L167-171）
- label 转换函数 `getCollegeLabel` 重命名为 `getAcademyLabel`，与 `getLevelLabel`、`getExerciseTypeLabel` 一起改为接收外部传入的数组参数，或直接在 index.vue 中实现
- `fileTypeOptions` computed（L30-37）和 `handleCategorySelect`（L112-123）中的 `category.id`/`category.fileType` 旧字段需统一改为 `value`/`label`
- 如果 hook 不再被使用，可考虑内联到 index.vue 中

### 3.12 模板管理视图 - [src/views/template/management/index.vue](src/views/template/management/index.vue)

- **import 修改**（L463）：删除 `TemplateSubclassVO` import，新增 `DocCategoryVO` import
- **subClassOptions 类型**（L525）：`ref<DocCategoryVO[]>([])`
- **搜索下拉**（L51-56）+ **弹窗下拉**（L270-275）：`category_id` -> `value`，`category_name` -> `label`
- **getSubCategoryNameById**（L672-676）：`.find(c => c.value === id)` + `return subClass?.label`
- **删除旧注释**（L673-674）

---

## 四、后端修改（collabedit-node-backend）

### 4.1 字典路由 - [src/routes/dict.ts](src/routes/dict.ts)

新增 `/sjrh/dict/dataList` 路由，复用现有 `listDict` 服务：

```typescript
router.get('/sjrh/dict/dataList', async (req, res) => {
  const dictType = String(req.query.dictType ?? '')
  if (!dictType) return fail(res, '缺少dictType', 400)
  const data = await listDict(dictType)
  const mapped = data.map((item) => ({
    value: item.value,
    label: item.label
  }))
  return ok(res, mapped)
})
```

**删除**旧的 `/dict/list` 路由（L10-18）。

### 4.2 模板路由 - [src/routes/template.ts](src/routes/template.ts)

**删除** `/tbTemplate/getTemTypeData` 路由（L33-41）。

### 4.3 种子数据 - [src/seed.ts](src/seed.ts)

**4.3.1 修改 seedDictTypes**（L216-226）- `FILE_TYPE` 改为 `tb_file_type`，新增 4 个字典类型：

```typescript
{ name: '文件类型', type: 'tb_file_type', status: 0, remark: '业务文件类型' },
{ name: '演训等级', type: 'tb_level_type', status: 0, remark: '演训等级' },
{ name: '所属学院', type: 'tb_academy_type', status: 0, remark: '所属学院' },
{ name: '演训类型', type: 'tb_exercise_type', status: 0, remark: '演训类型' },
{ name: '演训城市', type: 'tb_city_type', status: 0, remark: '演训城市' }
```

**4.3.2 修改 seedDictItems**（L237-291）- `FILE_TYPE` 全部改为 `tb_file_type`，新增 4 类字典项：

tb_level_type:

```
{ dictType: 'tb_level_type', value: '1', label: '战术级', sort: 1 },
{ dictType: 'tb_level_type', value: '2', label: '战役级', sort: 2 },
{ dictType: 'tb_level_type', value: '3', label: '战略级', sort: 3 }
```

tb_academy_type:

```
{ dictType: 'tb_academy_type', value: 'GFDX', label: '国防大学', sort: 1 },
{ dictType: 'tb_academy_type', value: 'LHZZ', label: '联合作战学院', sort: 2 },
{ dictType: 'tb_academy_type', value: 'GJAQ', label: '国家安全学院', sort: 3 },
{ dictType: 'tb_academy_type', value: 'JSGL', label: '军事管理学院', sort: 4 },
{ dictType: 'tb_academy_type', value: 'ZZ', label: '政治学院', sort: 5 },
{ dictType: 'tb_academy_type', value: 'LHQW', label: '联合勤务学院', sort: 6 },
{ dictType: 'tb_academy_type', value: 'JSWH', label: '军事文化学院', sort: 7 },
{ dictType: 'tb_academy_type', value: 'GJFW', label: '国际防务学院', sort: 8 },
{ dictType: 'tb_academy_type', value: 'YJSY', label: '研究生院', sort: 9 }
```

tb_exercise_type:

```
{ dictType: 'tb_exercise_type', value: '1', label: '政治类', sort: 1 },
... (共17项，按图片顺序)
```

tb_city_type:

```
{ dictType: 'tb_city_type', value: 'BJ', label: '北京', sort: 1 },
{ dictType: 'tb_city_type', value: 'SH', label: '上海', sort: 2 },
{ dictType: 'tb_city_type', value: 'SJZ', label: '石家庄', sort: 3 },
{ dictType: 'tb_city_type', value: 'XA', label: '西安', sort: 4 },
{ dictType: 'tb_city_type', value: 'NJ', label: '南京', sort: 5 }
```

**4.3.3 删除** `templateSubclass` 数组（L295-308）、`seedTemplateSubclass` 函数（L310-321）及 main 中的调用（L428-429）。

---

## 五、删除/清理的代码清单

| 位置 | 删除内容 |
| --- | --- |
| `src/types/management.ts` L15-21 | `TemplateSubclassVO` 接口 + 旧注释 |
| `src/api/template/index.ts` L24 | `TemplateSubclassVO` import |
| `src/api/template/index.ts` L46-50 | 旧接口注释 `/tbTemplate/getTemTypeData` |
| `src/mock/template/management.ts` L12 | `TemplateSubclassVO` import |
| `src/mock/template/management.ts` L15-28 | 旧 `mockTemplateSubclassList`（改为新格式） |
| `src/views/template/management/index.vue` L463 | `TemplateSubclassVO` import |
| `src/views/template/management/index.vue` L673-674 | 旧注释 `template_id`/`template_name` |
| `src/views/training/performance/index.vue` L375-411 | 硬编码 exerciseTypeOptions/levelOptions/collegeOptions（重命名为 academyOptions） |
| `src/views/training/performance/components/PerformanceSearch.vue` L133-143 | 硬编码 collegeOptions（重命名为 academyOptions） |
| `src/views/training/performance/components/PerformanceSearch.vue` L38-40 | 硬编码 level option 标签 |
| `src/views/training/performance/components/PerformanceForm.vue` L220-266 | 硬编码 exerciseThemeOptions(未使用)/exerciseTypeOptions/levelOptions/collegeOptions（重命名为 academyOptions） |
| `src/views/training/performance/components/DrillSelector.vue` L178-222 | 硬编码全部 options |
| `src/views/training/performance/hooks/usePerformanceList.ts` L125-171 | 硬编码全部 options |
| Node: `src/routes/dict.ts` L10-18 | 旧 `/dict/list` 路由 |
| Node: `src/routes/template.ts` L33-41 | `/tbTemplate/getTemTypeData` 路由 |
| Node: `src/seed.ts` L295-321 | `templateSubclass` 数组 + `seedTemplateSubclass` 函数 |
| Node: `src/seed.ts` L428-429 | main 中 `seedTemplateSubclass` 调用 |

---

## 六、影响分析

### 不受影响的功能

- 模板的新建/编辑/删除/审核/发布流程（`temSubclass` 字段存储编码值不变）
- 演训方案的 CRUD、审核、发布流程
- 表格列显示（label 转换函数签名不变，只是数据源从硬编码改为 API）
- `ExamRecordDialog` 等其他子组件（不涉及字典字段）

### 现有功能兼容性

1. **已有数据编码兼容**：Node seed 中模板样例使用的 `temSubclass` 值（`ZZWS`、`YXFA`、`ZZJH`）在 `tb_file_type` 字典中均存在；演训样例数据的 `exerciseType`（`'4'`、`'12'`）、`level`（`'1'`-`'3'`）、`collegeCode`（`'GFDX'`、`'LHZZ'`）等值与新字典完全一致，无兼容问题
2. **PerformanceSearch 文档分类 :value 绑定**：当前 L69 绑定 `:value="item.label"`（用 label 作为值），需确认后端查询是用 label 还是 value 过滤
3. **usePerformanceList hook**：内部使用 `category.fileType` 和 `category.id` 等旧字段（L31-36, L114, L119, L182），需统一改为 `value`/`label`

### Mock 模式验证要点

- Mock 模式下 dict API 返回与 Java API 完全一致的 `{ value, label }[]` 结构
- `VITE_USE_MOCK=true` 时走 mock 函数，`false` 时走 javaRequest

### 后端无需额外修改的部分

- `src/services/dict.service.ts` 的 `listDict` 函数逻辑不变（仍按 dictType 查询 DictItem 表）
- Prisma Schema 中 `DictItem` 模型不变
- `TemplateSubclass` 模型可后续通过 migration 删除（当前阶段保留）

### 需要重新运行 seed 的注意事项

由于修改了字典类型名称（`FILE_TYPE` -> `tb_file_type`）和新增了 4 类字典数据，需要重新执行 `npx prisma db seed` 来更新数据库。如果数据库中已有旧的 `FILE_TYPE` 数据，seed 的 upsert 逻辑会新增 `tb_file_type` 数据，旧数据不会自动删除（可手动清理或添加清理脚本）。

---

## 七、遗漏排查与补充修正

### 7.1 命名统一：college -> academy

本次改造中，所有 `collegeOptions` / `getCollegeOptions` / `collegeCategories` / `getCollegeLabel` 统一重命名为 `academyOptions` / `getAcademyOptions` / `academyCategories` / `getAcademyLabel`。

注意：数据库字段 `collegeCode`（`TrainingPerformanceVO.collegeCode`、`TrainingPerformancePageReqVO.collegeCode`）**保持不变**，因为这是后端存储字段名，只是前端选项变量名和 API 函数名更改。

涉及重命名的文件汇总：

| 文件 | 旧名称 | 新名称 |
| --- | --- | --- |
| `api/training/index.ts` | `getCollegeOptions` | `getAcademyOptions` |
| `mock/training/performance.ts` | `getCollegeOptions` | `getAcademyOptions` |
| `config/categories.ts` | `collegeCategories` | `academyCategories` |
| `index.vue` | `collegeOptions` ref, `getCollegeLabel` | `academyOptions` ref, `getAcademyLabel` |
| `PerformanceSearch.vue` | prop `collegeOptions`, 模板引用 | prop `academyOptions`, 模板引用 |
| `PerformanceForm.vue` | `collegeOptions`, 模板引用 | prop `academyOptions`, 模板引用 |
| `DrillSelector.vue` | `collegeOptions`, 模板引用 | prop `academyOptions`, 模板引用 |
| `usePerformanceList.ts` | `collegeOptions`, `getCollegeLabel` | `academyOptions`, `getAcademyLabel` |

### 7.2 PerformanceSearch.vue 文档分类 :value 绑定问题

当前 `PerformanceSearch.vue` L69 的文档分类下拉：

```html
<el-option ... :value="item.label" />
```

使用 `label`（如"侦察情报"）作为值传给后端查询，而非 `value`（如"ZCQB"）。需确认后端 `getPageList` 的 `fileType` 参数期望接收的是 label 还是 value。如果后端期望 value，应改为 `:value="item.value"`。

### 7.3 usePerformanceList.ts 旧字段访问

hook 中 `fileTypeOptions` computed（L30-37）使用了 `category.id` 和 `category.fileType` 等旧字段名：

```typescript
const filtered = filter(categories.value, (item) => item.id !== '0')
return map(filtered, (item) => ({
  label: item.fileType,
  value: item.id,
  id: item.id
}))
```

以及 `handleCategorySelect`（L112-123）中：

```typescript
const category = categories.value.find((cat) => cat.id === categoryId)
queryParams.fileType = category.fileType
```

这些都需要统一改为 `value`/`label` 字段。

### 7.4 PerformanceForm.vue 未使用的 exerciseThemeOptions

`exerciseThemeOptions`（L220-228）在 PerformanceForm 模板中无对应表单项引用，属于遗留代码，应一并删除。

### 7.5 categories.ts 中 performanceCategories 的 label 错误

当前 `performanceCategories` 第一项 label 为 `'侦察情报1'`（尾部多了 "1"），需修正为 `'侦察情报'`。

### 7.6 已确认无遗漏的范围

- `ExamRecordDialog.vue` - 不涉及任何字典字段
- `ExportToolbar.vue` - 不涉及字典字段
- `src/views/training/document/` 目录 - 不引用字典选项
- `src/views/template/editor/` 目录 - 不引用字典选项
- 除方案中列出的文件外，无其他文件引用 `getDocCategories`、`DocCategoryVO`、`FILE_TYPE` 或硬编码字典选项
