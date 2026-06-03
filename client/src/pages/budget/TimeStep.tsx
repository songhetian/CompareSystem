import { Form, DatePicker, Select, Tag, Space, Button, Typography } from '@arco-design/web-react';
import { StepProps } from './types';
import dayjs from 'dayjs';
import { IconCalendar, IconClose } from '@arco-design/web-react/icon';
import { useState } from 'react';

const { RangePicker } = DatePicker;
const { Text } = Typography;

export const TimeStep = ({ formData, updateFormData, form, promotions }: StepProps) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  // 移除某个高峰日
  const handleRemovePeakDate = (dateToRemove: string) => {
    const newDates = formData.peakDates.filter(d => d !== dateToRemove);
    updateFormData('peakDates', newDates);
    form.setFieldValue('peakDates', newDates);
  };

  // 添加高峰日
  const handleAddPeakDate = (dateString: string) => {
    if (!formData.peakDates.includes(dateString)) {
      const newDates = [...formData.peakDates, dateString].sort();
      updateFormData('peakDates', newDates);
      form.setFieldValue('peakDates', newDates);
    }
    setPickerVisible(false);
  };

  return (
    <Form form={form} layout='vertical' size='large' style={{ width: '100%' }} requiredSymbol={{ position: 'end' }}>
      <Form.Item label='1. 测算周期' field='dateRange' required rules={[{ required: true, message: '请选择测算周期' }]}>
        <RangePicker
          value={formData.dateRange.map((d) => dayjs(d)) as any}
          onChange={(dateStrings) => {
            updateFormData('dateRange', dateStrings);
          }}
          format='YYYY-MM-DD'
          style={{ width: '100%', maxWidth: 500 }}
        />
      </Form.Item>

      <Form.Item label='2. 活动规划（可选）' field='promotionId'>
        <Select
          placeholder='选择大促活动（如双11），无活动请留空'
          value={formData.promotionId || undefined}
          onChange={(v) => updateFormData('promotionId', v)}
          allowClear
          style={{ width: '100%', maxWidth: 500 }}
        >
          {promotions?.map((p) => (
            <Select.Option key={p.id} value={p.id}>
              {p.scheme_name}
              <span style={{ color: 'var(--color-text-3)', marginLeft: 8, fontSize: 12 }}>
                ({p.description || '无描述'})
              </span>
              <Tag color='orange' style={{ marginLeft: 8 }} size="small">
                爆发系数: {p.factor}x
              </Tag>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item label='3. 高峰日期（可选）' field='peakDates' extra="设定为高峰日期的天数，将应用特殊的计算系数">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', minHeight: 40 }}>
          {formData.peakDates.map((date) => (
            <Tag
              key={date}
              size="large"
              closable
              onClose={() => handleRemovePeakDate(date)}
              color="blue"
              style={{ borderRadius: 6, padding: '0 12px' }}
            >
              <IconCalendar style={{ marginRight: 6 }} />
              {date}
            </Tag>
          ))}
          
          <DatePicker
            triggerProps={{
              popupVisible: pickerVisible,
              onVisibleChange: setPickerVisible,
            }}
            disabledDate={(current) => {
              if (!formData.dateRange || formData.dateRange.length < 2) return false;
              const start = dayjs(formData.dateRange[0]).startOf('day');
              const end = dayjs(formData.dateRange[1]).endOf('day');
              return current.isBefore(start) || current.isAfter(end);
            }}
            style={{ width: 0, height: 0, padding: 0, border: 'none', overflow: 'hidden' }}
            onChange={(dateString) => handleAddPeakDate(dateString)}
          />
          
          <Button 
            type="dashed" 
            size="small" 
            onClick={() => setPickerVisible(true)}
            style={{ borderRadius: 6, height: 32 }}
          >
            + 添加高峰日期
          </Button>
        </div>
        
        {formData.peakDates.length === 0 && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            暂未选择任何高峰日期
          </Text>
        )}
      </Form.Item>
    </Form>
  );
};
