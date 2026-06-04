/**
 * 页面头部组件 - 标准化版
 */

import { Typography, Space } from '@arco-design/web-react';
import { ReactNode } from 'react';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  extra?: ReactNode;
}

export const PageHeader = ({
  title,
  subtitle,
  icon,
  extra,
}: PageHeaderProps) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <Space align='center' size={12}>
        {icon && <span style={{ fontSize: 20, color: 'var(--primary-color)' }}>{icon}</span>}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Title heading={5} style={{ margin: 0 }}>{title}</Title>
          {subtitle && <Text type='secondary' style={{ fontSize: 12 }}>{subtitle}</Text>}
        </div>
      </Space>

      {extra && <div>{extra}</div>}
    </div>
  );
};
