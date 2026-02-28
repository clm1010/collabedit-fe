<template>
  <el-popover
    placement="bottom"
    :width="showAdvanced ? 600 : 300"
    trigger="click"
    :show-arrow="false"
    popper-class="color-picker-popover"
    @show="handlePopoverShow"
  >
    <template #reference>
      <button class="color-btn" :class="{ active }" :title="title">
        <div class="color-indicator">
          <Icon :icon="icon" class="color-icon" />
          <div class="color-bar" :style="{ backgroundColor: modelValue || '#000000' }"></div>
        </div>
        <Icon icon="ep:arrow-down" class="dropdown-arrow" />
      </button>
    </template>
    <div class="color-picker-content">
      <div class="color-main">
        <div class="color-section">
          <div class="section-title">默认颜色</div>
          <div class="color-grid default-colors">
            <button
              v-for="(color, index) in defaultColors"
              :key="index"
              class="color-item"
              :class="{ active: modelValue === color, transparent: color === 'transparent' }"
              :style="{ backgroundColor: color === 'transparent' ? '#fff' : color }"
              :title="color === 'transparent' ? '透明' : color"
              @click="handleColorSelect(color)"
            >
              <Icon v-if="modelValue === color" icon="ep:check" class="check-icon" />
              <span v-if="color === 'transparent'" class="transparent-line"></span>
            </button>
          </div>
        </div>

        <div class="color-section">
          <div class="section-title">标准色</div>
          <div class="color-grid standard-colors">
            <button
              v-for="color in standardColors"
              :key="color"
              class="color-item"
              :class="{ active: modelValue === color }"
              :style="{ backgroundColor: color }"
              :title="color"
              @click="handleColorSelect(color)"
            >
              <Icon v-if="modelValue === color" icon="ep:check" class="check-icon" />
            </button>
          </div>
        </div>

        <div class="more-colors" @click="toggleAdvanced">
          <Icon icon="mdi:palette" class="palette-icon" />
          <span>更多颜色</span>
          <Icon :icon="showAdvanced ? 'ep:arrow-left' : 'ep:arrow-right'" class="arrow-icon" />
        </div>

        <div v-if="showClear" class="clear-color" @click="handleColorSelect('')">
          <Icon icon="mdi:format-color-marker-cancel" />
          <span>清除颜色</span>
        </div>
      </div>

      <transition name="slide-right">
        <div v-if="showAdvanced" class="color-advanced">
          <div class="advanced-header">
            <span>自定义颜色</span>
          </div>

          <div class="color-picker-area">
            <div
              ref="saturationArea"
              class="saturation-area"
              :style="{ backgroundColor: `hsl(${hue}, 100%, 50%)` }"
              @mousedown="startSaturationDrag"
            >
              <div class="saturation-white"></div>
              <div class="saturation-black"></div>
              <div
                class="saturation-cursor"
                :style="{ left: saturation + '%', top: 100 - lightness * 2 + '%' }"
              ></div>
            </div>

            <div ref="hueBar" class="hue-bar" @mousedown="startHueDrag">
              <div class="hue-cursor" :style="{ left: (hue / 360) * 100 + '%' }"></div>
            </div>
          </div>

          <div class="color-preview-row">
            <div class="preview-box">
              <div class="preview-new" :style="{ backgroundColor: customColor }"></div>
              <div class="preview-current" :style="{ backgroundColor: modelValue || '#000' }"></div>
            </div>
            <div class="color-inputs">
              <div class="input-group mode-select" @click.stop>
                <el-select v-model="colorMode" size="small" style="width: 80px" :teleported="false">
                  <el-option label="HEX" value="hex" />
                  <el-option label="RGB" value="rgb" />
                  <el-option label="HSL" value="hsl" />
                  <el-option label="HSV" value="hsv" />
                  <el-option label="CMYK" value="cmyk" />
                </el-select>
              </div>
              <template v-if="colorMode === 'hex'">
                <div class="input-group hex-input">
                  <el-input v-model="hexInput" size="small" @change="updateFromHex" />
                </div>
              </template>
              <template v-else-if="colorMode === 'rgb'">
                <div class="input-group num-input">
                  <el-input-number
                    v-model="rgb.r"
                    :min="0"
                    :max="255"
                    :controls="false"
                    size="small"
                    @change="updateFromRgb"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="rgb.g"
                    :min="0"
                    :max="255"
                    :controls="false"
                    size="small"
                    @change="updateFromRgb"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="rgb.b"
                    :min="0"
                    :max="255"
                    :controls="false"
                    size="small"
                    @change="updateFromRgb"
                  />
                </div>
              </template>
              <template v-else-if="colorMode === 'hsl'">
                <div class="input-group num-input">
                  <el-input-number
                    v-model="hsl.h"
                    :min="0"
                    :max="360"
                    :controls="false"
                    size="small"
                    @change="updateFromHsl"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="hsl.s"
                    :min="0"
                    :max="100"
                    :controls="false"
                    size="small"
                    @change="updateFromHsl"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="hsl.l"
                    :min="0"
                    :max="100"
                    :controls="false"
                    size="small"
                    @change="updateFromHsl"
                  />
                </div>
              </template>
              <template v-else-if="colorMode === 'hsv'">
                <div class="input-group num-input">
                  <el-input-number
                    v-model="hsv.h"
                    :min="0"
                    :max="360"
                    :controls="false"
                    size="small"
                    @change="updateFromHsv"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="hsv.s"
                    :min="0"
                    :max="100"
                    :controls="false"
                    size="small"
                    @change="updateFromHsv"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="hsv.v"
                    :min="0"
                    :max="100"
                    :controls="false"
                    size="small"
                    @change="updateFromHsv"
                  />
                </div>
              </template>
              <template v-else-if="colorMode === 'cmyk'">
                <div class="input-group num-input">
                  <el-input-number
                    v-model="cmyk.c"
                    :min="0"
                    :max="100"
                    :controls="false"
                    size="small"
                    @change="updateFromCmyk"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="cmyk.m"
                    :min="0"
                    :max="100"
                    :controls="false"
                    size="small"
                    @change="updateFromCmyk"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="cmyk.y"
                    :min="0"
                    :max="100"
                    :controls="false"
                    size="small"
                    @change="updateFromCmyk"
                  />
                </div>
                <div class="input-group num-input">
                  <el-input-number
                    v-model="cmyk.k"
                    :min="0"
                    :max="100"
                    :controls="false"
                    size="small"
                    @change="updateFromCmyk"
                  />
                </div>
              </template>
            </div>
          </div>

          <div class="advanced-footer">
            <el-button size="small" @click="showAdvanced = false">取消</el-button>
            <el-button type="primary" size="small" @click="applyCustomColor">确定</el-button>
          </div>
        </div>
      </transition>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Icon } from '@/components/Icon'

interface Props {
  modelValue: string
  icon: string
  title: string
  active?: boolean
  showClear?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  showClear: true
})

const emit = defineEmits<{
  'update:modelValue': [color: string]
  change: [color: string]
}>()

const defaultColors = [
  // 第一行 - 灰度
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#cccccc',
  '#d9d9d9',
  '#efefef',
  '#f3f3f3',
  '#ffffff',
  // 第二行 - 红橙黄绿蓝紫粉
  '#980000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
  // 第三行 - 浅色系
  '#e6b8af',
  '#f4cccc',
  '#fce5cd',
  '#fff2cc',
  '#d9ead3',
  '#d0e0e3',
  '#c9daf8',
  '#cfe2f3',
  '#d9d2e9',
  '#ead1dc',
  // 第四行
  '#dd7e6b',
  '#ea9999',
  '#f9cb9c',
  '#ffe599',
  '#b6d7a8',
  '#a2c4c9',
  '#a4c2f4',
  '#9fc5e8',
  '#b4a7d6',
  '#d5a6bd',
  // 第五行
  '#cc4125',
  '#e06666',
  '#f6b26b',
  '#ffd966',
  '#93c47d',
  '#76a5af',
  '#6d9eeb',
  '#6fa8dc',
  '#8e7cc3',
  '#c27ba0',
  // 第六行
  '#a61c00',
  '#cc0000',
  '#e69138',
  '#f1c232',
  '#6aa84f',
  '#45818e',
  '#3c78d8',
  '#3d85c6',
  '#674ea7',
  '#a64d79',
  // 第七行 - 深色系
  '#85200c',
  '#990000',
  '#b45f06',
  '#bf9000',
  '#38761d',
  '#134f5c',
  '#1155cc',
  '#0b5394',
  '#351c75',
  '#741b47'
]

const standardColors = [
  '#c00000',
  '#ff0000',
  '#ffc000',
  '#ffff00',
  '#92d050',
  '#00b050',
  '#00b0f0',
  '#0070c0',
  '#002060',
  '#7030a0'
]

const showAdvanced = ref(false)
const colorMode = ref<'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk'>('rgb')
const hue = ref(0)
const saturation = ref(100)
const lightness = ref(50)
const hexInput = ref('#000000')
const rgb = reactive({ r: 0, g: 0, b: 0 })
const hsl = reactive({ h: 0, s: 100, l: 50 })
const hsv = reactive({ h: 0, s: 100, v: 100 })
const cmyk = reactive({ c: 0, m: 0, y: 0, k: 0 })

const saturationArea = ref<HTMLElement | null>(null)
const hueBar = ref<HTMLElement | null>(null)
let isDraggingSaturation = false
let isDraggingHue = false

const customColor = computed(() => {
  return hslToHex(hue.value, saturation.value, lightness.value)
})

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  const v = max
  const d = max - min
  const s = max === 0 ? 0 : d / max

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) }
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  v /= 100
  let r = 0,
    g = 0,
    b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0:
      r = v
      g = t
      b = p
      break
    case 1:
      r = q
      g = v
      b = p
      break
    case 2:
      r = p
      g = v
      b = t
      break
    case 3:
      r = p
      g = q
      b = v
      break
    case 4:
      r = t
      g = p
      b = v
      break
    case 5:
      r = v
      g = p
      b = q
      break
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

function rgbToCmyk(
  r: number,
  g: number,
  b: number
): { c: number; m: number; y: number; k: number } {
  r /= 255
  g /= 255
  b /= 255
  const k = 1 - Math.max(r, g, b)
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }
  const c = (1 - r - k) / (1 - k)
  const m = (1 - g - k) / (1 - k)
  const y = (1 - b - k) / (1 - k)
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  }
}

function cmykToRgb(
  c: number,
  m: number,
  y: number,
  k: number
): { r: number; g: number; b: number } {
  c /= 100
  m /= 100
  y /= 100
  k /= 100
  const r = 255 * (1 - c) * (1 - k)
  const g = 255 * (1 - m) * (1 - k)
  const b = 255 * (1 - y) * (1 - k)
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4))
  }
}

function syncAllColorModes(r: number, g: number, b: number) {
  rgb.r = r
  rgb.g = g
  rgb.b = b

  hexInput.value = rgbToHex(r, g, b)

  const hslVal = rgbToHsl(r, g, b)
  hsl.h = hslVal.h
  hsl.s = hslVal.s
  hsl.l = hslVal.l
  hue.value = hslVal.h
  saturation.value = hslVal.s
  lightness.value = hslVal.l

  const hsvVal = rgbToHsv(r, g, b)
  hsv.h = hsvVal.h
  hsv.s = hsvVal.s
  hsv.v = hsvVal.v

  const cmykVal = rgbToCmyk(r, g, b)
  cmyk.c = cmykVal.c
  cmyk.m = cmykVal.m
  cmyk.y = cmykVal.y
  cmyk.k = cmykVal.k
}

function updateFromRgb() {
  syncAllColorModes(rgb.r, rgb.g, rgb.b)
}

function updateFromHex() {
  const rgbVal = hexToRgb(hexInput.value)
  if (rgbVal) {
    syncAllColorModes(rgbVal.r, rgbVal.g, rgbVal.b)
  }
}

function updateFromHsl() {
  const rgbVal = hslToRgb(hsl.h, hsl.s, hsl.l)
  syncAllColorModes(rgbVal.r, rgbVal.g, rgbVal.b)
}

function updateFromHsv() {
  const rgbVal = hsvToRgb(hsv.h, hsv.s, hsv.v)
  syncAllColorModes(rgbVal.r, rgbVal.g, rgbVal.b)
}

function updateFromCmyk() {
  const rgbVal = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k)
  syncAllColorModes(rgbVal.r, rgbVal.g, rgbVal.b)
}

function updateRgbFromHsl() {
  const hex = hslToHex(hue.value, saturation.value, lightness.value)
  const rgbVal = hexToRgb(hex)
  if (rgbVal) {
    syncAllColorModes(rgbVal.r, rgbVal.g, rgbVal.b)
  }
}

function startSaturationDrag(e: MouseEvent) {
  isDraggingSaturation = true
  updateSaturation(e)
  document.addEventListener('mousemove', handleSaturationMove)
  document.addEventListener('mouseup', stopSaturationDrag)
}

function handleSaturationMove(e: MouseEvent) {
  if (isDraggingSaturation) {
    updateSaturation(e)
  }
}

function updateSaturation(e: MouseEvent) {
  if (!saturationArea.value) return
  const rect = saturationArea.value.getBoundingClientRect()
  let x = ((e.clientX - rect.left) / rect.width) * 100
  let y = ((e.clientY - rect.top) / rect.height) * 100
  x = Math.max(0, Math.min(100, x))
  y = Math.max(0, Math.min(100, y))
  saturation.value = x
  lightness.value = (100 - y) / 2
  updateRgbFromHsl()
}

function stopSaturationDrag() {
  isDraggingSaturation = false
  document.removeEventListener('mousemove', handleSaturationMove)
  document.removeEventListener('mouseup', stopSaturationDrag)
}

function startHueDrag(e: MouseEvent) {
  isDraggingHue = true
  updateHue(e)
  document.addEventListener('mousemove', handleHueMove)
  document.addEventListener('mouseup', stopHueDrag)
}

function handleHueMove(e: MouseEvent) {
  if (isDraggingHue) {
    updateHue(e)
  }
}

function updateHue(e: MouseEvent) {
  if (!hueBar.value) return
  const rect = hueBar.value.getBoundingClientRect()
  let x = ((e.clientX - rect.left) / rect.width) * 360
  x = Math.max(0, Math.min(360, x))
  hue.value = x
  updateRgbFromHsl()
}

function stopHueDrag() {
  isDraggingHue = false
  document.removeEventListener('mousemove', handleHueMove)
  document.removeEventListener('mouseup', stopHueDrag)
}

function handlePopoverShow() {
  if (props.modelValue) {
    const rgbVal = hexToRgb(props.modelValue)
    if (rgbVal) {
      syncAllColorModes(rgbVal.r, rgbVal.g, rgbVal.b)
    }
  }
}

function handleColorSelect(color: string) {
  emit('update:modelValue', color)
  emit('change', color)
}

function toggleAdvanced() {
  showAdvanced.value = !showAdvanced.value
}

function applyCustomColor() {
  handleColorSelect(customColor.value)
  showAdvanced.value = false
}
</script>

<style lang="scss" scoped>
.color-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #e8f0fe;
  }

  &.active {
    background: #d3e3fd;
  }

  .color-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;

    .color-icon {
      font-size: 16px;
      color: #333;
    }

    .color-bar {
      width: 16px;
      height: 3px;
      border-radius: 1px;
    }
  }

  .dropdown-arrow {
    font-size: 10px;
    color: #666;
  }
}

.color-picker-content {
  display: flex;
  gap: 16px;
}

.color-main {
  width: 300px;
}

.color-section {
  margin-bottom: 12px;

  .section-title {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
    font-weight: 500;
  }
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;

  &.standard-colors {
    grid-template-columns: repeat(10, 1fr);
  }
}

.color-item {
  width: 18px;
  height: 18px;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  position: relative;
  padding: 0;
  background: transparent;

  &:hover {
    transform: scale(1.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 1;
  }

  &.active {
    border-color: #1a73e8;
    box-shadow: 0 0 0 1px #1a73e8;
  }

  &.transparent {
    background:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%) !important;
    background-size: 8px 8px;
    background-position:
      0 0,
      0 4px,
      4px -4px,
      -4px 0;

    .transparent-line {
      position: absolute;
      width: 100%;
      height: 2px;
      background: #ff0000;
      transform: rotate(-45deg);
    }
  }

  .check-icon {
    font-size: 10px;
    color: #fff;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }
}

.more-colors {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
  color: #333;
  font-size: 13px;
  border-top: 1px solid #eee;
  margin-top: 8px;

  &:hover {
    color: #1a73e8;
  }

  .palette-icon {
    font-size: 16px;
    background: linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .arrow-icon {
    margin-left: auto;
    font-size: 12px;
  }
}

.clear-color {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
  color: #666;
  font-size: 13px;
  border-top: 1px solid #eee;

  &:hover {
    color: #ff4d4f;
  }
}

.color-advanced {
  width: 340px;
  border-left: 1px solid #eee;
  padding-left: 16px;

  .advanced-header {
    font-size: 12px;
    color: #666;
    margin-bottom: 12px;
    font-weight: 500;
  }
}

.color-picker-area {
  .saturation-area {
    width: 100%;
    height: 150px;
    position: relative;
    cursor: crosshair;
    border-radius: 4px;
    overflow: hidden;

    .saturation-white {
      position: absolute;
      inset: 0;
      background: linear-gradient(to right, #fff, transparent);
    }

    .saturation-black {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent, #000);
    }

    .saturation-cursor {
      position: absolute;
      width: 12px;
      height: 12px;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
  }

  .hue-bar {
    width: 100%;
    height: 12px;
    margin-top: 12px;
    background: linear-gradient(
      to right,
      #f00 0%,
      #ff0 17%,
      #0f0 33%,
      #0ff 50%,
      #00f 67%,
      #f0f 83%,
      #f00 100%
    );
    border-radius: 6px;
    position: relative;
    cursor: pointer;

    .hue-cursor {
      position: absolute;
      top: 50%;
      width: 14px;
      height: 14px;
      background: #fff;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
  }
}

.color-preview-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 12px;

  .preview-box {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;

    .preview-new {
      flex: 1;
    }

    .preview-current {
      flex: 1;
    }
  }

  .color-inputs {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;

    .input-group {
      display: flex;
      align-items: center;
      gap: 2px;

      &.mode-select {
        :deep(.el-select) {
          width: 75px;

          .el-input__inner {
            padding: 0 8px;
          }
        }
      }

      &.num-input {
        :deep(.el-input-number) {
          width: 52px;

          .el-input__wrapper {
            padding: 0 8px;
          }

          .el-input__inner {
            text-align: center;
            padding: 0;
          }
        }
      }

      &.hex-input {
        :deep(.el-input) {
          width: 80px;

          .el-input__inner {
            text-align: center;
          }
        }
      }

      .input-suffix {
        font-size: 12px;
        color: #666;
      }
    }
  }
}

.advanced-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.2s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>

<style lang="scss">
.color-picker-popover {
  padding: 12px !important;
}
</style>
