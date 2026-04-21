/**
 * 全局 passive 事件补丁
 *
 * 背景：
 * Element Plus 等第三方库在模板中使用 `@touchstart` 等滚动阻塞事件，
 * 但 Vue 的 `patchEvent` 默认不带 `{ passive: true }`，Chrome 会输出
 * "[Violation] Added non-passive event listener to a scroll-blocking
 * 'touchstart' event" 的性能提示。
 *
 * 本补丁对指定的几个事件默认加上 `passive: true`，消除告警的同时
 * 也能提升移动端滚动流畅度。
 *
 * 安全保障：
 *  - 仅针对 `touchstart / touchmove / wheel / mousewheel` 这类
 *    不需要 `preventDefault` 的事件做默认 passive；
 *  - 如果调用方显式传入了 `passive: false`，保留调用方意图，避免
 *    破坏需要阻止默认滚动的业务（如自定义手势、滑块拖拽等）；
 *  - 如果浏览器不支持 passive 选项，直接透传原始参数。
 */

type ListenerOptions = boolean | AddEventListenerOptions | undefined

const PASSIVE_EVENTS = new Set(['touchstart', 'touchmove', 'wheel', 'mousewheel'])

const supportsPassive = (() => {
  let supported = false
  try {
    const options = Object.defineProperty({}, 'passive', {
      get() {
        supported = true
        return true
      }
    })
    const noop = () => {}
    window.addEventListener('__passive_probe__', noop, options)
    window.removeEventListener('__passive_probe__', noop, options)
  } catch {
    supported = false
  }
  return supported
})()

if (supportsPassive && typeof EventTarget !== 'undefined') {
  const originalAddEventListener = EventTarget.prototype.addEventListener

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: ListenerOptions
  ) {
    if (PASSIVE_EVENTS.has(type)) {
      let nextOptions: AddEventListenerOptions
      if (typeof options === 'boolean') {
        nextOptions = { capture: options, passive: true }
      } else if (options && typeof options === 'object') {
        nextOptions = options.passive === undefined ? { ...options, passive: true } : options
      } else {
        nextOptions = { passive: true }
      }
      return originalAddEventListener.call(this, type, listener, nextOptions)
    }
    return originalAddEventListener.call(this, type, listener, options)
  }
}

export {}
