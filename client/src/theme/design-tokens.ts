/**
 * 设计令牌 - 全局设计变量
 * 定义颜色、间距、字体等基础设计元素
 */

export const designTokens = {
  // 颜色系统
  colors: {
    // 主色调
    primary: '#165DFF',
    primaryHover: '#4080FF',
    primaryActive: '#0E42D2',
    primaryLight1: '#E8F3FF',
    primaryLight2: '#BEDAFF',

    // 功能色
    success: '#00B42A',
    successLight: '#AFF0B5',
    warning: '#FF7D00',
    warningLight: '#FFCF8B',
    danger: '#F53F3F',
    dangerLight: '#FDCDC5',
    info: '#165DFF',
    infoLight: '#BEDAFF',

    // 中性色
    gray1: '#F7F8FA',
    gray2: '#F2F3F5',
    gray3: '#E5E6EB',
    gray4: '#C9CDD4',
    gray5: '#A9AEB8',
    gray6: '#86909C',
    gray7: '#6B7785',
    gray8: '#4E5969',
    gray9: '#272E3B',
    gray10: '#1D2129',

    // 纯色
    white: '#FFFFFF',
    black: '#000000',
  },

  // 间距系统（8px 栅格）
  spacing: {
    mini: 4,      // 0.25rem
    small: 8,     // 0.5rem
    medium: 16,   // 1rem
    large: 24,    // 1.5rem
    xlarge: 32,   // 2rem
    xxlarge: 48,  // 3rem
  },

  // 圆角系统
  radius: {
    small: 2,
    medium: 4,
    large: 8,
    xlarge: 16,
    circle: '50%',
  },

  // 阴影系统
  shadow: {
    light: '0 1px 4px rgba(0, 0, 0, 0.08)',
    medium: '0 2px 8px rgba(0, 0, 0, 0.10)',
    heavy: '0 4px 16px rgba(0, 0, 0, 0.12)',
    strong: '0 8px 24px rgba(0, 0, 0, 0.15)',
  },

  // 字体系统
  typography: {
    fontSize: {
      mini: 12,
      small: 13,
      body: 14,
      title: 16,
      large: 20,
      xlarge: 24,
      xxlarge: 28,
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      dense: 1.3,
      normal: 1.5,
      loose: 1.8,
    },
  },

  // 过渡动画
  transition: {
    fast: '0.1s',
    normal: '0.2s',
    slow: '0.3s',
  },

  // 层级系统
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

export type DesignTokens = typeof designTokens;
