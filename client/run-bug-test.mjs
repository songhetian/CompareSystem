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
const day3 = dailyResults[2];
const day4 = dailyResults[3];

console.log('=== Bug Condition Exploration Results ===');
console.log(`Day 3 (non-peak): staff=${day3.staff}, isPeakDay=${day3.isPeakDay}`);
console.log(`Day 4 (peak): staff=${day4.staff}, isPeakDay=${day4.isPeakDay}`);
console.log(`Expected day 4 staff (with 1.5x multiplier): ${day3.staff * 1.5}`);
console.log(`Actual day 4 staff: ${day4.staff}`);
console.log(`Difference: ${day4.staff - day3.staff} (${((day4.staff / day3.staff - 1) * 100).toFixed(1)}% increase)`);
console.log(`Expected minimum increase (30%): ${(day3.staff * 1.3).toFixed(1)}`);
console.log('=========================================');
console.log('\nAll daily results:');
dailyResults.forEach((day, i) => {
  console.log(`Day ${i+1} (${day.fullDate}): staff=${day.staff}, isPeakDay=${day.isPeakDay}`);
});
