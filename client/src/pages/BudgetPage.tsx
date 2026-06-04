import { useState, useEffect } from 'react';
import { Form, Message, Steps, Layout, Card, Typography, Button, Space, Modal, Progress } from '@arco-design/web-react';
import { PageHeader } from '../components/common';
import { 
  IconRobot, IconPushpin, IconClockCircle, IconSchedule, IconDashboard, IconThunderbolt 
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import * as ExcelJS from 'exceljs';

import { BudgetFormData } from './budget/types';
import { TargetStep } from './budget/TargetStep';
import { TimeStep } from './budget/TimeStep';
import { ShiftStep } from './budget/ShiftStep';
import { HistoryStep } from './budget/HistoryStep';
import { ResultStep } from './budget/ResultStep';

const { Step } = Steps;
const { Content, Sider } = Layout;

export const BudgetPage = ({ onDirtyChange }: { onDirtyChange?: (isDirty: boolean) => void }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // AI Loading States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);

  // Data states
  const [schemes, setSchemes] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [historyProjects, setHistoryProjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<BudgetFormData>({
    schemeId: null,
    driveMode: 'sales',
    targetValue: '',
    promotionId: null,
    dateRange: [dayjs().format('YYYY-MM-DD'), dayjs().add(7, 'day').format('YYYY-MM-DD')],
    peakDates: [],
    selectedShifts: [],
    useHistoryData: false,
    historyProjectId: null,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [schemesData, shiftsData, promosData, historyProjectsData] = await Promise.all([
          window.api.getSchemes(),
          window.api.getShifts(),
          window.api.getPromotions(),
          window.api.getHistoryProjects(),
        ]);
        setSchemes(schemesData);
        setShifts(shiftsData);
        setPromotions(promosData);
        setHistoryProjects(historyProjectsData);

        const defaultScheme = schemesData.find((s: any) => s.is_default);
        if (defaultScheme) {
          setFormData(prev => ({ 
            ...prev, 
            schemeId: defaultScheme.id,
            selectedShifts: shiftsData.map((s: any) => s.id)
          }));
          form.setFieldValue('schemeId', defaultScheme.id);
        }
      } catch (err) {
        Message.error('加载基础数据失败');
      }
    };
    loadData();
    window.api.clearDraft();
  }, []);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateFormData = (key: keyof BudgetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleCalculate = async () => {
    setAiLoading(true);
    setAiProgress(0);
    const totalDuration = 3000; 
    const startTime = Date.now();
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / totalDuration) * 100, 99);
      setAiProgress(progress);
      if (elapsed >= totalDuration) clearInterval(timer);
    }, 50);

    try {
      const startDate = formData.dateRange[0];
      const endDate = formData.dateRange[1];
      const days = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
      const selectedPromo = promotions.find((p) => p.id === formData.promotionId);

      const calcData = {
        targetSales: formData.driveMode === 'sales' ? parseFloat(formData.targetValue as string) * 10000 : 0,
        targetVisitors: formData.driveMode === 'traffic' ? parseFloat(formData.targetValue as string) : undefined,
        days,
        eventType: selectedPromo?.scheme_name || null,
        eventDates: [],
        peakDates: formData.peakDates,
        calcStartDate: startDate,
        params: formData.schemeId ? JSON.parse(schemes.find((s) => s.id === formData.schemeId)?.params_json || '{}') : {},
        selectedShifts: formData.selectedShifts,
        promotionFactor: selectedPromo?.factor,
        minStaff: 1,
        historyProjectId: formData.useHistoryData ? formData.historyProjectId : null,
      };

      const res = await window.api.calculateManpower(calcData);
      
      setTimeout(() => {
        clearInterval(timer);
        setAiProgress(100);
        setTimeout(() => {
          setResult(res);
          setCurrentStep(4);
          setAiLoading(false);
          Message.success('AI 精算建模已完成');
        }, 400);
      }, 500);

    } catch (err: any) {
      clearInterval(timer);
      setAiLoading(false);
      Message.error(`测算失败: ${err.message || '请检查参数输入'}`);
    }
  };

  const handleExport = async () => {
    if (!result) return Message.warning('暂无测算结果');
    try {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('测算汇总');
      summarySheet.addRow(['项目', '数值']);
      summarySheet.addRow(['建议总编制', result.needed_staff + '人']);
      
      const dailySheet = workbook.addWorksheet('每日明细');
      dailySheet.addRow(['日期', '总需求(人)', '售前', '售中', '售后']);
      (result.daily_results || []).forEach((d: any) => {
        dailySheet.addRow([d.date, d.staff, d.presale, d.midsale, d.aftersale]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `人力测算报告_${dayjs().format('YYYYMMDD')}.xlsx`;
      link.click();
      Message.success('报表导出成功');
    } catch (err: any) {
      Message.error('导出失败: ' + err.message);
    }
  };

  const stepProps = { formData, updateFormData, form, schemes, promotions, shifts, historyProjects };

  const renderContent = () => {
    switch (currentStep) {
      case 0: return <TargetStep {...stepProps} />;
      case 1: return <TimeStep {...stepProps} />;
      case 2: return <ShiftStep {...stepProps} />;
      case 3: return <HistoryStep {...stepProps} />;
      case 4: return <ResultStep result={result} formData={formData} handleReset={() => {setCurrentStep(0); setResult(null);}} handleExport={handleExport} />;
      default: return null;
    }
  };

  const stepIcons = [
    <IconPushpin key="0" />, 
    <IconClockCircle key="1" />, 
    <IconSchedule key="2" />, 
    <IconDashboard key="3" />, 
    <IconThunderbolt key="4" />
  ];

  const stepTitles = ['业务目标设定', '时间规划方案', '班次需求配置', '历史参考数据', 'AI 建模结果'];

  return (
    <Layout style={{ height: '100%', padding: '16px', background: 'var(--color-fill-1)' }}>
      <PageHeader title='人力精算建模' subtitle='自动化测算人力需求与最优方案生成' icon={<IconRobot />} />
      
      <Layout style={{ marginTop: 16 }}>
        <Sider width={180} style={{ background: 'transparent' }}>
          <Steps direction='vertical' current={currentStep + 1} style={{ background: '#fff', padding: '16px', borderRadius: 'var(--radius-large)', boxShadow: 'var(--shadow-light)' }}>
            {stepTitles.map((title, idx) => (
              <Step key={idx} title={title} />
            ))}
          </Steps>
        </Sider>

        <Content style={{ marginLeft: 16 }}>
          <Card bordered={false} style={{ height: '100%', borderRadius: 'var(--radius-large)' }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 18, color: 'var(--primary-color)' }}>{stepIcons[currentStep]}</span>
               <Typography.Title heading={6} style={{ margin: 0 }}>
                 {stepTitles[currentStep]}
               </Typography.Title>
            </div>
            
            <div style={{ minHeight: 350 }}>
              {renderContent()}
            </div>

            {currentStep < 4 && (
                <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border-2)', paddingTop: 16 }}>
                    <Space>
                        <Button onClick={() => setCurrentStep(c => c - 1)} disabled={currentStep === 0} size="small">上一步</Button>
                        <Button type='primary' onClick={() => currentStep === 3 ? handleCalculate() : setCurrentStep(c => c + 1)} size="small">
                            {currentStep === 3 ? '开始智能测算' : '下一步'}
                        </Button>
                    </Space>
                </div>
            )}
          </Card>
        </Content>
      </Layout>

      <Modal 
        visible={aiLoading} 
        footer={null} 
        closable={false} 
        maskClosable={false} 
        alignCenter 
        style={{ width: 400, borderRadius: 16, overflow: 'hidden' }}
      >
        <div style={{ textAlign: 'center', padding: '32px 20px' }}>
          <IconRobot style={{ fontSize: 48, color: 'var(--primary-color)', marginBottom: 16 }} />
          <Typography.Title heading={6}>AI 精算引擎仿真中...</Typography.Title>
          <Progress percent={Math.round(aiProgress)} showText={false} style={{ marginTop: 24 }} />
        </div>
      </Modal>
    </Layout>
  );
};
