import { Form, Select, InputNumber, Tag, Space } from '@arco-design/web-react';
import { StepProps } from './types';
import { IconTrophy, IconUserGroup } from '@arco-design/web-react/icon';

export const TargetStep = ({ formData, updateFormData, form, schemes }: StepProps) => {
  return (
    <Form
      form={form}
      layout='vertical'
      size='large'
      autoComplete='off'
      style={{ width: '100%' }}
      requiredSymbol={{ position: 'end' }}
    >
      <Form.Item label='1. 选择测算参数方案' field='schemeId' required rules={[{ required: true, message: '请选择参数方案' }]}>
        <Select
          placeholder='选择参数方案'
          value={formData.schemeId || undefined}
          onChange={(v) => updateFormData('schemeId', v)}
          style={{ width: '100%', maxWidth: 500 }}
        >
          {schemes?.map((s) => (
            <Select.Option key={s.id} value={s.id}>
              {s.scheme_name}
              <span style={{ color: 'var(--color-text-3)', marginLeft: 8, fontSize: 12 }}>({s.description || '无描述'})</span>
              {!!s.is_default && <Tag color='blue' style={{ marginLeft: 8 }} size="small">默认</Tag>}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item label='2. 驱动方式' field='driveMode' required>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {/* 按销售额驱动卡片 */}
          <div
            onClick={() => updateFormData('driveMode', 'sales')}
            style={{
              padding: '15px', // 配合 2px 边框防止抖动
              borderRadius: 8,
              border: formData.driveMode === 'sales' ? '2px solid #165DFF' : '1px solid var(--color-border-2)',
              background: formData.driveMode === 'sales' ? '#e8f4ff' : 'var(--color-bg-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: formData.driveMode === 'sales' ? '0 4px 10px rgba(22,93,255,0.1)' : 'none'
            }}
          >
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', 
              background: formData.driveMode === 'sales' ? 'var(--color-primary-6)' : 'var(--color-fill-2)',
              color: formData.driveMode === 'sales' ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20
            }}>
              <IconTrophy />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: formData.driveMode === 'sales' ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>按销售额驱动</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>适用于大促或日常有明确GMV目标的场景</div>
            </div>
          </div>

          {/* 按访客数驱动卡片 */}
          <div
            onClick={() => updateFormData('driveMode', 'traffic')}
            style={{
              padding: '15px',
              borderRadius: 8,
              border: formData.driveMode === 'traffic' ? '2px solid #165DFF' : '1px solid var(--color-border-2)',
              background: formData.driveMode === 'traffic' ? '#e8f4ff' : 'var(--color-bg-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: formData.driveMode === 'traffic' ? '0 4px 10px rgba(22,93,255,0.1)' : 'none'
            }}
          >
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', 
              background: formData.driveMode === 'traffic' ? 'var(--color-primary-6)' : 'var(--color-fill-2)',
              color: formData.driveMode === 'traffic' ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20
            }}>
              <IconUserGroup />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: formData.driveMode === 'traffic' ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>按访客数驱动</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>适用于单纯评估流量承接能力的场景</div>
            </div>
          </div>
        </div>
      </Form.Item>

      <Form.Item
        label={`3. ${formData.driveMode === 'sales' ? '目标销售额（万元）' : '目标日均访客数（人）'}`}
        field='targetValue'
        required
        rules={[{ required: true, message: '请输入目标数值' }]}
      >
        <InputNumber
          placeholder={
            formData.driveMode === 'sales' ? '例如：500' : '例如：20000'
          }
          value={formData.targetValue as number}
          onChange={(v) => updateFormData('targetValue', v)}
          style={{ width: '100%', maxWidth: 500 }}
          min={0}
          precision={formData.driveMode === 'sales' ? 2 : 0}
          size="large"
        />
      </Form.Item>
    </Form>
  );
};
