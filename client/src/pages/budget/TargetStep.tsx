import { Form, Select, InputNumber, Tag, Space, Typography } from '@arco-design/web-react';
import { StepProps } from './types';
import { IconTrophy, IconUserGroup } from '@arco-design/web-react/icon';

const { Text } = Typography;

export const TargetStep = ({ formData, updateFormData, form, schemes }: StepProps) => {
  return (
    <Form
      form={form}
      layout='vertical'
      size='small'
      autoComplete='off'
      style={{ width: '100%' }}
    >
      <Form.Item label='1. 选择精算参数方案' field='schemeId' required rules={[{ required: true, message: '请选择精算参数方案' }]}>
        <Select
          placeholder='选择精算参数方案'
          value={formData.schemeId || undefined}
          onChange={(v) => updateFormData('schemeId', v)}
          style={{ width: '100%', maxWidth: 500 }}
          size="small"
        >
          {schemes?.map((s) => (
            <Select.Option key={s.id} value={s.id}>
              {s.scheme_name}
              <span style={{ color: 'var(--color-text-3)', marginLeft: 8, fontSize: 11 }}>({s.description || '无描述'})</span>
              {!!s.is_default && <Tag color='blue' style={{ marginLeft: 8 }} size="small">默认</Tag>}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item label='2. 驱动方式选择' field='driveMode' required>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div
            onClick={() => updateFormData('driveMode', 'sales')}
            style={{
              padding: '12px',
              borderRadius: 8,
              border: formData.driveMode === 'sales' ? '2px solid var(--color-primary-6)' : '1px solid var(--color-border-2)',
              background: formData.driveMode === 'sales' ? 'var(--color-primary-light-1)' : 'var(--color-bg-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ 
              width: 32, height: 32, borderRadius: '50%', 
              background: formData.driveMode === 'sales' ? 'var(--color-primary-6)' : 'var(--color-fill-2)',
              color: formData.driveMode === 'sales' ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16
            }}>
              <IconTrophy />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: formData.driveMode === 'sales' ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>按销售额驱动</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>适用于有明确业绩目标的场景</div>
            </div>
          </div>

          <div
            onClick={() => updateFormData('driveMode', 'traffic')}
            style={{
              padding: '12px',
              borderRadius: 8,
              border: formData.driveMode === 'traffic' ? '2px solid var(--color-primary-6)' : '1px solid var(--color-border-2)',
              background: formData.driveMode === 'traffic' ? 'var(--color-primary-light-1)' : 'var(--color-bg-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ 
              width: 32, height: 32, borderRadius: '50%', 
              background: formData.driveMode === 'traffic' ? 'var(--color-primary-6)' : 'var(--color-fill-2)',
              color: formData.driveMode === 'traffic' ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16
            }}>
              <IconUserGroup />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: formData.driveMode === 'traffic' ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>按访客数驱动</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>适用于单纯评估流量承接能力的场景</div>
            </div>
          </div>
        </div>
      </Form.Item>

      <Form.Item
        label={<Text bold>{formData.driveMode === 'sales' ? '目标销售额（万元）' : '目标日均访客数（人）'}</Text>}
        field='targetValue'
        required
        rules={[{ required: true, message: '请输入目标数值' }]}
      >
        <InputNumber
          placeholder={formData.driveMode === 'sales' ? '例如：500' : '例如：20000'}
          value={formData.targetValue as number}
          onChange={(v) => updateFormData('targetValue', v)}
          style={{ width: '100%', maxWidth: 500 }}
          min={0}
          precision={formData.driveMode === 'sales' ? 2 : 0}
          size="small"
        />
      </Form.Item>
    </Form>
  );
};
