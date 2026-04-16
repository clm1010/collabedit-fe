const namedColorMap: Record<string, string> = {
  yellow: '#FFFF00',
  green: '#00FF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  blue: '#0000FF',
  red: '#FF0000',
  darkblue: '#00008B',
  darkcyan: '#008B8B',
  darkgreen: '#006400',
  darkmagenta: '#8B008B',
  darkred: '#8B0000',
  darkyellow: '#808000',
  darkgray: '#A9A9A9',
  darkgrey: '#A9A9A9',
  lightgray: '#D3D3D3',
  lightgrey: '#D3D3D3',
  black: '#000000',
  white: '#FFFFFF',
  gray: '#808080',
  grey: '#808080',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  navy: '#000080',
  teal: '#008080',
  maroon: '#800000',
  olive: '#808000',
  aqua: '#00FFFF',
  fuchsia: '#FF00FF',
  silver: '#C0C0C0',
  lime: '#00FF00'
}

/**
 * 将各种颜色格式转换为标准 #RRGGBB 格式
 */
export const normalizeColor = (value: string): string => {
  const raw = value.trim()
  if (!raw) return ''

  const lowered = raw.toLowerCase()
  if (lowered === 'auto' || lowered === 'none' || lowered === 'transparent') return ''

  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`

  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toUpperCase()
  }

  if (raw.startsWith('#')) {
    if (raw.length === 4) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase()
    }
    return raw.toUpperCase()
  }

  const rgbMatch = raw.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch
    return (
      '#' +
      [r, g, b]
        .map((v) => parseInt(v, 10).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    )
  }

  const rgbaMatch = raw.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/i)
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch
    return (
      '#' +
      [r, g, b]
        .map((v) => parseInt(v, 10).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    )
  }

  if (namedColorMap[lowered]) {
    return namedColorMap[lowered]
  }

  return raw
}
