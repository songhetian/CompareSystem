import { Modal, Typography } from '@arco-design/web-react';
import { VChart } from '@visactor/react-vchart';

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

  const values = sortedData.flatMap((d, index) => [
    { time: `第 ${index + 1} 天`, type: '销售额(万)', value: d.sales_volume },
    { time: `第 ${index + 1} 天`, type: '在岗人数', value: d.actual_staff },
    { time: `第 ${index + 1} 天`, type: '咨询量', value: d.actual_consult },
  ]);

  const spec = {
    type: 'line',
    data: [{ id: 'table', values }],
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    animation: true,
  };

  return (
    <Modal
      title={<>📊 业务趋势分析</>}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      style={{ width: 1000 }}
    >
      <div style={{ height: 500 }}>
        <VChart spec={spec} style={{ height: '100%', width: '100%' }} />
      </div>

      <div
        className='mt-4 p-4 rounded-lg'
        style={{ background: 'var(--color-fill-1)' }}
      >
        <Text style={{ fontSize: 13, color: 'var(--color-text-1)' }}>
          <strong>📊 图表说明：</strong> 业务指标变化趋势分析。
        </Text>
      </div>
    </Modal>
  );
};
