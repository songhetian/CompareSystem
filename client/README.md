# 客服人力精算系统 - Electron 客户端

## 📌 项目信息

- **版本**: V7.0.0
- **框架**: React + TypeScript + Electron
- **UI 库**: Arco Design
- **构建工具**: Vite + electron-vite

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 📁 项目结构

```
client/
├── src/
│   ├── components/       # 组件
│   │   ├── common/      # 通用组件
│   │   │   ├── PageHeader.tsx    # 页面头部
│   │   │   └── StatsCard.tsx     # 统计卡片
│   │   ├── Charts.tsx            # 图表组件
│   │   ├── DataTable.tsx         # 数据表格
│   │   └── ...
│   ├── pages/           # 页面
│   │   ├── BudgetPage.tsx        # ✅ 测算工作室（已重构）
│   │   ├── HistoryDataPage.tsx   # 历史数据管理
│   │   ├── ShiftPage.tsx         # 排班管理
│   │   ├── PromotionPage.tsx     # 活动规划
│   │   ├── ParamPage.tsx         # 测算模板
│   │   └── ReportPage.tsx        # 历史记录
│   ├── theme/           # 主题配置
│   │   ├── design-tokens.ts      # 设计令牌
│   │   └── global.css            # 全局样式
│   ├── utils/           # 工具函数
│   ├── App.tsx          # ✅ 主应用（已重构）
│   └── main.tsx         # 入口文件
├── electron/            # Electron 主进程
│   ├── index.ts         # 主进程入口
│   ├── db.ts            # 数据库管理
│   └── preload.ts       # 预加载脚本
└── public/              # 静态资源
```

## 🎨 V7.0 Arco Design 重构

### 重构进度

```
✅ Phase 1: 设计系统基础   100%
✅ Phase 2: 主布局重构     100%
🔄 Phase 3: 页面重构       17% (1/6)
⏳ Phase 4: 细节优化       0%
⏳ Phase 5: 测试和文档     0%

总体完成度: 40%
```

### 已完成

- ✅ 设计令牌系统
- ✅ 全局样式规范
- ✅ 通用组件库（PageHeader, StatsCard）
- ✅ 主布局重构（App.tsx）
- ✅ BudgetPage 重构

### 设计系统

#### 颜色规范

```tsx
主色: #165DFF
成功: #00B42A
警告: #FF7D00
危险: #F53F3F
```

#### 间距规范

```tsx
mini:    4px
small:   8px
medium:  16px
large:   24px
xlarge:  32px
xxlarge: 48px
```

#### 使用方式

```tsx
// 使用设计令牌
style={{ padding: 'var(--spacing-large)' }}

// 使用通用组件
import { PageHeader, StatsCard } from '../components/common';

<PageHeader
  title='页面标题'
  subtitle='页面描述'
  icon='🎨'
/>

<StatsCard
  title='总销售额'
  value={12580}
  suffix='万'
  color='#165DFF'
/>
```

## 📚 文档

### 开发文档

- `V7.0_ARCO_REDESIGN_PLAN.md` - 完整重构方案
- `V7.0_REDESIGN_PROGRESS.md` - 重构进度跟踪
- `V7.0_QUICK_START.md` - 快速开始指南
- `V7.0_SETUP_COMPLETE.md` - 基础搭建完成
- `V7.0_REFACTOR_STATUS.md` - 页面重构状态

### 功能文档

- `FEATURE_STATUS.md` - 功能状态总览
- `V6.9_YOY_MOM_ANALYSIS_DESIGN.md` - 同比环比分析设计
- `V6.9_YOY_MOM_IMPLEMENTATION.md` - 同比环比分析实现

## 🛠️ 技术栈

### 核心技术

- **React 18** - UI 框架
- **TypeScript** - 类型系统
- **Electron** - 桌面应用框架
- **Vite** - 构建工具

### UI 组件

- **Arco Design** - 企业级 UI 组件库
- **Chart.js** - 图表库
- **React Chart.js 2** - React 图表封装

### 数据管理

- **Zustand** - 状态管理
- **React Query** - 数据请求
- **Better SQLite3** - 本地数据库

### 工具库

- **Day.js** - 日期处理
- **ExcelJS** - Excel 操作
- **Lodash** - 工具函数

## 🎯 核心功能

### 1. 测算工作室

- 智能人力需求测算
- 多驱动模式（销售额/访客数）
- 活动规划集成
- 班次配置
- Excel 报表导出

### 2. 历史数据管理

- 多项目数据管理
- Excel 导入导出
- 趋势图分析
- 同比/环比分析
- 多项目对比

### 3. 排班管理

- 班次配置
- 时间段设置
- 班次启用/禁用

### 4. 活动规划

- 活动配置
- 日期范围设置
- 活动系数设置

### 5. 测算模板

- 参数方案管理
- 默认方案设置
- 参数配置

### 6. 历史记录

- 测算历史查看
- 结果对比
- 数据追溯

## 🔧 开发指南

### 添加新页面

1. 在 `src/pages/` 创建新页面组件
2. 使用 `PageHeader` 组件作为页面头部
3. 使用设计令牌统一样式
4. 在 `App.tsx` 中注册路由

```tsx
// NewPage.tsx
import { PageHeader } from '../components/common';

export const NewPage = () => {
  return (
    <div className='page-container'>
      <PageHeader
        title='新页面'
        subtitle='页面描述'
      />
      {/* 页面内容 */}
    </div>
  );
};
```

### 使用设计令牌

```tsx
// ✅ 正确
<div style={{
  padding: 'var(--spacing-large)',
  borderRadius: 'var(--radius-large)',
  boxShadow: 'var(--shadow-medium)',
}}>

// ❌ 错误
<div style={{
  padding: '24px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}}>
```

### 组件开发规范

1. 使用 TypeScript 定义类型
2. 使用 Arco Design 组件
3. 遵循设计系统规范
4. 添加必要的注释
5. 保持组件简洁

## 🐛 问题排查

### 常见问题

1. **样式不生效**
   - 确保导入了 `global.css`
   - 检查 CSS 变量名是否正确

2. **组件找不到**
   - 检查导入路径
   - 确认组件已导出

3. **数据库错误**
   - 检查数据库文件路径
   - 确认 API 调用正确

## 📝 更新日志

### V7.0.0 (2026-06-03)

#### 新增

- 🎨 全新 Arco Design 设计系统
- 🎨 统一的视觉风格
- 🧩 通用组件库（PageHeader, StatsCard）
- 🔄 重构主布局（App.tsx）
- ✨ 重构测算工作室页面

#### 改进

- 📦 精简代码结构
- 🚀 提升性能
- 💄 优化 UI/UX
- 📚 完善文档

#### 移除

- 🗑️ 清理过时文档（20+ 个文件）
- 🗑️ 移除冗余代码

### V6.9.0 (2026-06-03)

- ✨ 新增同比/环比数据分析功能
- 📊 智能数据洞察
- 📈 增长率趋势图
- 🎯 业务建议生成

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

私有项目 - 保留所有权利

---

**版本**: V7.0.0
**更新日期**: 2026-06-03
**维护者**: 开发团队

🚀 让我们一起打造最专业的客服人力预算系统！
