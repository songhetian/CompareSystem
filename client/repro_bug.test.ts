import { it, expect } from 'vitest';
import { ManpowerCalculator } from './src/utils/calculator';
import dayjs from 'dayjs';

const params = {
  avg_order_value: 160.0,
  peak_factor: 1.2,
  safety_buffer: 1.15,
  peak_day_factor: 1.5,
  daily_visitors: 1000.0,
  visitor_to_presale: 0.25,
  presale_time_offset: 2.0,
  midsale_ratio: 0.35,
  consult_to_order: 0.6,
  order_to_payment: 0.9,
  payment_to_aftersale: 0.15,
  presale_handle_time: 4.5,
  presale_saturation: 0.78,
  midsale_handle_time: 3.0,
  midsale_saturation: 0.82,
  aftersale_handle_time: 6.5,
  aftersale_saturation: 0.72,
  max_concurrent_sessions: 3,
  concurrent_efficiency_loss: 0.15,
  simple_problem_ratio: 0.5,
  simple_time_factor: 0.6,
  complex_problem_ratio: 0.15,
  complex_time_factor: 2.0,
  novice_ratio: 0.2,
  novice_efficiency: 0.6,
  expert_ratio: 0.15,
  expert_efficiency: 1.4,
  ai_assist_usage: 0.3,
  ai_efficiency_gain: 1.3,
  actual_availability_rate: 0.85,
  response_rate: 0.95,
  schedule_inefficiency: 0.08,
  first_call_resolution: 0.85,
  service_level_factor: 1.1,
  event_a: 1.9, // Default A-level factor
};

it('reproduce the user scenario: 1234w sales, 06-05 to 06-13, peak 06-11, A-level event', () => {
const targetSales = 12340000;
const start = dayjs('2026-06-05');
const end = dayjs('2026-06-13');
const days = end.diff(start, 'day') + 1; // 9 days

const peakDate = dayjs('2026-06-11');

// Passing 'A级活动' as eventType
const result = ManpowerCalculator.calculateWithShifts(
  targetSales,
  days,
  'A级活动',
  [],
  start,
  params as any,
  undefined,
  undefined,
  1,
  undefined,
  [peakDate]
);

console.log('Needed staff (theoretical peak with A-level event):', result.theoretical_peak);
});
