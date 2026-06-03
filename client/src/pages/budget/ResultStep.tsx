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
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { BudgetFormData } from './types';

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
          plannedShiftIds: formData.selectedShifts // 保存当时规划使用的班次ID列表
        },
        result: result,
        desc: `基于目标值 ${formData.targetValue} 的智能测算结果`,
        startDate: formData.dateRange[0],
        endDate: formData.dateRange[1]
      });
      Message.success('已成功保存至“测算分析报告”');
    } catch (err) {
      Message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const usingHistory = formData.useHistoryData && !!formData.historyProjectId;

  // 每日人力趋势图 - 堆叠柱状图显示售前/售中/售后
  // X轴使用完整日期，不再使用简化的"第N天"格式
  const dailyLabels = (result.daily_results || []).map((d: any) => d.fullDate || d.date);

  // 使用堆叠柱状图，分别显示售前、售中、售后人数
  const dailyChartData = {
    labels: dailyLabels,
    datasets: [
      {
        label: '售前人数',
        data: (result.daily_results || []).map((d: any) => d.presale),
        backgroundColor: '#8b5cf6',
        borderRadius: 4,
        barPercentage: 0.6,  // 控制柱子宽度
        categoryPercentage: 0.8,  // 控制类别间距
      },
      {
        label: '售中人数',
        data: (result.daily_results || []).map((d: any) => d.midsale),
        backgroundColor: '#f59e0b',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
      {
        label: '售后人数',
        data: (result.daily_results || []).map((d: any) => d.aftersale),
        backgroundColor: '#10b981',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  // 堆叠柱状图配置 - 高峰日在tooltip中标注
  const dailyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 13 }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (items: any) => {
            const idx = items[0]?.dataIndex;
            const dr = result.daily_results?.[idx];
            if (!dr) return items[0]?.label || '';
            let title = dr.fullDate || dr.date; // 使用完整日期
            if (dr.isPeakDay) title += ' 🔥 高峰日';
            return title;
          },
          footer: (items: any) => {
            const total = items.reduce((sum: number, item: any) => sum + item.parsed.y, 0);
            return `总需求: ${total} 人`;
          }
        }
      },
    },
    scales: {
      y: { 
        stacked: true,
        beginAtZero: true, 
        title: { display: true, text: '人力需求 (人)' },
        ticks: {
          stepSize: 1,
          font: { size: 12 }
        }
      },
      x: { 
        stacked: true,
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45,  // 强制45度旋转，避免日期重叠
          autoSkip: true,
          maxTicksLimit: 30  // 最多显示30个刻度
        }
      }
    },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 岗位人力配比饼图 */}
        <Card bordered={false} title='岗位人力配比' style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ height: 280, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '80%', height: '100%' }}>
              <Pie 
                data={{
                  labels: ['售前咨询', '售中处理', '售后服务'],
                  datasets: [{
                    data: [result.presale_staff, result.midsale_staff, result.aftersale_staff],
                    backgroundColor: ['#8b5cf6', '#f59e0b', '#10b981'],
                    borderColor: ['#7c3aed', '#d97706', '#059669'],
                    borderWidth: 2,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 13 }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const total = result.presale_staff + result.midsale_staff + result.aftersale_staff;
                          const percentage = ((context.parsed / total) * 100).toFixed(1);
                          return `${context.label}: ${context.parsed}人 (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 6, fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>
            基于峰值日的话务量分布和各岗位处理时长计算
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
