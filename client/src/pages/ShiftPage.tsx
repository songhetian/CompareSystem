import {
  Typography, Card, Space, Message, Modal, Form, Input,
  Button, Tag, InputNumber, TimePicker
} from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { IconPlus, IconEdit, IconDelete, IconRefresh } from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { InlineLoading } from '../components/LoadingScreen';

const { Title, Text } = Typography;

export const ShiftPage = () => {
  const [form] = Form.useForm();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await window.api.getShifts();
      setShifts(data);
    } catch (err) {
      console.error('加载失败:', err);
      Message.error('加载班次数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingShift(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (shift: any) => {
    setEditingShift(shift);
    form.setFieldsValue({
      name: shift.shift_name,
      startTime: shift.start_time,
      endTime: shift.end_time,
      rest: shift.rest_hours
    });
    setModalVisible(true);
  };

  // 计算工作时长（总时长 - 休息时长）
  const calculateWorkHours = (startTime: string, endTime: string, restHours: number = 0): number => {
    if (!startTime || !endTime) return 0;

    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = dayjs(`2000-01-01 ${endTime}`);

    let diff = end.diff(start, 'hour', true);
    if (diff < 0) {
      // 跨天情况
      diff = 24 + diff;
    }

    // 减去休息时长
    const actualWorkHours = diff - (restHours || 0);

    return Math.max(0, Math.round(actualWorkHours * 10) / 10); // 保留1位小数，最小为0
  };

  // 监听时间变化，自动计算工作时长
  const handleTimeChange = () => {
    const startTime = form.getFieldValue('startTime');
    const endTime = form.getFieldValue('endTime');
    const restHours = form.getFieldValue('rest') || 0;

    if (startTime && endTime) {
      const hours = calculateWorkHours(startTime, endTime, restHours);
      form.setFieldValue('hours', hours);
    }
  };

  // 监听休息时长变化
  const handleRestChange = (value: number) => {
    const startTime = form.getFieldValue('startTime');
    const endTime = form.getFieldValue('endTime');

    if (startTime && endTime) {
      const hours = calculateWorkHours(startTime, endTime, value || 0);
      form.setFieldValue('hours', hours);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitLoading(true);
    try {
      // 自动判断班次类型
      const hour = parseInt(values.startTime.split(':')[0]);
      let shiftType = '全天';
      if (hour < 12) shiftType = '早班';
      else if (hour < 18) shiftType = '中班';
      else shiftType = '晚班';

      const data = {
        name: values.name,
        type: shiftType,
        start: values.startTime,
        end: values.endTime,
        hours: values.hours,
        rest: values.rest || 0
      };

      if (editingShift) {
        await window.api.updateShift({
          id: editingShift.id,
          ...data
        });
        Message.success('✅ 班次更新成功');
      } else {
        await window.api.addShift(data);
        Message.success('✅ 班次创建成功');
      }

      setModalVisible(false);
      loadShifts();
    } catch (err: any) {
      Message.error(`${editingShift ? '更新' : '创建'}失败: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除班次"${name}"吗？此操作不可撤销。`,
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          await window.api.deleteShift(id);
          Message.success('删除成功');
          loadShifts();
        } catch (err) {
          Message.error('删除失败');
        }
      }
    });
  };

  if (loading) {
    return <InlineLoading tip="正在加载班次数据..." />;
  }

  return (
    <div className='h-full flex flex-col' style={{ background: '#f8f9fa' }}>
      {/* 顶部标题栏 */}
      <div className='bg-white' style={{ borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className='max-w-7xl mx-auto px-8 py-6'>
          <div className='flex justify-between items-center'>
            <div>
              <Title heading={3} style={{ margin: 0, marginBottom: 4, color: '#1f2937' }}>
                ⏰ 排班室
              </Title>
              <Text type='secondary' style={{ color: '#6b7280' }}>设计灵活的工作班次，适配多样化排班需求</Text>
            </div>
            <Space>
              <Button
                icon={<IconRefresh />}
                onClick={loadShifts}
                size='large'
              >
                刷新
              </Button>
              <Button
                type='primary'
                icon={<IconPlus />}
                onClick={handleAdd}
                size='large'
              >
                创建班次
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className='flex-1 overflow-y-auto p-8'>
        <div className='max-w-7xl mx-auto'>
          {shifts.length === 0 ? (
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
              <div className='text-8xl mb-6'>📅</div>
              <Title heading={4} style={{ marginBottom: 16 }}>暂无班次配置</Title>
              <Text type='secondary' style={{ fontSize: 15, display: 'block', marginBottom: 32 }}>
                创建第一个班次，开始您的排班配置之旅
              </Text>
              <Button
                type='primary'
                icon={<IconPlus />}
                onClick={handleAdd}
                size='large'
                style={{ height: 48, padding: '0 32px', fontSize: 16 }}
              >
                立即创建班次
              </Button>
            </Card>
          ) : (
            <div>
              {/* 统计卡片 */}
              <div className='grid grid-cols-4 gap-4 mb-6'>
                {['早班', '中班', '晚班', '全天'].map((type) => {
                  const count = shifts.filter(s => s.shift_type === type).length;
                  const emojis: any = { '早班': '🌅', '中班': '☀️', '晚班': '🌙', '全天': '🌍' };
                  const colors: any = { '早班': '#ff9966', '中班': '#4facfe', '晚班': '#a18cd1', '全天': '#10b981' };

                  return (
                    <Card
                      key={type}
                      bordered={false}
                      style={{
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${colors[type]}20 0%, ${colors[type]}40 100%)`,
                        border: `2px solid ${colors[type]}50`
                      }}
                    >
                      <div className='text-center'>
                        <div className='text-4xl mb-2'>{emojis[type]}</div>
                        <Text type='secondary' style={{ fontSize: 13 }}>{type}</Text>
                        <div className='text-3xl font-bold mt-2' style={{ color: colors[type] }}>
                          {count}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* 班次卡片列表 */}
              <div className='grid grid-cols-2 gap-6'>
                {shifts.map(shift => {
                  const emojis: any = { '早班': '🌅', '中班': '☀️', '晚班': '🌙', '全天': '🌍' };
                  const gradients: any = {
                    '早班': 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
                    '中班': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    '晚班': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                    '全天': 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                  };

                  return (
                    <Card
                      key={shift.id}
                      hoverable
                      bordered={false}
                      style={{
                        borderRadius: 16,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* 卡片头部 - 渐变色块 */}
                      <div
                        style={{
                          background: gradients[shift.shift_type] || gradients['全天'],
                          padding: '20px',
                          marginTop: -20,
                          marginLeft: -20,
                          marginRight: -20,
                          marginBottom: 16,
                          color: 'white'
                        }}
                      >
                        <div className='flex justify-between items-center'>
                          <Space>
                            <div className='text-5xl'>{emojis[shift.shift_type] || '⏰'}</div>
                            <div>
                              <div className='text-2xl font-bold mb-1'>{shift.shift_name}</div>
                              <Tag color='white' style={{ color: '#333' }}>{shift.shift_type}</Tag>
                            </div>
                          </Space>
                        </div>
                      </div>

                      {/* 卡片内容 */}
                      <div className='space-y-4'>
                        <div className='grid grid-cols-2 gap-4'>
                          <div className='text-center p-4 rounded-lg' style={{ background: '#f7f8fa' }}>
                            <Text type='secondary' style={{ fontSize: 12 }}>开始时间</Text>
                            <div className='text-xl font-bold mt-1'>{shift.start_time}</div>
                          </div>
                          <div className='text-center p-4 rounded-lg' style={{ background: '#f7f8fa' }}>
                            <Text type='secondary' style={{ fontSize: 12 }}>结束时间</Text>
                            <div className='text-xl font-bold mt-1'>{shift.end_time}</div>
                          </div>
                        </div>

                        <div className='flex justify-between items-center p-4 rounded-lg' style={{ background: '#eef8ff' }}>
                          <Space>
                            <Text>工作时长</Text>
                            <Tag color='blue' size='large'>{shift.work_hours}小时</Tag>
                          </Space>
                          {shift.rest_hours > 0 && (
                            <Space>
                              <Text>休息</Text>
                              <Tag color='gray'>{shift.rest_hours}小时</Tag>
                            </Space>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className='flex gap-2'>
                          <Button
                            type='outline'
                            icon={<IconEdit />}
                            onClick={() => handleEdit(shift)}
                            style={{ flex: 1, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                          >
                            编辑
                          </Button>
                          <Button
                            status='danger'
                            icon={<IconDelete />}
                            onClick={() => handleDelete(shift.id, shift.shift_name)}
                            style={{ flex: 1, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* 底部提示 */}
              <Card
                bordered={false}
                style={{
                  marginTop: 24,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)'
                }}
              >
                <Space direction='vertical' size='small'>
                  <Text bold>💡 班次设计建议</Text>
                  <Text style={{ fontSize: 13, lineHeight: 1.8 }}>
                    • 早班适合 7:00-15:00，覆盖早高峰咨询时段<br/>
                    • 中班适合 10:00-18:00，承接午间及下午主力流量<br/>
                    • 晚班适合 14:00-22:00，处理晚间订单与售后<br/>
                    • 全天班适合 9:00-18:00，满足标准工作日需求
                  </Text>
                </Space>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 创建/编辑班次模态框 */}
      <Modal
        title={
          <Space>
            <IconPlus style={{ color: '#4a90e2' }} />
            <Text bold>{editingShift ? '编辑班次' : '创建新班次'}</Text>
          </Space>
        }
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingShift(null);
        }}
        footer={null}
        style={{ width: 550 }}
      >
        <Form
          form={form}
          layout='vertical'
          onSubmit={handleSubmit}
          autoComplete='off'
          requiredSymbol={{ position: 'end' }}
        >
          <Form.Item
            label="班次名称"
            field="name"
            required
            rules={[{ required: true, message: '请输入班次名称' }]}
          >
            <Input
              placeholder="例如: 早班A组"
              size='large'
              prefix={<span style={{ fontSize: 16 }}>📝</span>}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="开始时间"
              field="startTime"
              required
              rules={[{ required: true, message: '请选择开始时间' }]}
            >
              <TimePicker
                format="HH:mm"
                placeholder="选择开始时间"
                size='large'
                style={{ width: '100%', borderRadius: 8 }}
                onChange={handleTimeChange}
              />
            </Form.Item>

            <Form.Item
              label="结束时间"
              field="endTime"
              required
              rules={[{ required: true, message: '请选择结束时间' }]}
            >
              <TimePicker
                format="HH:mm"
                placeholder="选择结束时间"
                size='large'
                style={{ width: '100%', borderRadius: 8 }}
                onChange={handleTimeChange}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="休息时长（小时）"
              field="rest"
            >
              <InputNumber
                placeholder="选填"
                size='large'
                min={0}
                max={4}
                step={0.5}
                style={{ width: '100%', borderRadius: 8 }}
                onChange={handleRestChange}
              />
            </Form.Item>

            <Form.Item
              label="工作时长（小时）"
              field="hours"
              required
              rules={[{ required: true, message: '请先选择时间' }]}
            >
              <InputNumber
                placeholder="自动计算"
                size='large'
                min={0.5}
                max={24}
                step={0.5}
                disabled
                style={{ width: '100%', borderRadius: 8, background: '#f5f5f5' }}
              />
            </Form.Item>
          </div>

          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: '#f0f5ff',
            border: '1px solid #d6e4ff',
            marginBottom: 20
          }}>
            <Text style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              💡 <strong>提示：</strong>选择开始和结束时间后，工作时长会自动计算（总时长 - 休息时长）。系统会根据开始时间自动判断班次类型（早班/中班/晚班）。
            </Text>
          </div>

          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: '#f0f5ff',
            border: '1px solid #d6e4ff',
            marginBottom: 20
          }}>
            <Text style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              💡 <strong>提示：</strong>选择开始和结束时间后，工作时长会自动计算。系统会根据开始时间自动判断班次类型（早班/中班/晚班）。
            </Text>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingShift(null);
                }}
                size='large'
                style={{ borderRadius: 8, minWidth: 90 }}
              >
                取消
              </Button>
              <Button
                type='primary'
                htmlType='submit'
                loading={submitLoading}
                size='large'
                style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', minWidth: 90 }}
              >
                {editingShift ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
