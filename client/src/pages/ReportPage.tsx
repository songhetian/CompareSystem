import {
  Typography, Card, Space, Message, Modal, Button, Tag, Descriptions, Statistic, Table, Grid, Pagination, Divider, Avatar, Empty
} from '@arco-design/web-react';
import { useState, useEffect, useMemo } from 'react';
import { 
  IconDelete, IconRefresh, IconEye, IconHistory, IconCalendar, IconDownload, IconFire, 
  IconStorage, IconFile, IconArrowRise, IconClockCircle, IconPushpin 
} from '@arco-design/web-react/icon';
import { InlineLoading } from '../components/LoadingScreen';
import { PageHeader, StatsCard } from '../components/common';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;
const { Row, Col } = Grid;

export const ReportPage = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await window.api.getHistory();
      setHistory(data);
    } catch (err) {
      Message.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (record: any) => {
    setCurrentRecord(record);
    setDetailModalVisible(true);
  };

  const handleExport = async (record: any) => {
    try {
      const res = JSON.parse(record.result_json || '{}');
      const dailyResults = res.daily_results || [];
      if (dailyResults.length === 0) return Message.warning('无数据可导出');

      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('汇总');
      summarySheet.addRow(['方案名称', record.scheme_name]);
      const dailySheet = workbook.addWorksheet('明细');
      dailySheet.addRow(['日期', '总需求', '售前', '售中', '售后']);
      dailyResults.forEach((d: any) => dailySheet.addRow([d.date, d.staff, d.presale, d.midsale, d.aftersale]));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `报告_${record.scheme_name}.xlsx`;
      a.click();
      Message.success('导出成功');
    } catch (err) {
      Message.error('导出失败');
    }
  };

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除 "${name}" 吗？`,
      onOk: async () => {
        await window.api.deleteHistory(id);
        loadHistory();
      }
    });
  };

  const paginatedHistory = useMemo(() => {
    return history.slice((page - 1) * pageSize, page * pageSize);
  }, [history, page, pageSize]);

  if (loading) return <InlineLoading tip="加载中..." />;

  return (
    <div className='page-container' style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '20px' }}>
      <PageHeader title='精算分析报告' subtitle='历史方案归档与对比分析' icon={<IconFile />} extra={<Button icon={<IconRefresh />} onClick={loadHistory}>刷新</Button>} />

      {history.length === 0 ? (
        <Card bordered={false} style={{ textAlign: 'center', padding: '80px 0' }}>
          <Empty description="暂无记录" />
        </Card>
      ) : (
        <div style={{ marginTop: 24 }}>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}><StatsCard title="累计报告" value={history.length} suffix="份" icon={<IconFile />} /></Col>
            <Col span={8}><StatsCard title="本月测算" value={history.filter(h => dayjs(h.create_time).isSame(dayjs(), 'month')).length} suffix="份" icon={<IconArrowRise />} /></Col>
            <Col span={8}><StatsCard title="最近执行" value={dayjs(history[0]?.create_time).format('MM-DD')} icon={<IconClockCircle />} /></Col>
          </Row>

          <div style={{ position: 'relative', paddingLeft: 30 }}>
            <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: 'var(--color-fill-3)' }} />
            {paginatedHistory.map((record) => (
              <div key={record.id} style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{ position: 'absolute', left: -26, top: 20, width: 14, height: 14, borderRadius: '50%', background: '#165DFF', border: '3px solid #fff' }} />
                <Card hoverable bordered={false} style={{ borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space direction="vertical" size={4}>
                      <Space size={12}>
                        <Text bold style={{ fontSize: 16 }}>{record.scheme_name}</Text>
                        <Tag size="small" color="arcoblue">{dayjs(record.create_time).fromNow()}</Tag>
                      </Space>
                      <Space split={<Divider type="vertical" />} style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                        <span><IconCalendar /> {dayjs(record.create_time).format('YYYY-MM-DD HH:mm')}</span>
                        <span>周期: {record.start_date} ~ {record.end_date}</span>
                      </Space>
                    </Space>
                    <Space>
                      <Button type="text" icon={<IconEye />} onClick={() => handleViewDetail(record)}>详情</Button>
                      <Button type="text" icon={<IconDownload />} onClick={() => handleExport(record)}>导出</Button>
                      <Button type="text" status="danger" icon={<IconDelete />} onClick={() => handleDelete(record.id, record.scheme_name)}>删除</Button>
                    </Space>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
            <Pagination total={history.length} current={page} pageSize={pageSize} showTotal sizeCanChange onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
          </div>
        </div>
      )}

      <Modal
        title={<Space><Avatar size={32} style={{ background: '#165DFF' }}><IconHistory /></Avatar><div><div style={{ fontSize: 16, fontWeight: 600 }}>精算报告详情审计</div><div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{currentRecord?.scheme_name}</div></div></Space>}
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setDetailModalVisible(false)}>关闭</Button>
            <Button type='primary' icon={<IconDownload />} onClick={() => handleExport(currentRecord)}>导出报告</Button>
          </Space>
        }
        style={{ width: 900, borderRadius: 16 }}
      >
        {currentRecord && (() => {
          const res = JSON.parse(currentRecord.result_json || '{}');
          return (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <Descriptions title={<Space><IconPushpin /> 测算目标</Space>} column={3} border size="small" data={[{ label: '目标值', value: res.target_sales > 0 ? `¥${(res.target_sales/10000).toFixed(0)}w` : `${res.target_visitors}人` }, { label: '天数', value: `${res.days}天` }, { label: '建议编制', value: res.needed_staff + '人' }]} />
                <Card title="每日人力明细" bordered={false} style={{ background: 'var(--color-fill-1)', borderRadius: 12 }}>
                  <Table 
                    size="mini" 
                    rowKey="date" 
                    data={res.daily_results || []} 
                    pagination={{ pageSize: 7, simple: true }}
                    columns={[
                      { title: '日期', dataIndex: 'date', render: (t, r: any) => r.isPeakDay ? <Space><Text color="red">{t}</Text><IconFire style={{ color: 'red' }} /></Space> : t },
                      { title: '建议人力', dataIndex: 'staff' },
                      { title: '售前', dataIndex: 'presale' },
                      { title: '售中', dataIndex: 'midsale' },
                      { title: '售后', dataIndex: 'aftersale' },
                      { title: '预测咨询', render: (_, r: any) => Math.round(r.vol_pre + r.vol_mid + r.vol_after) }
                    ]}
                  />
                </Card>
              </Space>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
