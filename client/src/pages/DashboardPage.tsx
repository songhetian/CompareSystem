import { useState, useEffect, useMemo } from 'react';
import {
  Grid, Card, Typography, Space, Statistic, Table, Tag, Badge, Empty, Modal, Descriptions, Button, Tooltip as ArcoTooltip, Select, Divider, Progress, Avatar
} from '@arco-design/web-react';
import {
  IconArrowRise, IconArrowFall, IconUserGroup, IconCalendar, IconFile, IconCheckCircle, IconExclamationCircle, IconEye, IconDashboard, IconThunderbolt, IconInteraction, IconClockCircle, IconBulb, IconSafe, IconFire, IconSettings
} from '@arco-design/web-react/icon';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import dayjs from 'dayjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler
);

const { Row, Col } = Grid;
const { Title, Text } = Typography;

export const DashboardPage = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hist, persons] = await Promise.all([
          window.api.getHistory(),
          window.api.getPersonnel ? window.api.getPersonnel() : Promise.resolve([])
        ]);
        if (isMounted) {
          setReports(hist);
          if (hist.length > 0 && !selectedReportId) setSelectedReportId(hist[0].id);
          setPersonnel(persons);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const activeReport = useMemo(() => reports.find(r => r.id === selectedReportId) || reports[0], [reports, selectedReportId]);
  const activeResult = useMemo(() => {
    try { return activeReport ? JSON.parse(activeReport.result_json) : null; } catch { return null; }
  }, [activeReport]);

  const handleViewDetail = (record: any) => {
    setSelectedReport(record);
    setDetailVisible(true);
  };

  const stats = useMemo(() => {
    const staffCount = activeResult?.needed_staff || 0;
    const actualCount = personnel.length;
    const gap = staffCount - actualCount;
    return [
      { title: '建议总编制', value: staffCount, suffix: '人', icon: <IconThunderbolt />, color: '#165DFF', desc: '全周期最大峰值' },
      { title: '实际在岗人数', value: actualCount, suffix: '人', icon: <IconUserGroup />, color: '#00B42A', desc: '组织架构数据' },
      { title: '人力缺口/盈余', value: Math.abs(gap), suffix: '人', icon: gap > 0 ? <IconArrowRise /> : <IconArrowFall />, color: gap > 0 ? '#F53F3F' : '#FF7D00', desc: gap > 0 ? '配置不足' : '配置冗余' },
      { title: '测算方案库', value: reports.length, suffix: '份', icon: <IconFile />, color: '#722ED1', desc: '历史报告' },
    ];
  }, [activeResult, personnel, reports]);

  const distributionData = useMemo(() => {
    if (!activeResult) return null;
    return {
      labels: ['售前', '售中', '售后'],
      datasets: [{
        data: [activeResult.presale_staff, activeResult.midsale_staff, activeResult.aftersale_staff],
        backgroundColor: ['#00B42A', '#165DFF', '#F53F3F'],
        borderWidth: 0
      }]
    };
  }, [activeResult]);

  const dailyTrendData = useMemo(() => {
    if (!activeResult || !activeResult.daily_results) return null;
    return {
      labels: activeResult.daily_results.map((d: any) => d.date),
      datasets: [
        { label: '售前', data: activeResult.daily_results.map((d: any) => d.presale), backgroundColor: '#00B42A', stack: 'stack1' },
        { label: '售中', data: activeResult.daily_results.map((d: any) => d.midsale), backgroundColor: '#165DFF', stack: 'stack1' },
        { label: '售后', data: activeResult.daily_results.map((d: any) => d.aftersale), backgroundColor: '#F53F3F', stack: 'stack1' }
      ]
    };
  }, [activeResult]);

  const sensitivityChartData = useMemo(() => {
    let sens: any = activeResult?.sensitivity || { avg_order_value: 0, conversion_rate: 0 };
    return {
      labels: ['客单价-10%', '客单价+10%', '转化率-10%', '转化率+10%'],
      datasets: [{
        label: '变动',
        data: [Math.abs(sens.avg_order_value || 0), -(sens.avg_order_value || 0), -(sens.conversion_rate || 0), (sens.conversion_rate || 0)],
        backgroundColor: (context: any) => (context.raw > 0 ? 'rgba(245, 63, 63, 0.8)' : 'rgba(0, 180, 42, 0.8)'),
        borderRadius: 4
      }]
    };
  }, [activeResult]);

  if (loading) return <div style={{ padding: '100px 0', textAlign: 'center' }}><Progress type="circle" percent={100} width={80} /><div style={{ marginTop: 16 }}>深度分析中...</div></div>;
  if (reports.length === 0) return <div style={{ padding: '120px 0', textAlign: 'center' }}><Empty description="暂无数据" /><Button type="primary" style={{ marginTop: 24 }} onClick={() => window.location.reload()}>刷新数据</Button></div>;

  return (
    <div className='p-6 bg-gray-50 min-h-full'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><Title heading={3}><IconDashboard style={{ color: '#165DFF' }} /> 决策大脑分析中心</Title><Text type='secondary'>动态人力配比与压力预警</Text></div>
        <Select value={selectedReportId || undefined} onChange={setSelectedReportId} style={{ width: 340 }}>{reports.map(r => <Select.Option key={r.id} value={r.id}>{r.scheme_name}</Select.Option>)}</Select>
      </div>
      <Row gutter={16} style={{ marginBottom: 24 }}>{stats.map((item, index) => <Col span={6} key={index}><Card bordered={false} hoverable><div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><div style={{ width: 52, height: 52, borderRadius: 14, background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{item.icon}</div><div><div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{item.title}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{item.value}<small style={{ fontSize: 12, marginLeft: 4 }}>{item.suffix}</small></div></div></div></Card></Col>)}</Row>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card title="建议峰值配比" bordered={false} style={{ height: 420 }}><div style={{ height: 260, position: 'relative' }}>{distributionData && <Doughnut data={distributionData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />}<div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 800 }}>{activeResult?.needed_staff}</div><div>人</div></div></div></Card></Col>
        <Col span={16}><Card title="每日需求趋势" bordered={false} style={{ height: 420 }}><div style={{ height: 340 }}>{dailyTrendData && <Bar data={dailyTrendData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }} />}</div></Card></Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}><Card title="敏感度风险探测" bordered={false} style={{ height: 420 }}><div style={{ height: 320 }}><Bar data={sensitivityChartData} options={{ indexAxis: 'y' as const, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div></Card></Col>
        <Col span={12}><Card title="仿真参数审计" bordered={false} style={{ height: 420 }} extra={<Button type='primary' size='small' onClick={() => handleViewDetail(activeReport)}>详情</Button>}>
          {activeReport ? (() => {
            const p = JSON.parse(activeReport.params_json || '{}');
            const audit = [{ label: '并发会话', value: p.max_concurrent_sessions || 3 }, { label: '在岗率', value: `${((p.actual_availability_rate || 0.85)*100).toFixed(0)}%` }, { label: '解决率', value: `${((p.first_call_resolution || 0.85)*100).toFixed(0)}%` }, { label: '响应率', value: `${((p.response_rate || 0.95)*100).toFixed(0)}%` }];
            return <Row gutter={[16, 16]}>{audit.map((it, i) => <Col span={12} key={i}><div style={{ padding: 12, background: 'var(--color-fill-1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}><span>{it.label}</span><Text bold>{it.value}</Text></div></Col>)}</Row>
          })() : <Empty /> }
        </Card></Col>
      </Row>
      <Modal title={<Space><IconFile /> 精算报告详情</Space>} visible={detailVisible} onCancel={() => setDetailVisible(false)} footer={<Button type='primary' onClick={() => setDetailVisible(false)}>关闭</Button>} style={{ width: 900 }}>
        {selectedReport && (() => {
          const res = JSON.parse(selectedReport.result_json || '{}');
          return <Space direction='vertical' size='large' style={{ width: '100%' }}>
            <Descriptions column={3} border size='small' data={[{ label: '方案', value: selectedReport.scheme_name }, { label: '周期', value: `${selectedReport.start_date} ~ ${selectedReport.end_date}` }, { label: '总编制', value: res.needed_staff + '人' }]} />
            <Table size="mini" rowKey="date" data={res.daily_results?.slice(0, 10)} columns={[{ title: '日期', dataIndex: 'date' }, { title: '建议人力', dataIndex: 'staff' }, { title: '售前', dataIndex: 'presale' }, { title: '售中', dataIndex: 'midsale' }, { title: '售后', dataIndex: 'aftersale' }]} />
          </Space>
        })()}
      </Modal>
    </div>
  );
};
