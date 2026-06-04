import { useState, useEffect, useMemo } from 'react';
import {
  Grid, Card, Typography, Space, Table, Tag, Empty, Modal, Descriptions, Button, Select, Progress, Statistic
} from '@arco-design/web-react';
import {
  IconArrowRise, IconArrowFall, IconUserGroup, IconFile, IconDashboard, IconThunderbolt
} from '@arco-design/web-react/icon';
import { VChart } from '@visactor/react-vchart';
import dayjs from 'dayjs';

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

  // VChart Specs
  const distributionSpec = useMemo(() => {
    if (!activeResult) return null;
    const values = [
        { type: '售前', value: activeResult.presale_staff },
        { type: '售中', value: activeResult.midsale_staff },
        { type: '售后', value: activeResult.aftersale_staff || 0 },
    ];
    return { 
      type: 'pie', 
      data: [{ id: 'table', values }], 
      valueField: 'value', 
      categoryField: 'type',
      pie: {
        innerRadius: 0.6,
        style: { cornerRadius: 5 },
        state: { hover: { outerRadiusOffset: 10 } }
      },
      legends: { visible: true, orient: 'bottom' as any },
      animation: true
    };
  }, [activeResult]);

  const dailyTrendSpec = useMemo(() => {
    if (!activeResult || !activeResult.daily_results) return null;
    const values = activeResult.daily_results.flatMap((d: any) => [
        { time: d.date, type: '售前', value: d.presale },
        { time: d.date, type: '售中', value: d.midsale },
        { time: d.date, type: '售后', value: d.aftersale },
        { time: d.date, type: '总需求', value: d.staff },
    ]);
    return { 
      type: 'common', 
      data: [{ id: 'table', values }], 
      series: [
        { 
          type: 'bar', 
          xField: 'time', 
          yField: 'value', 
          seriesField: 'type', 
          stack: true, 
          barMaxWidth: 30,
          dataFilter: (datum: any) => ['售前', '售中', '售后'].includes(datum.type)
        },
        { 
          type: 'line', 
          xField: 'time', 
          yField: 'value', 
          seriesField: 'type',
          dataFilter: (datum: any) => datum.type === '总需求',
          line: { style: { lineWidth: 3 } },
          point: { style: { size: 4 } }
        }
      ],
      legends: { visible: true, orient: 'bottom' as any },
      axes: [{ orient: 'bottom' as any, label: { visible: true, autoRotate: true } }, { orient: 'left' as any }],
      tooltip: {
        visible: true,
        dimension: {
          visible: true,
          content: (items: any) => {
            const seen = new Set();
            return items.filter((item: any) => {
              if (seen.has(item.name)) return false;
              seen.add(item.name);
              return true;
            });
          }
        }
      }
    } as any;
  }, [activeResult]);

  const sensitivitySpec = useMemo(() => {
    if (!activeResult) return null;
    const staff = activeResult.needed_staff;
    const values = [
      { condition: '业务量+10%', staff: Math.round(staff * 1.1) },
      { condition: '基准', staff: staff },
      { condition: '业务量-10%', staff: Math.round(staff * 0.9) },
    ];
    return {
      type: 'bar',
      data: [{ id: 'table', values }],
      xField: 'condition',
      yField: 'staff',
      barMaxWidth: 40,
      label: { visible: true },
      color: ['#FF7D00']
    } as any;
  }, [activeResult]);

  const highPressureDays = useMemo(() => {
    if (!activeResult || !activeResult.daily_results) return [];
    return [...activeResult.daily_results]
      .sort((a, b) => b.staff - a.staff)
      .slice(0, 4);
  }, [activeResult]);

  if (loading) return <div style={{ padding: '100px 0', textAlign: 'center' }}><Progress type="circle" percent={100} width={80} /><div style={{ marginTop: 16 }}>深度分析中...</div></div>;
  if (reports.length === 0) return <div style={{ padding: '120px 0', textAlign: 'center' }}><Empty description="暂无数据" /><Button type="primary" style={{ marginTop: 24 }} onClick={() => window.location.reload()}>刷新数据</Button></div>;

  return (
    <div className='p-6 bg-gray-50 min-h-full'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><Title heading={3}><IconDashboard style={{ color: '#165DFF' }} /> 决策大脑分析中心</Title><Text type='secondary'>动态人力配比与压力预警</Text></div>
        <Select value={selectedReportId || undefined} onChange={setSelectedReportId} style={{ width: 340 }} size="small">{reports.map(r => <Select.Option key={r.id} value={r.id}>{r.scheme_name}</Select.Option>)}</Select>
      </div>
      
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {stats.map((item, index) => <Col span={6} key={index}><Card bordered={false} hoverable bodyStyle={{ padding: '12px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: 10, background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{item.icon}</div><div><div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{item.title}</div><div style={{ fontSize: 20, fontWeight: 700 }}>{item.value}<small style={{ fontSize: 12, marginLeft: 4 }}>{item.suffix}</small></div></div></div></Card></Col>)}
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card title="每日需求趋势" bordered={false} style={{ height: 450 }}>
            <div style={{ height: 370 }}>{dailyTrendSpec && <VChart spec={dailyTrendSpec} />}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title="建议峰值配比" bordered={false} style={{ height: 217 }}>
              <div style={{ height: 140 }}>{distributionSpec && <VChart spec={distributionSpec} />}</div>
            </Card>
            <Card title="敏感度风险探测" bordered={false} style={{ height: 217 }}>
              <div style={{ height: 140 }}>{sensitivitySpec && <VChart spec={sensitivitySpec} />}</div>
            </Card>
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="高压预警时段" bordered={false}>
            <Table 
              size="mini" 
              pagination={false} 
              data={highPressureDays} 
              columns={[
                { title: '日期', dataIndex: 'date' },
                { title: '预计峰值', dataIndex: 'staff', render: (v) => <Text bold style={{ color: 'var(--color-danger-6)' }}>{v}人</Text> },
                { title: '售前占比', render: (_, r: any) => `${((r.presale/r.staff)*100).toFixed(0)}%` },
                { title: '压力等级', render: () => <Tag color="red" size="small">极高</Tag> }
              ]} 
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="精算策略审计" bordered={false}>
            {activeReport ? (() => {
              const p = JSON.parse(activeReport.params_json || '{}');
              return (
                <Descriptions 
                  column={2} 
                  size="small" 
                  data={[
                    { label: '平均处理时长', value: `${p.avg_handling_time || 180}s` },
                    { label: '目标服务水平', value: `${((p.service_level_target || 0.8)*100).toFixed(0)}%` },
                    { label: '在岗率系数', value: p.actual_availability_rate || 0.85 },
                    { label: '并发阈值', value: p.max_concurrent_sessions || 3 }
                  ]} 
                />
              );
            })() : <Empty />}
          </Card>
        </Col>
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
