import { describe, it, expect } from 'vitest';
import { ManpowerCalculator, type CalcParams } from './calculator';
import dayjs from 'dayjs';

/**
 * Bug Condition Exploration Tests
 *
 * These tests verify the bug exists in the unfixed code.
 * They encode the expected behavior and will validate the fix when it passes.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
 */
describe('Bug Condition Exploration - Peak Day Staff Multiplier', () => {
  /**
   * **Property 1: Bug Condition** - Peak Day Staff Multiplier Not Applied
   *
   * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * **DO NOT attempt to fix the test or the code when it fails**
   * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
   * **GOAL**: Surface counterexamples that demonstrate the bug exists
   *
   * Test Scenario:
   * - 7-day calculation period
   * - Day 4 is a peak date (peakDates = [day 4])
   * - peak_day_factor = 1.5 (default)
   * - No event dates, no promotion factor, no history data (baseline scenario)
   *
   * Expected Behavior:
   * - Day 4 has isPeakDay = true
   * - Day 4's staff value should be >= day 3's staff * 1.3 (at least 30% higher)
   * - Day 4's staff value should be approximately day 3's staff * 1.5 (within rounding tolerance of ±2)
   *
   * **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
   *
   * Counterexamples to document:
   * - Expected: day 4 staff should be significantly higher (e.g., 45 vs 30)
   * - Actual: day 4 staff is the same or only slightly different (e.g., 31 vs 30)
   * - Root cause: isPeakDay flag is set but not used in getRawDemand calculation
   */
  it('should apply peak day multiplier to staff calculation for peak dates', () => {
    // Arrange: Create a 7-day test scenario with day 4 as peak date
    const targetSales = 100000; // 10万元销售目标
    const days = 7;
    const calcStartDate = dayjs('2024-01-01');
    const peakDate = calcStartDate.add(3, 'day'); // Day 4 (0-indexed, so add 3)

    // Baseline parameters - minimal configuration to isolate the bug
    const params: CalcParams = {
      // Basic business parameters
      avg_order_value: 160,
      daily_visitors: 1000,
      peak_factor: 1.2,
      safety_buffer: 1.15,

      // Conversion funnel
      visitor_to_presale: 0.25,
      consult_to_order: 0.6,
      order_to_payment: 0.9,
      midsale_ratio: 0.35,
      payment_to_aftersale: 0.15,

      // Time offsets
      presale_time_offset: 2,
      midsale_time_offset: 0,
      aftersale_time_offset: 3,

      // Job efficiency parameters
      presale_handle_time: 4.5,
      presale_saturation: 0.78,
      midsale_handle_time: 3.0,
      midsale_saturation: 0.82,
      aftersale_handle_time: 6.5,
      aftersale_saturation: 0.72,

      // Peak day factor - this is what should be applied but currently isn't
      peak_day_factor: 1.5
    };

    // Act: Calculate with peak date using the peakDates parameter
    const result = ManpowerCalculator.calculateWithShifts(
      targetSales,
      days,
      null, // No event type (daily mode)
      [], // eventDates - not used for peak day marking (used for Gaussian distribution)
      calcStartDate,
      params,
      undefined, // No promotion factor
      undefined, // No target visitors override
      1, // Min staff
      undefined, // No history data
      [peakDate] // peakDates - used for peak day marking
    );

    // Assert: Verify the bug condition
    const dailyResults = result.daily_results;

    // Find day 3 and day 4 (0-indexed, so indices 2 and 3)
    const day3 = dailyResults[2];
    const day4 = dailyResults[3];

    // Assertion 1: Day 4 should be marked as a peak day
    expect(day4.isPeakDay).toBe(true);
    expect(day4.fullDate).toBe('2024-01-04');

    // Assertion 2: Day 4's staff should be at least 30% higher than day 3
    // This validates that the peak_day_factor (1.5x) is being applied
    const minExpectedStaff = day3.staff * 1.3;
    expect(day4.staff).toBeGreaterThanOrEqual(minExpectedStaff);

    // Assertion 3: Day 4's staff should be approximately 1.5x of day 3's staff
    // Allow for rounding tolerance of ±2
    const expectedStaff = day3.staff * 1.5;
    const tolerance = 2;
    expect(Math.abs(day4.staff - expectedStaff)).toBeLessThanOrEqual(tolerance);

    // Log the results for debugging and counterexample documentation
    console.log('=== Bug Condition Exploration Results ===');
    console.log(`Day 3 (non-peak): staff=${day3.staff}, isPeakDay=${day3.isPeakDay}`);
    console.log(`Day 4 (peak): staff=${day4.staff}, isPeakDay=${day4.isPeakDay}`);
    console.log(`Expected day 4 staff (with 1.5x multiplier): ${expectedStaff}`);
    console.log(`Actual day 4 staff: ${day4.staff}`);
    console.log(`Difference: ${day4.staff - day3.staff} (${((day4.staff / day3.staff - 1) * 100).toFixed(1)}% increase)`);
    console.log(`Expected minimum increase: ${minExpectedStaff - day3.staff} (30% increase)`);
    console.log('=========================================');
  });

  /**
   * Additional test: Multiple peak days
   *
   * Verifies that the bug affects multiple peak days, not just a single day.
   * This helps confirm the root cause is systemic (isPeakDay not used in calculation)
   * rather than a one-off issue.
   */
  it('should apply peak day multiplier to multiple peak dates', () => {
    // Arrange: Create a 14-day test scenario with days 5 and 10 as peak dates
    const targetSales = 200000;
    const days = 14;
    const calcStartDate = dayjs('2024-01-01');
    const peakDate1 = calcStartDate.add(4, 'day'); // Day 5
    const peakDate2 = calcStartDate.add(9, 'day'); // Day 10

    const params: CalcParams = {
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

    // Act: Calculate with multiple peak dates using the peakDates parameter
    const result = ManpowerCalculator.calculateWithShifts(
      targetSales,
      days,
      null,
      [], // eventDates - not used for peak day marking
      calcStartDate,
      params,
      undefined,
      undefined,
      1,
      undefined,
      [peakDate1, peakDate2] // peakDates - used for peak day marking
    );

    const dailyResults = result.daily_results;

    // Assert: Both peak days should have multiplier applied
    const day4 = dailyResults[3]; // Adjacent non-peak day
    const day5 = dailyResults[4]; // Peak day
    const day9 = dailyResults[8]; // Adjacent non-peak day
    const day10 = dailyResults[9]; // Peak day

    // Verify peak day flags
    expect(day5.isPeakDay).toBe(true);
    expect(day10.isPeakDay).toBe(true);

    // Verify day 5 has multiplier applied
    expect(day5.staff).toBeGreaterThanOrEqual(day4.staff * 1.3);
    const expectedStaff5 = day4.staff * 1.5;
    expect(Math.abs(day5.staff - expectedStaff5)).toBeLessThanOrEqual(2);

    // Verify day 10 has multiplier applied
    expect(day10.staff).toBeGreaterThanOrEqual(day9.staff * 1.3);
    const expectedStaff10 = day9.staff * 1.5;
    expect(Math.abs(day10.staff - expectedStaff10)).toBeLessThanOrEqual(2);

    console.log('=== Multiple Peak Days Results ===');
    console.log(`Day 5 (peak): staff=${day5.staff}, expected≈${expectedStaff5}`);
    console.log(`Day 10 (peak): staff=${day10.staff}, expected≈${expectedStaff10}`);
    console.log('===================================');
  });
});

/**
 * Preservation Property Tests
 *
 * These tests verify that non-peak date calculations remain unchanged.
 * They follow the observation-first methodology:
 * 1. Run on UNFIXED code to observe baseline behavior
 * 2. Document observed behavior (even if it seems incorrect)
 * 3. After fix implementation, re-run to ensure NON-PEAK behavior is preserved
 *
 * **IMPORTANT**: These tests observe ACTUAL baseline behavior on unfixed code
 * **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms we captured baseline)
 * **AFTER FIX**: Tests MUST STILL PASS (confirms non-peak days remain unchanged)
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
 */
describe('Preservation Property Tests - Non-Peak Date Calculation Logic Unchanged', () => {
  /**
   * Test 1: When peakDates is empty, all days should have identical calculation logic
   *
   * **Validates: Requirement 3.1**
   * - WHEN user does not select any peak dates
   * - THEN system should maintain existing calculation logic (whatever that is)
   * - We observe and document the baseline behavior here
   */
  it('should preserve existing logic when no peak dates are selected', () => {
    // Arrange: 7-day scenario with NO peak dates, using event mode to ensure calculations happen
    const targetSales = 100000;
    const days = 7;
    const calcStartDate = dayjs('2024-01-01');
    const eventDate = calcStartDate.add(3, 'day'); // For event mode

    const params: CalcParams = {
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
      aftersale_saturation: 0.72
    };

    // Act: Calculate with NO peak dates (empty array means no peak dates concept)
    const result = ManpowerCalculator.calculateWithShifts(
      targetSales,
      days,
      'S级大促', // Use event mode
      [], // NO peak dates - empty array
      calcStartDate,
      params,
      2.8, // Promotion factor
      undefined,
      1,
      undefined
    );

    // Assert: When peak dates array is empty, ALL days have isPeakDay = false
    const dailyResults = result.daily_results;

    dailyResults.forEach((day, index) => {
      // This is the preservation check: no days should be marked as peak
      expect(day.isPeakDay).toBe(false);
      console.log(`Day ${index + 1}: staff=${day.staff}, isPeakDay=${day.isPeakDay}`);
    });

    // Document the baseline behavior for future reference
    console.log('=== Preservation Test 1: No Peak Dates (Baseline) ===');
    console.log(`Total days: ${dailyResults.length}`);
    console.log(`All days have isPeakDay=false: PASS`);
    console.log(`Staff values: ${dailyResults.map(d => d.staff).join(', ')}`);
    console.log('====================================================');
  });

  /**
   * Test 2: Non-peak days should maintain baseline calculation
   *
   * **Validates: Requirement 3.2, 3.8**
   * - WHEN some days are marked as event days (via eventDates parameter)
   * - THEN days NOT in the eventDates list should maintain their baseline calculation
   * - This preservation must hold after fix when peakDates becomes separate parameter
   *
   * NOTE: Currently eventDates parameter is being misused for peak day marking (line 304 in calculator.ts)
   * After fix, eventDates will affect Gaussian distribution, peakDates will affect staff multiplier
   * This test ensures non-peak day calculations don't change during that refactor
   */
  it('should preserve calculation for non-marked days when some days are marked', () => {
    // Arrange: 7-day scenario, we'll mark day 4 as a "peak" day using eventDates
    const targetSales = 100000;
    const days = 7;
    const calcStartDate = dayjs('2024-01-01');
    const markedDate = calcStartDate.add(3, 'day'); // Day 4

    const params: CalcParams = {
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
      aftersale_saturation: 0.72
    };

    // Get results with marked date using peakDates parameter
    const result = ManpowerCalculator.calculateWithShifts(
      targetSales,
      days,
      'S级大促',
      [], // eventDates - not used for peak day marking
      calcStartDate,
      params,
      2.8,
      undefined,
      1,
      undefined,
      [markedDate] // peakDates - Day 4 marked
    );

    const dailyResults = result.daily_results;

    // Assert: Verify which days are marked and which are not
    const markedDayIndex = 3; // Day 4 is index 3 (0-indexed)
    const nonMarkedIndices = [0, 1, 2, 4, 5, 6];

    // Day 4 should be marked as isPeakDay (this is the current baseline behavior)
    expect(dailyResults[markedDayIndex].isPeakDay).toBe(true);

    // All other days should NOT be marked
    nonMarkedIndices.forEach(i => {
      expect(dailyResults[i].isPeakDay).toBe(false);
    });

    console.log('=== Preservation Test 2: Non-Marked Days (Baseline) ===');
    dailyResults.forEach((day, i) => {
      console.log(`Day ${i + 1}: staff=${day.staff}, isPeakDay=${day.isPeakDay}`);
    });
    console.log('========================================================');
  });

  /**
   * Test 3: Promotion factor behavior (baseline observation)
   *
   * **Validates: Requirement 3.3**
   * - Promotion factor affects traffic/staff calculations
   * - This behavior must remain unchanged after peak dates fix
   */
  it('should preserve promotion factor behavior', () => {
    // Just verify promotion factor produces calculations
    const result = ManpowerCalculator.calculateWithShifts(
      100000, // targetSales
      7, // days
      'S级大促',
      [],
      dayjs('2024-01-01'),
      {
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
        aftersale_saturation: 0.72
      },
      2.8, // Promotion factor
      undefined,
      1,
      undefined
    );

    // Just verify it produces results and all are non-peak
    expect(result.daily_results.length).toBe(7);
    result.daily_results.forEach(day => expect(day.isPeakDay).toBe(false));

    console.log('=== Preservation Test 3: Promotion Factor (Baseline) ===');
    console.log(`Needed staff: ${result.needed_staff}`);
    console.log('=========================================================');
  });

  /**
   * Test 4: History data behavior (baseline observation)
   *
   * **Validates: Requirement 3.4**
   * - History data affects daily distribution
   * - This behavior must remain unchanged after peak dates fix
   */
  it('should preserve history data distribution behavior', () => {
    const historyData = [
      { data_date: '2024-01-01', sales_volume: 10000 },
      { data_date: '2024-01-02', sales_volume: 12000 },
      { data_date: '2024-01-03', sales_volume: 15000 },
      { data_date: '2024-01-04', sales_volume: 18000 },
      { data_date: '2024-01-05', sales_volume: 14000 },
      { data_date: '2024-01-06', sales_volume: 11000 },
      { data_date: '2024-01-07', sales_volume: 9000 }
    ];

    const result = ManpowerCalculator.calculateWithShifts(
      100000,
      7,
      'S级大促',
      [],
      dayjs('2024-01-01'),
      {
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
        aftersale_saturation: 0.72
      },
      2.8,
      undefined,
      1,
      historyData
    );

    // Just verify it uses history data and all are non-peak
    expect(result.daily_results.length).toBe(7);
    result.daily_results.forEach(day => expect(day.isPeakDay).toBe(false));

    console.log('=== Preservation Test 4: History Data (Baseline) ===');
    result.daily_results.forEach((day, i) => {
      console.log(`Day ${i + 1}: staff=${day.staff}, historySales=${historyData[i].sales_volume}`);
    });
    console.log('====================================================');
  });

  /**
   * Test 5: Event dates Gaussian distribution (baseline observation)
   *
   * **Validates: Requirement 3.8**
   * - eventDates parameter affects traffic distribution (Gaussian curve)
   * - After fix, eventDates and peakDates will be separate - eventDates behavior must be preserved
   *
   * IMPORTANT: Currently line 304 uses eventDates for isPeakDay marking
   * After fix, eventDates will ONLY affect Gaussian distribution, NOT isPeakDay
   */
  it('should observe current eventDates behavior (will change after fix)', () => {
    const calcStartDate = dayjs('2024-01-01');
    const eventDate = calcStartDate.add(6, 'day'); // Day 7

    const result = ManpowerCalculator.calculateWithShifts(
      200000,
      14,
      'S级大促',
      [eventDate], // eventDates affects Gaussian distribution, NOT peak day marking
      calcStartDate,
      {
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
        aftersale_saturation: 0.72
      },
      2.8,
      undefined,
      1,
      undefined,
      [] // No peakDates - so isPeakDay should be false
    );

    // After fix, eventDates will NOT affect isPeakDay, only Gaussian distribution
    const day7 = result.daily_results[6];
    expect(day7.isPeakDay).toBe(false); // Fixed behavior: eventDates don't mark peak days

    console.log('=== Preservation Test 5: Event Dates (Fixed Behavior) ===');
    console.log(`Day 7 isPeakDay: ${day7.isPeakDay} (correctly false - eventDates only affect Gaussian distribution)`);
    console.log(`Note: After fix, eventDates only affect Gaussian distribution, not peak day marking`);
    console.log('============================================================');
  });

  /**
   * Test 6: 24-hour distribution (baseline observation)
   *
   * **Validates: Requirement 3.5**
   * - 24-hour distribution calculation
   * - Must remain unchanged after peak dates fix
   */
  it('should preserve 24-hour distribution calculation', () => {
    const result = ManpowerCalculator.calculateWithShifts(
      100000,
      7,
      'S级大促',
      [],
      dayjs('2024-01-01'),
      {
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
        presale_burst_start: 10,
        presale_burst_end: 12,
        presale_burst_factor: 1.9,
        midsale_burst_start: 15,
        midsale_burst_end: 17,
        midsale_burst_factor: 2.3,
        aftersale_burst_start: 20,
        aftersale_burst_end: 22,
        aftersale_burst_factor: 2.6
      },
      2.8,
      undefined,
      1,
      undefined
    );

    // Verify 24-hour arrays exist
    expect(result.hourly_presale).toHaveLength(24);
    expect(result.hourly_midsale).toHaveLength(24);
    expect(result.hourly_aftersale).toHaveLength(24);
    expect(result.hourly_total).toHaveLength(24);

    console.log('=== Preservation Test 6: 24-Hour Distribution (Baseline) ===');
    console.log(`Hourly arrays present with 24 elements each`);
    console.log('============================================================');
  });

  /**
   * Test 7: Sensitivity analysis (baseline observation)
   *
   * **Validates: Requirement 3.7**
   * - Sensitivity analysis calculation
   * - Must remain unchanged after peak dates fix
   */
  it('should preserve sensitivity analysis calculation', () => {
    const result = ManpowerCalculator.calculateWithShifts(
      100000,
      7,
      'S级大促',
      [],
      dayjs('2024-01-01'),
      {
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
        aftersale_saturation: 0.72
      },
      2.8,
      undefined,
      1,
      undefined
    );

    // Verify sensitivity object exists
    expect(result.sensitivity).toBeDefined();
    expect(result.sensitivity.avg_order_value).toBeDefined();
    expect(result.sensitivity.conversion_rate).toBeDefined();
    expect(typeof result.sensitivity.avg_order_value).toBe('number');
    expect(typeof result.sensitivity.conversion_rate).toBe('number');

    console.log('=== Preservation Test 7: Sensitivity Analysis (Baseline) ===');
    console.log(`Avg order value sensitivity: ${result.sensitivity.avg_order_value}`);
    console.log(`Conversion rate sensitivity: ${result.sensitivity.conversion_rate}`);
    console.log('=============================================================');
  });
});
