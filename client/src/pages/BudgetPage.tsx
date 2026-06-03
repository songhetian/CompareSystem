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

  // 从localStorage恢复表单数据
  useEffect(() => {
    const savedFormData = localStorage.getItem('budgetFormData');
    const savedCurrentStep = localStorage.getItem('budgetCurrentStep');
    
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormData(parsedData);
      } catch (err) {
        console.error('恢复表单数据失败:', err);
      }
    }
    
    if (savedCurrentStep) {
      try {
        setCurrentStep(parseInt(savedCurrentStep, 10));
      } catch (err) {
        console.error('恢复步骤失败:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // 保存表单数据到localStorage（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('budgetFormData', JSON.stringify(formData));
    }, 500);
    return () => clearTimeout(timer);
  }, [formData]);

  // 保存当前步骤到localStorage
  useEffect(() => {
    localStorage.setItem('budgetCurrentStep', currentStep.toString());
  }, [currentStep]);

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
        minStaff: 1,  // 改为固定值1，不再受班次数量影响，让算法自然计算
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
      
      // ========== 第1个Sheet：测算汇总 ==========
      const summarySheet = workbook.addWorksheet('测算汇总');

      summarySheet.mergeCells('A1:D1');
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = '人力需求测算报告';
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F0FF' } };

      summarySheet.addRow([]);
      summarySheet.addRow(['测算时间', dayjs().format('YYYY-MM-DD HH:mm:ss')]);
      summarySheet.addRow(['测算周期', `${formData.dateRange[0]} 至 ${formData.dateRange[1]}`]);
      summarySheet.addRow(['驱动方式', formData.driveMode === 'sales' ? '按销售额' : '按访客数']);
      summarySheet.addRow(['目标数值', formData.targetValue]);
      summarySheet.addRow(['高峰日数量', formData.peakDates.length + ' 天']);
      summarySheet.addRow([]);

      summarySheet.addRow(['核心指标', '', '', '']);
      summarySheet.getRow(9).font = { bold: true };
      summarySheet.getRow(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      
      summarySheet.addRow(['建议总编制', result.needed_staff, '人']);
      summarySheet.addRow(['售前人员', result.presale_staff, '人']);
      summarySheet.addRow(['售中人员', result.midsale_staff, '人']);
      summarySheet.addRow(['售后人员', result.aftersale_staff, '人']);
      summarySheet.addRow(['日均接待量', Math.round(result.daily_consult), '次']);
      summarySheet.addRow(['理论峰值', result.theoretical_peak, '人']);

      summarySheet.columns = [{ width: 20 }, { width: 30 }, { width: 15 }, { width: 15 }];

      // ========== 第2个Sheet：每日人力需求明细 ==========
      const dailySheet = workbook.addWorksheet('每日人力需求明细');
      
      // 表头
      const dailyHeaders = ['日期', '是否高峰日', '总需求(人)', '售前(人)', '售中(人)', '售后(人)', '售前话务量', '售中话务量', '售后话务量'];
      const dailyHeaderRow = dailySheet.addRow(dailyHeaders);
      dailyHeaderRow.font = { bold: true };
      dailyHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
      dailyHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // 数据行
      (result.daily_results || []).forEach((day: any) => {
        const row = dailySheet.addRow([
          day.fullDate || day.date,
          day.isPeakDay ? '是 🔥' : '否',
          day.staff,
          day.presale,
          day.midsale,
          day.aftersale,
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
        { width: 12 },  // 日期
        { width: 12 },  // 是否高峰日
        { width: 12 },  // 总需求
        { width: 10 },  // 售前
        { width: 10 },  // 售中
        { width: 10 },  // 售后
        { width: 12 },  // 售前话务量
        { width: 12 },  // 售中话务量
        { width: 12 },  // 售后话务量
      ];

      // 添加边框
      dailySheet.eachRow((row, rowNumber) => {
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
      const link = document.createElement('a');
      link.href = url;
      link.download = `人力测算报告_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      Message.success('报表导出成功！包含2个工作表：测算汇总、每日明细');
    } catch (err: any) {
      Message.error('导出失败: ' + err.message);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setResult(null);
    form.resetFields();
    loadData();
    // 清除localStorage中的数据
    localStorage.removeItem('budgetFormData');
    localStorage.removeItem('budgetCurrentStep');
  };

  const stepProps = { formData, updateFormData, form, schemes, promotions, shifts, historyProjects };

  return (
    <div className='page-container' style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ paddingBottom: 16 }}>
        <PageHeader
          title='人力精算建模'
          subtitle='基于业务驱动的多维度人力需求精算，一键生成标准化人力配置方案'
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
              <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--color-border-2)' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
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
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00b42a' }}></span>
                    数据已自动保存
                  </div>
                </div>
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
