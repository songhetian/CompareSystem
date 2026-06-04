import { ManpowerCalculator } from './src/utils/calculator.ts';
import dayjs from 'dayjs';

// Arrange: Create a 7-day test scenario with day 4 as peak date
const targetSales = 100000;
const days = 7;
const calcStartDate = dayjs('2024-01-01');
const peakDate = calcStartDate.add(3, 'day'); // Day 4

const params = {
  avg_order_value: 160,
  daily_visitors: 1000,
  peak_factor: 1.2,
  safety_buffer: 1.15,
  visitor_to_presale: 0.25,
  consult_to_order: 0.6,
  order_to_payment: 0.9,
  midsale_ratio: 0.35,
  payment_to_aftersale: 0.15,
  presale_time_offset: 2,
  midsale_time_offset: 0,
  aftersale_time_offset: 3,
  presale_handle_time: 4.5,
  presale_saturation: 0.78,
  midsale_handle_time: 3.0,
  midsale_saturation: 0.82,
  aftersale_handle_time: 6.5,
  aftersale_saturation: 0.72,
  peak_day_factor: 1.5
};

const result = ManpowerCalculator.calculateWithShifts(
  targetSales,
  days,
  null,
  [peakDate],
  calcStartDate,
  params,
  undefined,
  undefined,
  1,
  undefined
);

const dailyResults = result.daily_results;
