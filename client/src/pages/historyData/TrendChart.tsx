import { Modal, Typography } from '@arco-design/web-react';
import { Line } from 'react-chartjs-2';

const { Text } = Typography;

interface TrendChartProps {
  visible: boolean;
  onCancel: () => void;
  data: any[];
  projectName: string;
}

export const TrendChart = ({ visible, onCancel, data, projectName }: TrendChartProps) => {
  const sortedData = [...(data || [])].sort((a, b) =>
    new Date(a.data_date).getTime() - new Date(b.data_date).getTime()
  );

  const getChartData = () => {
    if (!sortedData || sortedData.length === 0) return null;

    const labels = sortedData.map((_, index) => `第 ${index + 1} 天`);
    const salesData = sortedData.map(d => d.sales_volume);
    const staffData = sortedData.map(d => d.actual_staff);
    const consultsData = sortedData.map(d => d.actual_consult);

    return {
      labels,
      datasets: [
        {
          label: '销售额(万)',
          data: salesData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true
        },
        {
          label: '在岗人数',
          data: staffData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          yAxisID: 'y1',
          tension: 0.4,
          fill: true
        },
        {
          label: '咨询量',
          data: consultsData,
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.1)',
          yAxisID: 'y2',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

    const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: `${projectName} - 业务趋势分析`
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: any) => {
            const idx = tooltipItems[0].dataIndex;
            return `第 ${idx + 1} 天 (${sortedData[idx].data_date})`;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: '销售额(万)' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: '人数' },
        grid: { drawOnChartArea: false },
      },
      y2: {
        type: 'linear' as const,
        display: false,
      }
    },
  };

  return (
    <Modal
      title={<>📊 业务趋势分析</>}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      style={{ width: 1200 }}
    >
      <div style={{ height: 500 }}>
        {getChartData() && (
          <Line data={getChartData()!} options={chartOptions} />
        )}
      </div>

      <div
        className='mt-4 p-4 rounded-lg'
        style={{ background: 'var(--color-fill-1)' }}
      >
        <Text style={{ fontSize: 13, color: 'var(--color-text-1)' }}>
          <strong>📊 图表说明：</strong> 三条曲线分别代表销售额、在岗人数和咨询量的变化趋势。
          通过观察曲线走势，可以分析业务高峰期、人力配置效率等关键指标。
        </Text>
      </div>
    </Modal>
  );
};
