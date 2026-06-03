import {
  Typography, Card, Space, Message, Modal, Button, Tag, Descriptions, Statistic
} from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { IconDelete, IconRefresh, IconEye, IconHistory, IconCalendar } from '@arco-design/web-react/icon';
import { InlineLoading } from '../components/LoadingScreen';

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
    <div className='h-full flex flex-col' style={{ background: '#f8f9fa' }}>
      {/* 顶部标题栏 */}
      <div className='bg-white' style={{ borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className='max-w-7xl mx-auto px-8 py-6'>
          <div className='flex justify-between items-center'>
            <div>
              <Title heading={3} style={{ margin: 0, marginBottom: 4, color: '#1f2937' }}>
                📊 历史记录
              </Title>
              <Text type='secondary' style={{ color: '#6b7280' }}>查看过往测算记录，挖掘人力配置规律</Text>
            </div>
            <Space>
              <Button
                icon={<IconRefresh />}
                onClick={loadHistory}
                size='large'
              >
                刷新
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className='flex-1 overflow-y-auto p-8'>
        <div className='max-w-6xl mx-auto'>
          {history.length === 0 ? (
            <Card
              bordered={false}
              style={{
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                background: 'white',
                textAlign: 'center',
                padding: '80px 20px'
              }}
            >
              <div className='text-8xl mb-6'>📊</div>
              <Title heading={4} style={{ marginBottom: 16 }}>暂无历史记录</Title>
              <Text type='secondary' style={{ fontSize: 15, display: 'block', marginBottom: 32 }}>
                完成人力测算后，系统会自动保存记录<br/>
                您可以随时查看和对比历史方案
              </Text>
            </Card>
          ) : (
            <div>
              {/* 统计概览 */}
              <div className='grid grid-cols-3 gap-4 mb-8'>
                <Card bordered={false} style={{ borderRadius: 12, background: 'white' }}>
                  <Statistic
                    title="累计记录数"
                    value={history.length}
                    suffix="条"
                    styleValue={{ color: '#00bfa5' }}
                  />
                </Card>
                <Card bordered={false} style={{ borderRadius: 12, background: 'white' }}>
                  <Statistic
                    title="最近测算"
                    value={history.length > 0 ? new Date(history[0].create_time).toLocaleDateString('zh-CN') : '-'}
                    styleValue={{ color: '#7c4dff', fontSize: 16 }}
                  />
                </Card>
                <Card bordered={false} style={{ borderRadius: 12, background: 'white' }}>
                  <Statistic
                    title="本月记录"
                    value={history.filter(h => {
                      const date = new Date(h.create_time);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length}
                    suffix="条"
                    styleValue={{ color: '#ff6b6b' }}
                  />
                </Card>
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
              <Card
                bordered={false}
                style={{
                  marginTop: 24,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                }}
              >
                <Space direction='vertical' size='small'>
                  <Text bold>💡 数据管理建议</Text>
                  <Text style={{ fontSize: 13, lineHeight: 1.8 }}>
                    • 定期清理过期记录，保持系统运行流畅<br/>
                    • 对比不同时期的测算结果，优化人力配置策略<br/>
                    • 导出历史数据用于长期趋势分析和决策支持
                  </Text>
                </Space>
              </Card>
            </div>
          )}
        </div>
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
        style={{ width: 900 }}
      >
        {currentRecord && (
          <div>
            {/* 基本信息 */}
            <Card
              title={<Text bold>📋 基本信息</Text>}
              bordered
              style={{ marginBottom: 20, borderRadius: 8 }}
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
                title={<Text bold>⚙️ 参数配置</Text>}
                bordered
                style={{ marginBottom: 20, borderRadius: 8 }}
              >
                <div
                  className='p-4 rounded'
                  style={{
                    background: '#f7f8fa',
                    maxHeight: 300,
                    overflowY: 'auto',
                    fontFamily: 'Monaco, Consolas, monospace'
                  }}
                >
                  <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                    {JSON.stringify(JSON.parse(currentRecord.params_json), null, 2)}
                  </pre>
                </div>
              </Card>
            )}

            {/* 测算结果 */}
            {currentRecord.result_json && (
              <Card
                title={<Text bold>📊 测算结果</Text>}
                bordered
                style={{ borderRadius: 8 }}
              >
                <div
                  className='p-4 rounded'
                  style={{
                    background: '#e0f7fa',
                    maxHeight: 400,
                    overflowY: 'auto',
                    fontFamily: 'Monaco, Consolas, monospace'
                  }}
                >
                  <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#00695c' }}>
                    {JSON.stringify(JSON.parse(currentRecord.result_json), null, 2)}
                  </pre>
                </div>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
