/**
 * Web Worker for heavy manpower calculations
 * 用于执行复杂的人力测算，避免阻塞主线程
 */

interface CalculationData {
  targetSales: number;
  days: number;
  eventType: string | null;
  eventDates: string[];
  calcStartDate: string;
  params: any;
  selectedShifts: number[];
}

interface CalculationResult {
  needed_staff: number;
  presale_staff: number;
  midsale_staff: number;
  aftersale_staff: number;
  daily_consult: number;
  daily_hours: number;
  daily_results: any[];
  hourly_total: number[];
  hourly_presale: number[];
  hourly_midsale: number[];
  hourly_aftersale: number[];
}

// 模拟复杂计算逻辑（实际应该调用真实的计算算法）
function calculateManpower(data: CalculationData): CalculationResult {
  const {
    targetSales,
    days,
    eventDates,
    params,
  } = data;

  // 基础参数
  const avgPrice = params?.avg_price || 200;
  const conversionRate = params?.conversion_rate || 0.15;
  const consultPerStaff = params?.consult_per_staff || 50;

  // 计算日均访客数
  const totalSales = targetSales;
  const totalOrders = totalSales / avgPrice;
  const totalConsults = totalOrders / conversionRate;
  const dailyConsults = totalConsults / days;

  // 计算基础人力
  const baseStaff = Math.ceil(dailyConsults / consultPerStaff);

  // 岗位配比
  const presaleRatio = params?.presale_ratio || 0.4;
  const midsaleRatio = params?.midsale_ratio || 0.35;
  const aftersaleRatio = params?.aftersale_ratio || 0.25;

  const presaleStaff = Math.ceil(baseStaff * presaleRatio);
  const midsaleStaff = Math.ceil(baseStaff * midsaleRatio);
  const aftersaleStaff = Math.ceil(baseStaff * aftersaleRatio);

  // 生成每日数据
  const dailyResults = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(data.calcStartDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // 判断是否为高峰日
    const isPeak = eventDates.includes(dateStr);
    const peakFactor = isPeak ? 1.5 : 1.0;

    dailyResults.push({
      date: dateStr,
      staff: Math.ceil(baseStaff * peakFactor),
      presale: Math.ceil(presaleStaff * peakFactor),
      midsale: Math.ceil(midsaleStaff * peakFactor),
      aftersale: Math.ceil(aftersaleStaff * peakFactor),
    });
  }

  // 生成24小时数据
  const hourlyTotal = Array(24).fill(0).map((_, hour) => {
    // 模拟不同时段的人力需求波动
    const peakHours = [10, 11, 14, 15, 16, 19, 20, 21];
    const factor = peakHours.includes(hour) ? 1.2 : 0.8;
    return baseStaff * factor / 3; // 假设每班次覆盖8小时，需要3个班次
  });

  const hourlyPresale = hourlyTotal.map(v => v * presaleRatio);
  const hourlyMidsale = hourlyTotal.map(v => v * midsaleRatio);
  const hourlyAftersale = hourlyTotal.map(v => v * aftersaleRatio);

  return {
    needed_staff: baseStaff,
    presale_staff: presaleStaff,
    midsale_staff: midsaleStaff,
    aftersale_staff: aftersaleStaff,
    daily_consult: dailyConsults,
    daily_hours: 8,
    daily_results: dailyResults,
    hourly_total: hourlyTotal,
    hourly_presale: hourlyPresale,
    hourly_midsale: hourlyMidsale,
    hourly_aftersale: hourlyAftersale,
  };
}

// Worker 消息处理
self.addEventListener('message', (event: MessageEvent) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'CALCULATE':
        const result = calculateManpower(data);
        self.postMessage({
          type: 'RESULT',
          data: result,
          id,
          success: true
        });
        break;

      case 'BATCH_CALCULATE':
        // 批量计算多个方案
        const results = data.map((item: CalculationData) => calculateManpower(item));
        self.postMessage({
          type: 'BATCH_RESULT',
          data: results,
          id,
          success: true
        });
        break;

      default:
        self.postMessage({
          type: 'ERROR',
          error: 'Unknown message type',
          id,
          success: false
        });
    }
  } catch (error: any) {
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      id,
      success: false
    });
  }
});

// 类型导出，方便主线程使用
export type { CalculationData, CalculationResult };
