/**
 * 统计卡片组件 - 标准化版
 */

import { Card, Statistic } from '@arco-design/web-react';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  suffix?: string;
  precision?: number;
  icon?: ReactNode;
  loading?: boolean;
}

export const StatsCard = ({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  icon,
  loading = false,
}: StatsCardProps) => {
  return (
    <Card
      bordered={false}
      loading={loading}
      className="stats-card"
      style={{
        borderRadius: 'var(--radius-large)',
      }}
    >
      <Statistic
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{title}</span>
            {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          </div>
        }
        value={value}
        prefix={prefix}
        suffix={suffix}
        precision={precision}
        styleValue={{
          fontSize: 20,
          fontWeight: 600,
          marginTop: 8
        }}
      />
    </Card>
  );
};
