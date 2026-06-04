import { Empty, Tag, Typography } from '@arco-design/web-react';
import { StepProps } from './types';
import { IconCheck, IconClockCircle } from '@arco-design/web-react/icon';

const { Text } = Typography;

export const ShiftStep = ({ formData, updateFormData, shifts }: StepProps) => {
  const toggleShift = (shiftId: number) => {
    const newShifts = formData.selectedShifts.includes(shiftId)
      ? formData.selectedShifts.filter((id) => id !== shiftId)
      : [...formData.selectedShifts, shiftId];
    updateFormData('selectedShifts', newShifts);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 20, fontSize: 13 }}>
        已选择 <Tag color='arcoblue' size="small" style={{ margin: '0 4px', fontWeight: 'bold' }}>{formData.selectedShifts.length}</Tag> 个班次方案参与测算排班
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {shifts?.map((shift) => {
          const isSelected = formData.selectedShifts.includes(shift.id);
          return (
            <div
              key={shift.id}
              onClick={() => toggleShift(shift.id)}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--color-primary-6)' : '1px solid var(--color-border-2)',
                background: isSelected ? 'var(--color-primary-light-1)' : 'var(--color-bg-2)',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  background: 'var(--color-primary-6)',
                  borderRadius: '0 0 0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2
                }}>
                  <IconCheck style={{ color: '#fff', fontSize: 14 }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text bold style={{ fontSize: 14, color: isSelected ? 'var(--color-primary-6)' : 'var(--color-text-1)' }}>
                  {shift.shift_name}
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--color-text-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconClockCircle />
                    <span>{shift.start_time} - {shift.end_time}</span>
                </div>
                <div>时长: {shift.work_hours}h</div>
              </div>
            </div>
          );
        })}
      </div>

      {(!shifts || shifts.length === 0) && (
        <Empty description='暂无班次方案，请先在【排班管理】中添加' style={{ marginTop: 40 }} />
      )}
    </div>
  );
};
