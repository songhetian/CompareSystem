import { useState, useEffect } from 'react';
import { Form, Message, Steps } from '@arco-design/web-react';
import { PageHeader } from '../components/common';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

import { BudgetFormData } from './budget/types';
import { TargetStep } from './budget/TargetStep';
import { TimeStep } from './budget/TimeStep';
import { ShiftStep } from './budget/ShiftStep';
import { HistoryStep } from './budget/HistoryStep';
import { ResultStep } from './budget/ResultStep';
import { ConfigSummary } from './budget/ConfigSummary';

const { Step } = Steps;

export const BudgetPage = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 数据源
  const [schemes, setSchemes] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [historyProjects, setHistoryProjects] = useState<any[]>([]);

  // 表单数据状态
  const [formData, setFormData] = useState<BudgetFormData>({
    schemeId: null,
    driveMode: 'sales',
    targetValue: '',
    promotionId: null,
    dateRange: [
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(7, 'day').format('YYYY-MM-DD'),
    ],
    peakDates: [],
    selectedShifts: [],
    useHistoryData: false,
    historyProjectId: null,
  });

  useEffect(() => {
    loadData();
  }, []);

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

      // 默认选择
      const defaultScheme = schemesData.find((s: any) => s.is_default);
      const allShiftIds = shiftsData.map((s: any) => s.id);

      setFormData(prev => ({
        ...prev,
        schemeId: defaultScheme ? defaultScheme.id : prev.schemeId,
        selectedShifts: allShiftIds
      }));

      form.setFieldValue('schemeId', defaultScheme?.id);
    } catch (err) {
      Message.error('加载数据失败');
    }
  };

  const updateFormData = (key: keyof BudgetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.targetValue || isNaN(Number(formData.targetValue))) {
          Message.warning('请输入有效的目标数值');
          return false;
        }
        if (!formData.schemeId) {
          Message.warning('请选择参数方案');
          return false;
        }
        return true;
      case 1:
        return true;
      case 2:
        if (formData.selectedShifts.length === 0) {
          Message.warning('请至少选择一个班次方案');
          return false;
        }
        return true;
      case 3:
        if (formData.useHistoryData && !formData.historyProjectId) {
          Message.warning('请选择历史项目，或者关闭参考历史数据');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) setCurrentStep(c => c + 1);
      else handleCalculate();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const handleCalculate = async () => {
    setLoading(true);
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
        peakDates: formData.peakDates.map((d: any) => dayjs(d).format('YYYY-MM-DD')),
        calcStartDate: startDate,
        params: formData.schemeId ? JSON.parse(schemes.find((s) => s.id === formData.schemeId)?.params_json || '{}') : {},
        selectedShifts: formData.selectedShifts,
        promotionFactor: selectedPromo?.factor,
        minStaff: formData.selectedShifts.length || 1,
        historyProjectId: formData.useHistoryData ? formData.historyProjectId : null,
      };

      const res = await window.api.calculateManpower(calcData);
      setResult(res);
      setCurrentStep(4);
      Message.success('测算完成');
    } catch (err: any) {
      Message.error(`测算失败: ${err.message || '请检查输入'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result) return Message.warning('暂无测算结果');
    try {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('测算汇总');

      summarySheet.mergeCells('A1:D1');
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = '人力需求测算报告';
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      summarySheet.addRow([]);
      summarySheet.addRow(['测算时间', dayjs().format('YYYY-MM-DD HH:mm:ss')]);
      summarySheet.addRow(['测算周期', `${formData.dateRange[0]} 至 ${formData.dateRange[1]}`]);
      summarySheet.addRow(['驱动方式', formData.driveMode === 'sales' ? '按销售额' : '按访客数']);
      summarySheet.addRow(['目标数值', formData.targetValue]);
      summarySheet.addRow([]);

      summarySheet.addRow(['核心指标', '', '', '']);
      summarySheet.getRow(8).font = { bold: true };
      summarySheet.addRow(['建议总编制', result.needed_staff, '人']);
      summarySheet.addRow(['售前人员', result.presale_staff, '人']);
      summarySheet.addRow(['售中人员', result.midsale_staff, '人']);
      summarySheet.addRow(['售后人员', result.aftersale_staff, '人']);
      summarySheet.addRow(['日均接待量', Math.round(result.daily_consult), '次']);

      summarySheet.columns = [{ width: 20 }, { width: 30 }, { width: 15 }, { width: 15 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `人力测算报告_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      Message.success('报表导出成功！');
    } catch (err: any) {
      Message.error('导出失败: ' + err.message);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setResult(null);
    form.resetFields();
    loadData();
  };

  const stepProps = { formData, updateFormData, form, schemes, promotions, shifts, historyProjects };

  return (
    <div className='page-container' style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ paddingBottom: 16 }}>
        <PageHeader
          title='智能测算'
          subtitle='分步引导式目标参数录入，一键生成智能排班需求计划'
          icon='⚡'
        />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 24, paddingTop: 16 }}>
        {/* 左侧步骤条 */}
        <div style={{
          width: 220,
          flexShrink: 0,
          background: 'var(--color-bg-2)',
          borderRadius: 12,
          padding: '24px 20px',
          border: '1px solid var(--color-border-2)'
        }}>
          <Steps direction='vertical' current={currentStep + 1} style={{ height: '100%' }}>
            <Step title='目标设定' description='销售额或访客数' />
            <Step title='时间规划' description='活动周期与高峰' />
            <Step title='班次配置' description='选择排班方案' />
            <Step title='历史数据' description='参考历史(可选)' />
            <Step title='查看结果' description='人力配置建议' />
          </Steps>
        </div>

        {/* 中间表单内容区域 */}
        <div style={{
          flex: 1,
          background: 'var(--color-bg-2)',
          borderRadius: 12,
          padding: '32px 40px',
          border: '1px solid var(--color-border-2)',
          overflowY: 'auto',
          position: 'relative'
        }}>
          <div style={{
            animation: 'fadeInUp 0.3s ease-out',
            maxWidth: currentStep === 4 ? '100%' : 860,
            margin: currentStep === 4 ? '0' : '0 auto'
          }}>
            {currentStep === 0 && <TargetStep {...stepProps} />}
            {currentStep === 1 && <TimeStep {...stepProps} />}
            {currentStep === 2 && <ShiftStep {...stepProps} />}
            {currentStep === 3 && <HistoryStep {...stepProps} />}
            {currentStep === 4 && <ResultStep result={result} formData={formData} handleReset={handleReset} handleExport={handleExport} />}

            {/* 底部操作按钮 */}
            {currentStep < 4 && (
              <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--color-border-2)', display: 'flex', gap: 16 }}>
                {currentStep > 0 && (
                  <button onClick={prevStep} style={{
                    padding: '0 24px', height: 40, borderRadius: 8,
                    border: '1px solid var(--color-border-3)', background: 'transparent',
                    cursor: 'pointer', fontWeight: 500, color: 'var(--color-text-2)'
                  }}>上一步</button>
                )}
                <button onClick={nextStep} disabled={loading} style={{
                  padding: '0 32px', height: 40, borderRadius: 8,
                  border: 'none', background: 'linear-gradient(135deg, #165DFF 0%, #4080FF 100%)',
                  cursor: 'pointer', fontWeight: 500, color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  {loading ? '测算中...' : currentStep === 3 ? '开始智能测算' : '下一步'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧浮动信息面板 */}
        {currentStep < 4 && (
          <div style={{ width: 280, flexShrink: 0 }}>
            <ConfigSummary formData={formData} schemes={schemes} promotions={promotions} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .arco-form-label-item {
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          white-space: nowrap !important;
        }
        .arco-form-label-item-required-symbol {
          margin-left: 4px !important;
          display: inline-block !important;
          position: static !important;
        }
      `}</style>
    </div>
  );
};
