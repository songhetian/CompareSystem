# 历史数据功能 - 待实现清单

## 📋 功能概述

Python 版本有一个完整的**历史业务数据导入与趋势分析**功能，可以：
1. 导入历史业务数据（Excel）
2. 查看历史数据列表
3. 显示多维业务趋势图
4. 删除和导出数据
5. 基于历史数据进行测算参考

## ✅ 已完成（后端基础）

### 1. 数据库表结构
```sql
CREATE TABLE history_biz_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_date TEXT NOT NULL,              -- 日期
  sales_volume REAL NOT NULL DEFAULT 0.0,    -- 销售额(万)
  actual_staff INTEGER NOT NULL DEFAULT 0,   -- 实际在岗人数
  actual_consult REAL NOT NULL DEFAULT 0.0,  -- 实际咨询量
  conversion_rate REAL DEFAULT 0.0,          -- 转化率(0-1)
  remark TEXT,                               -- 备注
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. IPC Handlers (已添加)
- ✅ `get:historyData` - 获取历史数据列表
- ✅ `add:historyData` - 添加单条数据
- ✅ `batch:historyData` - 批量导入数据
- ✅ `delete:historyData` - 删除数据

### 3. 类型定义（需要添加到 global.d.ts）
```typescript
interface HistoryDataRecord {
  id: number;
  data_date: string;
  sales_volume: number;
  actual_staff: number;
  actual_consult: number;
  conversion_rate: number;
  remark: string;
  create_time: string;
}

interface IElectronAPI {
  // ... 现有方法

  // 历史数据
  getHistoryData: (limit?: number) => Promise<HistoryDataRecord[]>;
  addHistoryData: (data: {
    date: string;
    sales: number;
    staff: number;
    consults: number;
    conversionRate: number;
    remark: string;
  }) => Promise<any>;
  batchHistoryData: (records: Array<{
    date: string;
    sales: number;
    staff: number;
    consults: number;
    conversionRate: number;
    remark: string;
  }>) => Promise<{ success: boolean; count: number }>;
  deleteHistoryData: (ids: number[]) => Promise<any>;
}
```

---

## ⏳ 待实现（前端页面）

### 1. 创建 HistoryDataPage 页面

**位置**: `src/pages/HistoryDataPage.tsx`

**功能需求**:

#### 1.1 页面布局
```
┌─────────────────────────────────────────────┐
│  🗂️ 历史数据管理                             │
│                                             │
│  [📊 趋势图] [📥 导入Excel] [📤 导出Excel]  │
├─────────────────────────────────────────────┤
│  历史业务数据表格                            │
│  ┌─┬────────┬────────┬────────┬──────┐     │
│  │☑│ 日期   │ 销售额 │ 人数   │ 咨询量│     │
│  ├─┼────────┼────────┼────────┼──────┤     │
│  │☐│2026-05│ 1500万 │ 45人   │ 8200  │     │
│  │☐│2026-04│ 1200万 │ 42人   │ 7500  │     │
│  └─┴────────┴────────┴────────┴──────┘     │
│                                             │
│  [🗑️ 删除选中]                              │
└─────────────────────────────────────────────┘
```

#### 1.2 数据表格
- ✅ 复选框列（多选）
- ✅ 日期列（YYYY-MM-DD）
- ✅ 销售额列（万元）
- ✅ 实际人数列
- ✅ 咨询量列
- ✅ 转化率列（百分比显示）
- ✅ 备注列
- ✅ 操作列（删除单条）

#### 1.3 工具栏功能
- ✅ 导入 Excel 按钮
- ✅ 导出 Excel 按钮
- ✅ 查看趋势图按钮
- ✅ 删除选中按钮
- ✅ 刷新按钮

### 2. Excel 导入功能

**需要安装依赖**:
```bash
npm install xlsx @types/xlsx
```

**实现步骤**:

#### 2.1 下载模板
```typescript
const downloadTemplate = () => {
  const XLSX = require('xlsx');

  const template = [
    {
      '日期(YYYY-MM-DD)': '2026-01-01',
      '销售额(万)': 1000,
      '实际在岗人数': 40,
      '咨询量': 6500,
      '转化率(0-1)': 0.15,
      '备注': '示例数据'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '历史数据');
  XLSX.writeFile(wb, '历史数据导入模板.xlsx');
};
```

#### 2.2 读取并导入
```typescript
const handleImport = async (file: File) => {
  const XLSX = require('xlsx');
  const reader = new FileReader();

  reader.onload = async (e) => {
    const data = e.target?.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const records = jsonData.map((row: any) => ({
      date: row['日期(YYYY-MM-DD)'],
      sales: parseFloat(row['销售额(万)']),
      staff: parseInt(row['实际在岗人数']),
      consults: parseFloat(row['咨询量']),
      conversionRate: parseFloat(row['转化率(0-1)']),
      remark: row['备注'] || ''
    }));

    await window.api.batchHistoryData(records);
    Message.success(`成功导入 ${records.length} 条数据`);
    loadData();
  };

  reader.readAsBinaryString(file);
};
```

### 3. Excel 导出功能

```typescript
const handleExport = async () => {
  const XLSX = require('xlsx');
  const data = await window.api.getHistoryData(1000);

  const exportData = data.map(row => ({
    '日期': row.data_date,
    '销售额(万)': row.sales_volume,
    '实际人数': row.actual_staff,
    '咨询量': row.actual_consult,
    '转化率': (row.conversion_rate * 100).toFixed(2) + '%',
    '备注': row.remark || '',
    '记录时间': row.create_time
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '历史数据');
  XLSX.writeFile(wb, `历史数据_${new Date().toLocaleDateString()}.xlsx`);
};
```

### 4. 趋势图展示

**使用 @arco-design/web-react 的 Chart 组件**

```typescript
const TrendChartModal = ({ data }: { data: HistoryDataRecord[] }) => {
  // 准备数据
  const chartData = data.map(item => ({
    date: item.data_date,
    sales: item.sales_volume,
    staff: item.actual_staff,
    consults: item.actual_consult
  })).reverse(); // 按时间正序

  return (
    <Modal visible={true} width={1000} title="📈 业务趋势分析">
      <div style={{ height: 500 }}>
        {/* 使用现有的 TimelineChart 组件 */}
        <TimelineChart
          data={chartData}
          title="业务趋势"
        />
      </div>

      {/* 或者使用双轴图 */}
      <div style={{ height: 300, marginTop: 20 }}>
        <LineChart
          data={chartData}
          xField="date"
          yFields={['sales', 'staff']}
          seriesNames={['销售额(万)', '人员数']}
        />
      </div>
    </Modal>
  );
};
```

### 5. 添加到主路由

**修改 `App.tsx` 添加历史数据页面入口**:

```typescript
import { HistoryDataPage } from './pages/HistoryDataPage';

// 在导航栏添加
<TabPane key="history" title={<><IconHistory /> 历史数据</>}>
  <HistoryDataPage />
</TabPane>
```

---

## 🎯 优先级实现顺序

### Phase 1: 基础数据管理 (高优先级)
1. ✅ 创建 `HistoryDataPage.tsx`
2. ✅ 实现数据表格展示
3. ✅ 实现删除功能
4. ✅ 更新 `global.d.ts` 类型定义
5. ✅ 更新 `electron/preload.ts` 暴露 API

### Phase 2: Excel 导入导出 (中优先级)
6. ✅ 安装 xlsx 依赖
7. ✅ 实现模板下载
8. ✅ 实现 Excel 导入
9. ✅ 实现 Excel 导出

### Phase 3: 趋势分析 (中优先级)
10. ✅ 创建趋势图模态框
11. ✅ 集成现有 Chart 组件
12. ✅ 实现多维度数据对比

### Phase 4: 高级功能 (低优先级)
13. ⏳ 基于历史数据的智能预测
14. ⏳ 数据异常检测
15. ⏳ 同比/环比分析
16. ⏳ 历史数据在测算时的参考显示

---

## 📊 Python 版本参考

### 主要特性
1. **Excel 批量导入** - 支持标准模板
2. **趋势图展示** - 双轴折线图（销售额 + 人数）
3. **数据管理** - 增删查改
4. **数据验证** - 日期格式、数值范围校验

### UI 参考
- 表格布局：清晰的列表视图
- 工具栏：导入/导出/图表按钮
- 模态框：趋势图全屏展示

---

## 📝 实现注意事项

### 数据验证
- 日期格式验证：YYYY-MM-DD
- 数值范围验证：
  - 销售额 > 0
  - 人数 >= 0
  - 咨询量 >= 0
  - 转化率 0-1 之间

### 用户体验
- 导入进度提示
- 批量操作确认
- 数据去重提示
- 空状态友好提示

### 性能优化
- 虚拟滚动处理大量数据
- 图表懒加载
- Excel 导出分批处理

---

## 🔗 相关文件

### 已修改
- ✅ `electron/db.ts` - 数据库表结构
- ✅ `electron/index.ts` - IPC Handlers

### 待创建
- ⏳ `src/pages/HistoryDataPage.tsx` - 主页面
- ⏳ `src/types/history.d.ts` - 类型定义
- ⏳ `src/components/TrendChart.tsx` - 趋势图组件（可选）

### 待修改
- ⏳ `src/App.tsx` - 添加路由
- ⏳ `src/types/global.d.ts` - 添加 API 类型
- ⏳ `electron/preload.ts` - 暴露 API

---

## 🎉 预期效果

实现后用户可以：
1. 📥 **导入历史数据** - 通过 Excel 批量导入过去的业务数据
2. 📊 **查看趋势** - 可视化分析业务规模和人力效率的变化
3. 🔍 **数据对比** - 对比不同时期的业务表现
4. 💡 **智能参考** - 基于历史数据进行更准确的测算

---

**状态**: 后端基础 ✅ | 前端页面 ⏳
**预计工作量**: 4-6小时
**优先级**: 中（功能完整性提升）
