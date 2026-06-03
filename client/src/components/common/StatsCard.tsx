/**
 * 统计卡片组件
 * 用于展示关键指标数据
 */

import { Card, Statistic, Space } from '@arco-design/web-react';
import { ReactNode } from 'react';
import { IconUp, IconDown } from '@arco-design/web-react/icon';

interface StatsCardProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  suffix?: string;
  precision?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  color?: string;
  bgGradient?: string;
  loading?: boolean;
}

export const StatsCard = ({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  trend,
  trendValue,
  icon,
  color = '#165DFF',
  bgGradient,
  loading = false,
}: StatsCardProps) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <IconUp />;
    if (trend === 'down') return <IconDown />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return '#00B42A';
    if (trend === 'down') return '#F53F3F';
    return '#86909C';
  };

  return (
    <Card
      bordered={false}
      loading={loading}
      style={{
        background: bgGradient || '#FFFFFF',
        borderRadius: 'var(--radius-large)',
        boxShadow: 'var(--shadow-medium)',
        transition: 'all var(--transition-normal)',
      }}
      hoverable
    >
      <Space direction='vertical' size={12} style={{ width: '100%' }}>
        {/* 标题和图标 */}
        <div className='flex-between'>
          <span style={{
            fontSize: 14,
            color: bgGradient ? 'rgba(255,255,255,0.85)' : 'var(--gray-7)',
            fontWeight: 500,
          }}>
            {title}
          </span>
          {icon && (
            <span style={{
              fontSize: 24,
              color: bgGradient ? 'rgba(255,255,255,0.6)' : color,
            }}>
              {icon}
            </span>
          )}
        </div>

        {/* 数值 */}
        <Statistic
          value={value}
          prefix={prefix}
          suffix={suffix}
          precision={precision}
          styleValue={{
            fontSize: 28,
            fontWeight: 600,
            color: bgGradient ? '#FFFFFF' : color,
          }}
        />

        {/* 趋势 */}
        {trend && trendValue && (
          <Space size={4} style={{ fontSize: 12 }}>
            <span style={{ color: getTrendColor() }}>{getTrendIcon()}</span>
            <span style={{
              color: bgGradient ? 'rgba(255,255,255,0.85)' : getTrendColor(),
            }}>
              {trendValue}
            </span>
            <span style={{
              color: bgGradient ? 'rgba(255,255,255,0.65)' : 'var(--gray-6)',
            }}>
              vs 上期
            </span>
          </Space>
        )}
      </Space>
    </Card>
  );
};
