import dayjs from 'dayjs';

/**
 * 计算参数接口
 */
export interface CalcParams {
  // 基础业务
  avg_order_value: number;
  daily_visitors: number;
  peak_factor: number;
  safety_buffer: number;

  // 转化漏斗
  visitor_to_presale: number;
  consult_to_order: number;
  order_to_payment: number;
  midsale_ratio: number;
  payment_to_aftersale: number;

  // 时间偏移
  presale_time_offset: number;
  midsale_time_offset: number;
  aftersale_time_offset: number;

  // 岗位效能
  presale_handle_time: number;
  presale_saturation: number;
  midsale_handle_time: number;
  midsale_saturation: number;
  aftersale_handle_time: number;
  aftersale_saturation: number;

  // 分时爆发
  presale_burst_start?: number;
  presale_burst_end?: number;
  presale_burst_factor?: number;
  midsale_burst_start?: number;
  midsale_burst_end?: number;
  midsale_burst_factor?: number;
  aftersale_burst_start?: number;
  aftersale_burst_end?: number;
  aftersale_burst_factor?: number;

  // 大促系数（作为默认备用值）
  event_s?: number;
  event_a?: number;

  [key: string]: number | undefined;
}

/**
 * 计算配置接口
 */
export interface CalcConfig {
  targetSales: number;
  targetVisitors?: number;  // 访客数驱动模式下的目标日均访客数
  days: number;
  eventType: string | null;
  eventDates: dayjs.Dayjs[];
  calcStartDate: dayjs.Dayjs | null;
  params: CalcParams;
  promotionFactor?: number; // 活动规划中设置的精确系数
  minStaff?: number;        // 班次最低保底人数
}

/**
 * 人力测算计算器
 * 基于双径流量推演与柔性人力模型的全过程仿真算法
 */
export class ManpowerCalculator {
  /**
   * 获取每日权重分布（高斯分布模型）
   * @param days 总天数
   * @param eventDate 活动日期
   * @param calcStartDate 计算开始日期
   * @param phaseOffset 阶段偏移（天）
   * @param spread 分布宽度
   * @param isUniform 是否均匀分布（日常模式）
   */
  private static getDailyWeights(
    days: number,
    eventDate: dayjs.Dayjs,
    calcStartDate: dayjs.Dayjs,
    phaseOffset: number,
    spread = 3,
    isUniform = false
  ): number[] {
    // 日常模式：均匀分布
    if (isUniform) return new Array(days).fill(1.0 / days);

    const weights: number[] = [];
    const peakDay = eventDate.add(phaseOffset, 'day');

    // 高斯分布计算每日权重
    for (let i = 0; i < days; i++) {
      const currentDay = calcStartDate.add(i, 'day');
      const delta = currentDay.diff(peakDay, 'day');
      const weight = Math.exp(-(Math.pow(delta, 2)) / (2 * Math.pow(spread, 2)));
      weights.push(weight);
    }

    // 归一化
    const totalW = weights.reduce((a, b) => a + b, 0);
    return totalW === 0 ? new Array(days).fill(1.0 / days) : weights.map(w => w / totalW);
  }

  /**
   * 核心计算方法：全过程人力仿真算法
   * 采用双径流量推演与柔性人力模型
   */
  public static calculateWithShifts(
    targetSales: number,
    days: number = 30,
    eventType: string | null = null,
    eventDates: dayjs.Dayjs[] = [dayjs()],
    calcStartDate: dayjs.Dayjs | null = null,
    params: CalcParams,
    promotionFactor?: number, // 活动规划中设置的精确系数
    targetVisitors?: number,  // 访客数驱动模式下的目标日均访客数
    minStaff: number = 1      // 班次最低保底人数
  ) {
    // 判断是否为日常模式
    const isDaily = eventType === null || eventType.includes('日常');

    // 计算开始日期：默认为最早的事件日期前5天
    const startDate = calcStartDate || dayjs(Math.min(...eventDates.map(d => d.valueOf()))).subtract(5, 'day');

    // 参数获取辅助函数（带默认值）
    const p = (k: string, d: number) => params[k] ?? d;

    // 1. 核心业务参数
    const avgOv = p('avg_order_value', 160.0);
    const peakFactor = p('peak_factor', 1.2);
    const safetyBuffer = p('safety_buffer', 1.15);
    // 如果是访客数驱动模式且传入了目标访客数，则覆盖参数中的基准日访客数
    const baseDailyVisitors = targetVisitors ?? p('daily_visitors', 1000.0);
    const vToPRate = p('visitor_to_presale', 0.25);

    // 2. 时间偏移参数
    const offsets = {
      presale: p('presale_time_offset', -2.0),
      midsale: p('midsale_time_offset', 0.0),
      aftersale: p('aftersale_time_offset', 3.0)
    };

    // 3. 转化漏斗参数
    const conversion = {
      c_to_o: p('consult_to_order', 0.6),
      o_to_p: p('order_to_payment', 0.9),
      m_ratio: p('midsale_ratio', 0.35),
      p_to_a: p('payment_to_aftersale', 0.15)
    };

    // 4. 岗位效能参数（每小时处理能力）
    const cap = {
      presale: (60.0 / p('presale_handle_time', 4.5)) * p('presale_saturation', 0.78),
      midsale: (60.0 / p('midsale_handle_time', 3.0)) * p('midsale_saturation', 0.82),
      aftersale: (60.0 / p('aftersale_handle_time', 6.5)) * p('aftersale_saturation', 0.72)
    };

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

    // 6. 双径流量推演
    // 路径A: 从销售额反推咨询量
    const ordersFromSales = (targetSales / avgOv) * eventF;
    const presaleFromSales = ordersFromSales / (conversion.c_to_o * conversion.o_to_p);

    // 路径B: 从访客量正推咨询量（确保人力底线）
    const visitorPresaleBaseline = baseDailyVisitors * days * vToPRate;

    // 取两者最大值，确保不漏流量
    const totalPresale = Math.max(presaleFromSales, visitorPresaleBaseline);
    const totalMidsale = totalPresale * conversion.m_ratio;
    const totalAftersale = (totalPresale * conversion.c_to_o * conversion.o_to_p) * conversion.p_to_a;

    // 7. 多峰叠加权重分布
    const numPeaks = eventDates.length;
    let wPre = new Array(days).fill(0.0);
    let wMid = new Array(days).fill(0.0);
    let wAft = new Array(days).fill(0.0);

    for (const ed of eventDates) {
      const wp = this.getDailyWeights(days, ed, startDate, offsets.presale, 3, isDaily);
      const wm = this.getDailyWeights(days, ed, startDate, offsets.midsale, 3, isDaily);
      const wa = this.getDailyWeights(days, ed, startDate, offsets.aftersale, 3, isDaily);
      for (let i = 0; i < days; i++) {
        wPre[i] += wp[i] / numPeaks;
        wMid[i] += wm[i] / numPeaks;
        wAft[i] += wa[i] / numPeaks;
      }
    }

    // 8. 每日人力需求计算
    const dailyResults: Array<{ date: string; staff: number; presale: number; midsale: number; aftersale: number; vol_pre: number; vol_mid: number; vol_after: number }> = [];
    for (let i = 0; i < days; i++) {
      const vP = totalPresale * wPre[i];
      const vM = totalMidsale * wMid[i];
      const vA = totalAftersale * wAft[i];

      /**
       * 关键算法：岗位人力需求计算
       * 考虑峰值、安全冗余、岗位效能
       */
      const getRawDemand = (vol: number, phase: 'presale' | 'midsale' | 'aftersale') => {
        // 每小时基础话务量
        let hV = (vol / 24.0) * peakFactor * safetyBuffer;

        // 售前补正系数（夜间/晚间压力更大）
        if (phase === 'presale') hV *= 1.5;

        return cap[phase] > 0 ? hV / cap[phase] : 0;
      };

      const rawP = getRawDemand(vP, 'presale');
      const rawM = getRawDemand(vM, 'midsale');
      const rawA = getRawDemand(vA, 'aftersale');

      // 先求和再取整（全能客服模型）
      dailyResults.push({
        date: startDate.add(i, 'day').format('MM-DD'),
        staff: Math.ceil(rawP + rawM + rawA),
        presale: Math.ceil(rawP),
        midsale: Math.ceil(rawM),
        aftersale: Math.ceil(rawA),
        vol_pre: vP,
        vol_mid: vM,
        vol_after: vA
      });
    }

    // 9. 峰值日分析
    const theoreticalPeak = Math.max(...dailyResults.map(r => r.staff));
    const neededStaff = Math.max(theoreticalPeak, minStaff); // 应用班次最低保底
    const peakDay = dailyResults.reduce((prev, curr) => (curr.staff > prev.staff ? curr : prev));

    // 10. 24小时分布计算（基于峰值日）
    const hourlyPresale: number[] = [];
    const hourlyMidsale: number[] = [];
    const hourlyAftersale: number[] = [];
    const hourlyTotal: number[] = [];

    // 分时爆发参数
    const presaleBurstStart = p('presale_burst_start', 10);
    const presaleBurstEnd = p('presale_burst_end', 12);
    const presaleBurstFactor = p('presale_burst_factor', 1.9);

    const midsaleBurstStart = p('midsale_burst_start', 15);
    const midsaleBurstEnd = p('midsale_burst_end', 17);
    const midsaleBurstFactor = p('midsale_burst_factor', 2.3);

    const aftersaleBurstStart = p('aftersale_burst_start', 20);
    const aftersaleBurstEnd = p('aftersale_burst_end', 22);
    const aftersaleBurstFactor = p('aftersale_burst_factor', 2.6);

    for (let hour = 0; hour < 24; hour++) {
      const basePresale = peakDay.presale / 24;
      const baseMidsale = peakDay.midsale / 24;
      const baseAftersale = peakDay.aftersale / 24;

      // 应用分时爆发系数
      const presaleHour =
        hour >= presaleBurstStart && hour < presaleBurstEnd
          ? basePresale * presaleBurstFactor
          : basePresale;

      const midsaleHour =
        hour >= midsaleBurstStart && hour < midsaleBurstEnd
          ? baseMidsale * midsaleBurstFactor
          : baseMidsale;

      const aftersaleHour =
        hour >= aftersaleBurstStart && hour < aftersaleBurstEnd
          ? baseAftersale * aftersaleBurstFactor
          : baseAftersale;

      // 夜间额外补正（0-2点和20-24点）
      let nightBoost = 1.0;
      if (hour < 2 || hour >= 20) nightBoost = 1.3;

      hourlyPresale.push(presaleHour * nightBoost);
      hourlyMidsale.push(midsaleHour);
      hourlyAftersale.push(aftersaleHour);
      hourlyTotal.push(presaleHour * nightBoost + midsaleHour + aftersaleHour);
    }

    // 11. 真实敏感度分析：分别小幅调整关键参数，观察结果变化
    const calcStaff = (ovDelta: number, crDelta: number) => {
      const newOv = avgOv * (1 + ovDelta);
      const newCr = conversion.c_to_o * (1 + crDelta);
      const newOrders = (targetSales / newOv) * eventF;
      const newPresale = newOrders / (newCr * conversion.o_to_p);
      const newTotal = Math.max(newPresale, visitorPresaleBaseline);
      const newMid = newTotal * conversion.m_ratio;
      const newAft = (newTotal * newCr * conversion.o_to_p) * conversion.p_to_a;
      const peakW = wPre[dailyResults.findIndex(r => r.staff === theoreticalPeak)] || (1 / days);
      const rP = ((newTotal * peakW) / 24.0 * peakFactor * safetyBuffer * 1.5) / cap.presale;
      const rM = ((newMid * peakW) / 24.0 * peakFactor * safetyBuffer) / cap.midsale;
      const rA = ((newAft * peakW) / 24.0 * peakFactor * safetyBuffer) / cap.aftersale;
      return Math.ceil(rP + rM + rA);
    };
    const sensitivityOv = calcStaff(-0.1, 0) - neededStaff; // 客单价降低10%的人员变化
    const sensitivityCr = calcStaff(0, 0.1) - neededStaff;  // 转化率提升10%的人员变化

    // 12. 返回完整结果
    return {
      // 核心指标
      needed_staff: neededStaff,
      theoretical_peak: theoreticalPeak,
      presale_staff: peakDay.presale,
      midsale_staff: peakDay.midsale,
      aftersale_staff: peakDay.aftersale,

      // 话务量统计
      total_consult: totalPresale + totalMidsale + totalAftersale,
      daily_consult: (totalPresale + totalMidsale + totalAftersale) / days,

      // 工作时长
      daily_hours:
        (peakDay.vol_pre * p('presale_handle_time', 4.5) +
          peakDay.vol_mid * p('midsale_handle_time', 3.0) +
          peakDay.vol_after * p('aftersale_handle_time', 6.5)) /
        60.0 *
        peakFactor *
        safetyBuffer,

      // 每日明细
      daily_results: dailyResults,
      days,

      // 流量来源分析
      presale_from_sales: presaleFromSales,
      visitor_presale_baseline: visitorPresaleBaseline,

      // 24小时分布
      hourly_presale: hourlyPresale,
      hourly_midsale: hourlyMidsale,
      hourly_aftersale: hourlyAftersale,
      hourly_total: hourlyTotal,

      // 真实敏感度分析
      sensitivity: {
        avg_order_value: sensitivityOv,   // 客单价降低10%时，人力变化量（负=减少）
        conversion_rate: sensitivityCr    // 转化率提升10%时，人力变化量（正=增加）
      }
    };
  }
}
