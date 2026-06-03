import { Space, Typography, Tag } from '@arco-design/web-react';
import { BudgetFormData } from './types';
import dayjs from 'dayjs';
import { 
  IconSettings, IconCheckCircle, IconCalendar, IconUserGroup, IconClockCircle, IconHistory 
} from '@arco-design/web-react/icon';

const { Text } = Typography;

interface ConfigSummaryProps {
  formData: BudgetFormData;
  schemes: any[];
  promotions: any[];
}

export const ConfigSummary = ({ formData, schemes, promotions }: ConfigSummaryProps) => {
  const schemeName = schemes.find(s => s.id === formData.schemeId)?.scheme_name || '未选择';
  const promoName = promotions.find(p => p.id === formData.promotionId)?.scheme_name || '无活动';
  const days = formData.dateRange[0] && formData.dateRange[1] 
    ? dayjs(formData.dateRange[1]).diff(dayjs(formData.dateRange[0]), 'day') + 1 
    : 0;

  return (
    <div style={{
      background: 'var(--color-bg-2)',
      borderRadius: 12,
      border: '1px solid var(--color-border-2)',
      padding: '16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      position: 'sticky',
      top: 20
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconSettings style={{ color: 'var(--color-primary-6)' }} />
        测算配置清单
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 目标与方案 */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>基础设定</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <IconCheckCircle style={{ color: 'var(--color-text-3)' }} />
              <Text>方案：{schemeName}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <IconUserGroup style={{ color: 'var(--color-text-3)' }} />
              <Text>
                {formData.driveMode === 'sales' ? '目标金额' : '目标访客'}：
                <span style={{ fontWeight: 600, color: 'var(--color-primary-6)' }}>
                  {formData.targetValue ? `${formData.targetValue} ${formData.driveMode === 'sales' ? '万元' : '人'}` : '未设置'}
                </span>
              </Text>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-1)' }} />

        {/* 时间规划 */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>时间规划</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <IconCalendar style={{ color: 'var(--color-text-3)' }} />
              <Text>周期：{days > 0 ? `${days} 天` : '未设置'}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <IconFire style={{ color: 'var(--color-text-3)' }} />
              <Text>活动：{promoName}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
              <IconClockCircle style={{ color: 'var(--color-text-3)', marginTop: 2 }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <Text style={{ marginRight: 4 }}>高峰：</Text>
                {formData.peakDates.length > 0 ? formData.peakDates.map(d => (
                  <Tag key={d} size="small" color="blue" bordered>{dayjs(d).format('MM-DD')}</Tag>
                )) : <Text type="secondary">无</Text>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-1)' }} />

        {/* 班次与数据 */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>排班与数据</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <IconUserGroup style={{ color: 'var(--color-text-3)' }} />
              <Text>班次方案：已选 {formData.selectedShifts.length} 个</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <IconHistory style={{ color: 'var(--color-text-3)' }} />
              <Text>历史参考：{formData.useHistoryData ? '启用' : '不使用'}</Text>
            </div>
          </div>
        </div>
      </Space>
    </div>
  );
};
// IconFire helper
const IconFire = (props: any) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" width="1em" height="1em" {...props}>
    <path d="M24 44c11.046 0 20-8.954 20-20S24 4 24 4 4 12.954 4 24s8.954 20 20 20Z" />
    <path d="M24 44a20 20 0 0 1-8-38.33" />
  </svg>
);
