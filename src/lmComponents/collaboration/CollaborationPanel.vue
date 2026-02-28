<template>
  <el-splitter
    lazy
    layout="vertical"
    class="collaboration-panel w-full h-full bg-white flex flex-col text-sm"
  >
    <el-splitter-panel size="40%" collapsible class="section p-4 border-b border-gray-100">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-gray-800">在线协作者</h3>
        <el-tag type="info" size="small" round>{{ collaborators.length }}</el-tag>
      </div>

      <div class="space-y-2 max-h-[400px] custom-scrollbar">
        <div
          v-for="user in collaborators"
          :key="user.clientId"
          class="flex items-center group hover:bg-gray-50 p-1.5 -mx-1.5 rounded transition-colors"
        >
          <div class="relative flex-shrink-0">
            <el-avatar
              :size="40"
              :shape="'circle'"
              :style="{ backgroundColor: user.color }"
              class="text-white text-xs"
            >
              {{ user.name.substring(0, 2) }}
            </el-avatar>
            <div
              v-if="user.isOwner"
              class="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] px-1 rounded-full scale-75"
            >
              创建人
            </div>
          </div>
          <div class="ml-2 flex-1 min-w-0">
            <div class="flex items-center">
              <span class="font-medium text-gray-700 truncate block max-w-[100px]">{{
                user.name
              }}</span>
              <el-tag
                v-if="user.isSelf"
                size="small"
                type="info"
                class="ml-1 scale-75 origin-left flex-shrink-0"
                >我</el-tag
              >
            </div>
            <div class="text-xs text-gray-400 truncate">
              {{ user.role || defaultRole }}
            </div>
          </div>
          <div class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="在线"></div>
        </div>

        <div v-if="collaborators.length === 0" class="text-center text-gray-400 py-4">
          暂无其他协作者
        </div>
      </div>
    </el-splitter-panel>

    <el-splitter-panel
      size="60%"
      collapsible
      class="section p-4 flex-1 overflow-hidden flex flex-col"
    >
      <template v-if="mode === 'materials'">
        <h3 class="font-bold text-gray-800 mb-3">参考素材</h3>
        <div class="overflow-y-auto flex-1 custom-scrollbar -mx-2 px-2">
          <div v-if="materials && materials.length > 0" class="space-y-2">
            <div
              v-for="(item, index) in materials"
              :key="index"
              class="p-3 bg-gray-50 rounded hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-all border border-transparent hover:border-blue-100"
              @click="$emit('click-material', item)"
            >
              <div class="font-medium mb-1 truncate" :title="item.title">{{ item.title }}</div>
              <div class="text-xs text-gray-400 flex justify-between items-center">
                <span>{{ item.date }}</span>
                <span>{{ item.author }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-gray-400 py-8"> 暂无参考素材 </div>
        </div>
      </template>

      <template v-else-if="mode === 'elements'">
        <h3 class="font-bold text-gray-800 mb-3">自定义要素</h3>
        <div class="overflow-y-auto flex-1 custom-scrollbar -mx-2 px-2">
          <div v-if="elements && elements.length > 0" class="space-y-2">
            <div
              v-for="(item, index) in elements"
              :key="index"
              class="p-3 bg-gray-50 rounded border border-gray-100"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-gray-700">{{ item.item_label }}</span>
                <el-tag size="small" type="info" effect="plain">
                  {{ getTypeLabel(item.item_type) }}
                </el-tag>
              </div>
              <div
                v-if="item.item_options && item.item_options.length > 0"
                class="text-xs text-gray-400 mt-1"
              >
                选项: {{ item.item_options.join(', ') }}
              </div>
            </div>
          </div>
          <div v-else class="text-center text-gray-400 py-8"> 暂无自定义要素 </div>
        </div>
      </template>
    </el-splitter-panel>
  </el-splitter>
</template>

<script setup lang="ts">
import { ELEMENT_TYPE_LABELS, type ElementItemType } from '@/utils/tmmConstants'
import type { ElementItem } from '@/types/management'

interface Props {
  /** 协作者列表 */
  collaborators: any[]
  /** 面板模式: 'materials' 显示参考素材, 'elements' 显示自定义要素 */
  mode?: 'materials' | 'elements'
  /** 参考素材列表 (mode='materials' 时使用) */
  materials?: any[]
  /** 自定义要素列表 (mode='elements' 时使用) */
  elements?: ElementItem[]
  /** 文档属性 */
  properties?: any
  /** 默认角色显示文本 */
  defaultRole?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'materials',
  materials: () => [],
  elements: () => [],
  defaultRole: '查看者'
})

defineEmits<{
  (e: 'click-material', item: any): void
}>()

const getTypeLabel = (type: ElementItemType): string => {
  return ELEMENT_TYPE_LABELS[type] || type
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
