# 🎨 设计亮点展示

## 页面主题色系统

每个页面都有独特的视觉识别，通过渐变色和图标让用户快速定位功能：

### 🧠 BudgetPage - 紫色系 (智能、专业)
```
渐变: #667eea → #764ba2
风格: 步骤引导式，渐进完成复杂任务
图标: 🎯 目标、📅 时间、⏰ 班次、📊 结果
```

### ⚙️ ParamPage - 多彩卡片系统
```
主题: 白色背景 + 彩色分类卡片
布局: 左侧列表 + 右侧编辑 (双栏)
图标: 💼 业务、🎯 漏斗、⚡ 效能、🔥 爆发、🎉 大促、⏰ 偏移
```

### ⏰ ShiftPage - 粉红系 (活力、时间)
```
渐变: #f093fb → #f5576c
风格: 卡片网格展示，统计概览
图标: 🌅 早班、☀️ 中班、🌙 晚班、🌍 全天
```

### 🔥 PromotionPage - 黄粉系 (热情、营销)
```
渐变: #fa709a → #fee140
风格: 级别徽章 + 3列卡片
图标: 💥 S级、🚀 A级、🎪 B级、📦 C级
```

### 📊 ReportPage - 青绿系 (清新、历史)
```
渐变: #a8edea → #fed6e3
风格: 垂直时间线
图标: 📊 统计、🕐 时间线、📋 详情
```

---

## 交互设计模式

### 1. 步骤引导模式 (BudgetPage)
```
[进度条 75%完成]
━━━━━━━━━━━━━━━━━━━━━━━━━━

● 目标设定 → ● 时间规划 → ● 班次配置 → ○ 查看结果
  (已完成)     (已完成)     (进行中)      (待完成)

[< 上一步]  [开始测算 >]
```

**优势**:
- 降低认知负担，一次只关注一个任务
- 进度可视化，增强掌控感
- 每步独立验证，减少错误

### 2. 主从面板模式 (ParamPage)
```
┌─────────────┬──────────────────────────┐
│  方案列表   │    参数配置面板           │
│             │                          │
│ ▶ 默认方案  │  💼 基础业务参数          │
│   方案A     │  ├─ 平均客单价 [====] 160│
│   方案B     │  ├─ 日均访客数 [====] 3800│
│             │  └─ 峰值系数   [==] 1.2  │
│ [+ 新建]    │                          │
│             │  🎯 转化漏斗              │
└─────────────┴──────────────────────────┘
```

**优势**:
- 左侧管理，右侧编辑，符合认知习惯
- 方案切换无需离开页面
- 实时保存，不丢失修改

### 3. 卡片网格模式 (ShiftPage, PromotionPage)
```
┌─────────┐ ┌─────────┐ ┌─────────┐
│ 🌅      │ │ ☀️      │ │ 🌙      │
│ 早班A组 │ │ 中班B组 │ │ 晚班C组 │
│ 8小时   │ │ 8小时   │ │ 8小时   │
│ [编辑]  │ │ [编辑]  │ │ [编辑]  │
└─────────┘ └─────────┘ └─────────┘
```

**优势**:
- 一屏展示更多信息
- 视觉扫描效率高
- 卡片独立，操作清晰

### 4. 时间线模式 (ReportPage)
```
  │
  ●─── 📊 双11大促测算 (今天)
  │    需求编制: 120人
  │    [查看] [删除]
  │
  ●─── 📊 日常方案 (3天前)
  │    需求编制: 80人
  │    [查看] [删除]
  │
  ○─── 📊 年中大促 (7天前)
       需求编制: 150人
       [查看] [删除]
```

**优势**:
- 时间维度一目了然
- 最近记录高亮显示
- 支持快速对比

---

## 色彩语义系统

### 功能色
- 🔵 **蓝色 (#165DFF)**: 主要操作、链接、正常状态
- 🟢 **绿色 (#00b42a)**: 成功、安全、确认
- 🔴 **红色 (#f53f3f)**: 危险、删除、警告
- 🟠 **橙色 (#ff7d00)**: 提醒、待处理、重要
- 🟣 **紫色 (#722ed1)**: 高级功能、VIP、特殊

### 状态色
- ⚪ **灰色**: 禁用、不可用、次要信息
- 🟡 **黄色**: 进行中、草稿、待完成
- 🔵 **亮蓝**: 已选中、激活、焦点

### 级别色 (PromotionPage)
- 🔴 **#ff4757**: S级大促 (2.5x+)
- 🟠 **#ff6348**: A级活动 (1.8-2.5x)
- 🟡 **#ffa502**: B级活动 (1.3-1.8x)
- ⚫ **#747d8c**: C级日常 (1.0-1.3x)

---

## 组件设计规范

### 按钮尺寸
```typescript
// 大号按钮 - 主要操作
<Button size='large' style={{ height: 48, fontSize: 16 }}>
  开始测算
</Button>

// 标准按钮 - 次要操作
<Button size='large'>保存</Button>

// 小号按钮 - 表格内操作
<Button size='small'>编辑</Button>
```

### 卡片圆角
```typescript
// 页面主卡片
borderRadius: 16

// 功能卡片
borderRadius: 12

// 内嵌卡片
borderRadius: 8
```

### 间距系统
```typescript
// 页面外边距
padding: '32px' (p-8)

// 卡片间距
gap: '24px' (gap-6)

// 元素间距
Space size='large'  // 16px
Space size='medium' // 12px
Space size='small'  // 8px
```

### 阴影层次
```typescript
// 浮起效果
boxShadow: '0 2px 8px rgba(0,0,0,0.08)'

// 悬停效果
boxShadow: '0 4px 12px rgba(0,0,0,0.1)'

// 强调效果
boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
```

---

## 动效设计 (CSS Transitions)

### 卡片悬停
```css
transition: all 0.3s ease;

hover:
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
```

### 按钮交互
```css
transition: all 0.2s ease;

hover:
  opacity: 0.9;
  transform: scale(1.02);
```

### 模态框
```css
/* Arco Design 内置动画 */
fadeIn + scaleUp
```

---

## 响应式设计

### 网格布局
```typescript
// 2列布局
className='grid grid-cols-2 gap-6'

// 3列布局
className='grid grid-cols-3 gap-6'

// 4列布局
className='grid grid-cols-4 gap-4'
```

### 断点系统 (Tailwind)
```
sm:  640px  (移动端横屏)
md:  768px  (平板)
lg:  1024px (笔记本)
xl:  1280px (桌面)
2xl: 1536px (大屏)
```

---

## 无障碍设计 (Accessibility)

### 键盘导航
- ✅ 所有按钮可 Tab 聚焦
- ✅ 模态框支持 Esc 关闭
- ✅ 表单支持 Enter 提交

### 语义化标签
- ✅ Button 替代 div + onClick
- ✅ Form 正确的 label 关联
- ✅ Modal title 属性

### 颜色对比
- ✅ 文字与背景对比度 ≥ 4.5:1
- ✅ 禁用状态明显区分
- ✅ 链接有下划线或其他标识

---

## 性能优化

### 代码分割
```typescript
// 按路由懒加载
const BudgetPage = lazy(() => import('./pages/BudgetPage'))
```

### 状态管理
```typescript
// 避免不必要的重渲染
const memoizedValue = useMemo(() => calculate(), [deps])
const callback = useCallback(() => {}, [deps])
```

### 图片优化
- 使用 Emoji 代替图片图标 (零请求)
- SVG 图标内联使用
- 懒加载非首屏内容

---

## 开发体验

### 代码组织
```
src/
├── pages/          # 页面组件
├── components/     # 通用组件
├── utils/          # 工具函数
├── types/          # 类型定义
└── assets/         # 静态资源
```

### 类型安全
```typescript
// 全局类型定义
declare global {
  interface Window {
    api: {
      calculateManpower: (data: CalcData) => Promise<Result>;
    }
  }
}
```

### 开发工具
- TypeScript: 类型检查
- ESLint: 代码规范
- Prettier: 代码格式化
- Vite: 快速热更新

---

**设计系统版本**: v1.0
**更新日期**: 2026-06-02
**设计师**: AI Agent + User Feedback
