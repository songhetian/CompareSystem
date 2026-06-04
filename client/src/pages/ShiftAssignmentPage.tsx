/**
 * 人员排班页面 (日历版)
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Card, Space, Button, Select, Message, Typography, Tag, Calendar, Badge, Modal, List, Avatar, Tooltip, Empty, Table, Divider, Input, Alert, Grid, Statistic
} from '@arco-design/web-react';
import { 
  IconSave, IconRefresh, IconFile, IconExclamationCircle, IconCheckCircle, IconCalendar, IconUser, IconSearch, IconApps, IconClockCircle, IconCheck
} from '@arco-design/web-react/icon';
import { PageHeader } from '../components/common';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

export const ShiftAssignmentPage = () => {
  const [loading, setLoading] = useState(false);
  
  // 基础数据
  const [departments, setDepartments] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [historyReports, setHistoryReports] = useState<any[]>([]);

  // 状态
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [allAssignments, setAllAssignments] = useState<any[]>([]); // 原始数据库记录
  
  // 状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeDate, setActiveDate] = useState<dayjs.Dayjs | null>(null);
  const [tempAssignments, setTempAssignments] = useState<any>({});
  const [personnelSearch, setPersonnelSearch] = useState(''); // 新增搜索状态
  const [bulkShift, setBulkShift] = useState<number | undefined>(); // 新增批量排班状态

  // 校验模态框
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);

  // 过滤后的人员列表
  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => 
      p.name.toLowerCase().includes(personnelSearch.toLowerCase()) || 
      (p.staff_id && p.staff_id.includes(personnelSearch))
    );
  }, [personnel, personnelSearch]);

  const handleBulkSet = () => {
    if (bulkShift === undefined) return;
    const newAssignments = { ...tempAssignments };
    filteredPersonnel.forEach(p => {
      newAssignments[p.id] = bulkShift;
    });
    setTempAssignments(newAssignments);
    Message.success(`已应用至 ${filteredPersonnel.length} 位人员`);
  };

  // 1. 初始化 - 整合加载逻辑
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [dRes, sRes, hRes, pRes] = await Promise.all([
          window.api.getDepartments(),
          window.api.getShifts(),
          window.api.getHistory(),
          window.api.getPersonnel()
        ]);
        
        setDepartments(dRes);
        setShifts(sRes);
        setHistoryReports(hRes);
        setPersonnel(pRes);
      } catch (err) {
        Message.error('基础数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 获取当月排班数据
  const fetchMonthAssignments = async () => {
    setLoading(true);
    try {
      const start = currentDate.startOf('month').format('YYYY-MM-DD');
      const end = currentDate.endOf('month').format('YYYY-MM-DD');
      const res = await window.api.getAssignments(start, end);
      setAllAssignments(res);
    } catch (err) {
      Message.error('获取排班数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthAssignments();
  }, [currentDate]);

  const handleDateClick = async (date: dayjs.Dayjs) => {
    setActiveDate(date);
    const dateStr = date.format('YYYY-MM-DD');
    
    setLoading(true);
    try {
      const assignments = await window.api.getAssignments(dateStr, dateStr);
      const assignmentsMap: any = {};
      assignments.forEach((a: any) => {
        assignmentsMap[a.personnel_id] = a.shift_id;
      });
      setTempAssignments(assignmentsMap);
      setDetailModalVisible(true);
    } catch (e) {
      Message.error('加载排班数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染排班详情Modal内容
  const renderPersonnelModalContent = () => {
    if (filteredPersonnel.length === 0) {
      return <Empty description="未找到匹配的人员" style={{ padding: '40px 0' }} />;
    }

    const getAvatarColor = (name: string) => {
        const colors = ['#F53F3F', '#F77234', '#FF7D00', '#F7BA1E', '#00B42A', '#165DFF', '#3491FA', '#722ED1'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
      <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px 4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredPersonnel.map((p: any) => {
            const currentShiftId = tempAssignments[p.id];
            const currentShift = shifts.find(s => s.id === currentShiftId);

            return (
              <Card 
                key={p.id}
                size="small"
                style={{ 
                  borderRadius: 12, 
                  border: currentShiftId ? '1.5px solid var(--color-primary-3)' : '1px solid var(--color-border-2)',
                  background: currentShiftId ? 'var(--color-primary-light-1)' : '#fff',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* 人员基本信息 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar size={32} style={{ backgroundColor: getAvatarColor(p.name || '未知') }}>
                        {p.name?.[0] || '?'}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>工号: {p.staff_id || '-'}</div>
                      </div>
                    </div>
                    {currentShiftId && (
                      <Tag color="arcoblue" size="small" icon={<IconCheckCircle />} bordered style={{ borderRadius: 4 }}>
                        已排
                      </Tag>
                    )}
                  </div>

                  <Divider style={{ margin: '4px 0' }} />

                  {/* 班次选择选择器 */}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>分派班次</div>
                    <Select
                      placeholder="点击分派班次"
                      allowClear
                      value={currentShiftId ?? undefined}
                      onChange={(v) => setTempAssignments((prev: any) => ({ ...prev, [p.id]: v }))}
                      style={{ width: '100%', borderRadius: 6 }}
                      size="small"
                    >
                      {shifts.map((s: any) => (
                        <Select.Option key={s.id} value={s.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{s.shift_name}</span>
                            <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{s.start_time}-{s.end_time}</span>
                          </div>
                        </Select.Option>
                      ))}
                    </Select>
                  </div>

                  {/* 班次预览详情 */}
                  {currentShift && (
                    <div style={{ 
                      padding: '8px', 
                      background: '#fff', 
                      borderRadius: 6, 
                      fontSize: 11, 
                      border: '1px dashed var(--color-primary-3)' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary-6)' }}>
                        <IconClockCircle />
                        <span>工作时长: {currentShift.work_hours}h</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // 4. 关联报告
  const currentReport = useMemo(() => 
    historyReports.find(r => r.id === selectedReportId), 
  [selectedReportId, historyReports]);

  const suggestedMap = useMemo(() => {
    if (!currentReport) return {};
    const res: any = {};
    try {
      const resultObj = JSON.parse(currentReport.result_json);
      (resultObj.daily_results || []).forEach((dr: any) => {
        res[dr.fullDate || dr.date] = { needed: dr.staff, isPeak: dr.isPeakDay };
      });
    } catch(e) {}
    return res;
  }, [currentReport]);

  const plannedCountMap = useMemo(() => {
    const res: any = {};
    allAssignments.forEach(a => {
      if (personnel.some(p => p.id === a.personnel_id)) {
        res[a.assignment_date] = (res[a.assignment_date] || 0) + 1;
      }
    });
    return res;
  }, [allAssignments, personnel]);

  // 交互：校验并保存本日排班
  const checkAndSaveDaily = () => {
    if (!activeDate || !selectedReportId || !currentReport) {
      saveDailyAssignments();
      return;
    }

    const dateStr = activeDate.format('YYYY-MM-DD');
    const suggestion = suggestedMap[dateStr];
    if (!suggestion) {
      saveDailyAssignments();
      return;
    }

    const plannedCount = Object.values(tempAssignments).filter(v => !!v).length;
    const currentShiftIds = new Set(Object.values(tempAssignments).filter(v => !!v));
    
    let plannedShiftIds: number[] = [];
    try {
      plannedShiftIds = JSON.parse(currentReport.params_json).plannedShiftIds || [];
    } catch(e) {}

    const uncoveredShiftNames = plannedShiftIds
      .filter(sid => !currentShiftIds.has(sid))
      .map(sid => shifts.find(s => s.id === sid)?.shift_name)
      .filter(Boolean);

    if (plannedCount < suggestion.needed || uncoveredShiftNames.length > 0) {
      setValidationResults([{
        date: dateStr,
        headcountGap: suggestion.needed - plannedCount,
        needed: suggestion.needed,
        planned: plannedCount,
        uncoveredShifts: uncoveredShiftNames,
        isPeak: suggestion.isPeak
      }]);
      setValidationModalVisible(true);
    } else {
      saveDailyAssignments();
    }
  };

  const saveDailyAssignments = async () => {
    if (!activeDate) return;
    const dateStr = activeDate.format('YYYY-MM-DD');
    setLoading(true);
    try {
      const dataToSave: any[] = [];
      Object.entries(tempAssignments).forEach(([pId, sId]) => {
        dataToSave.push({ personnelId: parseInt(pId), shiftId: sId, date: dateStr, remark: '' });
      });
      personnel.forEach(p => {
        if (tempAssignments[p.id] === undefined) {
          dataToSave.push({ personnelId: p.id, shiftId: null, date: dateStr });
        }
      });

      await window.api.batchAssignments(dataToSave);
      Message.success(`${dateStr} 排班已保存`);
      setDetailModalVisible(false);
      setValidationModalVisible(false);
      fetchMonthAssignments();
    } catch (err) {
      Message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const dateInnerContent = (date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const suggestion = suggestedMap[dateStr];
    const planned = plannedCountMap[dateStr] || 0;
    const isPeak = suggestion?.isPeak;

    if (!selectedDeptId) return null;
    const isActive = activeDate && date.isSame(activeDate, 'day');

    return (
      <div 
        style={{ 
          height: '100%', 
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          background: isActive ? 'var(--color-primary-light-1)' : 'transparent',
          borderRadius: 8,
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleDateClick(date);
        }}
      >
        <div style={{ minHeight: 48, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {isPeak && <Badge status="error" text="爆发点" />}
          
          <div style={{ 
            marginTop: 'auto',
            fontSize: 12, 
            padding: '4px 8px', 
            borderRadius: 6,
            background: suggestion ? (planned >= suggestion.needed ? 'var(--color-success-light-1)' : 'var(--color-danger-light-1)') : 'var(--color-fill-2)',
            color: suggestion ? (planned >= suggestion.needed ? 'var(--color-success-6)' : 'var(--color-danger-6)') : 'var(--color-text-3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: suggestion ? `1px solid ${planned >= suggestion.needed ? 'var(--color-success-3)' : 'var(--color-danger-3)'}` : 'none'
          }}>
            <span>已排: {planned}</span>
            {suggestion && <span style={{ opacity: 0.8 }}>/ 需: {suggestion.needed}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='page-container' style={{ maxWidth: '100%', width: '100%', background: '#F7F8FA', minHeight: '100%', padding: '24px' }}>
      <PageHeader
        title='智能排班调度'
        subtitle='基于人力精算结果的智能排班调度系统，实现客服人力资源的精准投放'
        icon='📅'
        extra={<Button icon={<IconRefresh />} onClick={fetchMonthAssignments}>刷新数据</Button>}
      />

      <Row gutter={20} style={{ marginTop: 20 }}>
        {/* 左侧控制面板 */}
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div>
                <Title heading={6} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconUser style={{ color: '#165DFF' }} /> 1. 选择排班部门
                </Title>
                <Select
                  placeholder="请选择部门"
                  value={selectedDeptId || undefined}
                  onChange={setSelectedDeptId}
                  size="large"
                  style={{ width: '100%', borderRadius: 8 }}
                >
                  {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.dept_name}</Select.Option>)}
                </Select>
              </div>

              <div>
                <Title heading={6} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconFile style={{ color: '#722ED1' }} /> 2. 关联精算报告
                </Title>
                <Select
                  placeholder="选择基准测算报告 (可选)"
                  value={selectedReportId || undefined}
                  onChange={setSelectedReportId}
                  allowClear
                  size="large"
                  style={{ width: '100%', borderRadius: 8 }}
                >
                  {historyReports.map(r => <Select.Option key={r.id} value={r.id}>{r.scheme_name}</Select.Option>)}
                </Select>
                {currentReport && (
                  <div style={{ marginTop: 12, padding: 12, background: 'linear-gradient(135deg, #E8F3FF 0%, #F0F7FF 100%)', borderRadius: 8, fontSize: 12, border: '1px solid #BAE7FF' }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text bold color="arcoblue">报告周期</Text>
                        <Tag size="small" color="blue">有效</Tag>
                      </div>
                      <Text type="secondary">{currentReport.start_date} ~ {currentReport.end_date}</Text>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text bold color="arcoblue">建议总编制</Text>
                        <Text bold style={{ fontSize: 16, color: '#165DFF' }}>{JSON.parse(currentReport.result_json).needed_staff} 人</Text>
                      </div>
                    </Space>
                  </div>
                )}
              </div>

              <Alert
                type="info"
                showIcon
                content="点击日历中的日期格，即可进入该日的人员详细排班分配界面。"
                style={{ borderRadius: 8 }}
              />
            </Space>
          </Card>
        </Col>

        {/* 右侧日历 */}
        <Col span={18}>
          <Card 
            bordered={false} 
            style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}
            bodyStyle={{ padding: 0 }}
          >
            <Calendar
              value={currentDate.toDate()}
              onChange={(d: any) => setCurrentDate(dayjs(d))}
              dateInnerContent={dateInnerContent}
              style={{ border: 'none' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 排班详情 Modal */}
      <Modal
        title={
          <div style={{ padding: '12px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{activeDate?.format('YYYY-MM-DD')} 调度面板</div>
          </div>
        }
        visible={detailModalVisible}
        onOk={checkAndSaveDaily}
        onCancel={() => setDetailModalVisible(false)}
        style={{ width: '90%', maxWidth: 1100, borderRadius: 16 }}
        okText="完成校验并保存"
        confirmLoading={loading}
      >
        <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
          <Row align="center" justify="space-between">
            <Col span={10}>
              <Space size="large">
                <Statistic title="已排" value={Object.values(tempAssignments).filter(v => !!v).length} />
                {activeDate && suggestedMap[activeDate.format('YYYY-MM-DD')] && (
                  <Statistic title="建议" value={suggestedMap[activeDate.format('YYYY-MM-DD')].needed} />
                )}
              </Space>
            </Col>
            <Col span={14} style={{ textAlign: 'right' }}>
              <Space>
                <Input.Search placeholder="搜索人员" value={personnelSearch} onChange={setPersonnelSearch} style={{ width: 220 }} />
                <Select placeholder="批量班次" value={bulkShift} onChange={setBulkShift} style={{ width: 150 }}>
                  {shifts.map((s: any) => <Select.Option key={s.id} value={s.id}>{s.shift_name}</Select.Option>)}
                </Select>
                <Button type="primary" icon={<IconApps />} onClick={handleBulkSet} disabled={bulkShift === undefined}>全员应用</Button>
              </Space>
            </Col>
          </Row>
        </Card>
        {renderPersonnelModalContent()}
      </Modal>
    </div>
  );
};
