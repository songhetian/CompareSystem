import { describe, it, expect } from 'vitest';
import { ManpowerCalculator, type CalcParams } from './calculator';
import dayjs from 'dayjs';

describe('ManpowerCalculator - New Factors (Availability & Complexity)', () => {
  const baseParams: CalcParams = {
    avg_order_value: 100,
    daily_visitors: 1000,
    peak_factor: 1.0,
    safety_buffer: 1.0,
    visitor_to_presale: 0.1,
    consult_to_order: 1.0,
    order_to_payment: 1.0,
    midsale_ratio: 0,
    payment_to_aftersale: 0,
    presale_time_offset: 0,
    midsale_time_offset: 0,
    aftersale_time_offset: 0,
    presale_handle_time: 6, // 10 per hour
    presale_saturation: 1.0,
    midsale_handle_time: 6,
    midsale_saturation: 1.0,
    aftersale_handle_time: 6,
    aftersale_saturation: 1.0,
    max_concurrent_sessions: 1,
    concurrent_efficiency_loss: 0,
    novice_ratio: 0,
    novice_efficiency: 1,
    expert_ratio: 0,
    expert_efficiency: 1,
    actual_availability_rate: 1.0, // Base
    response_rate: 1.0,
    simple_problem_ratio: 0, // Base
    simple_time_factor: 1,
    complex_problem_ratio: 0, // Base
    complex_time_factor: 1,
  };

  it('should increase staff requirement when availability rate decreases', () => {
    const targetSales = 24000; // 240 orders -> 10/hour -> 1 person needed at 100% capacity
    
    // 100% availability
    const params1 = { ...baseParams, actual_availability_rate: 1.0 };
    const res1 = ManpowerCalculator.calculateWithShifts(targetSales, 1, null, [], dayjs(), params1);
    
    // 50% availability
    const params2 = { ...baseParams, actual_availability_rate: 0.5 };
    const res2 = ManpowerCalculator.calculateWithShifts(targetSales, 1, null, [], dayjs(), params2);
    
    // At 50% availability, we need 2x people
    // res1: 10 calls/hr * 1.5 (presale correction) = 15. Standard capacity = 10 calls/hr. 15/10 = 1.5 -> ceil = 2.
    // res2: (15 / 10) / 0.5 = 3.0 -> ceil = 3.
    // Wait, let's trace: 
    // targetSales 24000, avg_order_value 100 -> 240 orders.
    // days 1 -> 240 orders/day.
    // peak_factor 1.0, safety_buffer 1.0.
    // Hour HV = (240 / 24) * 1.0 * 1.0 * 1.5 (presale) = 15.
    // Cap = (60/6) * 1.0 * 1.0 = 10.
    // res1 (avail 1.0) = ceil(15 / 10) = 2.
    // res2 (avail 0.5) = ceil(15 / (10 * 0.5)) = 3.
    // Let's adjust target to be more divisible.
    const divisTarget = 16000; // 160 orders -> 160/24 * 1.5 = 10 calls/hr peak.
    // Cap 10. 
    // res1 = 10 / 10 = 1 -> ceil = 1.
    // res2 = 10 / (10 * 0.5) = 2 -> ceil = 2.
    
    const r1 = ManpowerCalculator.calculateWithShifts(divisTarget, 1, null, [], dayjs(), params1);
    const r2 = ManpowerCalculator.calculateWithShifts(divisTarget, 1, null, [], dayjs(), params2);
    
    expect(r2.needed_staff).toBe(r1.needed_staff * 2);
  });

  it('should increase staff requirement when complex problem ratio increases', () => {
    const targetSales = 16000; 
    
    // No complex problems (baseParams has complexityFactor = 1.0)
    const res1 = ManpowerCalculator.calculateWithShifts(targetSales, 1, null, [], dayjs(), baseParams);
    
    // 100% complex problems with 2x time factor -> complexityFactor = 2.0
    const params2 = { 
      ...baseParams, 
      complex_problem_ratio: 1.0, 
      complex_time_factor: 2.0 
    };
    const res2 = ManpowerCalculator.calculateWithShifts(targetSales, 1, null, [], dayjs(), params2);
    
    expect(res2.needed_staff).toBe(res1.needed_staff * 2);
  });

  it('should decrease staff requirement when simple problem ratio increases', () => {
    const targetSales = 24000;
    
    // Base case
    const res1 = ManpowerCalculator.calculateWithShifts(targetSales, 1, null, [], dayjs(), baseParams);
    
    // 100% simple problems with 0.5x time factor
    const params2 = { 
      ...baseParams, 
      simple_problem_ratio: 1.0, 
      simple_time_factor: 0.5 
    };
    const res2 = ManpowerCalculator.calculateWithShifts(targetSales, 1, null, [], dayjs(), params2);
    
    // Note: Math.ceil will round up, so we need a larger target to see the effect clearly
    const largeTarget = 240000; // 10 people needed
    const res1Large = ManpowerCalculator.calculateWithShifts(largeTarget, 1, null, [], dayjs(), baseParams);
    const res2Large = ManpowerCalculator.calculateWithShifts(largeTarget, 1, null, [], dayjs(), params2);
    
    expect(res2Large.needed_staff).toBe(Math.ceil(res1Large.needed_staff * 0.5));
  });
});
