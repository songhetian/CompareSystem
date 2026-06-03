/**
 * 性能监控工具
 * 用于监控和优化应用性能
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  type: 'api' | 'render' | 'calculation' | 'custom';
  metadata?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100; // 最多保存100条记录
  private timers: Map<string, number> = new Map();

  /**
   * 开始计时
   */
  start(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * 结束计时并记录
   */
  end(
    name: string,
    type: PerformanceMetric['type'] = 'custom',
    metadata?: any
  ): number {
    const startTime = this.timers.get(name);

    if (startTime === undefined) {
      console.warn(`Performance timer "${name}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      type,
      metadata,
    };

    this.metrics.push(metric);

    // 限制记录数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 开发环境下打印慢操作
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * 测量异步函数
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    type: PerformanceMetric['type'] = 'custom',
    metadata?: any
  ): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name, type, metadata);
      return result;
    } catch (error) {
      this.end(name, type, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * 测量同步函数
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    type: PerformanceMetric['type'] = 'custom',
    metadata?: any
  ): T {
    this.start(name);
    try {
      const result = fn();
      this.end(name, type, metadata);
      return result;
    } catch (error) {
      this.end(name, type, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(type?: PerformanceMetric['type']): PerformanceMetric[] {
    if (type) {
      return this.metrics.filter(m => m.type === type);
    }
    return [...this.metrics];
  }

  /**
   * 获取统计信息
   */
  getStats(name?: string) {
    const filtered = name
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filtered.length === 0) {
      return null;
    }

    const durations = filtered.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    // 计算中位数
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      count: filtered.length,
      avg: avg.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      median: median.toFixed(2),
      total: sum.toFixed(2),
    };
  }

  /**
   * 清空所有指标
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const report: string[] = [];
    report.push('=== Performance Report ===\n');

    // 按类型分组统计
    const types: PerformanceMetric['type'][] = ['api', 'render', 'calculation', 'custom'];

    types.forEach(type => {
      const typeMetrics = this.getMetrics(type);
      if (typeMetrics.length > 0) {
        report.push(`\n${type.toUpperCase()}:`);

        // 获取该类型下的所有操作名称
        const names = [...new Set(typeMetrics.map(m => m.name))];

        names.forEach(name => {
          const stats = this.getStats(name);
          if (stats) {
            report.push(
              `  ${name}: ${stats.count} calls, avg: ${stats.avg}ms, min: ${stats.min}ms, max: ${stats.max}ms`
            );
          }
        });
      }
    });

    return report.join('\n');
  }

  /**
   * 打印性能报告
   */
  printReport(): void {
    console.log(this.generateReport());
  }

  /**
   * 监控 React 组件渲染
   */
  monitorRender(componentName: string, renderCount: number, actualDuration: number): void {
    const metric: PerformanceMetric = {
      name: componentName,
      duration: actualDuration,
      timestamp: Date.now(),
      type: 'render',
      metadata: { renderCount },
    };

    this.metrics.push(metric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();

// React Hook
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
  });

  return {
    start: (name: string) => performanceMonitor.start(`${componentName}.${name}`),
    end: (name: string, metadata?: any) =>
      performanceMonitor.end(`${componentName}.${name}`, 'render', metadata),
    measure: async <T,>(name: string, fn: () => Promise<T>) =>
      performanceMonitor.measure(`${componentName}.${name}`, fn, 'render'),
    measureSync: <T,>(name: string, fn: () => T) =>
      performanceMonitor.measureSync(`${componentName}.${name}`, fn, 'render'),
    renderCount: renderCount.current,
  };
}

// 性能装饰器（用于类方法）
export function measurePerformance(type: PerformanceMetric['type'] = 'custom') {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const name = `${target.constructor.name}.${propertyKey}`;
      performanceMonitor.start(name);

      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.end(name, type);
        return result;
      } catch (error) {
        performanceMonitor.end(name, type, { error: true });
        throw error;
      }
    };

    return descriptor;
  };
}

// 全局性能监控初始化
export function initPerformanceMonitoring() {
  // 监控页面加载性能
  if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;

      console.log(`📊 Page Load Performance:
  - Total Load Time: ${loadTime}ms
  - DOM Ready: ${domReady}ms
  - DOM Interactive: ${timing.domInteractive - timing.navigationStart}ms
      `);
    });
  }

  // 定期清理过期指标
  setInterval(() => {
    const stats = performanceMonitor.getStats();
    if (stats && stats.count > 50) {
      console.log('🔄 Performance metrics cleaned');
      performanceMonitor.clear();
    }
  }, 5 * 60 * 1000); // 每5分钟

  // 开发环境下添加全局访问
  if (process.env.NODE_ENV === 'development') {
    (window as any).performanceMonitor = performanceMonitor;
    console.log('💡 Performance monitor available at window.performanceMonitor');
  }
}
