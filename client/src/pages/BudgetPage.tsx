import { useState, useEffect } from 'react';
import { Form, Message, Steps, Modal, Progress, Typography, Space, Grid, Card, Divider, Tag, Select, InputNumber, Alert, Button } from '@arco-design/web-react';
import { PageHeader } from '../components/common';
import { IconRobot, IconThunderbolt, IconBulb, IconInfoCircle, IconTrophy, IconUserGroup, IconCheck } from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import * as ExcelJS from 'exceljs';

import { BudgetFormData } from './budget/types';
import { TimeStep } from './budget/TimeStep';
import { ShiftStep } from './budget/ShiftStep';
import { HistoryStep } from './budget/HistoryStep';
import { ResultStep } from './budget/ResultStep';
import { ConfigSummary } from './budget/ConfigSummary';

const { Step } = Steps;
const { Text, Title } = Typography;

// TargetStep 组件直接定义在这里，确保不丢失
const TargetStep = ({ formData, updateFormData, form, schemes }: any) => {
  return (
    <Form form={form} layout='vertical'>
      <Form.Item label='1. 选择精算参数方案' field='schemeId' required>
        <Select 
          value={formData.schemeId || undefined} 
          onChange={v => updateFormData('schemeId', v)}
          placeholder="请选择"
          size="large"
        >
          {schemes.map((s: any) => <Select.Option key={s.id} value={s.id}>{s.scheme_name}</Select.Option>)}
        </Select>
      </Form.Item>
      <Form.Item label='2. 驱动方式' required>
        <Space size='large'>
          <Card 
            hoverable 
            onClick={() => updateFormData('driveMode', 'sales')}
            style={{ 
              border: formData.driveMode === 'sales' ? '2px solid #165dff' : '1px solid #e5e6eb', 
              cursor: 'pointer', width: 240, height: 100, position: 'relative', overflow: 'hidden'
            }}
          >
            {formData.driveMode === 'sales' && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: 32, height: 32, background: '#165dff', borderRadius: '0 0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                <IconCheck style={{ color: '#fff', fontSize: 16 }} />
              </div>
            )}
            <Space><IconTrophy /> <b>按销售额驱动</b></Space>
          </Card>
          <Card 
            hoverable 
            onClick={() => updateFormData('driveMode', 'traffic')}
            style={{ 
              border: formData.driveMode === 'traffic' ? '2px solid #165dff' : '1px solid #e5e6eb', 
              cursor: 'pointer', width: 240, height: 100, position: 'relative', overflow: 'hidden'
            }}
          >
            {formData.driveMode === 'traffic' && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: 32, height: 32, background: '#165dff', borderRadius: '0 0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                <IconCheck style={{ color: '#fff', fontSize: 16 }} />
              </div>
            )}
            <Space><IconUserGroup /> <b>按访客数驱动</b></Space>
          </Card>
        </Space>
      </Form.Item>
      <Form.Item label={formData.driveMode === 'sales' ? '目标销售额 (万元)' : '目标访客数 (人)'} field='targetValue' required>
        <InputNumber 
          placeholder={formData.driveMode === 'sales' ? '例如：500' : '例如：20000'}
          value={formData.targetValue as number} 
          onChange={v => updateFormData('targetValue', v)} 
          style={{ width: '100%', maxWidth: 500 }} 
          min={0}
          size="large"
        />
      </Form.Item>
    </Form>
  );
};

export const BudgetPage = ({ onDirtyChange }: { onDirtyChange?: (isDirty: boolean) => void }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);

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
    loadData();
    window.api.clearDraft();
  }, []);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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

  const updateFormData = (key: keyof BudgetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleCalculate = async () => {
    setAiLoading(true);
    setAiProgress(0);
    const totalDuration = Math.floor(Math.random() * 5001) + 5000; 
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
      
      const remainingTime = Math.max(totalDuration - (Date.now() - startTime), 0);
      setTimeout(() => {
        clearInterval(timer);
        setAiProgress(100);
        setTimeout(() => {
          setResult(res);
          setCurrentStep(4);
          setIsDirty(true);
          setAiLoading(false);
          Message.success('AI 精算建模已完成');
        }, 400);
      }, remainingTime);

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

  const handleReset = () => {
    setCurrentStep(0);
    setResult(null);
    form.resetFields();
    loadData();
    setIsDirty(false);
  };

  const stepProps = { formData, updateFormData, form, schemes, promotions, shifts, historyProjects };

  return (
    <div className='page-container' style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F8FA', padding: 20 }}>
      <div style={{ paddingBottom: 16 }}>
        <PageHeader title='人力精算建模' subtitle='自动化测算人力需求与最优方案生成' icon='⚡' />
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Grid.Row gutter={24} style={{ height: '100%' }}>
          <Grid.Col style={{ width: 220, height: '100%' }}>
            <Card bordered={false} style={{ height: '100%', borderRadius: 12 }}>
              <Steps direction='vertical' current={currentStep + 1} style={{ height: '100%' }}>
                <Step title='目标设定' />
                <Step title='时间规划' />
                <Step title='班次配置' />
                <Step title='历史数据' />
                <Step title='查看结果' />
              </Steps>
            </Card>
          </Grid.Col>

          <Grid.Col flex="1" style={{ height: '100%', overflowY: 'auto' }}>
            <Card bordered={false} style={{ minHeight: '100%', borderRadius: 12 }}>
              <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 20 }}>
                <Typography.Title heading={4} style={{ marginBottom: 4 }}>
                  {['🎯 第一步：业务目标', '⏰ 第二步：时间规划', '📅 第三步：班次方案', '📊 第四步：历史参考', '🚀 建模结果：人力配置方案'][currentStep]}
                </Typography.Title>
                <Typography.Text type='secondary'>请根据实际业务场景完善精算参数</Typography.Text>
                
                <Divider style={{ margin: '24px 0' }} />

                <div style={{ minHeight: 300 }}>
                  {currentStep === 0 && <TargetStep {...stepProps} />}
                  {currentStep === 1 && <TimeStep {...stepProps} />}
                  {currentStep === 2 && <ShiftStep {...stepProps} />}
                  {currentStep === 3 && <HistoryStep {...stepProps} />}
                  {currentStep === 4 && <ResultStep result={result} formData={formData} handleReset={handleReset} handleExport={handleExport} />}
                </div>

                {currentStep < 4 && (
                  <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--color-border-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      {currentStep > 0 && <Button onClick={() => setCurrentStep(c => c - 1)} className="btn-secondary">上一步</Button>}
                      <Button 
                        type="primary"
                        onClick={() => currentStep === 3 ? handleCalculate() : setCurrentStep(c => c + 1)} 
                        className="btn-primary"
                        disabled={loading}
                      >
                        {currentStep === 3 ? '开始智能测算' : '下一步'}
                      </Button>
                    </Space>
                    <Tag icon={<IconInfoCircle />} color="green" bordered>参数就绪</Tag>
                  </div>
                )}
              </div>
            </Card>
          </Grid.Col>

          {currentStep < 4 && (
            <Grid.Col style={{ width: 300, height: '100%', overflowY: 'auto' }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <ConfigSummary formData={formData} schemes={schemes} promotions={promotions} />
                <Card title={<Space><IconBulb style={{ color: '#FF7D00' }} />建模指导</Space>} bordered={false} style={{ borderRadius: 12 }}>
                  <div style={{ padding: '10px', background: '#FFF7E8', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#864C00' }}>业务驱动建议</div>
                    <div style={{ fontSize: 12, color: '#B26200', lineHeight: 1.4 }}>大促期间，建议将“售前提前天数”设置为2-3天。</div>
                  </div>
                  <Alert type="info" content="提示：模型将结合活动系数进行非线性计算。" style={{ fontSize: 11 }} />
                </Card>
              </Space>
            </Grid.Col>
          )}
        </Grid.Row>
      </div>

      {/* AI 白色毛玻璃感加载 Modal */}
      <Modal 
        visible={aiLoading} 
        footer={null} 
        closable={false} 
        maskClosable={false} 
        alignCenter 
        style={{ width: 520, borderRadius: 24, overflow: 'hidden', padding: 0 }}
      >
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '48px 40px', 
          position: 'relative'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fff', border: '1px solid #e5e6eb', margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(22, 93, 255, 0.12)' }}>
              <IconRobot style={{ fontSize: 40, color: '#165dff' }} />
            </div>
            <Typography.Title heading={4}>AI 精算仿真中</Typography.Title>
            <Progress percent={Math.round(aiProgress)} showText={false} strokeWidth={10} color={{ '0%': '#165dff', '100%': '#722ed1' }} style={{ marginTop: 32 }} />
          </div>
        </div>
      </Modal>

      <style>{`
        .btn-primary { padding: 0 32px; height: 44px; border-radius: 8px; border: none; background: #165DFF; color: #fff; cursor: pointer; font-weight: 600; }
        .btn-secondary { padding: 0 24px; height: 44px; border-radius: 8px; border: 1px solid #dcdfe6; background: #fff; color: #4e5969; cursor: pointer; }
        .arco-modal-content { padding: 0 !important; }
      `}</style>
    </div>
  );
};
