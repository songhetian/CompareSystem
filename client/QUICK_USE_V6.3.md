# CompareSystem V6.3 快速使用指南

## 🚀 快速开始

### 安装依赖
```bash
cd client
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建打包
```bash
npm run build
```

### 打包应用
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

---

## 📖 功能速查

### 1. 人力测算 (BudgetPage)

#### 基础流程
1. **设定目标** → 选择模板、输入目标值、选择活动力度
2. **规划时间** → 设置周期、添加高峰日期（**可拖拽排序** 🆕）
3. **配置班次** → 选择要使用的班次
4. **查看结果** → 核心指标、岗位分布、4种图表 🆕

#### 新功能使用

**拖拽排序高峰日期**：
- 点击左侧拖拽图标
- 拖动到目标位置
- 释放完成排序

**查看图表**（4种）：
- 📈 多日趋势 - 折线图
- 📊 24小时分布 - 柱状图
- 🥧 岗位占比 - 饼图 🆕
- 🎯 能力分布 - 雷达图 🆕

**保存和对比**：
- 点击"💾 保存结果"保存当前测算
- 点击"📊 查看历史对比"查看对比表格和趋势
- 最多保存5个结果

**导出报表**：
- 点击"导出报表"按钮
- 自动生成Excel文件（3个Sheet）
  - 测算汇总
  - 每日人力需求
  - 24小时分布

---

### 2. 参数配置 (ParamPage)

#### 创建方案
1. 点击"新建方案"
2. 输入方案名称
3. 设置参数：
   - 基础参数（6个）
   - 客单价
   - 岗位配比
   - 咨询转化率
   - **分时爆发**（只需输入倍数）🆕

#### 管理方案
- 编辑：点击方案卡片的"编辑"按钮
- 删除：点击"删除"按钮
- 设为默认：点击"设为默认"

---

### 3. 排班管理 (ShiftPage)

#### 创建班次
1. 点击"新建班次"
2. 输入班次名称
3. **直接输入开始和结束时间**（HH:mm格式）🆕
4. 系统**自动判断班次类型**（早班/中班/晚班）🆕
5. 自动计算工作时长

#### 班次展示
- 🌅 早班 - 淡蓝色卡片
- ☀️ 中班 - 淡黄色卡片
- 🌙 晚班 - 淡紫色卡片
- ⏰ 其他 - 淡灰色卡片

---

### 4. 活动规划 (PromotionPage)

#### 创建活动
1. 点击"新建活动"
2. 输入活动名称
3. 设置力度系数（如：2.8）
4. 系统自动显示**流量提升百分比**（如：+180%）🆕

#### 活动展示
- 🔥 图标大小：20px 🆕
- 📛 徽章大小：32px 🆕
- 显示倍数和提升百分比

---

### 5. 数据报表 (ReportPage)

#### 查看历史
- 列表展示所有历史测算
- **支持虚拟滚动**（大量数据流畅）🆕
- 点击查看详情
- 支持Excel导出

---

## 🎯 性能优化功能使用

### 1. 虚拟滚动（大列表优化）

**何时使用**：列表数据超过50条

**使用方法**：
```typescript
import { VirtualList } from '@/components/VirtualList';

<VirtualList
  items={data}
  height={600}          // 容器高度
  itemHeight={80}       // 每项高度
  renderItem={(item, index) => (
    <ItemCard item={item} />
  )}
/>
```

**性能提升**：1000条数据从2秒降至60ms

---

### 2. Web Worker（复杂计算）

**何时使用**：计算耗时超过100ms

**使用方法**：
```typescript
import { useCalculatorWorker } from '@/hooks/useCalculatorWorker';

const { calculate } = useCalculatorWorker();

const handleCalculate = async () => {
  const result = await calculate(data);
  setResult(result);
};
```

**优势**：计算期间UI不阻塞，用户体验流畅

---

### 3. 缓存管理（减少API调用）

**何时使用**：数据不常变化，需要重复访问

**使用方法**：
```typescript
import { useCachedData } from '@/utils/cacheManager';

const { data, loading, refetch } = useCachedData({
  key: 'data_key',
  fetcher: () => fetchData(),
  expiresIn: 60 * 60 * 1000  // 1小时
});
```

**优势**：缓存期内0ms响应

---

### 4. 性能监控（开发工具）

**使用方法**：
```typescript
import { performanceMonitor } from '@/utils/performanceMonitor';

// 计时
performanceMonitor.start('operation');
// ... 执行操作
performanceMonitor.end('operation', 'api');

// 查看报告
performanceMonitor.printReport();
```

**开发环境控制台**：
```javascript
window.performanceMonitor.printReport();
```

---

## 💡 使用技巧

### 1. 快速测算
- 使用默认模板快速开始
- 一键选择所有班次
- 快捷键可选日期范围（未来7天/30天）

### 2. 方案对比
- 测算后立即保存
- 修改参数重新测算
- 使用对比功能查看差异
- 最多对比5个方案

### 3. 数据导出
- Excel包含3个Sheet完整数据
- 文件名自动带时间戳
- 可用于存档和汇报

### 4. 性能优化
- 大列表自动使用虚拟滚动
- 复杂计算自动使用Worker
- 数据自动缓存1小时
- 开发时查看性能报告

---

## 🔧 配置建议

### 缓存过期时间

| 数据类型 | 建议时间 |
|---------|---------|
| 用户配置 | 24小时 |
| 参数方案 | 1小时 |
| 班次数据 | 1小时 |
| 活动方案 | 30分钟 |
| 测算结果 | 永久 |

### 虚拟滚动参数

| 列表类型 | 高度 | 每项高度 |
|---------|------|---------|
| 紧凑列表 | 500 | 60 |
| 普通列表 | 600 | 80 |
| 详细列表 | 700 | 120 |

---

## 🐛 故障排除

### 构建错误
```bash
# 清理缓存
npm run clean

# 重新安装依赖
rm -rf node_modules
npm install

# 重新构建
npm run build
```

### 运行错误
```bash
# 检查端口占用
netstat -ano | findstr :3000

# 清理进程
taskkill /F /PID <进程ID>
```

### 性能问题
```javascript
// 开发环境检查
window.performanceMonitor.printReport();
```

---

## 📚 文档索引

- **功能文档**
  - `REDESIGN_V6_SUMMARY.md` - V6.0 改造
  - `UPDATE_V6.1.md` - V6.1 更新
  - `UPDATE_V6.2.md` - V6.2 高级功能
  - `UPDATE_V6.3.md` - V6.3 性能优化

- **技术文档**
  - `PERFORMANCE_OPTIMIZATION.md` - 性能优化详解
  - `FEATURE_COMPLETE_V6.md` - 完整功能清单
  - `V6_COMPLETE_ALL.md` - 总体总结

---

## 🆘 获取帮助

### 查看文档
```bash
# 在项目根目录
ls *.md
```

### 检查版本
```bash
# 查看 package.json
cat package.json | grep version
```

### 联系开发者
- 项目Issues
- 技术支持邮件

---

## ✅ 检查清单

### 首次使用
- [ ] 安装依赖 (`npm install`)
- [ ] 启动开发服务 (`npm run dev`)
- [ ] 创建测算模板
- [ ] 配置班次
- [ ] 设置活动方案

### 日常使用
- [ ] 进入人力测算
- [ ] 设定目标
- [ ] 规划时间
- [ ] 选择班次
- [ ] 查看结果
- [ ] 保存和对比
- [ ] 导出报表

### 优化使用
- [ ] 大列表使用虚拟滚动
- [ ] 复杂计算使用Worker
- [ ] 开启数据缓存
- [ ] 监控性能指标

---

**版本**: V6.3.0
**更新时间**: 2026-06-02
**状态**: ✅ 生产就绪

🎉 **祝使用愉快！**
