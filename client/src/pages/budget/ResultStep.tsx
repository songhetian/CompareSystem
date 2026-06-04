import { Space, Card, Button, Message, Typography } from '@arco-design/web-react';
import { StatsCard } from '../../components/common';
import dayjs from 'dayjs';
import { useState } from 'react';
import { IconRefresh, IconDownload, IconSave } from '@arco-design/web-react/icon';
import { BudgetFormData } from './types';

export const ResultStep = ({ result, formData, handleReset, handleExport }: any) => {
  const [saving, setSaving] = useState(false);

  if (!result) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Typography.Text type="secondary">测算结果为空，请重新进行智能测算。</Typography.Text>
        <div style={{ marginTop: 16 }}>
          <Button onClick={handleReset}>返回重测</Button>
        </div>
      </div>
    );
  }

  const handleSaveToHistory = async () => {
    setSaving(true);
    try {
      const reportName = `测算报告_${dayjs().format('MMDD_HHmm')}`;
      await window.api.addHistory({
        name: reportName,
        params: { ...result.params, plannedShiftIds: formData.selectedShifts },
        result: result,
        desc: `基于目标值 ${formData.targetValue} 的智能测算结果`,
        startDate: formData.dateRange[0],
        endDate: formData.dateRange[1]
      });
      Message.success('已成功保存');
    } catch (err) {
      Message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction='vertical' size={24} style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatsCard title='建议总编制' value={result.needed_staff} suffix='人' icon='👥' />
        <StatsCard title='售前人员' value={result.presale_staff} suffix='人' icon='📞' />
        <StatsCard title='售中人员' value={result.midsale_staff} suffix='人' icon='💬' />
        <StatsCard title='售后人员' value={result.aftersale_staff} suffix='人' icon='🛠️' />
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
        <Button size='large' onClick={handleReset} icon={<IconRefresh />}>重新测算</Button>
        <Button size='large' type='primary' onClick={handleSaveToHistory} loading={saving} icon={<IconSave />}>采纳方案并入库</Button>
        <Button size='large' onClick={handleExport} icon={<IconDownload />}>导出报告</Button>
      </div>
    </Space>
  );
};
