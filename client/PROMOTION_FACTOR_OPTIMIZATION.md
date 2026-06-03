# 活动系数优化 - 使用精确 Factor 值

## 📋 优化概述

**问题描述：**
- 活动规划页面允许用户精确设置流量爆发系数（如 ×2.3、×1.5 等）
- 但计算器并未使用这个精确值，而是根据活动名称字符串判断使用固定的 event_s (2.8) 或 event_a (1.9)
- 导致用户精心设置的系数被忽略，降低了测算准确性

**优化方案：**
- ✅ 优先使用活动规划中设置的精确 `factor` 值
- ✅ 保留基于名称判断的逻辑作为备用（向后兼容）
- ✅ 参数配置中的 event_s/event_a 作为默认值保留

---

## 🔧 修改内容

### 1. **calculator.ts** - 计算逻辑优化

#### 新增接口
```typescript
export interface CalcConfig {
  targetSales: number;
  days: number;
  eventType: string | null;
  eventDates: dayjs.Dayjs[];
  calcStartDate: dayjs.Dayjs | null;
  params: CalcParams;
  promotionFactor?: number; // 新增：活动规划中设置的精确系数
}
```

#### 修改计算方法签名
```typescript
public static calculateWithShifts(
  targetSales: number,
  days: number = 30,
  eventType: string | null = null,
  eventDates: dayjs.Dayjs[] = [dayjs()],
  calcStartDate: dayjs.Dayjs | null = null,
  params: CalcParams,
  promotionFactor?: number // 新增参数
)
```

#### 优化系数计算逻辑
```typescript
// 5. 活动力度系数
let eventF = 1.0;

// 优先使用活动规划中精确设置的系数
if (promotionFactor !== undefined && promotionFactor > 0) {
  eventF = promotionFactor;
}
// 如果没有传入精确系数，则回退到基于名称判断（兼容旧逻辑）
else if (eventType) {
  if (eventType.includes('S级大促') || eventType.includes('S级')) {
    eventF = p('event_s', 2.8);
  } else if (eventType.includes('A级') || eventType.includes('会员日')) {
    eventF = p('event_a', 1.9);
  }
}
```

**优先级：**
1. ⭐ **活动规划精确系数** (promotionFactor) - 最高优先级
2. 📝 **名称匹配系数** (event_s/event_a) - 备用方案
3. 🔢 **默认值** (1.0) - 无活动时

---

### 2. **BudgetPage.tsx** - 传递 Factor

#### 修改 handleCalculate
```typescript
const handleCalculate = async () => {
  // ...

  // 获取选中的活动及其精确的 factor 值
  const selectedPromo = promotions.find(p => p.id === formData.promotionId);

  const calcData = {
    targetSales: formData.driveMode === 'sales' ? parseFloat(formData.targetValue) * 10000 : 0,
    days,
    eventType: selectedPromo?.scheme_name || null,
    eventDates: formData.peakDates,
    calcStartDate: startDate,
    params: formData.schemeId
      ? JSON.parse(schemes.find(s => s.id === formData.schemeId)?.params_json || '{}')
      : {},
    selectedShifts: formData.selectedShifts,
    // 传递活动规划中设置的精确系数
    promotionFactor: selectedPromo?.factor
  };

  const res = await window.api.calculateManpower(calcData);
  // ...
};
```

---

### 3. **electron/index.ts** - 主进程支持

#### 更新 IPC Handler
```typescript
ipcMain.handle('calc:manpower', async (_event: any, data: any) => {
  try {
    const {
      targetSales,
      days,
      eventType,
      eventDates,
      calcStartDate,
      params,
      promotionFactor // 新增
    } = data

    // 转换日期字符串为 dayjs 对象
    const parsedEventDates = (eventDates || []).map((d: string) => dayjs(d))
    const parsedCalcStartDate = calcStartDate ? dayjs(calcStartDate) : null

    return ManpowerCalculator.calculateWithShifts(
      targetSales || 0,
      days || 7,
      eventType || null,
      parsedEventDates,
      parsedCalcStartDate,
      params || {},
      promotionFactor // 传递精确系数
    )
  } catch (error) {
    console.error('calc:manpower error:', error)
    throw error
  }
})
```

---

## 🎯 使用场景示例

### 场景 1: 使用活动规划（推荐）
```
用户在活动规划中创建：
- 名称: "年中大促"
- Factor: 2.3

测算时选择该活动
→ 计算器使用 eventF = 2.3 ✅
```

### 场景 2: 不选活动（日常）
```
用户不选择任何活动

→ 计算器使用 eventF = 1.0 ✅
```

### 场景 3: 兼容旧数据（备用）
```
用户选择活动 "S级大促"
但没有 factor 字段（旧数据）

→ 计算器回退到名称匹配
→ 使用参数中的 event_s = 2.8 ✅
```

---

## ✅ 优化效果

### 精确度提升
- ✅ 用户可以设置任意精度的系数（如 1.3、2.7、3.5）
- ✅ 不再受限于固定的 S级/A级 两档
- ✅ 每个活动都可以独立配置力度

### 灵活性增强
- ✅ 同一级别活动可以有不同系数
  - 双11 (S级): ×3.5
  - 618 (S级): ×3.2
  - 周年庆 (S级): ×2.8
- ✅ 支持更细粒度的活动分级

### 向后兼容
- ✅ 保留了基于名称判断的逻辑
- ✅ 旧的测算方式仍然可用
- ✅ 参数配置中的 event_s/event_a 作为默认值

---

## 📊 参数配置说明

### 大促系数（ParamPage）
```
event_s: 2.8  // S级大促默认值（备用）
event_a: 1.9  // A级活动默认值（备用）
```

**角色定位：**
- 这些参数现在是 **默认值/备用值**
- 当活动规划没有设置 factor 时使用
- 仍然可以在参数配置中调整

### 活动规划（PromotionPage）
```
创建活动时设置 factor:
- 可以是任意值 (1.0 - 5.0)
- 不受参数配置限制
- 每个活动独立设置
```

**优先级：最高**
- 测算时会直接使用这个值
- 覆盖参数配置中的默认值

---

## 🔍 验证方法

### 1. 创建测试活动
```
活动名称: "测试活动"
系数: 2.5
```

### 2. 执行测算
```
- 选择该活动
- 设置目标销售额: 1000万
- 点击测算
```

### 3. 检查结果
```
查看测算结果中的人力需求
→ 应该基于 ×2.5 倍流量计算
→ 而不是基于名称匹配的固定值
```

---

## 📁 修改文件列表

- ✅ `src/utils/calculator.ts` - 核心计算逻辑
- ✅ `src/pages/BudgetPage.tsx` - 传递 factor 参数
- ✅ `electron/index.ts` - 主进程 IPC 支持

---

## 🎉 总结

这次优化让活动规划中设置的 `factor` 值真正生效，提升了测算的准确性和灵活性。用户现在可以为每个活动精确设置流量爆发系数，而不再受限于固定的 S级/A级 两档。

**构建状态：** ✅ 成功
**兼容性：** ✅ 向后兼容
**测试状态：** ⏳ 待用户验证
