import { Space, Card, Statistic, Button, Tag, Message, Divider, Typography, Table } from '@arco-design/web-react';
import { StatsCard } from '../../components/common';
import dayjs from 'dayjs';
import { useState } from 'react';
import { IconRefresh, IconDownload, IconSave, IconFire, IconStorage, IconBook } from '@arco-design/web-react/icon';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { BudgetFormData } from './types';

const { Text } = Typography;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const chartOptionsBase: any = {
  responsive: true,
  maintainAspectRatio: false,
  devicePixelRatio: 2,
  plugins: {
    legend: { labels: { usePointStyle: true } }
  }
};

export const ResultStep = ({ result, formData, handleReset, handleExport }: any) => {
  const [saving, setSaving] = useState(false);

  // Fallback UI
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

  const dailyLabels = (result.daily_results || []).map((item: any, index: number) => {
    const rawDate = item.fullDate || item.date;
    return rawDate && dayjs(rawDate).isValid() ? dayjs(rawDate).format('MM-DD') : `D${index + 1}`;
  });

  const dailyChartData = {
    labels: dailyLabels,
    datasets: [
      { label: '售前', data: (result.daily_results || []).map((d: any) => d.presale), backgroundColor: '#00B42A', borderRadius: 4 },
      { label: '售中', data: (result.daily_results || []).map((d: any) => d.midsale), backgroundColor: '#165DFF', borderRadius: 4 },
      { label: '售后', data: (result.daily_results || []).map((d: any) => d.aftersale), backgroundColor: '#F53F3F', borderRadius: 4 },
    ],
  };

  return (
    <Space direction='vertical' size={24} style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatsCard title='建议总编制' value={result.needed_staff} suffix='人' icon='👥' color='#165DFF' />
        <StatsCard title='售前人员' value={result.presale_staff} suffix='人' icon='📞' color='#00B42A' />
        <StatsCard title='售中人员' value={result.midsale_staff} suffix='人' icon='💬' color='#FF7D00' />
        <StatsCard title='售后人员' value={result.aftersale_staff} suffix='人' icon='🛠️' color='#F53F3F' />
      </div>

      <Card bordered={false} title="分职能每日人力趋势" style={{ borderRadius: 12 }}>
        <div style={{ height: 320, width: '100%' }}>
          <Bar data={dailyChartData} options={{ ...chartOptionsBase, scales: { y: { stacked: true }, x: { stacked: true } } }} />
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card bordered={false} title="职能配比" style={{ flex: 1, borderRadius: 12 }}>
          <div style={{ height: 250 }}>
            <Doughnut 
              data={{
                labels: ['售前', '售中', '售后'],
                datasets: [{
                  data: [result.presale_staff, result.midsale_staff, result.aftersale_staff],
                  backgroundColor: ['#00B42A', '#165DFF', '#F53F3F'],
                  borderWidth: 0
                }]
              }}
              options={{ ...chartOptionsBase, cutout: '70%' }}
            />
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
        <Button size='large' onClick={handleReset} icon={<IconRefresh />}>重新测算</Button>
        <Button size='large' type='primary' onClick={handleSaveToHistory} loading={saving} icon={<IconSave />}>采纳方案并入库</Button>
        <Button size='large' onClick={handleExport} icon={<IconDownload />}>导出报告</Button>
      </div>
    </Space>
  );
};
