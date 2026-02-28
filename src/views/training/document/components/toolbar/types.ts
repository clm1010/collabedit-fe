export interface ToolbarButtonProps {
  icon?: string
  label?: string
  title?: string
  active?: boolean
  disabled?: boolean
  showLabel?: boolean
}

export interface DropdownOption {
  label: string
  value: string | number
  icon?: string
  disabled?: boolean
}

// 字体选项 - 参考 https://tiptap.dev/docs/editor/extensions/functionality/fontfamily
export const fontFamilyOptions: DropdownOption[] = [
  {
    label: '方正大标宋简体',
    value: 'FZDaBiaoSong-B06S, "方正大标宋简体", SimSun, serif'
  },
  { label: '方正舒体', value: 'FZShuTi-S05S, "方正舒体", KaiTi, serif' },
  { label: '方正小标宋简体', value: 'FZXiaoBiaoSong-B05S, "方正小标宋简体", SimSun, serif' },
  { label: '方正姚体', value: 'FZYaoTi, "方正姚体", KaiTi, serif' },
  { label: '仿宋', value: 'FangSong, serif' },
  { label: '仿宋-GB2312', value: 'FangSong_GB2312, FangSong, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '华文彩云', value: 'STCaiyun, "华文彩云", cursive' },
  { label: '华文仿宋', value: 'STFangsong, "华文仿宋", FangSong, serif' },
  { label: '华文细黑', value: 'STXihei, "华文细黑", "Microsoft YaHei", sans-serif' },
  { label: '华文楷体', value: 'STKaiti, "华文楷体", KaiTi, serif' },
  { label: '华文宋体', value: 'STSong, "华文宋体", SimSun, serif' },
  { label: '华文琥珀', value: 'STHupo, "华文琥珀", cursive' },
  { label: '华文新魏', value: 'STXinwei, "华文新魏", serif' },
  { label: '华文行楷', value: 'STXingkai, "华文行楷", KaiTi, serif' },
  { label: '华文中宋', value: 'STZhongsong, "华文中宋", SimSun, serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '楷体-GB2312', value: 'KaiTi_GB2312, KaiTi, serif' },
  { label: '隶书', value: 'LiSu, serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
  {
    label: '微软雅黑 Light',
    value: '"Microsoft YaHei Light", "Microsoft YaHei", "微软雅黑", sans-serif'
  },
  {
    label: '文泉驿等宽微米黑',
    value: '"WenQuanYi Zen Hei Mono", "文泉驿等宽微米黑", "Microsoft YaHei", sans-serif'
  },
  {
    label: '文泉驿微米黑',
    value: '"WenQuanYi Micro Hei", "文泉驿微米黑", "Microsoft YaHei", sans-serif'
  },
  { label: '新宋体', value: 'NSimSun, "新宋体", SimSun, serif' }
]

// 字号选项 - 使用 px 单位，参考 https://tiptap.dev/docs/editor/extensions/functionality/fontsize
// 中文字号与px对应关系（1pt≈1.33px，按 Word 下拉顺序）:
// 字号选项 - 使用 label 作为唯一标识符 (value)，避免重复值导致下拉框多选高亮
// 初号=42pt=56px, 小初=36pt=48px, 一号=26pt≈34.7px, 小一=24pt=32px
// 二号=22pt≈29.3px, 小二=18pt=24px, 三号=16pt≈21.3px, 小三=15pt=20px
// 四号=14pt≈18.7px, 小四=12pt=16px, 五号=10.5pt=14px, 小五=9pt=12px
// 六号=7.5pt=10px, 小六=6.5pt≈8.7px, 七号=5.5pt≈7.3px, 八号=5pt≈6.7px
export const fontSizeOptions: DropdownOption[] = [
  { label: '初号', value: '初号' },
  { label: '小初', value: '小初' },
  { label: '一号', value: '一号' },
  { label: '小一', value: '小一' },
  { label: '二号', value: '二号' },
  { label: '小二', value: '小二' },
  { label: '三号', value: '三号' },
  { label: '小三', value: '小三' },
  { label: '四号', value: '四号' },
  { label: '小四', value: '小四' },
  { label: '五号', value: '五号' },
  { label: '小五', value: '小五' },
  { label: '六号', value: '六号' },
  { label: '小六', value: '小六' },
  { label: '七号', value: '七号' },
  { label: '八号', value: '八号' },
  { label: '5', value: '5' },
  { label: '5.5', value: '5.5' },
  { label: '6.5', value: '6.5' },
  { label: '7.5', value: '7.5' },
  { label: '8', value: '8' },
  { label: '9', value: '9' },
  { label: '10', value: '10' },
  { label: '10.5', value: '10.5' },
  { label: '11', value: '11' },
  { label: '12', value: '12' },
  { label: '13.5', value: '13.5' },
  { label: '14', value: '14' },
  { label: '14.5', value: '14.5' },
  { label: '16', value: '16' },
  { label: '18', value: '18' },
  { label: '20', value: '20' },
  { label: '22', value: '22' },
  { label: '24', value: '24' },
  { label: '26', value: '26' },
  { label: '28', value: '28' },
  { label: '36', value: '36' },
  { label: '48', value: '48' },
  { label: '72', value: '72' }
]

// 字号 label 到 px 值的映射表
export const fontSizeLabelToPx: Record<string, string> = {
  初号: '56px',
  小初: '48px',
  一号: '35px',
  小一: '32px',
  二号: '29px',
  小二: '24px',
  三号: '21px',
  小三: '20px',
  四号: '19px',
  小四: '16px',
  五号: '14px',
  小五: '12px',
  六号: '10px',
  小六: '8.7px',
  七号: '7.3px',
  八号: '6.7px',
  '5': '6.7px',
  '5.5': '7.3px',
  '6.5': '8.7px',
  '7.5': '10px',
  '8': '10.6px',
  '9': '12px',
  '10': '13.3px',
  '10.5': '14px',
  '11': '14.7px',
  '12': '16px',
  '13.5': '18px',
  '14': '18.7px',
  '14.5': '19.3px',
  '16': '21.3px',
  '18': '24px',
  '20': '26.7px',
  '22': '29.3px',
  '24': '32px',
  '26': '34.7px',
  '28': '37.3px',
  '36': '48px',
  '48': '64px',
  '72': '96px'
}

// px 值到字号 label 的反向映射（用于从文档读取时匹配）
// 标准字号优先用中文名称，非标准字号使用数字标签
export const fontSizePxToLabel: Record<string, string> = {
  // 中文字号
  '6.7px': '八号', // 5pt
  '7.3px': '七号', // 5.5pt
  '8.7px': '小六', // 6.5pt
  '10px': '六号', // 7.5pt
  '12px': '小五', // 9pt
  '14px': '五号', // 10.5pt
  '16px': '小四', // 12pt
  '18.7px': '四号', // 14pt
  '20px': '小三', // 15pt
  '21.3px': '三号', // 16pt
  '24px': '小二', // 18pt
  '29.3px': '二号', // 22pt
  '32px': '小一', // 24pt
  '35px': '一号', // 26pt
  '48px': '小初', // 36pt
  '56px': '初号', // 42pt
  // 数字字号（非标准或更细粒度）
  '7px': '5', // 近似
  '9px': '6.5', // 近似
  '10.6px': '8', // 8pt
  '11px': '8', // 近似
  '13px': '10', // 近似
  '13.3px': '10', // 10pt
  '14.7px': '11', // 11pt
  '15px': '11', // 近似
  '17px': '13.5', // 近似
  '17.9px': '13.5', // 13.5pt 精确
  '18px': '13.5', // 13.5pt
  '18.6px': '14', // 14pt 近似
  '19px': '14', // 近似
  '19.3px': '14.5', // 14.5pt
  '21px': '16', // 近似
  '22px': '16', // 近似
  '25px': '18', // 近似
  '26px': '20', // 近似
  '26.7px': '20', // 20pt
  '27px': '20', // 近似
  '29px': '22', // 近似
  '30px': '22', // 近似
  '33px': '24', // 近似
  '34.7px': '26', // 26pt
  '36px': '28', // 近似
  '37px': '28', // 近似
  '37.3px': '28', // 28pt
  '64px': '48', // 48pt
  '72px': '72', // 近似
  '96px': '72' // 72pt
}

export const lineHeightOptions: DropdownOption[] = [
  { label: '默认', value: '' },
  { label: '1', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: '3', value: '3' }
]

export const presetColors = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#B7B7B7',
  '#CCCCCC',
  '#D9D9D9',
  '#EFEFEF',
  '#F3F3F3',
  '#FFFFFF',
  '#980000',
  '#FF0000',
  '#FF9900',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#4A86E8',
  '#0000FF',
  '#9900FF',
  '#FF00FF',
  '#E6B8AF',
  '#F4CCCC',
  '#FCE5CD',
  '#FFF2CC',
  '#D9EAD3',
  '#D0E0E3',
  '#C9DAF8',
  '#CFE2F3',
  '#D9D2E9',
  '#EAD1DC',
  '#DD7E6B',
  '#EA9999',
  '#F9CB9C',
  '#FFE599',
  '#B6D7A8',
  '#A2C4C9',
  '#A4C2F4',
  '#9FC5E8',
  '#B4A7D6',
  '#D5A6BD',
  '#CC4125',
  '#E06666',
  '#F6B26B',
  '#FFD966',
  '#93C47D',
  '#76A5AF',
  '#6D9EEB',
  '#6FA8DC',
  '#8E7CC3',
  '#C27BA0',
  '#A61C00',
  '#CC0000',
  '#E69138',
  '#F1C232',
  '#6AA84F',
  '#45818E',
  '#3C78D8',
  '#3D85C6',
  '#674EA7',
  '#A64D79',
  '#85200C',
  '#990000',
  '#B45F06',
  '#BF9000',
  '#38761D',
  '#134F5C',
  '#1155CC',
  '#0B5394',
  '#351C75',
  '#741B47',
  '#5B0F00',
  '#660000',
  '#783F04',
  '#7F6000',
  '#274E13',
  '#0C343D',
  '#1C4587',
  '#073763',
  '#20124D',
  '#4C1130'
]

export const specialCharacters: Record<string, string[]> = {
  标点符号: [
    '、',
    '。',
    '·',
    '—',
    '～',
    '‖',
    '…',
    '〔',
    '〕',
    '〈',
    '〉',
    '《',
    '》',
    '「',
    '」',
    '『',
    '』',
    '〖',
    '〗',
    '【',
    '】',
    '±',
    '×',
    '÷',
    '∶',
    '∧',
    '∨',
    '∑',
    '∏',
    '∪',
    '∩',
    '∈',
    '∷',
    '√',
    '⊥',
    '∥',
    '∠',
    '⌒',
    '⊙',
    '∫',
    '∮',
    '≡',
    '≌',
    '≈',
    '∽',
    '∝',
    '≠',
    '≮',
    '≯',
    '≤',
    '≥',
    '∞',
    '∵',
    '∴'
  ],
  数字序号: [
    '①',
    '②',
    '③',
    '④',
    '⑤',
    '⑥',
    '⑦',
    '⑧',
    '⑨',
    '⑩',
    '⑪',
    '⑫',
    '⑬',
    '⑭',
    '⑮',
    '⑯',
    '⑰',
    '⑱',
    '⑲',
    '⑳',
    'Ⅰ',
    'Ⅱ',
    'Ⅲ',
    'Ⅳ',
    'Ⅴ',
    'Ⅵ',
    'Ⅶ',
    'Ⅷ',
    'Ⅸ',
    'Ⅹ',
    'Ⅺ',
    'Ⅻ',
    'ⅰ',
    'ⅱ',
    'ⅲ',
    'ⅳ',
    'ⅴ',
    'ⅵ',
    'ⅶ',
    'ⅷ',
    'ⅸ',
    'ⅹ'
  ],
  希腊字母: [
    'Α',
    'Β',
    'Γ',
    'Δ',
    'Ε',
    'Ζ',
    'Η',
    'Θ',
    'Ι',
    'Κ',
    'Λ',
    'Μ',
    'Ν',
    'Ξ',
    'Ο',
    'Π',
    'Ρ',
    'Σ',
    'Τ',
    'Υ',
    'Φ',
    'Χ',
    'Ψ',
    'Ω',
    'α',
    'β',
    'γ',
    'δ',
    'ε',
    'ζ',
    'η',
    'θ',
    'ι',
    'κ',
    'λ',
    'μ',
    'ν',
    'ξ',
    'ο',
    'π',
    'ρ',
    'σ',
    'τ',
    'υ',
    'φ',
    'χ',
    'ψ',
    'ω'
  ],
  单位符号: [
    '㎎',
    '㎏',
    '㎜',
    '㎝',
    '㎞',
    '㎡',
    '㏄',
    '㏎',
    '㏑',
    '㏒',
    '㏕',
    '℃',
    '℉',
    '°',
    '$',
    '￥',
    '￠',
    '￡',
    '‰',
    '§',
    '№',
    '☆',
    '★',
    '○',
    '●',
    '◎',
    '◇',
    '◆',
    '□',
    '■',
    '△',
    '▲',
    '※',
    '→',
    '←',
    '↑',
    '↓',
    '〓'
  ]
}

export const emojiCategories = {
  常用: [
    '😀',
    '😃',
    '😄',
    '😁',
    '😆',
    '😅',
    '🤣',
    '😂',
    '🙂',
    '🙃',
    '😉',
    '😊',
    '😇',
    '🥰',
    '😍',
    '🤩',
    '😘',
    '😗',
    '☺️',
    '😚',
    '😙',
    '🥲',
    '😋',
    '😛',
    '😜',
    '🤪',
    '😝',
    '🤑',
    '🤗',
    '🤭',
    '🤫',
    '🤔'
  ],
  手势: [
    '👍',
    '👎',
    '👌',
    '🤌',
    '🤏',
    '✌️',
    '🤞',
    '🤟',
    '🤘',
    '🤙',
    '👈',
    '👉',
    '👆',
    '🖕',
    '👇',
    '☝️',
    '👋',
    '🤚',
    '🖐️',
    '✋',
    '🖖',
    '👏',
    '🙌',
    '🤲',
    '🤝',
    '🙏'
  ],
  表情: [
    '😐',
    '😑',
    '😶',
    '😏',
    '😒',
    '🙄',
    '😬',
    '🤥',
    '😌',
    '😔',
    '😪',
    '🤤',
    '😴',
    '😷',
    '🤒',
    '🤕',
    '🤢',
    '🤮',
    '🤧',
    '🥵',
    '🥶',
    '🥴',
    '😵',
    '🤯',
    '😎',
    '🥳',
    '😲',
    '😨',
    '😰',
    '😥',
    '😢',
    '😭',
    '😱',
    '😖',
    '😣',
    '😞',
    '😓',
    '😩',
    '😫',
    '🥱',
    '😤',
    '😡',
    '😠',
    '🤬'
  ]
}

export const tableAlignOptions: DropdownOption[] = [
  { label: '左对齐', value: 'left', icon: 'mdi:format-align-left' },
  { label: '居中', value: 'center', icon: 'mdi:format-align-center' },
  { label: '右对齐', value: 'right', icon: 'mdi:format-align-right' }
]

export const templateList = [
  { id: 'blank', name: '空白文档', description: '创建一个新的空白文档' },
  { id: 'report', name: '工作报告', description: '标准工作报告模板' },
  { id: 'meeting', name: '会议纪要', description: '会议记录模板' },
  { id: 'contract', name: '合同模板', description: '标准合同模板' },
  { id: 'resume', name: '简历模板', description: '个人简历模板' }
]

export const EditorKey = Symbol('Editor')
