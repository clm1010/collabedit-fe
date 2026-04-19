<template>
  <node-view-wrapper
    as="div"
    class="toc-entry"
    :class="`toc-entry--level-${level}`"
    @click="handleClick"
  >
    <span class="toc-entry__text">{{ text }}</span>
    <span class="toc-entry__leader" aria-hidden="true"></span>
    <span class="toc-entry__page">{{ pageNumber }}</span>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const attrs = computed(() => props.node.attrs ?? {})
const text = computed<string>(() => String(attrs.value.text ?? ''))
const pageNumber = computed<string>(() => String(attrs.value.pageNumber ?? ''))
const level = computed<number>(() => {
  const l = Number(attrs.value.level ?? 1)
  return Number.isFinite(l) && l >= 1 && l <= 9 ? l : 1
})
const href = computed<string | undefined>(() =>
  typeof attrs.value.href === 'string' ? (attrs.value.href as string) : undefined,
)

function handleClick(event: MouseEvent) {
  const link = href.value
  if (!link || !link.startsWith('#')) return
  event.preventDefault()
  const editorDom = props.editor?.view?.dom as HTMLElement | undefined
  if (!editorDom) return
  const anchor = link.slice(1)
  const target = editorDom.querySelector(
    `[data-bookmark="${CSS.escape(anchor)}"]`,
  ) as HTMLElement | null
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
</script>

<style scoped lang="scss">
.toc-entry {
  display: flex;
  align-items: baseline;
  cursor: pointer;
  line-height: 1.8;
  padding: 0 0 2px 0;

  &--level-1 { padding-left: 0; font-weight: 500; }
  &--level-2 { padding-left: 20px; }
  &--level-3 { padding-left: 40px; }
  &--level-4 { padding-left: 60px; }
  &--level-5 { padding-left: 80px; }
  &--level-6 { padding-left: 100px; }
  &--level-7 { padding-left: 120px; }
  &--level-8 { padding-left: 140px; }
  &--level-9 { padding-left: 160px; }

  &:hover .toc-entry__text {
    color: var(--el-color-primary, #409eff);
  }
}

.toc-entry__text {
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 80px);
}

.toc-entry__leader {
  flex: 1;
  border-bottom: 1px dotted currentColor;
  margin: 0 6px;
  min-width: 20px;
  opacity: 0.5;
  align-self: flex-end;
  transform: translateY(-4px);
}

.toc-entry__page {
  flex-shrink: 0;
  min-width: 24px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
