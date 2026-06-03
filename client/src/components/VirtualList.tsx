/**
 * 虚拟滚动列表组件
 * 用于优化大列表渲染性能
 *
 * 注意：由于 react-window 在 Electron 环境中可能存在兼容性问题
 * 这里提供一个简化的实现版本
 */

import { Empty } from '@arco-design/web-react';
import { useRef, useState, useEffect, CSSProperties } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyText?: string;
}

/**
 * 简化版虚拟列表
 * 只渲染可见区域的元素
 */
export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  emptyText = '暂无数据'
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={emptyText} />
      </div>
    );
  }

  // 计算可见区域
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(height / itemHeight) + 1,
    items.length
  );

  // 总高度
  const totalHeight = items.length * itemHeight;

  // 处理滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // 渲染可见项
  const visibleItems = items.slice(startIndex, endIndex).map((item, idx) => {
    const actualIndex = startIndex + idx;
    const top = actualIndex * itemHeight;

    return (
      <div
        key={actualIndex}
        style={{
          position: 'absolute',
          top,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(item, actualIndex)}
      </div>
    );
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

// 带加载更多的虚拟列表
interface InfiniteVirtualListProps<T> extends VirtualListProps<T> {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loadingText?: string;
}

export function InfiniteVirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  hasMore,
  isLoading,
  onLoadMore,
  emptyText = '暂无数据',
  loadingText = '加载中...'
}: InfiniteVirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0 && !isLoading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={emptyText} />
      </div>
    );
  }

  // 检测是否接近底部
  useEffect(() => {
    if (!containerRef.current || isLoading || !hasMore) return;

    const container = containerRef.current;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;

    // 距离底部小于500px时加载
    if (scrollBottom < 500) {
      onLoadMore();
    }
  }, [scrollTop, isLoading, hasMore, onLoadMore]);

  // 计算可见区域
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(height / itemHeight) + 1,
    items.length
  );

  // 总高度（包括加载指示器）
  const totalHeight = items.length * itemHeight + (hasMore ? itemHeight : 0);

  // 处理滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // 渲染可见项
  const visibleItems = items.slice(startIndex, endIndex).map((item, idx) => {
    const actualIndex = startIndex + idx;
    const top = actualIndex * itemHeight;

    return (
      <div
        key={actualIndex}
        style={{
          position: 'absolute',
          top,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(item, actualIndex)}
      </div>
    );
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
        {hasMore && (
          <div
            style={{
              position: 'absolute',
              top: items.length * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading ? loadingText : <button onClick={onLoadMore}>加载更多</button>}
          </div>
        )}
      </div>
    </div>
  );
}
