import { Form, Select } from '@arco-design/web-react';
import { StepProps } from './types';
import { IconHistory, IconCloseCircle } from '@arco-design/web-react/icon';

export const HistoryStep = ({ formData, updateFormData, form, historyProjects }: StepProps) => {
  return (
    <Form
      form={form}
      layout='vertical'
      size='large'
      autoComplete='off'
      style={{ width: '100%' }}
      requiredSymbol={{ position: 'end' }}
    >
      <Form.Item label='1. 是否参考历史项目数据' field='useHistoryData'>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          
          <div
            onClick={() => updateFormData('useHistoryData', false)}
            style={{
              padding: '15px',
              borderRadius: 8,
              border: !formData.useHistoryData ? '2px solid #165DFF' : '1px solid var(--color-border-2)',
              background: !formData.useHistoryData ? '#e8f4ff' : 'var(--color-bg-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: !formData.useHistoryData ? '0 4px 10px rgba(22,93,255,0.1)' : 'none'
            }}
          >
            <div style={{ 
              width: 36, height: 36, borderRadius: '50%', 
              background: !formData.useHistoryData ? 'var(--color-primary-6)' : 'var(--color-fill-2)',
              color: !formData.useHistoryData ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18
            }}>
              <IconCloseCircle />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: !formData.useHistoryData ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>不使用历史数据</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>完全基于当前输入的参数方案和目标测算</div>
            </div>
          </div>

          <div
            onClick={() => updateFormData('useHistoryData', true)}
            style={{
              padding: '15px',
              borderRadius: 8,
              border: formData.useHistoryData ? '2px solid #165DFF' : '1px solid var(--color-border-2)',
              background: formData.useHistoryData ? '#e8f4ff' : 'var(--color-bg-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: formData.useHistoryData ? '0 4px 10px rgba(22,93,255,0.1)' : 'none'
            }}
          >
            <div style={{ 
              width: 36, height: 36, borderRadius: '50%', 
              background: formData.useHistoryData ? 'var(--color-primary-6)' : 'var(--color-fill-2)',
              color: formData.useHistoryData ? '#fff' : 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18
            }}>
              <IconHistory />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: formData.useHistoryData ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>使用历史数据辅助</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>引入历史大促项目的真实数据修正偏差</div>
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
          >
            {historyProjects?.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                {p.project_name}
                <span style={{ color: 'var(--color-text-3)', marginLeft: 8, fontSize: 12 }}>
                  ({p.description || '无描述'})
                </span>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      {formData.useHistoryData && (!historyProjects || historyProjects.length === 0) && (
        <div style={{ padding: '12px 16px', background: 'var(--color-warning-light-1)', border: '1px solid var(--color-warning-light-3)', borderRadius: 6, color: 'var(--color-warning-6)', fontSize: 13 }}>
          💡 暂无历史项目数据，请先在【历史数据管理】中创建项目并导入数据
        </div>
      )}
    </Form>
  );
};
