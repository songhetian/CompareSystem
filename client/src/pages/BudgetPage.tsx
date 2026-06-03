import {
  Typography, Card, Radio, Input, Select, DatePicker,
  Space, Message, Modal, Steps, Badge, Tag, Empty, Button,
  Statistic, Progress, Tooltip, Table
} from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { StyledButton } from '../components/StyledButton';
import {
  IconPlus, IconDelete, IconRefresh, IconDownload,
  IconThunderbolt, IconCheck, IconRight, IconLeft, IconDragDot
} from '@arco-design/web-react/icon';
import { TimelineChart, HourlyChart, PieChart, RadarChart } from '../components/Charts';
import { DataTable } from '../components/DataTable';
import { InlineLoading } from '../components/LoadingScreen';
import { IconHistory } from '@arco-design/web-react/icon';
import { Line } from 'react-chartjs-2';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const Step = Steps.Step;

// 可拖拽的高峰日期项组件
const SortablePeakDateItem = ({
  id,
  date,
  index,
  total,
  onUpdate,
  onRemove
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className='flex items-center gap-3'>
      <div
        {...attributes}
        {...listeners}
        className='flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 cursor-move hover:bg-red-200'
        style={{ borderRadius: 8 }}
      >
        <IconDragDot />
      </div>
      <DatePicker
        value={date}
        onChange={(_, dateString) => onUpdate(index, typeof dateString === 'string' ? dateString : '')}
        style={{ flex: 1, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        size='large'
      />
      {total > 1 && (
        <Button
          icon={<IconDelete />}
          status='danger'
          shape='circle'
          onClick={() => onRemove(index)}
          style={{ borderRadius: 8 }}
        />
      )}
    </div>
  );
};

export const BudgetPage = () => {
  // 状态管理
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // 数据源
  const [schemes, setSchemes] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<HistoryDataRecord[]>([]);

  // 表单数据
  const [formData, setFormData] = useState({
    schemeId: null as number | null,
    driveMode: 'sales' as 'sales' | 'traffic',
    targetValue: '',
    promotionId: null as number | null,
    dateRange: [dayjs().format('YYYY-MM-DD'), dayjs().add(7, 'day').format('YYYY-MM-DD')] as [string, string],
    peakDates: [dayjs().add(3, 'day').format('YYYY-MM-DD')] as string[],
    selectedShifts: [] as number[]
  });

  // 图表模态框
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [chartType, setChartType] = useState<'timeline' | 'hourly' | 'pie' | 'radar'>('timeline');

  // 数据对比
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [savedResults, setSavedResults] = useState<any[]>([]);

  // 历史数据参考
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyProjects, setHistoryProjects] = useState<HistoryProject[]>([]);
  const [selectedHistoryProject, setSelectedHistoryProject] = useState<number | null>(null);
  const [projectHistoryData, setProjectHistoryData] = useState<HistoryDataRecord[]>([]);
  const [showHistoryChart, setShowHistoryChart] = useState(false);

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
    loadSavedResults();
    loadHistoryProjects();
  }, []);

  useEffect(() => {
    if (selectedHistoryProject) {
      loadProjectHistoryData(selectedHistoryProject);
    }
  }, [selectedHistoryProject]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [schemesData, shiftsData, promosData, history] = await Promise.all([
        window.api.getSchemes(),
        window.api.getShifts(),
        window.api.getPromotions(),
        window.api.getHistoryData ? window.api.getHistoryData(50) : Promise.resolve([])
      ]);
      setSchemes(schemesData);
      setShifts(shiftsData);
      setPromotions(promosData);
      setHistoryData(history || []);

      // 自动选择默认方案和所有班次
      const defaultScheme = schemesData.find((s: any) => s.is_default);
      if (defaultScheme) {
        setFormData(prev => ({ ...prev, schemeId: defaultScheme.id }));
      }
      setFormData(prev => ({ ...prev, selectedShifts: shiftsData.map((s: any) => s.id) }));
    } catch (err) {
      console.error('加载数据失败:', err);
      Message.error('加载数据失败');
    } finally {
      setDataLoading(false);
    }
  };

  const loadHistoryProjects = async () => {
    try {
      if (window.api.getHistoryProjects) {
        const projects = await window.api.getHistoryProjects();
        setHistoryProjects(projects);
      }
    } catch (err) {
      console.error('加载历史项目失败:', err);
    }
  };

  const loadProjectHistoryData = async (projectId: number) => {
    try {
      if (window.api.getHistoryData) {
        const data = await window.api.getHistoryData(projectId, 90);
        setProjectHistoryData(data);
      }
    } catch (err) {
      console.error('加载项目历史数据失败:', err);
      Message.error('加载历史数据失败');
    }
  };

  const calculateHistoryStats = (data: HistoryDataRecord[]) => {
    if (data.length === 0) return null;

    const avgSales = data.reduce((sum, d) => sum + (d.sales_volume || 0), 0) / data.length;
    const avgStaff = data.reduce((sum, d) => sum + (d.actual_staff || 0), 0) / data.length;
    const avgConsult = data.reduce((sum, d) => sum + (d.actual_consult || 0), 0) / data.length;
    const avgConversion = data.reduce((sum, d) => sum + (d.conversion_rate || 0), 0) / data.length;
    const avgEfficiency = data.filter(d => d.actual_staff > 0)
      .reduce((sum, d) => sum + (d.sales_volume / d.actual_staff), 0) / data.filter(d => d.actual_staff > 0).length;

    // 计算数据波动率（标准差）
    const efficiencies = data.filter(d => d.actual_staff > 0).map(d => d.sales_volume / d.actual_staff);
    const variance = efficiencies.reduce((sum, eff) => sum + Math.pow(eff - avgEfficiency, 2), 0) / efficiencies.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgEfficiency;

    // 计算置信度
    let confidence = 100;

    // 数据量因素
    if (data.length < 30) confidence -= 20;
    if (data.length < 10) confidence -= 30;

    // 波动性因素（变异系数）
    if (coefficientOfVariation > 0.3) confidence -= 15;
    if (coefficientOfVariation > 0.5) confidence -= 25;

    // 数据完整性因素
    const completeness = data.filter(d => d.actual_staff > 0).length / data.length;
    if (completeness < 0.8) confidence -= 10;
    if (completeness < 0.6) confidence -= 20;

    confidence = Math.max(confidence, 30); // 最低30%

    // 检测异常数据
    const anomalies = data.filter(d => {
      if (d.actual_staff === 0) return false;
      const efficiency = d.sales_volume / d.actual_staff;
      const zScore = Math.abs((efficiency - avgEfficiency) / stdDev);
      return zScore > 2.5; // 超过2.5个标准差视为异常
    });

    return {
      avgSales: avgSales.toFixed(1),
      avgStaff: Math.round(avgStaff),
      avgConsult: Math.round(avgConsult),
      avgConversion: (avgConversion * 100).toFixed(2),
      avgEfficiency: avgEfficiency.toFixed(2),
      confidence: Math.round(confidence),
      anomalies: anomalies.length,
      stdDev: stdDev.toFixed(2),
      predictedStaff: (targetValue: number) => Math.ceil(targetValue / avgEfficiency)
    };
  };

  const getHistoryChartData = () => {
    if (projectHistoryData.length === 0) return null;

    // 按日期排序
    const sortedData = [...projectHistoryData].sort((a, b) =>
      new Date(a.data_date).getTime() - new Date(b.data_date).getTime()
    );

    const labels = sortedData.map(d => d.data_date);
    const salesData = sortedData.map(d => d.sales_volume);
    const staffData = sortedData.map(d => d.actual_staff);
    const efficiencyData = sortedData.map(d =>
      d.actual_staff > 0 ? (d.sales_volume / d.actual_staff) : 0
    );

    return {
      labels,
      datasets: [
        {
          label: '销售额(万)',
          data: salesData,
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true
        },
        {
          label: '人数',
          data: staffData,
          borderColor: '#ff7d00',
          backgroundColor: 'rgba(255, 125, 0, 0.1)',
          yAxisID: 'y1',
          tension: 0.4,
          fill: true
        },
        {
          label: '人均效率(万/人)',
          data: efficiencyData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'y2',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  const historyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '历史业务趋势分析'
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '销售额(万)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '人数'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '效率(万/人)'
        },
        grid: {
          drawOnChartArea: false,
        },
      }
    },
  };

  const applyHistoryPrediction = () => {
    if (!selectedHistoryProject || projectHistoryData.length === 0) {
      Message.warning('请先选择项目并确保有历史数据');
      return;
    }

    const stats = calculateHistoryStats(projectHistoryData);
    if (!stats) return;

    if (formData.driveMode === 'sales' && formData.targetValue) {
      const predicted = stats.predictedStaff(Number(formData.targetValue));

      // 置信度颜色
      const getConfidenceColor = (conf: number) => {
        if (conf >= 80) return '#10b981';
        if (conf >= 60) return '#f59e0b';
        return '#ef4444';
      };

      // 置信度描述
      const getConfidenceDesc = (conf: number) => {
        if (conf >= 80) return '高置信度 - 预测结果可靠';
        if (conf >= 60) return '中等置信度 - 建议结合业务判断';
        return '低置信度 - 建议谨慎参考';
      };

      Modal.info({
        title: '📊 智能预测结果',
        style: { width: 700 },
        content: (
          <div>
            <p style={{ marginBottom: 12 }}>基于 <strong>{projectHistoryData.length}</strong> 条历史数据分析：</p>

            {/* 置信度评分 */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>预测置信度</div>
                  <div style={{ fontSize: 42, fontWeight: 'bold', marginTop: 4 }}>
                    {stats.confidence}%
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    {getConfidenceDesc(stats.confidence)}
                  </div>
                </div>
                <div style={{ fontSize: 64 }}>
                  {stats.confidence >= 80 ? '🎯' : stats.confidence >= 60 ? '⚠️' : '❗'}
                </div>
              </div>
            </div>

            {/* 历史统计 */}
            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 12 }}>
              <p style={{ fontWeight: 'bold', marginBottom: 8 }}>📈 历史数据统计</p>
              <p>• 平均销售额: <strong>{stats.avgSales}</strong> 万元</p>
              <p>• 平均人数: <strong>{stats.avgStaff}</strong> 人</p>
              <p>• 人均效率: <strong>{stats.avgEfficiency}</strong> 万元/人 (标准差: ±{stats.stdDev})</p>
              <p>• 平均咨询量: <strong>{stats.avgConsult}</strong> 次</p>
              <p>• 平均转化率: <strong>{stats.avgConversion}%</strong></p>
              {stats.anomalies > 0 && (
                <p style={{ color: '#ef4444', marginTop: 8 }}>
                  ⚠️ 检测到 <strong>{stats.anomalies}</strong> 条异常数据（偏离平均值超过2.5个标准差）
                </p>
              )}
            </div>

            {/* 预测结果 */}
            <div style={{ background: '#e6f7ff', padding: 16, borderRadius: 8, border: '1px solid #91d5ff' }}>
              <p style={{ fontSize: 16, fontWeight: 'bold', color: '#0050b3' }}>
                💡 预测人力需求: <span style={{ fontSize: 24, color: '#1890ff' }}>{predicted}</span> 人
              </p>
              <p style={{ color: '#666', marginTop: 8, fontSize: 12 }}>
                基于目标销售额 {formData.targetValue} 万元 ÷ 人均效率 {stats.avgEfficiency} 万元/人
              </p>
              <p style={{ color: '#666', marginTop: 4, fontSize: 12 }}>
                建议配置范围: {Math.ceil(predicted * 0.9)} - {Math.ceil(predicted * 1.1)} 人
              </p>
            </div>

            {/* 数据质量提示 */}
            {stats.confidence < 70 && (
              <div style={{
                background: '#fff7e6',
                padding: 12,
                borderRadius: 8,
                marginTop: 12,
                border: '1px solid #ffd591'
              }}>
                <p style={{ fontSize: 13, color: '#ad6800', margin: 0 }}>
                  <strong>💡 提高置信度建议：</strong><br/>
                  {projectHistoryData.length < 30 && '• 继续积累历史数据（建议至少30天）\n'}
                  {stats.anomalies > 0 && '• 检查并处理异常数据\n'}
                  • 确保数据记录的完整性和准确性
                </p>
              </div>
            )}
          </div>
        )
      });
    } else {
      Message.success(`历史平均销售额: ${stats.avgSales}万元, 平均人数: ${stats.avgStaff}人`);
    }

    setHistoryModalVisible(false);
  };

  const loadSavedResults = () => {
    const saved = localStorage.getItem('savedResults');
    if (saved) {
      setSavedResults(JSON.parse(saved));
    }
  };

  const saveResult = () => {
    if (!result) return;

    const newResult = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      formData: {...formData},
      result: {...result}
    };

    const updated = [newResult, ...savedResults].slice(0, 5); // 只保留最近5个
    setSavedResults(updated);
    localStorage.setItem('savedResults', JSON.stringify(updated));
    Message.success('测算结果已保存，可在数据对比中查看');
  };

  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const addPeakDate = () => {
    const lastDate = formData.peakDates[formData.peakDates.length - 1];
    const nextDate = dayjs(lastDate).add(3, 'day').format('YYYY-MM-DD');
    setFormData(prev => ({
      ...prev,
      peakDates: [...prev.peakDates, nextDate]
    }));
  };

  const removePeakDate = (index: number) => {
    if (formData.peakDates.length > 1) {
      setFormData(prev => ({
        ...prev,
        peakDates: prev.peakDates.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePeakDate = (index: number, value: string) => {
    const newDates = [...formData.peakDates];
    newDates[index] = value;
    setFormData(prev => ({ ...prev, peakDates: newDates }));
  };

  // 拖拽结束处理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.peakDates.findIndex((_, i) => i === active.id);
        const newIndex = prev.peakDates.findIndex((_, i) => i === over.id);
        return {
          ...prev,
          peakDates: arrayMove(prev.peakDates, oldIndex, newIndex)
        };
      });
      Message.info('高峰日期顺序已调整');
    }
  };

  const toggleShift = (shiftId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedShifts: prev.selectedShifts.includes(shiftId)
        ? prev.selectedShifts.filter(id => id !== shiftId)
        : [...prev.selectedShifts, shiftId]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.targetValue) {
          Message.warning('请输入目标数值');
          return false;
        }
        if (isNaN(Number(formData.targetValue))) {
          Message.warning('请输入有效数字');
          return false;
        }
        return true;
      case 1:
        return true;
      case 2:
        if (formData.selectedShifts.length === 0) {
          Message.warning('请至少选择一个班次');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 2) {
        setCurrentStep(currentStep + 1);
      } else {
        handleCalculate();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const startDate = formData.dateRange[0];
      const endDate = formData.dateRange[1];
      const days = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;

      // 获取选中的活动及其精确的 factor 值
      const selectedPromo = promotions.find(p => p.id === formData.promotionId);

      const calcData = {
        targetSales: formData.driveMode === 'sales' ? parseFloat(formData.targetValue) * 10000 : 0,
        // 访客数驱动：将用户输入的目标日均访客数传给计算器
        targetVisitors: formData.driveMode === 'traffic' ? parseFloat(formData.targetValue) : undefined,
        days,
        eventType: selectedPromo?.scheme_name || null,
        eventDates: formData.peakDates,
        calcStartDate: startDate,
        params: formData.schemeId
          ? JSON.parse(schemes.find(s => s.id === formData.schemeId)?.params_json || '{}')
          : {},
        selectedShifts: formData.selectedShifts,
        // 传递活动规划中设置的精确系数
        promotionFactor: selectedPromo?.factor,
        // 班次最低保底人数（选了几个班次就至少要几个人）
        minStaff: formData.selectedShifts.length || 1
      };

      const res = await window.api.calculateManpower(calcData);
      setResult(res);
      setCurrentStep(3);
      Message.success('✅ 测算完成！');
    } catch (err: any) {
      console.error('测算失败:', err);
      Message.error(`测算失败: ${err.message || '请检查输入'}`);
    } finally {
      setLoading(false);
    }
  };

  const showChart = (type: 'timeline' | 'hourly' | 'pie' | 'radar') => {
    setChartType(type);
    setChartModalVisible(true);
  };

  const handleExport = async () => {
    if (!result) {
      Message.warning('暂无测算结果可导出');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = '人力测算系统';
      workbook.created = new Date();

      // 创建汇总sheet
      const summarySheet = workbook.addWorksheet('测算汇总');

      // 标题
      summarySheet.mergeCells('A1:D1');
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = '人力需求测算报告';
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 测算信息
      summarySheet.addRow([]);
      summarySheet.addRow(['测算时间', dayjs().format('YYYY-MM-DD HH:mm:ss')]);
      summarySheet.addRow(['测算周期', `${formData.dateRange[0]} 至 ${formData.dateRange[1]}`]);
      summarySheet.addRow(['驱动方式', formData.driveMode === 'sales' ? '按销售额' : '按访客数']);
      summarySheet.addRow(['目标数值', formData.targetValue]);
      summarySheet.addRow([]);

      // 核心指标
      summarySheet.addRow(['核心指标', '', '', '']);
      summarySheet.getRow(8).font = { bold: true };
      summarySheet.addRow(['建议总编制', result.needed_staff, '人']);
      summarySheet.addRow(['售前人员', result.presale_staff, '人']);
      summarySheet.addRow(['售中人员', result.midsale_staff, '人']);
      summarySheet.addRow(['售后人员', result.aftersale_staff, '人']);
      summarySheet.addRow(['日均接待量', Math.round(result.daily_consult), '次']);

      // 每日明细sheet
      if (result.daily_results && result.daily_results.length > 0) {
        const dailySheet = workbook.addWorksheet('每日人力需求');
        dailySheet.addRow(['日期', '总人数', '售前', '售中', '售后']);
        dailySheet.getRow(1).font = { bold: true };

        result.daily_results.forEach((day: any) => {
          dailySheet.addRow([
            day.date,
            day.staff,
            day.presale,
            day.midsale,
            day.aftersale
          ]);
        });

        // 自动调整列宽
        dailySheet.columns.forEach((column: any) => {
          column.width = 15;
        });
      }

      // 24小时分布sheet
      if (result.hourly_total && result.hourly_total.length > 0) {
        const hourlySheet = workbook.addWorksheet('24小时人力分布');
        hourlySheet.addRow(['时段', '总人数', '售前', '售中', '售后']);
        hourlySheet.getRow(1).font = { bold: true };

        for (let i = 0; i < 24; i++) {
          hourlySheet.addRow([
            `${i}:00-${i+1}:00`,
            result.hourly_total[i]?.toFixed(1) || 0,
            result.hourly_presale[i]?.toFixed(1) || 0,
            result.hourly_midsale[i]?.toFixed(1) || 0,
            result.hourly_aftersale[i]?.toFixed(1) || 0
          ]);
        }

        hourlySheet.columns.forEach((column: any) => {
          column.width = 15;
        });
      }

      // 列宽设置
      summarySheet.columns = [
        { width: 20 },
        { width: 30 },
        { width: 15 },
        { width: 15 }
      ];

      // 导出文件
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `人力测算报告_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      Message.success('✅ 报表导出成功！');
    } catch (err: any) {
      console.error('导出失败:', err);
      Message.error('导出失败: ' + err.message);
    }
  };

  if (dataLoading) {
    return <InlineLoading tip="正在初始化工作台..." />;
  }

  const progress = ((currentStep + 1) / 4) * 100;

  return (
    <div className='h-full flex flex-col' style={{ background: '#f8f9fa' }}>
      {/* 顶部进度条 */}
      <div className='bg-white' style={{ borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className='max-w-7xl mx-auto px-8 py-6'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <Title heading={3} style={{ margin: 0, color: '#1f2937' }}>
                🧠 智能人力测算
              </Title>
              <Text type='secondary' style={{ fontSize: 14, color: '#6b7280' }}>分步引导，轻松完成人力预算测算</Text>
            </div>
            <Progress
              type='circle'
              percent={progress}
              size='small'
              style={{ marginRight: 20 }}
            />
          </div>

          <Steps current={currentStep} style={{ maxWidth: 900 }}>
            <Step title='目标设定' description='销售额或访客数' />
            <Step title='时间规划' description='活动周期与高峰' />
            <Step title='班次配置' description='选择排班方案' />
            <Step title='查看结果' description='人力配置建议' />
          </Steps>
        </div>
      </div>

      {/* 内容区域 */}
      <div className='flex-1 overflow-y-auto p-8'>
        <div className='max-w-7xl mx-auto'>

          <Modal
            title={
              <Space>
                <IconHistory />
                <Text bold>📊 参考历史数据与智能预测</Text>
              </Space>
            }
            visible={historyModalVisible}
            onCancel={() => setHistoryModalVisible(false)}
            footer={
              <Space>
                <Button onClick={() => setHistoryModalVisible(false)}>取消</Button>
                <Button
                  type="primary"
                  onClick={applyHistoryPrediction}
                  disabled={!selectedHistoryProject || projectHistoryData.length === 0}
                >
                  智能预测人力需求
                </Button>
              </Space>
            }
            style={{ width: 900, top: 40 }}
          >
            <div className="space-y-4">
              {/* 项目选择 */}
              <div>
                <Text bold className="block mb-2">选择历史项目</Text>
                <Select
                  placeholder="选择要参考的项目/店铺"
                  value={selectedHistoryProject || undefined}
                  onChange={(v) => setSelectedHistoryProject(v)}
                  size="large"
                  style={{ width: '100%' }}
                  allowClear
                >
                  {historyProjects.map(p => (
                    <Select.Option key={p.id} value={p.id}>
                      <Space>
                        📁 {p.project_name}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {p.description || ''}
                        </Text>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* 统计信息 */}
              {selectedHistoryProject && projectHistoryData.length > 0 && (() => {
                const stats = calculateHistoryStats(projectHistoryData);
                if (!stats) return null;

                return (
                  <div>
                    <Text bold className="block mb-3">历史数据统计 ({projectHistoryData.length} 条记录)</Text>
                    <div className="grid grid-cols-5 gap-3">
                      <Card style={{ textAlign: 'center', background: '#f0f9ff' }}>
                        <Statistic
                          title="平均销售额"
                          value={stats.avgSales}
                          suffix="万"
                          styleValue={{ fontSize: 18, color: '#1890ff' }}
                        />
                      </Card>
                      <Card style={{ textAlign: 'center', background: '#fff7ed' }}>
                        <Statistic
                          title="平均人数"
                          value={stats.avgStaff}
                          suffix="人"
                          styleValue={{ fontSize: 18, color: '#ff7d00' }}
                        />
                      </Card>
                      <Card style={{ textAlign: 'center', background: '#f0fdf4' }}>
                        <Statistic
                          title="人均效率"
                          value={stats.avgEfficiency}
                          suffix="万/人"
                          styleValue={{ fontSize: 18, color: '#10b981' }}
                        />
                      </Card>
                      <Card style={{ textAlign: 'center', background: '#fef3f2' }}>
                        <Statistic
                          title="平均咨询量"
                          value={stats.avgConsult}
                          suffix="次"
                          styleValue={{ fontSize: 18, color: '#ef4444' }}
                        />
                      </Card>
                      <Card style={{ textAlign: 'center', background: '#faf5ff' }}>
                        <Statistic
                          title="平均转化率"
                          value={stats.avgConversion}
                          suffix="%"
                          styleValue={{ fontSize: 18, color: '#a855f7' }}
                        />
                      </Card>
                    </div>

                    {/* 预测结果 */}
                    {formData.targetValue && formData.driveMode === 'sales' && (
                      <div className="mt-4 p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>基于历史效率的智能预测</Text>
                            <div style={{ fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>
                              约需 {stats.predictedStaff(Number(formData.targetValue))} 人
                            </div>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
                              {formData.targetValue}万 ÷ {stats.avgEfficiency}万/人 = {stats.predictedStaff(Number(formData.targetValue))}人
                            </Text>
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                background: 'rgba(255,255,255,0.2)',
                                padding: '4px 12px',
                                borderRadius: 12,
                                fontSize: 13
                              }}>
                                置信度: {stats.confidence}%
                              </div>
                              {stats.anomalies > 0 && (
                                <div style={{
                                  background: 'rgba(255,152,0,0.3)',
                                  padding: '4px 12px',
                                  borderRadius: 12,
                                  fontSize: 13
                                }}>
                                  ⚠️ {stats.anomalies}条异常
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: 48 }}>🎯</div>
                        </div>
                      </div>
                    )}

                    {/* 趋势图按钮 */}
                    <div className="mt-4">
                      <Button
                        type="dashed"
                        long
                        onClick={() => setShowHistoryChart(!showHistoryChart)}
                        icon={<IconHistory />}
                      >
                        {showHistoryChart ? '隐藏' : '查看'}趋势图分析
                      </Button>
                    </div>

                    {/* 趋势图 */}
                    {showHistoryChart && getHistoryChartData() && (
                      <div style={{ height: 350, marginTop: 16, background: '#fafafa', padding: 16, borderRadius: 8 }}>
                        <Line data={getHistoryChartData()!} options={historyChartOptions} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 数据表格 */}
              {selectedHistoryProject && projectHistoryData.length > 0 && (
                <div>
                  <Text bold className="block mb-2">历史数据明细（最近90天）</Text>
                  <Table
                    data={projectHistoryData}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    columns={[
                      {
                        title: '日期',
                        dataIndex: 'data_date',
                        width: 110,
                        sorter: (a: HistoryDataRecord, b: HistoryDataRecord) =>
                          new Date(a.data_date).getTime() - new Date(b.data_date).getTime()
                      },
                      {
                        title: '销售额(万)',
                        dataIndex: 'sales_volume',
                        width: 100,
                        render: (val: number) => val?.toFixed(1) || '-'
                      },
                      {
                        title: '人数',
                        dataIndex: 'actual_staff',
                        width: 70
                      },
                      {
                        title: '咨询量',
                        dataIndex: 'actual_consult',
                        width: 90,
                        render: (val: number) => Math.round(val) || '-'
                      },
                      {
                        title: '转化率',
                        dataIndex: 'conversion_rate',
                        width: 80,
                        render: (val: number) => val ? `${(val * 100).toFixed(1)}%` : '-'
                      },
                      {
                        title: '人均效率',
                        width: 100,
                        render: (_: any, record: HistoryDataRecord) => {
                          if (!record.sales_volume || !record.actual_staff) return '-';
                          const efficiency = record.sales_volume / record.actual_staff;

                          // 检查是否为异常数据
                          const stats = calculateHistoryStats(projectHistoryData);
                          if (stats) {
                            const avgEff = parseFloat(stats.avgEfficiency);
                            const stdDev = parseFloat(stats.stdDev);
                            const zScore = Math.abs((efficiency - avgEff) / stdDev);

                            if (zScore > 2.5) {
                              return (
                                <Tooltip content="异常数据：偏离平均值超过2.5个标准差">
                                  <Tag color="orange" size="small">
                                    {efficiency.toFixed(2)}万/人 ⚠️
                                  </Tag>
                                </Tooltip>
                              );
                            }
                          }

                          return efficiency.toFixed(2) + '万/人';
                        }
                      },
                      {
                        title: '操作',
                        width: 80,
                        fixed: 'right' as const,
                        render: (_: any, record: HistoryDataRecord) => (
                          <Button
                            type="text"
                            size="small"
                            onClick={() => {
                              updateFormData('targetValue', record.sales_volume.toString());
                              Message.success(`已应用 ${record.data_date} 的销售额数据`);
                            }}
                          >
                            应用
                          </Button>
                        )
                      }
                    ]}
                  />
                </div>
              )}

              {/* 空状态 */}
              {selectedHistoryProject && projectHistoryData.length === 0 && (
                <Empty description="该项目暂无历史数据" />
              )}

              {!selectedHistoryProject && (
                <Empty
                  description="请选择一个项目查看历史数据"
                  icon={<div style={{ fontSize: 64 }}>📊</div>}
                />
              )}

              {/* 提示信息 */}
              <div className="p-3 rounded-lg" style={{ background: '#f0f9ff', border: '1px solid #bae7ff' }}>
                <Text style={{ fontSize: 13, color: '#0050b3' }}>
                  <strong>💡 使用提示：</strong><br />
                  • 选择项目后，系统会自动计算历史平均效率<br />
                  • 点击"智能预测"可基于历史数据预测人力需求<br />
                  • 点击表格中的"应用"可快速填入该天的销售额
                </Text>
              </div>
            </div>
          </Modal>

          {/* 步骤 1: 目标设定 */}
          {currentStep === 0 && (
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                background: 'white',
                border: '1px solid #e5e7eb'
              }}
            >
              <div className='text-center mb-8'>
                <div className='text-6xl mb-4'>🎯</div>
                <Title heading={4}>设定核心目标</Title>
                <Text type='secondary'>告诉我们你想达成什么样的业务目标</Text>
              </div>

              <div className='max-w-2xl mx-auto space-y-6'>
                {/* 参数模板 */}
                <div>
                  <Text bold className='block mb-3'>选择测算模板（可选）</Text>
                  <Select
                    placeholder="使用默认模板或选择自定义模板"
                    value={formData.schemeId || undefined}
                    onChange={(v) => updateFormData('schemeId', v)}
                    size='large'
                    allowClear
                    style={{ width: '100%', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  >
                    {schemes.map(s => (
                      <Select.Option key={s.id} value={s.id}>
                        <Space>
                          {s.scheme_name}
                          {s.is_default && <Tag color='blue' size='small'>默认</Tag>}
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {/* 驱动模式 */}
                <div>
                  <Text bold className='block mb-3'>测算驱动方式</Text>
                  <Radio.Group
                    type='button'
                    size='large'
                    value={formData.driveMode}
                    onChange={(v) => updateFormData('driveMode', v)}
                    style={{ width: '100%' }}
                  >
                    <Radio value='sales' style={{ flex: 1, textAlign: 'center' }}>
                      <div className='py-4'>
                        <div className='text-3xl mb-2'>💰</div>
                        <div className='font-bold'>按销售额算</div>
                        <div className='text-xs text-gray-500'>适合有明确销售目标</div>
                      </div>
                    </Radio>
                    <Radio value='traffic' style={{ flex: 1, textAlign: 'center' }}>
                      <div className='py-4'>
                        <div className='text-3xl mb-2'>👥</div>
                        <div className='font-bold'>按访客数算</div>
                        <div className='text-xs text-gray-500'>适合流量驱动场景</div>
                      </div>
                    </Radio>
                  </Radio.Group>
                </div>

                {/* 目标数值 */}
                <div>
                  <div className='flex justify-between items-center mb-3'>
                    <Text bold>
                      {formData.driveMode === 'sales' ? '目标销售额（万元）' : '预计日均访客数（人）'}
                    </Text>
                    <Button
                      type='text'
                      icon={<IconHistory />}
                      onClick={() => setHistoryModalVisible(true)}
                    >
                      参考历史数据
                    </Button>
                  </div>
                  <Input
                    size='large'
                    placeholder={formData.driveMode === 'sales' ? '例如: 2000' : '例如: 5000'}
                    value={formData.targetValue}
                    onChange={(v) => updateFormData('targetValue', v)}
                    prefix={formData.driveMode === 'sales' ? '¥' : ''}
                    suffix={formData.driveMode === 'sales' ? '万' : '人'}
                    style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}
                  />
                  {formData.targetValue && !isNaN(Number(formData.targetValue)) && (
                    <div className='text-center mt-3'>
                      <Tag color='green' size='large'>
                        {formData.driveMode === 'sales'
                          ? `目标: ${(Number(formData.targetValue) * 10000).toLocaleString()} 元`
                          : `日均: ${Number(formData.targetValue).toLocaleString()} 人`
                        }
                      </Tag>
                    </div>
                  )}
                </div>

                {/* 活动级别 */}
                <div>
                  <Text bold className='block mb-3'>活动力度（可选）</Text>
                  <div className='grid grid-cols-4 gap-3'>
                    {promotions.map(p => (
                      <div
                        key={p.id}
                        onClick={() => updateFormData('promotionId', p.id)}
                        className={`p-4 rounded-lg cursor-pointer border-2 transition-all text-center ${
                          formData.promotionId === p.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ borderRadius: 8, boxShadow: formData.promotionId === p.id ? '0 4px 6px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)' }}
                      >
                        <div className='text-2xl mb-2'>🔥</div>
                        <div className='font-bold text-sm mb-1'>{p.scheme_name}</div>
                        <Tag color='orangered' size='small'>×{p.factor}</Tag>
                        <div className='text-xs text-gray-500 mt-1'>
                          流量提升 {((p.factor - 1) * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 步骤 2: 时间规划 */}
          {currentStep === 1 && (
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                background: 'white',
                border: '1px solid #e5e7eb'
              }}
            >
              <div className='text-center mb-8'>
                <div className='text-6xl mb-4'>📅</div>
                <Title heading={4}>规划活动时间</Title>
                <Text type='secondary'>设置活动周期和流量高峰日期</Text>
              </div>

              <div className='max-w-2xl mx-auto space-y-8'>
                {/* 活动周期 */}
                <div>
                  <Text bold className='block mb-3'>活动周期</Text>
                  <RangePicker
                    value={formData.dateRange}
                    onChange={(_, dateStrings) => updateFormData('dateRange', dateStrings)}
                    style={{ width: '100%', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    size='large'
                    shortcuts={[
                      {
                        text: '未来7天',
                        value: () => [dayjs(), dayjs().add(7, 'day')]
                      },
                      {
                        text: '未来30天',
                        value: () => [dayjs(), dayjs().add(30, 'day')]
                      }
                    ]}
                  />
                  <div className='flex justify-between mt-3 text-sm text-gray-500'>
                    <span>开始: {dayjs(formData.dateRange[0]).format('YYYY年MM月DD日')}</span>
                    <span>
                      共 {dayjs(formData.dateRange[1]).diff(dayjs(formData.dateRange[0]), 'day') + 1} 天
                    </span>
                    <span>结束: {dayjs(formData.dateRange[1]).format('YYYY年MM月DD日')}</span>
                  </div>
                </div>

                {/* 高峰日期 */}
                <div>
                  <div className='flex justify-between items-center mb-3'>
                    <Text bold>流量高峰日期（可拖拽排序）</Text>
                    <Badge count={formData.peakDates.length} />
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={formData.peakDates.map((_, i) => i)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className='space-y-3'>
                        {formData.peakDates.map((date, index) => (
                          <SortablePeakDateItem
                            key={index}
                            id={index}
                            date={date}
                            index={index}
                            total={formData.peakDates.length}
                            onUpdate={updatePeakDate}
                            onRemove={removePeakDate}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <Button
                    type='dashed'
                    icon={<IconPlus />}
                    onClick={addPeakDate}
                    long
                    style={{ marginTop: 12, borderRadius: 8 }}
                  >
                    添加高峰日
                  </Button>

                  <div className='mt-4 p-4 bg-yellow-50 rounded-lg' style={{ borderRadius: 8 }}>
                    <Text style={{ fontSize: 13, color: '#666' }}>
                      💡 拖动左侧图标可调整日期优先级顺序
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 步骤 3: 班次配置 */}
          {currentStep === 2 && (
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                background: 'white',
                border: '1px solid #e5e7eb'
              }}
            >
              <div className='text-center mb-8'>
                <div className='text-6xl mb-4'>⏰</div>
                <Title heading={4}>选择排班方案</Title>
                <Text type='secondary'>
                  已选 <Tag color='blue'>{formData.selectedShifts.length}/{shifts.length}</Tag> 个班次
                </Text>
              </div>

              {shifts.length === 0 ? (
                <Empty description='暂无班次配置，请先在班次管理中添加' />
              ) : (
                <div className='grid grid-cols-3 gap-4 max-w-4xl mx-auto'>
                  {shifts.map(shift => {
                    const isSelected = formData.selectedShifts.includes(shift.id);
                    return (
                      <div
                        key={shift.id}
                        onClick={() => toggleShift(shift.id)}
                        className={`relative p-6 rounded-xl cursor-pointer border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg scale-105'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        {isSelected && (
                          <div className='absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center'>
                            <IconCheck style={{ color: 'white', fontSize: 14 }} />
                          </div>
                        )}
                        <div className='text-center'>
                          <div className='text-3xl mb-3'>
                            {shift.shift_type === '早班' ? '🌅' :
                             shift.shift_type === '中班' ? '☀️' :
                             shift.shift_type === '晚班' ? '🌙' : '⏰'}
                          </div>
                          <div className='font-bold text-lg mb-2'>{shift.shift_name}</div>
                          <div className='text-sm text-gray-600 mb-1'>
                            {shift.start_time} - {shift.end_time}
                          </div>
                          <Tag color={isSelected ? 'blue' : 'gray'} size='small'>
                            {shift.work_hours}小时
                          </Tag>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* 步骤 4: 结果展示 */}
          {currentStep === 3 && result && (
            <div className='space-y-6'>
              {/* 核心指标卡片 */}
              <div className='grid grid-cols-3 gap-6'>
                <Card bordered={false} style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: 16
                }}>
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>建议总编制</span>}
                    value={result.needed_staff}
                    suffix="人"
                    styleValue={{ color: 'white', fontSize: 48, fontWeight: 'bold' }}
                  />
                </Card>
                <Card bordered={false} style={{ borderRadius: 16 }}>
                  <Statistic
                    title="日均接待量"
                    value={Math.round(result.daily_consult)}
                    suffix="次"
                    styleValue={{ color: '#3f8600' }}
                  />
                </Card>
                <Card bordered={false} style={{ borderRadius: 16 }}>
                  <Statistic
                    title="峰值工作时长"
                    value={result.daily_hours?.toFixed(1)}
                    suffix="小时"
                    styleValue={{ color: '#cf1322' }}
                  />
                </Card>
              </div>

              {/* 岗位分布 */}
              <Card
                title={<Text bold>岗位编制详情</Text>}
                bordered={false}
                style={{ borderRadius: 16 }}
              >
                <div className='grid grid-cols-3 gap-4'>
                  {[
                    { label: '售前咨询', value: result.presale_staff, color: '#8b5cf6', emoji: '💬' },
                    { label: '售中处理', value: result.midsale_staff, color: '#ec4899', emoji: '📦' },
                    { label: '售后服务', value: result.aftersale_staff, color: '#10b981', emoji: '🛠️' }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className='p-6 rounded-xl text-center'
                      style={{ background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}30 100%)` }}
                    >
                      <div className='text-4xl mb-3'>{item.emoji}</div>
                      <div className='text-2xl font-bold mb-2' style={{ color: item.color }}>
                        {item.value}
                      </div>
                      <div className='text-sm text-gray-600'>{item.label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 图表按钮 */}
              <div className='grid grid-cols-4 gap-4'>
                <Button
                  type='primary'
                  size='large'
                  onClick={() => showChart('timeline')}
                  style={{ height: 60, fontSize: 16, borderRadius: 12 }}
                >
                  📈 多日趋势
                </Button>
                <Button
                  type='primary'
                  size='large'
                  status='warning'
                  onClick={() => showChart('hourly')}
                  style={{ height: 60, fontSize: 16, borderRadius: 12 }}
                >
                  📊 24小时分布
                </Button>
                <Button
                  type='primary'
                  size='large'
                  status='success'
                  onClick={() => showChart('pie')}
                  style={{ height: 60, fontSize: 16, borderRadius: 12 }}
                >
                  🥧 岗位占比
                </Button>
                <Button
                  type='primary'
                  size='large'
                  status='danger'
                  onClick={() => showChart('radar')}
                  style={{ height: 60, fontSize: 16, borderRadius: 12 }}
                >
                  🎯 能力分布
                </Button>
              </div>

              {/* 操作按钮 */}
              <div className='flex justify-center gap-4'>
                <Button size='large' onClick={() => setCurrentStep(0)} style={{ borderRadius: 8 }}>
                  重新测算
                </Button>
                <Button
                  size='large'
                  onClick={saveResult}
                  style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                  💾 保存结果
                </Button>
                <Button
                  size='large'
                  type='primary'
                  icon={<IconDownload />}
                  onClick={handleExport}
                  style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                  导出报表
                </Button>
              </div>

              {savedResults.length > 0 && (
                <div className='text-center mt-4'>
                  <Button
                    type='outline'
                    onClick={() => setCompareModalVisible(true)}
                    style={{ borderRadius: 8 }}
                  >
                    📊 查看历史对比 ({savedResults.length})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 底部操作按钮 */}
          {currentStep < 3 && (
            <div className='flex justify-center gap-4 mt-8'>
              {currentStep > 0 && (
                <Button
                  size='large'
                  icon={<IconLeft />}
                  onClick={prevStep}
                  style={{ minWidth: 120 }}
                >
                  上一步
                </Button>
              )}
              <Button
                type='primary'
                size='large'
                icon={currentStep === 2 ? <IconThunderbolt /> : <IconRight />}
                onClick={nextStep}
                loading={loading}
                style={{ minWidth: 200 }}
              >
                {currentStep === 2 ? '开始测算' : '下一步'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 图表模态框 */}
      <Modal
        title={
          chartType === 'timeline' ? '📈 多日人力趋势' :
          chartType === 'hourly' ? '📊 24小时负荷分布' :
          chartType === 'pie' ? '🥧 岗位编制占比' :
          '🎯 多维能力分布'
        }
        visible={chartModalVisible}
        onCancel={() => setChartModalVisible(false)}
        footer={null}
        style={{ width: '90vw', maxWidth: chartType === 'pie' ? 800 : 1200 }}
      >
        <div style={{ height: 500, padding: '20px 0' }}>
          {chartType === 'timeline' && result?.daily_results ? (
            <TimelineChart data={result.daily_results} />
          ) : chartType === 'hourly' && result ? (
            <HourlyChart
              hourlyTotal={result.hourly_total || []}
              hourlyPresale={result.hourly_presale || []}
              hourlyMidsale={result.hourly_midsale || []}
              hourlyAftersale={result.hourly_aftersale || []}
            />
          ) : chartType === 'pie' && result ? (
            <PieChart
              presale={result.presale_staff}
              midsale={result.midsale_staff}
              aftersale={result.aftersale_staff}
            />
          ) : chartType === 'radar' && result ? (
            (() => {
            // 从选中的方案提取真实参数
            const sp = formData.schemeId
              ? JSON.parse(schemes.find(s => s.id === formData.schemeId)?.params_json || '{}')
              : {};
            const rp = (k: string, d: number) => Number(sp[k] ?? d);

            // 每小时处理能力（真实效能）: 60/处理时长 × 饱和度 × 10 做缩放以匹配人数量级
            const presaleEff  = Math.round((60 / rp('presale_handle_time', 4.5))  * rp('presale_saturation', 0.78)  * result.presale_staff  / 10);
            const midsaleEff  = Math.round((60 / rp('midsale_handle_time', 3.0))  * rp('midsale_saturation', 0.82)  * result.midsale_staff  / 10);
            const aftersaleEff = Math.round((60 / rp('aftersale_handle_time', 6.5)) * rp('aftersale_saturation', 0.72) * result.aftersale_staff / 10);

            // 高峰爆发力: 人数 × 爆发系数
            const presaleBurst  = Math.round(result.presale_staff  * rp('presale_burst_factor', 1.9));
            const midsaleBurst  = Math.round(result.midsale_staff  * rp('midsale_burst_factor', 2.3));
            const aftersaleBurst = Math.round(result.aftersale_staff * rp('aftersale_burst_factor', 2.6));

            // 实际饱和负荷: 人数 × 饱和度 × 10（百分比放大）
            const presaleSat  = Math.round(result.presale_staff  * rp('presale_saturation', 0.78)  * 10);
            const midsaleSat  = Math.round(result.midsale_staff  * rp('midsale_saturation', 0.82)  * 10);
            const aftersaleSat = Math.round(result.aftersale_staff * rp('aftersale_saturation', 0.72) * 10);

            return (
              <RadarChart
                data={[
                  { label: '编制规模', presale: result.presale_staff, midsale: result.midsale_staff, aftersale: result.aftersale_staff },
                  { label: '处理效能', presale: presaleEff, midsale: midsaleEff, aftersale: aftersaleEff },
                  { label: '饱和负荷', presale: presaleSat, midsale: midsaleSat, aftersale: aftersaleSat },
                  { label: '高峰爆发', presale: presaleBurst, midsale: midsaleBurst, aftersale: aftersaleBurst },
                  { label: '日均话务', presale: Math.round(result.total_consult * (result.presale_staff / (result.needed_staff || 1)) / (result.days || 1)), midsale: Math.round(result.total_consult * (result.midsale_staff / (result.needed_staff || 1)) / (result.days || 1)), aftersale: Math.round(result.total_consult * (result.aftersale_staff / (result.needed_staff || 1)) / (result.days || 1)) }
                ]}
              />
            );
            })()
          ) : (
            <Empty description='暂无图表数据' />
          )}
        </div>
      </Modal>

      {/* 数据对比模态框 */}
      <Modal
        title={<><Text bold>📊 历史数据对比分析</Text></>}
        visible={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={null}
        style={{ width: '95vw', maxWidth: 1400 }}
      >
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {savedResults.length === 0 ? (
            <Empty description='暂无保存的测算结果' />
          ) : (
            <div>
              {/* 对比表格 */}
              <div className='overflow-x-auto'>
                <table className='w-full' style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>测算时间</th>
                      <th style={{ padding: '12px', border: '1px solid #e5e7eb' }}>总编制</th>
                      <th style={{ padding: '12px', border: '1px solid #e5e7eb' }}>售前</th>
                      <th style={{ padding: '12px', border: '1px solid #e5e7eb' }}>售中</th>
                      <th style={{ padding: '12px', border: '1px solid #e5e7eb' }}>售后</th>
                      <th style={{ padding: '12px', border: '1px solid #e5e7eb' }}>目标值</th>
                      <th style={{ padding: '12px', border: '1px solid #e5e7eb' }}>驱动方式</th>
                      <th style={{ padding: '12px', border: '1px solid #e5e7eb' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedResults.map((item, idx) => (
                      <tr key={item.id} style={{ background: idx === 0 ? '#f0f5ff' : 'white' }}>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                          {dayjs(item.timestamp).format('MM-DD HH:mm')}
                          {idx === 0 && <Tag color='blue' size='small' style={{ marginLeft: 8 }}>最新</Tag>}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: '#4a90e2' }}>
                          {item.result.needed_staff}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                          {item.result.presale_staff}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                          {item.result.midsale_staff}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                          {item.result.aftersale_staff}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                          {item.formData.targetValue}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                          {item.formData.driveMode === 'sales' ? '按销售额' : '按访客数'}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                          <Button
                            size='small'
                            status='danger'
                            onClick={() => {
                              const updated = savedResults.filter(r => r.id !== item.id);
                              setSavedResults(updated);
                              localStorage.setItem('savedResults', JSON.stringify(updated));
                              Message.success('已删除');
                            }}
                            style={{ borderRadius: 6 }}
                          >
                            删除
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 趋势对比图 */}
              {savedResults.length > 1 && (
                <Card title="编制趋势对比" style={{ marginTop: 24, borderRadius: 12 }}>
                  <div style={{ height: 300 }}>
                    <TimelineChart
                      data={savedResults.map((item, idx) => ({
                        date: `方案${savedResults.length - idx}`,
                        staff: item.result.needed_staff,
                        presale: item.result.presale_staff,
                        midsale: item.result.midsale_staff,
                        aftersale: item.result.aftersale_staff
                      }))}
                    />
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
