# 历史数据功能实现总结

## ✅ 已完成

### 1. 数据库结构（多项目支持）

#### history_projects 表（项目管理）
```sql
CREATE TABLE history_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_name TEXT NOT NULL,           -- 项目/店铺名称
  description TEXT,                     -- 描述
  is_active INTEGER DEFAULT 1,          -- 是否启用
  create_time TIMESTAMP,
  update_time TIMESTAMP
);
```

#### history_biz_data 表（关联项目的历史数据）
```sql
CREATE TABLE history_biz_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,          -- 关联项目ID
  data_date TEXT NOT NULL,
  sales_volume REAL,
  actual_staff INTEGER,
  actual_consult REAL,
  conversion_rate REAL,
  remark TEXT,
  create_time TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES history_projects(id) ON DELETE CASCADE
);
```

#### 自动数据迁移
- ✅ 检测旧数据结构
- ✅ 创建"默认项目"
- ✅ 迁移旧数据到新结构
- ✅ 删除备份表

---

### 2. 后端 IPC Handlers

#### 项目管理 API
```typescript
get:historyProjects        // 获取所有项目
add:historyProject         // 创建项目
update:historyProject      // 更新项目
delete:historyProject      // 删除项目（软删除）
```

#### 历史数据 API（支持 project_id）
```typescript
get:historyData(projectId?, limit?)     // 获取数据（可按项目过滤）
add:historyData({projectId, ...})       // 添加单条数据
batch:historyData(projectId, records)   // 批量导入数据
delete:historyData(ids[])               // 批量删除数据
```

---

### 3. 类型定义

```typescript
interface HistoryProject {
  id: number;
  project_name: string;
  description: string;
  is_active: number;
  create_time: string;
  update_time: string;
}

interface HistoryDataRecord {
  id: number;
  project_id: number;          // 新增：关联项目
  data_date: string;
  sales_volume: number;
  actual_staff: number;
  actual_consult: number;
  conversion_rate: number;
  remark: string;
  create_time: string;
}
```

---

### 4. 前端基础页面

**文件：** `src/pages/HistoryDataPage.tsx`

**已实现功能：**
- ✅ 数据表格展示
- ✅ Excel 导入/导出
- ✅ 批量删除
- ✅ 趋势图展示（使用 Chart.js）
- ✅ 数据刷新

**当前状态：**
- 暂时使用默认项目 ID = 1
- 完整的多项目UI将在下一步实现

---

## ⏳ 下一步需要实现

### 1. 完善 HistoryDataPage 多项目UI

**目标界面结构：**
```
┌───────────────────────────────────────────────────────┐
│  🗂️ 历史数据管理                                       │
├───────────────────────────────────────────────────────┤
│  [项目选择器▼] [+ 新建项目]                           │
│                                                       │
│  当前项目: 天猫旗舰店  (23条数据)                      │
│  [📊 趋势图] [📥 导入Excel] [📤 导出Excel]            │
├───────────────────────────────────────────────────────┤
│  历史业务数据表格                                      │
│  ☑  日期       销售额   人数   咨询量   转化率         │
│  ☐  2026-05-01  1500万   45     8200    15.2%        │
│  ☐  2026-04-30  1200万   42     7500    14.8%        │
└───────────────────────────────────────────────────────┘
```

**需要添加的组件：**

#### 1.1 项目选择器
```typescript
const [projects, setProjects] = useState<HistoryProject[]>([]);
const [currentProject, setCurrentProject] = useState<HistoryProject | null>(null);

// 加载项目列表
const loadProjects = async () => {
  const data = await window.api.getHistoryProjects();
  setProjects(data);
  if (data.length > 0) {
    setCurrentProject(data[0]);
  }
};

// 切换项目
const handleProjectChange = (projectId: number) => {
  const project = projects.find(p => p.id === projectId);
  setCurrentProject(project);
  loadData(projectId); // 加载该项目的数据
};
```

#### 1.2 项目管理弹窗
```typescript
<Modal title="项目管理" visible={projectModalVisible}>
  <Form onSubmit={handleProjectSubmit}>
    <Form.Item label="项目名称" field="name" required>
      <Input placeholder="例如: 天猫旗舰店" />
    </Form.Item>
    <Form.Item label="描述" field="description">
      <Input.TextArea placeholder="店铺或项目的详细说明" />
    </Form.Item>
  </Form>

  {/* 项目列表 */}
  <List>
    {projects.map(p => (
      <List.Item key={p.id}>
        {p.project_name}
        <Button onClick={() => handleEditProject(p)}>编辑</Button>
        <Button onClick={() => handleDeleteProject(p.id)}>删除</Button>
      </List.Item>
    ))}
  </List>
</Modal>
```

#### 1.3 更新导入导出逻辑
```typescript
// 导入时指定项目
const handleImport = async (file: File) => {
  if (!currentProject) {
    Message.warning('请先选择项目');
    return;
  }

  // ... 解析 Excel

  await window.api.batchHistoryData(currentProject.id, records);
};

// 导出包含项目信息
const handleExport = () => {
  const exportData = data.map(row => ({
    '项目': currentProject?.project_name,
    '日期': row.data_date,
    // ...
  }));
};
```

---

### 2. 在 BudgetPage 中集成历史数据参考

**目标：** 在测算时可以选择参考某个项目的历史趋势

#### 2.1 添加历史数据选择
```typescript
// BudgetPage.tsx - 步骤 1 中添加
<Form.Item label="参考历史数据（可选）">
  <Select
    placeholder="选择历史项目数据进行趋势参考"
    value={formData.referenceProjectId}
    onChange={(v) => updateFormData('referenceProjectId', v)}
    allowClear
  >
    {historyProjects.map(p => (
      <Select.Option key={p.id} value={p.id}>
        {p.project_name} ({p.data_count}条数据)
      </Select.Option>
    ))}
  </Select>
</Form.Item>
```

#### 2.2 加载历史趋势
```typescript
const loadHistoryTrend = async (projectId: number) => {
  const data = await window.api.getHistoryData(projectId, 90); // 最近90天

  // 分析历史趋势
  const trend = analyzeTrend(data);

  // 显示趋势图表
  setHistoryTrend(trend);
};
```

#### 2.3 智能预测（可选）
```typescript
// 基于历史数据进行预测
const predictManpower = (
  targetSales: number,
  historyData: HistoryDataRecord[]
) => {
  // 计算历史平均效率
  const avgEfficiency = historyData.reduce((sum, record) => {
    return sum + (record.sales_volume / record.actual_staff);
  }, 0) / historyData.length;

  // 预测人力需求
  const predictedStaff = Math.ceil(targetSales / avgEfficiency);

  return {
    predicted: predictedStaff,
    confidence: calculateConfidence(historyData),
    recommendation: generateRecommendation(predictedStaff, historyData)
  };
};
```

---

### 3. 添加到主导航

**文件：** `src/App.tsx`

```typescript
import { HistoryDataPage } from './pages/HistoryDataPage';

// 在导航中添加
<Menu.Item key="history">
  <Link to="/history">
    <IconHistory /> 历史数据
  </Link>
</Menu.Item>

// 添加路由
<Route path="/history" element={<HistoryDataPage />} />
```

---

## 📊 使用流程

### 场景 1: 创建新项目并导入数据
1. 打开"历史数据"页面
2. 点击"新建项目"，输入项目名称（如"天猫旗舰店"）
3. 选择该项目
4. 点击"导入 Excel"，上传历史数据
5. 查看数据表格和趋势图

### 场景 2: 基于历史数据进行测算
1. 打开"智能测算"页面
2. 在步骤1中选择"参考历史数据"
3. 选择要参考的项目（如"天猫旗舰店"）
4. 系统显示该项目的历史趋势图
5. 继续设置目标销售额等参数
6. 点击测算，系统会参考历史数据给出更准确的建议

### 场景 3: 对比多个店铺数据
1. 创建多个项目（天猫、京东、抖音）
2. 分别导入各店铺的历史数据
3. 在趋势图中选择多个项目进行对比
4. 分析不同店铺的效率和规律

---

## 🎯 核心优势

### 1. 多项目隔离
- ✅ 每个项目独立管理数据
- ✅ 不同店铺/业务线互不干扰
- ✅ 可以无限添加项目

### 2. 数据分析
- ✅ 趋势图展示业务变化
- ✅ 可视化销售额、人数、咨询量
- ✅ 转化率分析

### 3. 智能预测（未来）
- ⏳ 基于历史效率预测人力需求
- ⏳ 识别异常数据点
- ⏳ 同比/环比分析

### 4. 数据驱动决策
- ✅ 不再拍脑袋估算
- ✅ 有历史数据支撑
- ✅ 持续优化测算模型

---

## 🔧 技术细节

### 数据库设计特点
1. **外键约束** - 确保数据完整性
2. **级联删除** - 删除项目时自动删除相关数据
3. **软删除** - 项目标记为 `is_active=0` 而不是物理删除
4. **索引优化** - project_id 和 data_date 建立索引

### API 设计特点
1. **可选过滤** - `getHistoryData(projectId?)` 可以按项目过滤
2. **批量操作** - 使用事务确保批量导入的原子性
3. **灵活参数** - 支持 limit 参数控制返回数量

### 前端设计特点
1. **组件化** - 项目选择器、数据表格、趋势图独立组件
2. **状态管理** - 清晰的 currentProject 状态
3. **用户体验** - 加载状态、错误提示、操作确认

---

## 📝 待优化项

### 短期（1-2天）
- [ ] 完整实现多项目UI界面
- [ ] 添加项目管理功能（增删改）
- [ ] 在 BudgetPage 中集成历史数据参考

### 中期（1周）
- [ ] 实现更丰富的数据分析
- [ ] 添加数据对比功能
- [ ] 优化趋势图展示

### 长期（1个月）
- [ ] 智能预测算法
- [ ] 异常检测
- [ ] 数据导出报告
- [ ] 权限管理（多用户场景）

---

## 🎉 总结

当前实现已经完成了**多项目/多店铺历史数据管理**的核心架构：

✅ **数据库层** - 支持多项目的表结构和自动迁移
✅ **API 层** - 完整的项目和数据管理接口
✅ **类型层** - TypeScript 类型定义完整
✅ **基础UI** - 数据展示、导入导出、趋势图

**下一步只需要：**
1. 完善 HistoryDataPage 的多项目选择UI（2-3小时）
2. 在 BudgetPage 中添加历史数据参考选项（1-2小时）

之后你就可以：
- 为每个店铺创建独立的历史数据项目
- 导入各店铺的历史业务数据
- 在测算时参考历史数据
- 对比不同店铺的效率

---

**状态**: 核心架构 ✅ | 多项目UI ⏳ | 测算集成 ⏳
**预计剩余工作量**: 3-5小时
**优先级**: 高（功能完整性的关键部分）
