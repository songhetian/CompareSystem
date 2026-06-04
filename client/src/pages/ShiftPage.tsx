/**
 * 排班管理页面 - V7.0 Arco Design 重构版
 * 班次配置与排班方案管理
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Space,
  Message,
  Modal,
  Form,
  Input,
  Button,
  Tag,
  InputNumber,
  TimePicker,
  Empty,
} from '@arco-design/web-react';
import { IconPlus, IconEdit, IconDelete, IconRefresh, IconClockCircle, IconSettings, IconDashboard } from '@arco-design/web-react/icon';
import { PageHeader, StatsCard } from '../components/common';
import dayjs from 'dayjs';

export const ShiftPage = () => {
  const [form] = Form.useForm();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
      rest: shift.rest_hours,
    });
    setModalVisible(true);
  };

  const calculateWorkHours = (
    startTime: string,
    endTime: string,
    restHours: number = 0
  ): number => {
    if (!startTime || !endTime) return 0;

    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = dayjs(`2000-01-01 ${endTime}`);

    let diff = end.diff(start, 'hour', true);
    if (diff < 0) {
      diff = 24 + diff;
    }

    const actualWorkHours = diff - (restHours || 0);
    return Math.max(0, Math.round(actualWorkHours * 10) / 10);
  };

  const handleTimeChange = () => {
    const startTime = form.getFieldValue('startTime');
    const endTime = form.getFieldValue('endTime');
    const restHours = form.getFieldValue('rest') || 0;

    if (startTime && endTime) {
      const hours = calculateWorkHours(startTime, endTime, restHours);
      form.setFieldValue('hours', hours);
    }
  };

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
        rest: values.rest || 0,
      };

      if (editingShift) {
        await window.api.updateShift({
          id: editingShift.id,
          ...data,
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
      },
    });
  };

  // 统计不同类型班次数量
  const shiftStats = {
    早班: shifts.filter((s) => s.shift_type === '早班').length,
    中班: shifts.filter((s) => s.shift_type === '中班').length,
    晚班: shifts.filter((s) => s.shift_type === '晚班').length,
    全天: shifts.filter((s) => s.shift_type === '全天').length,
  };

  return (
    <div className='page-container' style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      {/* 页面头部 */}
      <PageHeader
        title='班次方案配置'
        subtitle='标准化班次方案定义，配置工作时段与时长，为排班调度提供基准'
        icon='⏰'
        extra={
          <Space size={12}>
            <Button icon={<IconRefresh />} onClick={loadShifts} loading={loading}>
              刷新
            </Button>
            <Button type='primary' icon={<IconPlus />} onClick={handleAdd}>
              创建班次
            </Button>
          </Space>
        }
      />

      {shifts.length === 0 ? (
        <Card bordered={false} style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Empty
            icon={<div style={{ fontSize: 64 }}>📅</div>}
            description={
              <div>
                <div style={{ fontSize: 16, marginBottom: 16 }}>暂无班次配置</div>
                <div style={{ fontSize: 14, color: 'var(--gray-6)', marginBottom: 24 }}>
                  创建第一个班次，开始您的排班配置之旅
                </div>
                <Button type='primary' icon={<IconPlus />} onClick={handleAdd} size='large'>
                  立即创建班次
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Space direction='vertical' size={16} style={{ width: '100%' }}>
          {/* 统计卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatsCard title='早班' value={shiftStats.早班} suffix='个' icon={<IconClockCircle />} />        
            <StatsCard title='中班' value={shiftStats.中班} suffix='个' icon={<IconClockCircle />} />        
            <StatsCard title='晚班' value={shiftStats.晚班} suffix='个' icon={<IconSettings />} />        
            <StatsCard title='全天' value={shiftStats.全天} suffix='个' icon={<IconDashboard />} />
          </div>

          {/* 班次列表 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {shifts.map((shift) => {
              const emojis: any = { 早班: '🌅', 中班: '☀️', 晚班: '🌙', 全天: '🌍' };
              const colors: any = {
                早班: '#FF9966',
                中班: '#4FACFE',
                晚班: '#A18CD1',
                全天: '#10B981',
              };

              return (
                <Card
                  key={shift.id}
                  bordered={false}
                  hoverable
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--color-border-2)',
                    background: 'var(--color-bg-2)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                  }}
                  title={
                    <Space>
                      <span style={{ fontSize: 24 }}>{emojis[shift.shift_type] || '⏰'}</span>
                      <span>{shift.shift_name}</span>
                      <Tag color='blue'>{shift.shift_type}</Tag>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        type='text'
                        icon={<IconEdit />}
                        onClick={() => handleEdit(shift)}
                      />
                      <Button
                        type='text'
                        status='danger'
                        icon={<IconDelete />}
                        onClick={() => handleDelete(shift.id, shift.shift_name)}
                      />
                    </Space>
                  }
                >
                  <Space direction='vertical' size={12} style={{ width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: 'var(--color-fill-2)',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--gray-6)' }}>开始时间</div>
                        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                          {shift.start_time}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: 'var(--color-fill-2)',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--gray-6)' }}>结束时间</div>
                        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                          {shift.end_time}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: 'var(--radius-medium)',
                        background: 'rgba(22, 93, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Space>
                        <span>工作时长</span>
                        <Tag color='blue' size='large'>
                          {shift.work_hours}小时
                        </Tag>
                      </Space>
                      {shift.rest_hours > 0 && (
                        <Space>
                          <span>休息</span>
                          <Tag>{shift.rest_hours}小时</Tag>
                        </Space>
                      )}
                    </div>
                  </Space>
                </Card>
              );
            })}
          </div>

          {/* 提示卡片 */}
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'var(--color-primary-light-1)',
              border: '1px solid var(--color-primary-light-2)',
            }}
          >
            <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-1)' }}>
              <strong>💡 班次设计建议：</strong>
              <div style={{ marginTop: 8 }}>
                • 早班适合 7:00-15:00，覆盖早高峰咨询时段
                <br />
                • 中班适合 10:00-18:00，承接午间及下午主力流量
                <br />
                • 晚班适合 14:00-22:00，处理晚间订单与售后
                <br />• 全天班适合 9:00-18:00，满足标准工作日需求
              </div>
            </div>
          </Card>
        </Space>
      )}

      {/* 创建/编辑班次模态框 */}
      <Modal
        title={editingShift ? '编辑班次' : '创建新班次'}
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingShift(null);
        }}
        footer={null}
        style={{ width: 600 }}
      >
        <Form
          form={form}
          layout='vertical'
          size='large'
          onSubmit={handleSubmit}
          autoComplete='off'
          requiredSymbol={false}
        >
          <Form.Item
            label={<span style={{ whiteSpace: 'nowrap' }}>班次名称 <span style={{ color: 'rgb(245, 63, 63)', fontWeight: 'bold' }}>*</span></span>}
            field='name'
            rules={[{ required: true, message: '请输入班次名称' }]}
          >
            <Input placeholder='例如: 早班A组' />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              label={<span style={{ whiteSpace: 'nowrap' }}>开始时间 <span style={{ color: 'rgb(245, 63, 63)', fontWeight: 'bold' }}>*</span></span>}
              field='startTime'
              rules={[{ required: true, message: '请选择开始时间' }]}
            >
              <TimePicker
                format='HH:mm'
                step={{ minute: 30 }}
                placeholder='选择开始时间'
                style={{ width: '100%' }}
                onChange={handleTimeChange}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ whiteSpace: 'nowrap' }}>结束时间 <span style={{ color: 'rgb(245, 63, 63)', fontWeight: 'bold' }}>*</span></span>}
              field='endTime'
              rules={[{ required: true, message: '请选择结束时间' }]}
            >
              <TimePicker
                format='HH:mm'
                step={{ minute: 30 }}
                placeholder='选择结束时间'
                style={{ width: '100%' }}
                onChange={handleTimeChange}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item label='休息时长（小时）' field='rest'>
              <InputNumber
                placeholder='选填'
                min={0}
                max={4}
                step={0.5}
                style={{ width: '100%' }}
                onChange={handleRestChange}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ whiteSpace: 'nowrap' }}>工作时长（小时） <span style={{ color: 'rgb(245, 63, 63)', fontWeight: 'bold' }}>*</span></span>}
              field='hours'
              rules={[{ required: true, message: '请先选择时间' }]}
            >
              <InputNumber
                placeholder='自动计算'
                min={0.5}
                max={24}
                step={0.5}
                disabled
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          <Card
            bordered={false}
            style={{
              background: 'var(--primary-light-1)',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              💡 <strong>提示：</strong>
              选择开始和结束时间后，工作时长会自动计算（总时长 -
              休息时长）。系统会根据开始时间自动判断班次类型。
            </div>
          </Card>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingShift(null);
                }}
              >
                取消
              </Button>
              <Button type='primary' htmlType='submit' loading={submitLoading}>
                {editingShift ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
