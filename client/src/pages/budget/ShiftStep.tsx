import { Empty, Tag } from '@arco-design/web-react';
import { StepProps } from './types';
import { IconCheck } from '@arco-design/web-react/icon';

export const ShiftStep = ({ formData, updateFormData, shifts }: StepProps) => {
  const toggleShift = (shiftId: number) => {
    const newShifts = formData.selectedShifts.includes(shiftId)
      ? formData.selectedShifts.filter((id) => id !== shiftId)
      : [...formData.selectedShifts, shiftId];
    updateFormData('selectedShifts', newShifts);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        已选择 <Tag color='blue' size="small" style={{ margin: '0 4px', fontWeight: 'bold' }}>{formData.selectedShifts.length}</Tag> 个班次方案参与测算排班
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {shifts?.map((shift) => {
          const isSelected = formData.selectedShifts.includes(shift.id);
          return (
            <div
              key={shift.id}
              onClick={() => toggleShift(shift.id)}
              style={{
                padding: '16px',
                borderRadius: 12,
                cursor: 'pointer',
                border: isSelected ? '2px solid #165dff' : '1px solid var(--color-border-2)',
                background: isSelected ? '#e8f4ff' : 'var(--color-bg-2)',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 4px 12px rgba(22,93,255,0.1)' : '0 2px 5px rgba(0,0,0,0.02)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* 现代感选中标签 (右上角蓝色三角+对号) */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  background: '#165dff',
                  borderRadius: '0 0 0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2
                }}>
                  <IconCheck style={{ color: '#fff', fontSize: 16 }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#165dff' : 'var(--color-text-1)' }}>
                  {shift.shift_name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-2)' }}>
                <div>时段：<span style={{ fontWeight: 500 }}>{shift.start_time} - {shift.end_time}</span></div>
                <div>时长：<span style={{ fontWeight: 500 }}>{shift.work_hours} 小时</span></div>
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
