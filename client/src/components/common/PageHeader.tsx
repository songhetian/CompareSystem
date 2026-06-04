/**
 * 页面头部组件
 * 统一的页面标题、面包屑和操作区
 */

import { Typography, Space, Breadcrumb } from '@arco-design/web-react';
import { ReactNode } from 'react';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  breadcrumb?: Array<{ title: string; path?: string }>;
  extra?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  icon,
  breadcrumb,
  extra,
  className = '',
}: PageHeaderProps) => {
  return (
    <div className={`page-header ${className}`}>
      {/* 面包屑导航 */}
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb style={{ marginBottom: 12 }}>
          {breadcrumb.map((item, index) => (
            <Breadcrumb.Item key={index}>
              {item.path ? <a href={item.path}>{item.title}</a> : item.title}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      )}

      {/* 标题区域 */}
      <div className='flex-between' style={{ alignItems: 'flex-start' }}>
        <Space direction='vertical' size={4} style={{ width: '100%', textAlign: 'center' }}>
          <Space align='center' size={16} style={{ justifyContent: 'center' }}>
            {icon && <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>}
            <Title heading={4} style={{ margin: 0, fontWeight: 600 }}>
              {title}
            </Title>
          </Space>
          {subtitle && (
            <Text type='secondary' style={{ fontSize: 14 }}>
              {subtitle}
            </Text>
          )}
        </Space>

        {/* 操作区 */}
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
};
