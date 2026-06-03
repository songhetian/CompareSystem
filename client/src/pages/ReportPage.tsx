import {
  Typography, Card, Space, Message, Modal, Button, Tag, Descriptions, Statistic
} from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { IconDelete, IconRefresh, IconEye, IconHistory, IconCalendar } from '@arco-design/web-react/icon';
import { InlineLoading } from '../components/LoadingScreen';
import { PageHeader, StatsCard } from '../components/common';

const { Title, Text } = Typography;

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

  if (loading) {
    return <InlineLoading tip="正在加载历史记录..." />;
  }

  return (
    <div className='page-container' style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      {/* 页面头部 */}
      <PageHeader
        title='测算报告'
        subtitle='查看过往测算记录，挖掘人力配置规律'
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

                {history.map((record, index) => {
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
            <Text bold>测算记录详情</Text>
          </Space>
        }
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          <Button type='primary' onClick={() => setDetailModalVisible(false)} size='large'>
            关闭
          </Button>
        }
        style={{ width: 900, borderRadius: 12 }}
      >
        {currentRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 基本信息 */}
            <Card
              title={<Text bold>📋 基本信息</Text>}
              bordered={false}
              style={{ borderRadius: 12, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-2)' }}
            >
              <Descriptions
                column={2}
                data={[
                  {
                    label: '方案名称',
                    value: <Text bold style={{ fontSize: 16 }}>{currentRecord.scheme_name}</Text>
                  },
                  {
                    label: '测算时间',
                    value: currentRecord.create_time
                      ? new Date(currentRecord.create_time).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'
                  },
                  {
                    label: '描述说明',
                    value: currentRecord.description || '暂无描述',
                    span: 2
                  }
                ]}
              />
            </Card>

            {/* 参数配置 */}
            {currentRecord.params_json && (
              <Card
                title={<Text bold>⚙️ 核心参数</Text>}
                bordered={false}
                style={{ borderRadius: 12, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-2)' }}
              >
                {(() => {
                  try {
                    const params = JSON.parse(currentRecord.params_json);
                    return (
                      <Descriptions
                        column={3}
                        data={[
                          { label: '售前处理时长', value: `${params.presale_handle_time || 4.5} 分钟` },
                          { label: '售中处理时长', value: `${params.midsale_handle_time || 3.0} 分钟` },
                          { label: '售后处理时长', value: `${params.aftersale_handle_time || 6.5} 分钟` },
                          { label: '询单转化率', value: `${((params.c_to_o || 0.45) * 100).toFixed(0)}%` },
                          { label: '付款售后率', value: `${((params.payment_to_aftersale || 0.15) * 100).toFixed(0)}%` },
                          { label: '客单价', value: `${params.avg_order_value || 200} 元` },
                        ]}
                      />
                    );
                  } catch (e) {
                    return <Text type='secondary'>参数解析失败</Text>;
                  }
                })()}
              </Card>
            )}

            {/* 测算结果 */}
            {currentRecord.result_json && (
              <Card
                title={<Text bold>📊 测算结果</Text>}
                bordered={false}
                style={{ borderRadius: 12, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-2)' }}
              >
                {(() => {
                  try {
                    const res = JSON.parse(currentRecord.result_json);
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        <div style={{ background: 'rgba(22,93,255,0.05)', padding: 16, borderRadius: 8, border: '1px solid rgba(22,93,255,0.1)' }}>
                          <div style={{ color: 'var(--color-text-3)', fontSize: 13, marginBottom: 8 }}>建议总编制</div>
                          <div style={{ color: '#165dff', fontSize: 24, fontWeight: 'bold' }}>{res.needed_staff} <span style={{ fontSize: 14, fontWeight: 'normal' }}>人</span></div>
                        </div>
                        <div style={{ background: 'rgba(0,180,42,0.05)', padding: 16, borderRadius: 8, border: '1px solid rgba(0,180,42,0.1)' }}>
                          <div style={{ color: 'var(--color-text-3)', fontSize: 13, marginBottom: 8 }}>售前人员</div>
                          <div style={{ color: '#00b42a', fontSize: 24, fontWeight: 'bold' }}>{res.presale_staff} <span style={{ fontSize: 14, fontWeight: 'normal' }}>人</span></div>
                        </div>
                        <div style={{ background: 'rgba(255,125,0,0.05)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,125,0,0.1)' }}>
                          <div style={{ color: 'var(--color-text-3)', fontSize: 13, marginBottom: 8 }}>售中人员</div>
                          <div style={{ color: '#ff7d00', fontSize: 24, fontWeight: 'bold' }}>{res.midsale_staff} <span style={{ fontSize: 14, fontWeight: 'normal' }}>人</span></div>
                        </div>
                        <div style={{ background: 'rgba(245,63,63,0.05)', padding: 16, borderRadius: 8, border: '1px solid rgba(245,63,63,0.1)' }}>
                          <div style={{ color: 'var(--color-text-3)', fontSize: 13, marginBottom: 8 }}>售后人员</div>
                          <div style={{ color: '#f53f3f', fontSize: 24, fontWeight: 'bold' }}>{res.aftersale_staff} <span style={{ fontSize: 14, fontWeight: 'normal' }}>人</span></div>
                        </div>
                        
                        <div style={{ gridColumn: 'span 4', marginTop: 16 }}>
                          <Descriptions
                            column={3}
                            data={[
                              { label: '日均接待预估', value: `${Math.round(res.daily_consult || 0)} 次` },
                              { label: '理论峰值日', value: `${res.theoretical_peak || 0} 人` },
                              { label: '日均工时负荷', value: `${(res.daily_hours || 0).toFixed(1)} 小时` },
                            ]}
                          />
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return <Text type='secondary'>结果解析失败</Text>;
                  }
                })()}
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
