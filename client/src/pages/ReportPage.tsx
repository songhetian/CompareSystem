import {
  Typography, Card, Space, Message, Modal, Button, Tag, Descriptions, Statistic, Table, Grid
} from '@arco-design/web-react';
import { useState, useEffect, useMemo } from 'react';
import { IconDelete, IconRefresh, IconEye, IconHistory, IconCalendar, IconDownload, IconCheckCircle } from '@arco-design/web-react/icon';
import { InlineLoading } from '../components/LoadingScreen';
import { PageHeader, StatsCard } from '../components/common';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
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
import { Bar } from 'react-chartjs-2';

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

const { Title, Text } = Typography;
const { Row, Col } = Grid;

export const ReportPage = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await window.api.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('加载失败:', err);
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
      const params = JSON.parse(record.params_json || '{}');
      
      if (dailyResults.length === 0) {
        Message.warning('当前报告无逐日明细数据可导出');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      
      // ========== 第1个Sheet：测算汇总 ==========
      const summarySheet = workbook.addWorksheet('测算汇总');

      summarySheet.mergeCells('A1:D1');
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = '人力需求测算报告';
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F0FF' } };

      summarySheet.addRow([]);
      summarySheet.addRow(['测算名称', record.scheme_name]);
      summarySheet.addRow(['导出时间', dayjs().format('YYYY-MM-DD HH:mm:ss')]);
      summarySheet.addRow(['周期', `${record.start_date || 'N/A'} 至 ${record.end_date || 'N/A'}`]);
      summarySheet.addRow([]);

      summarySheet.addRow(['核心指标', '', '', '']);
      summarySheet.getRow(7).font = { bold: true };
      summarySheet.getRow(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      
      summarySheet.addRow(['建议总编制', res.needed_staff || 0, '人']);
      summarySheet.addRow(['售前人员', res.presale_staff || 0, '人']);
      summarySheet.addRow(['售中人员', res.midsale_staff || 0, '人']);
      summarySheet.addRow(['售后人员', res.aftersale_staff || 0, '人']);
      
      summarySheet.columns = [{ width: 20 }, { width: 30 }, { width: 15 }];

      // ========== 第2个Sheet：每日人力需求明细 ==========
      const dailySheet = workbook.addWorksheet('每日人力需求明细');
      
      // 表头
      const dailyHeaders = ['日期', '是否高峰日', '总需求(人)', '售前(人)', '售中(人)', '售后(人)', '售前话务量', '售中话务量', '售后话务量'];
      const dailyHeaderRow = dailySheet.addRow(dailyHeaders);
      dailyHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      dailyHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
      dailyHeaderRow.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // 数据行
      dailyResults.forEach((day: any) => {
        const row = dailySheet.addRow([
          day.fullDate || day.date,
          day.isPeakDay ? '是 🔥' : '否',
          day.staff || 0,
          day.presale || 0,
          day.midsale || 0,
          day.aftersale || 0,
          Math.round(day.vol_pre || 0),
          Math.round(day.vol_mid || 0),
          Math.round(day.vol_after || 0)
        ]);
        
        // 高峰日高亮
        if (day.isPeakDay) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6E6' } };
          });
        }
      });

      // 设置列宽
      dailySheet.columns = [
        { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }
      ];

      // 添加边框
      dailySheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // ========== 导出文件 ==========
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      
      const safeName = (record.scheme_name || 'report').replace(/[\\\/:\*\?"<>|]/g, '_');
      anchor.download = `人力测算报告_${safeName}_${dayjs().format('YYYYMMDD')}.xlsx`;
      
      anchor.click();
      window.URL.revokeObjectURL(url);
      Message.success('报表导出成功！包含测算汇总、每日明细');
    } catch (err: any) {
      console.error('Export failed:', err);
      Message.error(`导出失败: ${err.message || '未知错误'}`);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除记录"${name}"吗？此操作不可撤销。`,
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          await window.api.deleteHistory(id);
          Message.success('删除成功');
          loadHistory();
        } catch (err) {
          Message.error('删除失败');
        }
      }
    });
  };

  // 分页状态与逻辑
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const paginatedHistory = useMemo(() => {
    return history.slice((page - 1) * pageSize, page * pageSize);
  }, [history, page, pageSize]);

  const renderPagination = () => (
    history.length > pageSize && (
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Pagination 
          current={page} 
          pageSize={pageSize} 
          total={history.length} 
          onChange={(p) => setPage(p)}
          showTotal
        />
      </div>
    )
  );

  if (loading) {
    return <InlineLoading tip="正在加载历史记录..." />;
  }

  return (
    <div className='page-container' style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      {/* 页面头部 */}
      <PageHeader
        title='测算分析报告'
        subtitle='历史测算执行记录归档与多维度精算结果对比分析'
        icon='📊'

        extra={
          <Button
            icon={<IconRefresh />}
            onClick={loadHistory}
            size='large'
          >
            刷新
          </Button>
        }
      />

      {/* 内容区域 */}
      <div className='page-content'>
          {history.length === 0 ? (
            <div className='empty-state'>
              <div className='text-8xl mb-6'>📊</div>
              <Title heading={4} style={{ marginBottom: 16 }}>暂无历史记录</Title>
              <Text type='secondary' style={{ fontSize: 15, display: 'block', marginBottom: 32 }}>
                完成人力测算后，系统会自动保存记录<br/>
                您可以随时查看和对比历史方案
              </Text>
            </div>
          ) : (
            <div>
              {/* 统计概览 */}
              <div className='grid grid-cols-3 gap-4' style={{ marginBottom: 'var(--spacing-large)' }}>
                <StatsCard
                  title="累计记录数"
                  value={history.length}
                  suffix="条"
                  icon='📝'
                  color='#00bfa5'
                />
                <StatsCard
                  title="最近测算"
                  value={history.length > 0 ? new Date(history[0].create_time).toLocaleDateString('zh-CN') : '-'}
                  icon='📅'
                  color='#7c4dff'
                />
                <StatsCard
                  title="本月记录"
                  value={history.filter(h => {
                    const date = new Date(h.create_time);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                  suffix="条"
                  icon='📊'
                  color='#ff6b6b'
                />
              </div>

              {/* 时间线样式的记录列表 */}
              <div className='relative' style={{ paddingLeft: 40 }}>
                {/* 时间线竖线 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 15,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: 'linear-gradient(180deg, #00bfa5 0%, #fed6e3 100%)'
                  }}
                />

                {paginatedHistory.map((record, index) => {
                  const date = new Date(record.create_time);
                  const isRecent = Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days

                  return (
                    <div key={record.id} className='relative mb-6'>
                      {/* 时间线圆点 */}
                      <div
                        style={{
                          position: 'absolute',
                          left: -33,
                          top: 20,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: isRecent ? '#00bfa5' : '#b0bec5',
                          border: '3px solid white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                      />

                      <Card
                        hoverable
                        bordered={false}
                        style={{
                          borderRadius: 12,
                          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                          border: isRecent ? '2px solid #00bfa540' : '1px solid #e0e0e0',
                          background: isRecent ? '#e0f7fa' : 'white'
                        }}
                      >
                        <div className='flex justify-between items-start'>
                          <div className='flex-1'>
                            <Space direction='vertical' size='small'>
                              <Space>
                                <IconHistory style={{ color: '#00bfa5', fontSize: 20 }} />
                                <Text bold style={{ fontSize: 18 }}>{record.scheme_name}</Text>
                                {isRecent && <Tag color='green' size='small'>最近</Tag>}
                              </Space>

                              <Space>
                                <IconCalendar style={{ color: '#999' }} />
                                <Text type='secondary'>
                                  {date.toLocaleDateString('zh-CN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Text>
                              </Space>

                              {record.description && (
                                <Text type='secondary' style={{ fontSize: 13, lineHeight: 1.6 }}>
                                  {record.description}
                                </Text>
                              )}
                            </Space>
                          </div>

                          <Space>
                            <Button
                              type='primary'
                              icon={<IconEye />}
                              onClick={() => handleViewDetail(record)}
                            >
                              查看详情
                            </Button>
                            <Button 
                              icon={<IconDownload />} 
                              onClick={() => handleExport(record)}
                            >
                              导出
                            </Button>
                            <Button
                              status='danger'
                              icon={<IconDelete />}
                              onClick={() => handleDelete(record.id, record.scheme_name)}
                            >
                              删除
                            </Button>
                          </Space>
                        </div>
                      </Card>
                    </div>
                  );
                })}
                {renderPagination()}
              </div>

              {/* 底部提示 */}
              <div className='info-banner' style={{ marginTop: 'var(--spacing-large)' }}>
                <Space direction='vertical' size='small'>
                  <Text bold>💡 数据管理建议</Text>
                  <Text style={{ fontSize: 13, lineHeight: 1.8 }}>
                    • 定期清理过期记录，保持系统运行流畅<br/>
                    • 对比不同时期的测算结果，优化人力配置策略<br/>
                    • 导出历史数据用于长期趋势分析和决策支持
                  </Text>
                </Space>
              </div>
            </div>
          )}
      </div>

      {/* 详情模态框 */}
      <Modal
        title={
          <Space>
            <IconEye style={{ color: '#00bfa5' }} />
            <Text bold>精算报告全景详细分析</Text>
            {currentRecord && <Tag color='arcoblue' size='small'>{currentRecord.scheme_name}</Tag>}
          </Space>
        }
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          <Space>
            <Button 
              icon={<IconDownload />} 
              onClick={() => handleExport(currentRecord)}
            >
              导出 Excel
            </Button>
            <Button type='primary' onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>
          </Space>
        }
        style={{ width: 800, borderRadius: 12, top: 40 }}
      >
        {currentRecord && (() => {
          let res: any = {};
          let params: any = {};
          try { 
            res = JSON.parse(currentRecord.result_json || '{}'); 
            params = JSON.parse(currentRecord.params_json || '{}');
          } catch {}
          
          return (
            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
              <Space direction='vertical' size='large' style={{ width: '100%' }}>
                
                {/* 1. 基础信息快照 */}
                <Descriptions
                  column={2}
                  title={<Title heading={6}>📌 基础信息快照</Title>}
                  border
                  size='small'
                  data={[
                    { label: '方案名称', value: currentRecord.scheme_name },
                    { label: '生成时间', value: currentRecord.create_time || '-' },
                    { label: '计算周期', value: `${currentRecord.start_date} 至 ${currentRecord.end_date} (${res.days || '-'}天)` },
                    { 
                      label: res.target_sales > 0 ? '目标销售额' : '目标访客数', 
                      value: <Text bold style={{ color: 'var(--color-primary-light-4)' }}>
                        {res.target_sales > 0 ? `¥${res.target_sales?.toLocaleString()}` : `${res.target_visitors?.toLocaleString() || 0} 人`}
                      </Text>
                    },
                  ]}
                />

                {/* 2. 精算核心结论 */}
                <Card title={<Title heading={6} style={{ margin: 0 }}>📊 精算核心产出</Title>} style={{ background: 'var(--color-fill-1)', border: 'none' }}>
                  <Row gutter={24}>
                    <Col span={8}>
                      <Statistic title="建议总编制" value={res.needed_staff || 0} suffix="人" groupSeparator valueStyle={{ color: '#165DFF' }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="预测总咨询量" value={Math.round(res.total_consult || 0)} suffix="次" groupSeparator />
                    </Col>
                    <Col span={8}>
                      <Statistic title="日均话务量" value={Math.round(res.daily_consult || 0)} suffix="次" groupSeparator />
                    </Col>
                  </Row>

                  <div style={{ marginTop: 20 }}>
                    <Text type='secondary'>每日人力需求趋势：</Text>
                    <div style={{ height: 200, marginTop: 10 }}>
                      <Bar 
                        data={{
                          labels: (res.daily_results || []).map((d: any) => d.fullDate || d.date),
                          datasets: [
                            { label: '售前', data: (res.daily_results || []).map((d: any) => d.presale), backgroundColor: '#8b5cf6' },
                            { label: '售中', data: (res.daily_results || []).map((d: any) => d.midsale), backgroundColor: '#f59e0b' },
                            { label: '售后', data: (res.daily_results || []).map((d: any) => d.aftersale), backgroundColor: '#10b981' },
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: { y: { stacked: true }, x: { stacked: true, ticks: { font: { size: 10 } } } },
                          plugins: { legend: { position: 'bottom' } }
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <Text type='secondary'>岗位人力配比：</Text>
                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                      <div style={{ flex: 1, padding: '12px', background: '#e8f3ff', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#165DFF' }}>售前组</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{res.presale_staff || 0} <small style={{ fontSize: 12 }}>人</small></div>
                      </div>
                      <div style={{ flex: 1, padding: '12px', background: '#e8ffea', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#00B42A' }}>售中组</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{res.midsale_staff || 0} <small style={{ fontSize: 12 }}>人</small></div>
                      </div>
                      <div style={{ flex: 1, padding: '12px', background: '#fff7e8', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#FF7D00' }}>售后组</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{res.aftersale_staff || 0} <small style={{ fontSize: 12 }}>人</small></div>
                      </div>
                    </div>
                  </div>
                </Card>


                {/* 3. 流量拆解详情 */}
                <div>
                  <Title heading={6}>🔍 流量推演双径拆解</Title>
                  <div style={{ padding: '0 12px' }}>
                    <Row gutter={16} align='center'>
                      <Col span={11}>
                        <div style={{ padding: 12, border: '1px solid var(--color-border-2)', borderRadius: 8 }}>
                          <Text type='secondary' size='small'>路径A：销售额反推</Text>
                          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{Math.round(res.presale_from_sales || 0).toLocaleString()} <small style={{ fontWeight: 400, fontSize: 12 }}>次咨询</small></div>
                        </div>
                      </Col>
                      <Col span={2} style={{ textAlign: 'center' }}><Text type='secondary'>VS</Text></Col>
                      <Col span={11}>
                        <div style={{ padding: 12, border: '1px solid var(--color-border-2)', borderRadius: 8 }}>
                          <Text type='secondary' size='small'>路径B：基准访客正推</Text>
                          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{Math.round(res.visitor_presale_baseline || 0).toLocaleString()} <small style={{ fontWeight: 400, fontSize: 12 }}>次咨询</small></div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>

                {/* 4. 关键算法系数快照 */}
                <Descriptions
                  column={3}
                  title={<Title heading={6}>⚙️ 核心算法系数快照</Title>}
                  size='small'
                  layout='inline-horizontal'
                  data={[
                    { label: '平均并发', value: params.max_concurrent_sessions || 3 },
                    { label: '首次解决率', value: `${((params.first_call_resolution || 0.85) * 100).toFixed(0)}%` },
                    { label: '实际在岗率', value: `${((params.actual_availability_rate || 0.85) * 100).toFixed(0)}%` },
                    { label: '目标响应率', value: `${((params.response_rate || 0.95) * 100).toFixed(0)}%` },
                    { label: '班次损耗', value: `${((params.schedule_inefficiency || 0.08) * 100).toFixed(0)}%` },
                    { label: 'SL压力系数', value: params.service_level_factor || 1.1 },
                  ]}
                />

                {/* 5. 敏感度对冲预估 */}
                {res.sensitivity && (
                  <div>
                    <Title heading={6}>📉 业务波动敏感度对冲预估</Title>
                    <Table
                      size='small'
                      pagination={false}
                      rowKey="id"
                      columns={[
                        { title: '业务指标变动', dataIndex: 'scenario' },
                        { title: '编制变动影响', dataIndex: 'impact', render: (val) => (
                          <Tag color={val > 0 ? 'red' : 'green'}>{val > 0 ? `+${val}` : val} 人</Tag>
                        )},
                        { title: '对冲建议', dataIndex: 'action' }
                      ]}
                      data={[
                        { id: 1, scenario: '客单价 降低 10%', impact: Math.abs(res.sensitivity.avg_order_value || 0), action: '建议申请临时增编' },
                        { id: 2, scenario: '客单价 提升 10%', impact: -(res.sensitivity.avg_order_value || 0), action: '存在编制溢出风险' },
                        { id: 3, scenario: '转化率 提升 10%', impact: res.sensitivity.conversion_rate || 0, action: '关注人员饱和度压力' },
                      ]}
                    />
                  </div>
                )}
              </Space>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
