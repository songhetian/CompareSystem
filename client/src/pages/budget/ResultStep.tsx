import { Space, Card, Statistic, Button, Tag, Message } from '@arco-design/web-react';
import { StatsCard } from '../../components/common';
import dayjs from 'dayjs';
import { useState } from 'react';
import { IconRefresh, IconDownload, IconHistory, IconSave } from '@arco-design/web-react/icon';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { BudgetFormData } from './types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

interface ResultStepProps {
  result: any;
  formData: BudgetFormData;
  handleReset: () => void;
  handleExport: () => void;
}

export const ResultStep = ({ result, formData, handleReset, handleExport }: ResultStepProps) => {
  const [saving, setSaving] = useState(false);

  if (!result) return null;

  const handleSaveToHistory = async () => {
    setSaving(true);
    try {
      const reportName = `测算报告_${dayjs().format('MMDD_HHmm')}`;
      
      await window.api.addHistory({
        name: reportName,
        params: { 
          ...result.params,
          plannedShiftIds: formData.shifts // 保存当时规划使用的班次ID列表
        },
        result: result,
        desc: `基于目标值 ${formData.targetValue} 的智能测算结果`,
        startDate: formData.dateRange[0],
        endDate: formData.dateRange[1]
      });
      Message.success('已成功保存至“测算报告”');
    } catch (err) {
      Message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const usingHistory = formData.useHistoryData && !!formData.historyProjectId;

  // 每日人力趋势图（使用 daily_results）
  const dailyLabels = (result.daily_results || []).map((d: any, i: number) =>
    usingHistory ? `第 ${i + 1} 天` : d.date
  );

  // 高峰日高亮：高峰日用橙色，普通日用蓝色
  const totalStaffData = (result.daily_results || []).map((d: any) => d.isPeakDay ? null : d.staff);
  const peakDayStaffData = (result.daily_results || []).map((d: any) => d.isPeakDay ? d.staff : null);

  const dailyChartData = {
    labels: dailyLabels,
    datasets: [
      {
        label: '普通日人力需求 (人)',
        data: totalStaffData,
        backgroundColor: 'rgba(22,93,255,0.7)',
        borderColor: '#165DFF',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: '高峰日人力需求 (人)',
        data: peakDayStaffData,
        backgroundColor: 'rgba(245,63,63,0.85)',
        borderColor: '#F53F3F',
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  // 高峰日 tooltip 后缀提示
  const dailyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          afterTitle: (items: any) => {
            const idx = items[0]?.dataIndex;
            const dr = result.daily_results?.[idx];
            if (!dr) return '';
            const parts = [];
            if (dr.isPeakDay) parts.push('🔥 高峰日');
            if (usingHistory) parts.push(`(原始日期: ${dr.date})`);
            return parts.join(' ');
          }
        }
      },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: '人力需求 (人)' } },
      x: { grid: { display: false }, stacked: false }
    },
  };

  // 24小时分布图
  const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const hourlyChartData = {
    labels: hourlyLabels,
    datasets: [
      {
        fill: true,
        label: '总排班需求 (人)',
        data: result.hourly_total,
        borderColor: '#165DFF',
        backgroundColor: 'rgba(22,93,255,0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 4,
      }
    ],
  };

  const hourlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: '所需人力 (人)' } },
      x: { grid: { display: false } }
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false }
  };

  return (
    <Space direction='vertical' size={24} style={{ width: '100%' }}>
      {/* 历史趋势应用提示 */}
      {usingHistory && (
        <div style={{
          padding: '10px 16px',
          background: 'var(--color-primary-light-1)',
          border: '1px solid var(--color-primary-light-3)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <IconHistory style={{ color: 'var(--color-primary-6)', fontSize: 18 }} />
          <span style={{ color: 'var(--color-primary-6)', fontWeight: 600 }}>
            已根据历史项目的实际销售趋势分布人力配置，不受日历日期影响
          </span>
          <Tag color='blue' size='small' style={{ marginLeft: 'auto' }}>历史趋势模式</Tag>
        </div>
      )}

      {/* 核心指标 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatsCard title='建议总编制' value={result.needed_staff} suffix='人' icon='👥' color='#165DFF' />
        <StatsCard title='售前人员' value={result.presale_staff} suffix='人' icon='📞' color='#00B42A' />
        <StatsCard title='售中人员' value={result.midsale_staff} suffix='人' icon='💬' color='#FF7D00' />
        <StatsCard title='售后人员' value={result.aftersale_staff} suffix='人' icon='🛠️' color='#F53F3F' />
      </div>

      {/* 每日排班趋势（按顺序，不含真实日期） */}
      {result.daily_results && result.daily_results.length > 0 && (
        <Card
          bordered={false}
          title={
            <span>
              每日人力需求趋势
              {usingHistory && (
                <Tag color='blue' size='small' style={{ marginLeft: 8 }}>按历史趋势分布</Tag>
              )}
            </span>
          }
          style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
        >
          <div style={{ height: 260, width: '100%' }}>
            <Bar data={dailyChartData} options={dailyChartOptions} />
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* 24小时排班分布 */}
        <Card bordered={false} title='24小时排班需求分布（峰值日）' style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ height: 280, width: '100%' }}>
            <Line data={hourlyChartData} options={hourlyChartOptions} />
          </div>
        </Card>

        {/* 测算详情 */}
        <Card bordered={false} title='测算详情' style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Statistic
              title='日均接待量预估'
              value={Math.round(result.daily_consult)}
              suffix='次'
              styleValue={{ color: 'var(--color-text-1)' }}
            />
            <Statistic
              title='理论最大峰值日'
              value={result.theoretical_peak}
              suffix='人'
            />
            <Statistic
              title='测算周期'
              value={result.days}
              suffix='天'
            />
            <Statistic
              title='高峰日期数量'
              value={formData.peakDates.length}
              suffix='天'
            />
          </Space>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
        <Button size='large' onClick={handleReset} icon={<IconRefresh />} style={{ width: 140, borderRadius: 8 }}>
          重新测算
        </Button>
        <Button
          size='large'
          type='primary'
          onClick={handleSaveToHistory}
          loading={saving}
          icon={<IconSave />}
          style={{ width: 180, borderRadius: 8, background: 'linear-gradient(135deg, #00B42A 0%, #23C343 100%)', border: 'none' }}
        >
          保存为正式报告
        </Button>
        <Button
          size='large'
          onClick={handleExport}
          icon={<IconDownload />}
          style={{ width: 180, borderRadius: 8 }}
        >
          导出 Excel 报告
        </Button>
      </div>
    </Space>
  );
};
