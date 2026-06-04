/**
 * 人员排班页面 (日历版)
 * 1. 采用标准的日历 (7列) 布局
 * 2. 部门优先：先选部门再操作
 * 3. 结果关联：关联测算报告，显示需求对标
 * 4. 交互：点击日历格子，弹出该部门全员排班面板
 * 5. 校验：增加合规性校验报告，支持全覆盖检测
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Card, Space, Button, Select, Message, Typography, Tag, Calendar, Badge, Modal, List, Avatar, Tooltip, Empty, Table, Divider, Input, Alert
} from '@arco-design/web-react';
import { 
  IconSave, IconRefresh, IconFile, IconExclamationCircle, IconCheckCircle, IconCalendar, IconUser 
} from '@arco-design/web-react/icon';
import { PageHeader } from '../components/common';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

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
        Message.error('基础数据加载失败，请检查控制台');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 获取当月排班数据
  const fetchMonthAssignments = useMemo(() => async () => {
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
  }, [currentDate]);

  useEffect(() => {
    fetchMonthAssignments();
  }, [currentDate, fetchMonthAssignments]);

  const handleDateClick = async (date: dayjs.Dayjs) => {
    setActiveDate(date);
    const dateStr = date.format('YYYY-MM-DD');
    
    // 获取当天的全部排班
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

  // ... (在Modal内部渲染逻辑中进行分组)

  // 渲染Modal内部人员列表 - 调试版本
  const renderPersonnelModalContent = () => {
    console.log('DEBUG: Rendering modal content. filteredPersonnel length:', filteredPersonnel.length);
    if (filteredPersonnel.length === 0) {
      return <Empty description="暂无人员数据" />;
    }

    // 生成随机颜色工具
    const getAvatarColor = (name: string) => {
        const colors = ['#F53F3F', '#F77234', '#FF7D00', '#F7BA1E', '#00B42A', '#165DFF', '#3491FA', '#722ED1'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px', border: '1px solid red' }}>
        {filteredPersonnel.map((p: any) => (
          <div
            key={p.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-fill-2)', background: '#fff' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar style={{ backgroundColor: getAvatarColor(p.name || '未知') }}>{p.name?.[0] || '?'}</Avatar>
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>工号: {p.staff_id || '-'}</div>
              </div>
            </div>
            <div style={{ width: 240 }}>
              <Select
                  placeholder="请选择班次"
                  allowClear
                  value={tempAssignments[p.id] || undefined}
                  onChange={(v) => setTempAssignments((prev: any) => ({ ...prev, [p.id]: v }))}
                  style={{ width: '100%' }}
              >
                  {shifts.map((s: any) => (
                      <Select.Option key={s.id} value={s.id}>{s.shift_name}</Select.Option>
                  ))}
              </Select>
            </div>
          </div>
        ))}
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
        res[dr.fullDate] = { needed: dr.staff, isPeak: dr.isPeakDay };
      });
    } catch(e) {}
    return res;
  }, [currentReport]);

  // 计算每日已排人数 (仅限当前部门)
  const plannedCountMap = useMemo(() => {
    const res: any = {};
    allAssignments.forEach(a => {
      if (personnel.some(p => p.id === a.personnel_id)) {
        res[a.assignment_date] = (res[a.assignment_date] || 0) + 1;
      }
    });
    return res;
  }, [allAssignments, personnel]);

  // 计算每日班次分布
  const dailyShiftDistribution = useMemo(() => {
    const dist: any = {};
    allAssignments.forEach(a => {
      if (personnel.some(p => p.id === a.personnel_id)) {
        if (!dist[a.assignment_date]) dist[a.assignment_date] = new Set();
        dist[a.assignment_date].add(a.shift_id);
      }
    });
    return dist;
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

    // 执行单日校验
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
      // 补充未排班人员
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

  // 日历渲染逻辑
  const dateInnerContent = (date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const suggestion = suggestedMap[dateStr];
    const planned = plannedCountMap[dateStr] || 0;
    const isPeak = suggestion?.isPeak;

    if (!selectedDeptId) return null;

    // 样式优化：高亮当前选中日期
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
          {isPeak && <Badge status="error" text={<span style={{ color: 'var(--color-danger-6)', fontSize: 11, fontWeight: 700 }}>🔥 爆发点</span>} />}
          
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
    <div className='page-container' style={{ maxWidth: '100%', width: '100%' }}>
      <PageHeader
        title='智能排班调度'
        subtitle='基于人力精算结果的智能排班调度系统，实现客服人力资源的精准投放'
        icon='📅'
        extra={<Button icon={<IconRefresh />} onClick={fetchMonthAssignments}>刷新</Button>}
      />

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        {/* 左侧控制面板 */}
        <Card bordered={false} style={{ width: 350, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <div>
              <Title heading={6} style={{ marginBottom: 12 }}>1. 选择排班部门</Title>
              <Select
                placeholder="请选择部门 (必选)"
                value={selectedDeptId}
                onChange={setSelectedDeptId}
                size="large"
                style={{ width: '100%', borderRadius: 8 }}
              >
                {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.dept_name}</Select.Option>)}
              </Select>
            </div>

            <div>
              <Title heading={6} style={{ marginBottom: 12 }}>2. 关联测算报告</Title>
              <Select
                placeholder="选择基准报告 (可选)"
                value={selectedReportId}
                onChange={setSelectedReportId}
                allowClear
                size="large"
                style={{ width: '100%', borderRadius: 8 }}
              >
                {historyReports.map(r => (
                  <Select.Option key={r.id} value={r.id}>
                    {r.scheme_name}
                  </Select.Option>
                ))}
              </Select>
              {currentReport && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--color-primary-light-1)', borderRadius: 8, fontSize: 12 }}>
                  <Space direction="vertical" size={4}>
                    <Text bold color="arcoblue">报告周期：</Text>
                    <Text type="secondary">{currentReport.start_date} 至 {currentReport.end_date}</Text>
                    <div style={{ height: 1, background: 'var(--color-primary-light-3)', margin: '4px 0' }} />
                    <Text bold color="arcoblue">测算建议：</Text>
                    <Text type="secondary">总编制需 {JSON.parse(currentReport.result_json).needed_staff} 人</Text>
                  </Space>
                </div>
              )}
            </div>

            <div style={{ padding: 16, background: 'var(--color-fill-2)', borderRadius: 12, fontSize: 13, color: 'var(--color-text-3)' }}>
              <Space direction="vertical" size={12}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconCheckCircle style={{ color: 'var(--color-success-6)' }} />
                  <span>绿色：人力充足</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconExclamationCircle style={{ color: 'var(--color-danger-6)' }} />
                  <span>红色：人力缺口</span>
                </div>
                <Divider style={{ margin: '4px 0' }} />
                <Text style={{ fontSize: 12 }}>💡 点击日历中的格子，可为部门人员分派具体班次。</Text>
              </Space>
            </div>
          </Space>
        </Card>

        {/* 右侧日历 */}
        <Card 
          bordered={false} 
          style={{ flex: 1, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}
          bodyStyle={{ padding: 0 }}
        >
          <Calendar
            value={currentDate.toDate()}
            onChange={(d: any) => setCurrentDate(dayjs(d))}
            dateInnerContent={dateInnerContent}
            onSelect={(d: any) => handleDateClick(dayjs(d))}
            style={{ border: 'none' }}
          />
        </Card>
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-primary-6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCalendar style={{ fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{activeDate?.format('YYYY年MM月DD日')} 排班详情</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>当前部门：{departments.find(d => d.id === selectedDeptId)?.dept_name}</div>
            </div>
          </div>
        }
        visible={detailModalVisible}
        onOk={checkAndSaveDaily}
        onCancel={() => setDetailModalVisible(false)}
        width="90%"
        style={{ maxWidth: 1200, borderRadius: 16, top: 50 }}
        okText="校验并保存"
        confirmLoading={loading}
      >
        {/* 单日汇总统计 */}
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--color-fill-1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>已排人数</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary-6)' }}>{Object.values(tempAssignments).filter(v => !!v).length}</div>
            </div>
            {activeDate && suggestedMap[activeDate.format('YYYY-MM-DD')] && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>测算建议</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-danger-6)' }}>{suggestedMap[activeDate.format('YYYY-MM-DD')].needed}</div>
              </div>
            )}
          </div>
          {activeDate && suggestedMap[activeDate.format('YYYY-MM-DD')]?.isPeak && (
            <Tag color="red" bordered style={{ alignSelf: 'center', borderRadius: 4 }}>
              🔥 爆发高峰日
            </Tag>
          )}
        </div>

        {/* 批量操作工具栏 */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <Input.Search
            placeholder="搜索姓名或工号"
            value={personnelSearch}
            onChange={(val) => setPersonnelSearch(val)}
            allowClear
            style={{ width: 300 }}
          />
          <Select
            placeholder="批量设置班次"
            value={bulkShift}
            onChange={setBulkShift}
            allowClear
            style={{ width: 200 }}
          >
            {shifts.map((s: any) => (
              <Select.Option key={s.id} value={s.id}>{s.shift_name}</Select.Option>
            ))}
          </Select>
          <Button type="primary" onClick={handleBulkSet} disabled={bulkShift === undefined}>应用至 {filteredPersonnel.length} 名搜索结果</Button>
        </div>

        {renderPersonnelModalContent()}
      </Modal>

      {/* 合规性校验报告 Modal */}
      <Modal
        title={
          <Space>
            <IconExclamationCircle style={{ color: 'var(--color-warning-6)' }} />
            <span>排班合规性校验报告</span>
          </Space>
        }
        visible={validationModalVisible}
        onOk={saveDailyAssignments}
        onCancel={() => setValidationModalVisible(false)}
        okText="忽略风险，强制通过"
        cancelText="取消，返回修改"
        width={600}
        style={{ borderRadius: 16 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">检测到当前排班与测算方案存在不一致：</Text>
        </div>
        
        <Table
          data={validationResults}
          pagination={false}
          rowKey="date"
          size="small"
          columns={[
            {
              title: '差异项',
              render: (_, record) => (
                <Space direction="vertical" size={4}>
                  <Badge 
                    status={record.headcountGap > 0 ? 'error' : 'success'} 
                    text={`人力缺口: ${record.planned} / ${record.needed} (缺 ${record.headcountGap > 0 ? record.headcountGap : 0}人)`} 
                  />
                  {record.uncoveredShifts.length > 0 && (
                    <div style={{ paddingLeft: 12 }}>
                      <Text type="danger" style={{ fontSize: 12 }}>未覆盖班次: </Text>
                      {record.uncoveredShifts.map((name: string) => <Tag key={name} color="red" size="mini" style={{ borderRadius: 4, marginRight: 4 }}>{name}</Tag>)}
                    </div>
                  )}
                </Space>
              )
            }
          ]}
        />

        <div style={{ marginTop: 20, padding: 16, background: 'var(--color-warning-light-1)', borderRadius: 8, border: '1px solid var(--color-warning-light-3)' }}>
          <Title heading={6} style={{ marginTop: 0, marginBottom: 8, color: 'var(--color-warning-6)' }}>风险提示：</Title>
          <Text style={{ fontSize: 13, color: 'var(--color-warning-6)' }}>
            作为管理人员，您拥有一票通过权。点击“强制通过”将保存本日排班，但可能面临服务响应超时或客服过载风险。
          </Text>
        </div>
      </Modal>

      <style>{`
        .arco-calendar-cell {
          min-height: 100px !important;
          transition: all 0.2s;
        }
        .arco-calendar-cell:hover {
          background-color: var(--color-primary-light-1) !important;
          cursor: pointer;
        }
        .arco-calendar-date-value {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};
