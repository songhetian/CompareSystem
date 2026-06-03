import { useRef, useCallback, useEffect } from 'react';

interface WorkerMessage {
  type: string;
  data?: any;
  id?: string;
  success?: boolean;
  error?: string;
}

interface UseCalculatorWorkerOptions {
  onResult?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useCalculatorWorker(options: UseCalculatorWorkerOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());

  // 初始化 Worker
  useEffect(() => {
    // 在 Electron 环境中，需要特殊处理 Worker
    // 这里使用动态 import 的方式
    try {
      // 注意：在实际 Electron 环境中，Worker 的创建方式可能需要调整
      // 因为 Electron 的渲染进程对 Worker 的支持有限
      // 我们可以使用 inline worker 或者通过 Blob URL 创建

      const workerCode = `
        // Worker 内联代码
        ${calculateManpowerCode}

        self.addEventListener('message', function(event) {
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
                const results = data.map(item => calculateManpower(item));
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
          } catch (error) {
            self.postMessage({
              type: 'ERROR',
              error: error.message,
              id,
              success: false
            });
          }
        });
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);

      // 监听 Worker 消息
      workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, data, id, success, error } = event.data;

        if (id && callbacksRef.current.has(id)) {
          const callbacks = callbacksRef.current.get(id)!;

          if (success) {
            callbacks.resolve(data);
            options.onResult?.(data);
          } else {
            callbacks.reject(new Error(error || 'Worker calculation failed'));
            options.onError?.(error || 'Unknown error');
          }

          callbacksRef.current.delete(id);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        options.onError?.(error.message);
      };

      return () => {
        workerRef.current?.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    } catch (error) {
      console.error('Failed to create worker:', error);
      // Worker 不可用时的降级处理
    }
  }, []);

  // 计算函数
  const calculate = useCallback((data: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        // 如果 Worker 不可用，直接使用主线程计算（降级）
        reject(new Error('Worker not available'));
        return;
      }

      const id = `calc_${Date.now()}_${Math.random()}`;
      callbacksRef.current.set(id, { resolve, reject });

      workerRef.current.postMessage({
        type: 'CALCULATE',
        data,
        id,
      });

      // 设置超时
      setTimeout(() => {
        if (callbacksRef.current.has(id)) {
          callbacksRef.current.delete(id);
          reject(new Error('Calculation timeout'));
        }
      }, 30000); // 30秒超时
    });
  }, []);

  // 批量计算
  const batchCalculate = useCallback((dataList: any[]): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = `batch_${Date.now()}_${Math.random()}`;
      callbacksRef.current.set(id, { resolve, reject });

      workerRef.current.postMessage({
        type: 'BATCH_CALCULATE',
        data: dataList,
        id,
      });

      setTimeout(() => {
        if (callbacksRef.current.has(id)) {
          callbacksRef.current.delete(id);
          reject(new Error('Batch calculation timeout'));
        }
      }, 60000); // 60秒超时
    });
  }, []);

  return {
    calculate,
    batchCalculate,
    isAvailable: workerRef.current !== null,
  };
}

// Worker 计算函数代码（字符串形式，用于内联）
const calculateManpowerCode = `
function calculateManpower(data) {
  const {
    targetSales,
    days,
    eventDates,
    params,
  } = data;

  const avgPrice = params?.avg_price || 200;
  const conversionRate = params?.conversion_rate || 0.15;
  const consultPerStaff = params?.consult_per_staff || 50;

  const totalSales = targetSales;
  const totalOrders = totalSales / avgPrice;
  const totalConsults = totalOrders / conversionRate;
  const dailyConsults = totalConsults / days;

  const baseStaff = Math.ceil(dailyConsults / consultPerStaff);

  const presaleRatio = params?.presale_ratio || 0.4;
  const midsaleRatio = params?.midsale_ratio || 0.35;
  const aftersaleRatio = params?.aftersale_ratio || 0.25;

  const presaleStaff = Math.ceil(baseStaff * presaleRatio);
  const midsaleStaff = Math.ceil(baseStaff * midsaleRatio);
  const aftersaleStaff = Math.ceil(baseStaff * aftersaleRatio);

  const dailyResults = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(data.calcStartDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

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

  const hourlyTotal = Array(24).fill(0).map((_, hour) => {
    const peakHours = [10, 11, 14, 15, 16, 19, 20, 21];
    const factor = peakHours.includes(hour) ? 1.2 : 0.8;
    return baseStaff * factor / 3;
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
`;
