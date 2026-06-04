import { Form, Select, Typography, Space } from '@arco-design/web-react';
import { StepProps } from './types';
import { IconHistory, IconCloseCircle, IconBulb } from '@arco-design/web-react/icon';

const { Text } = Typography;

export const HistoryStep = ({ formData, updateFormData, form, historyProjects }: StepProps) => {
  return (
    <Form
      form={form}
      layout='vertical'
      size='small'
      autoComplete='off'
      style={{ width: '100%' }}
    >
      <Form.Item label='1. 是否参考历史项目数据' field='useHistoryData'>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          
          <div
            onClick={() => updateFormData('useHistoryData', false)}
            style={{
              padding: '12px',
              borderRadius: 8,
              border: !formData.useHistoryData ? '2px solid var(--color-primary-6)' : '1px solid var(--color-border-2)',
              background: !formData.useHistoryData ? 'var(--color-primary-light-1)' : 'var(--color-bg-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ 
              width: 32, height: 32, borderRadius: '50%', 
              background: !formData.useHistoryData ? 'var(--color-primary-6)' : 'var(--color-fill-2)',
              color: !formData.useHistoryData ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16
            }}>
              <IconCloseCircle />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: !formData.useHistoryData ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>不使用历史数据</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>基于当前参数方案和目标测算</div>
            </div>
          </div>

          <div
            onClick={() => updateFormData('useHistoryData', true)}
            style={{
              padding: '12px',
              borderRadius: 8,
              border: formData.useHistoryData ? '2px solid var(--color-primary-6)' : '1px solid var(--color-border-2)',
              background: formData.useHistoryData ? 'var(--color-primary-light-1)' : 'var(--color-bg-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ 
              width: 32, height: 32, borderRadius: '50%', 
              background: formData.useHistoryData ? 'var(--color-primary-6)' : 'var(--color-fill-2)',
              color: formData.useHistoryData ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16
            }}>
              <IconHistory />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: formData.useHistoryData ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>使用历史数据辅助</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>引入历史项目的真实数据修正偏差</div>
            </div>
          </div>

        </div>
      </Form.Item>

      {formData.useHistoryData && (
        <Form.Item 
          label='2. 选择历史项目' 
          field='historyProjectId'
          required
          rules={[{ required: true, message: '请选择历史项目' }]}
        >
          <Select
            placeholder='选择要参考的历史项目'
            value={formData.historyProjectId || undefined}
            onChange={(v) => updateFormData('historyProjectId', v)}
            style={{ width: '100%', maxWidth: 500 }}
            size="small"
          >
            {historyProjects?.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                {p.project_name}
                <span style={{ color: 'var(--color-text-3)', marginLeft: 8, fontSize: 11 }}>
                  ({p.description || '无描述'})
                </span>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      {formData.useHistoryData && (!historyProjects || historyProjects.length === 0) && (
        <div style={{ padding: '10px 12px', background: 'var(--color-warning-light-1)', border: '1px solid var(--color-warning-light-3)', borderRadius: 6, color: 'var(--color-warning-6)', fontSize: 12 }}>
          <Space><IconBulb /> <span>暂无历史项目数据，请先在【历史数据管理】中创建项目并导入数据</span></Space>
        </div>
      )}
    </Form>
  );
};
