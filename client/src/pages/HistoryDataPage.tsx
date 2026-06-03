import { useState, useEffect } from 'react';
import {
  Typography, Card, Button, Table, Space, Message, Modal, Form, Input,
  Select, Upload, Tag, Empty, Statistic, Divider, Popconfirm
} from '@arco-design/web-react';
import {
  IconDownload, IconUpload, IconDelete, IconRefresh,
  IconPlus, IconEdit, IconHistory, IconFolderAdd
} from '@arco-design/web-react/icon';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

dayjs.extend(weekOfYear);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const { Title, Text } = Typography;

export const HistoryDataPage = () => {
  // 项目相关状态
  const [projects, setProjects] = useState<HistoryProject[]>([]);
  const [currentProject, setCurrentProject] = useState<HistoryProject | null>(null);
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<HistoryProject | null>(null);
  const [projectForm] = Form.useForm();

  // 数据相关状态
  const [data, setData] = useState<HistoryDataRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);

  // 图表相关状态
  const [chartVisible, setChartVisible] = useState(false);

  // 同比/环比分析相关状态
  const [yoyMomModalVisible, setYoyMomModalVisible] = useState(false);
  const [analysisType, setAnalysisType] = useState<'yoy' | 'mom'>('yoy');
  const [analysisPeriod, setAnalysisPeriod] = useState<'week' | 'month'>('month');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  // ==================== 项目管理 ====================

  const loadProjects = async () => {
    try {
      const result = await window.api.getHistoryProjects();
      setProjects(result);

      // 自动选择第一个项目
      if (result.length > 0 && !currentProject) {
        setCurrentProject(result[0]);
      }

      // 如果没有项目，提示用户创建
      if (result.length === 0) {
        Modal.confirm({
          title: '欢迎使用历史数据管理',
          content: '检测到您还没有创建项目，是否立即创建第一个项目？',
          okText: '创建项目',
          onOk: () => handleAddProject()
        });
      }
    } catch (err) {
      console.error('加载项目失败:', err);
      Message.error('加载项目失败');
    }
  };

  const handleAddProject = () => {
    setEditingProject(null);
    projectForm.resetFields();
    setProjectModalVisible(true);
  };

  const handleEditProject = (project: HistoryProject) => {
    setEditingProject(project);
    projectForm.setFieldsValue({
      name: project.project_name,
      description: project.description
    });
    setProjectModalVisible(true);
  };

  const handleProjectSubmit = async (values: any) => {
    try {
      if (editingProject) {
        // 更新项目
        await window.api.updateHistoryProject({
          id: editingProject.id,
          name: values.name,
          description: values.description || ''
        });
        Message.success('项目更新成功');
      } else {
        // 创建项目
        const result = await window.api.addHistoryProject({
          name: values.name,
          description: values.description || ''
        });
        Message.success('项目创建成功');

        // 重新加载项目列表
        await loadProjects();

        // 选中新创建的项目
        const newProjects = await window.api.getHistoryProjects();
        const newProject = newProjects.find((p: HistoryProject) => p.project_name === values.name);
        if (newProject) {
          setCurrentProject(newProject);
        }
      }

      setProjectModalVisible(false);
      loadProjects();
    } catch (err) {
      console.error('保存项目失败:', err);
      Message.error('保存项目失败');
    }
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目"${projectName}"吗？该项目下的所有历史数据也将被删除，此操作不可撤销！`,
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          await window.api.deleteHistoryProject(projectId);
          Message.success('项目删除成功');

          // 如果删除的是当前项目，切换到其他项目
          if (currentProject?.id === projectId) {
            const remainingProjects = projects.filter(p => p.id !== projectId);
            setCurrentProject(remainingProjects[0] || null);
          }

          loadProjects();
        } catch (err) {
          console.error('删除项目失败:', err);
          Message.error('删除项目失败');
        }
      }
    });
  };

  const handleProjectChange = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      setSelectedRowKeys([]);
    }
  };

  // ==================== 数据管理 ====================

  const loadData = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const result = await window.api.getHistoryData(currentProject.id, 1000);
      setData(result);
    } catch (err) {
      console.error('加载数据失败:', err);
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        '日期(YYYY-MM-DD)': '2026-01-01',
        '销售额(万)': 1000,
        '实际在岗人数': 40,
        '咨询量': 6500,
        '转化率(0-1)': 0.15,
        '备注': '示例数据'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '历史数据模板');
    XLSX.writeFile(wb, '历史数据导入模板.xlsx');
    Message.success('模板下载成功');
  };

  const handleImport = (file: File) => {
    if (!currentProject) {
      Message.warning('请先选择项目');
      return false;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileData = e.target?.result;
        const workbook = XLSX.read(fileData, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const records = jsonData.map((row: any) => {
          // 处理转化率：如果是百分比字符串，转换为小数
          let conversionRate = 0;
          const rateValue = row['转化率(0-1)'] || row['转化率'];
          if (typeof rateValue === 'string' && rateValue.includes('%')) {
            conversionRate = parseFloat(rateValue.replace('%', '')) / 100;
          } else {
            conversionRate = parseFloat(rateValue) || 0;
          }

          return {
            date: row['日期(YYYY-MM-DD)'] || row['日期'],
            sales: parseFloat(row['销售额(万)']) || 0,
            staff: parseInt(row['实际在岗人数']) || 0,
            consults: parseFloat(row['咨询量']) || 0,
            conversionRate: conversionRate,
            remark: row['备注'] || ''
          };
        }).filter(r => r.date); // 过滤掉没有日期的空行

        if (records.length === 0) {
          Message.warning('未读取到有效数据，请检查模板格式');
          return;
        }

        setLoading(true);
        await window.api.batchHistoryData(currentProject.id, records);
        Message.success(`成功导入 ${records.length} 条数据到 "${currentProject.project_name}"`);
        loadData();
      } catch (err) {
        console.error('导入失败:', err);
        Message.error('导入失败，请检查文件格式');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    return false; // 阻止自动上传
  };

  const handleExport = () => {
    if (!data || data.length === 0) {
      Message.warning('没有可导出的数据');
      return;
    }

    const exportData = data.map(row => ({
      '项目': currentProject?.project_name || '',
      '日期': row.data_date,
      '销售额(万)': row.sales_volume,
      '实际人数': row.actual_staff,
      '咨询量': row.actual_consult,
      '转化率': (row.conversion_rate * 100).toFixed(2) + '%',
      '备注': row.remark || '',
      '记录时间': row.create_time
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '历史数据');
    XLSX.writeFile(wb, `${currentProject?.project_name}_历史数据_${dayjs().format('YYYYMMDD')}.xlsx`);
    Message.success('导出成功');
  };

  const handleDelete = async () => {
    if (selectedRowKeys.length === 0) {
      Message.warning('请先选择要删除的数据');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条数据吗？`,
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          setLoading(true);
          await window.api.deleteHistoryData(selectedRowKeys as number[]);
          Message.success('删除成功');
          setSelectedRowKeys([]);
          loadData();
        } catch (err) {
          console.error('删除失败:', err);
          Message.error('删除失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // ==================== 趋势图 ====================

  const showChart = () => {
    if (!data || data.length === 0) {
      Message.warning('暂无数据可展示');
      return;
    }
    setChartVisible(true);
  };

  const getChartData = () => {
    if (!data || data.length === 0) return null;

    // 按日期排序
    const sortedData = [...data].sort((a, b) =>
      new Date(a.data_date).getTime() - new Date(b.data_date).getTime()
    );

    const labels = sortedData.map(d => d.data_date);
    const salesData = sortedData.map(d => d.sales_volume);
    const staffData = sortedData.map(d => d.actual_staff);
    const consultsData = sortedData.map(d => d.actual_consult);

    return {
      labels,
      datasets: [
        {
          label: '销售额(万)',
          data: salesData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true
        },
        {
          label: '在岗人数',
          data: staffData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          yAxisID: 'y1',
          tension: 0.4,
          fill: true
        },
        {
          label: '咨询量',
          data: consultsData,
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.1)',
          yAxisID: 'y2',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  const chartOptions = {
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
        text: `${currentProject?.project_name || ''} - 业务趋势分析`
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
        display: false,
      }
    },
  };

  // ==================== 表格列定义 ====================

  const columns = [
    {
      title: '日期',
      dataIndex: 'data_date',
      width: 120,
      sorter: (a: HistoryDataRecord, b: HistoryDataRecord) =>
        new Date(a.data_date).getTime() - new Date(b.data_date).getTime()
    },
    {
      title: '销售额(万)',
      dataIndex: 'sales_volume',
      width: 120,
      render: (value: number) => value?.toFixed(1) || '-',
      sorter: (a: HistoryDataRecord, b: HistoryDataRecord) =>
        (a.sales_volume || 0) - (b.sales_volume || 0)
    },
    {
      title: '在岗人数',
      dataIndex: 'actual_staff',
      width: 100,
      sorter: (a: HistoryDataRecord, b: HistoryDataRecord) =>
        (a.actual_staff || 0) - (b.actual_staff || 0)
    },
    {
      title: '咨询量',
      dataIndex: 'actual_consult',
      width: 100,
      render: (value: number) => value?.toFixed(0) || '-',
      sorter: (a: HistoryDataRecord, b: HistoryDataRecord) =>
        (a.actual_consult || 0) - (b.actual_consult || 0)
    },
    {
      title: '转化率',
      dataIndex: 'conversion_rate',
      width: 100,
      render: (value: number) => value ? `${(value * 100).toFixed(2)}%` : '-',
      sorter: (a: HistoryDataRecord, b: HistoryDataRecord) =>
        (a.conversion_rate || 0) - (b.conversion_rate || 0)
    },
    {
      title: '人均销售额',
      width: 120,
      render: (_: any, record: HistoryDataRecord) => {
        if (!record.sales_volume || !record.actual_staff) return '-';
        return (record.sales_volume / record.actual_staff).toFixed(2) + '万';
      }
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true
    },
    {
      title: '记录时间',
      dataIndex: 'create_time',
      width: 160,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm')
    }
  ];

  // ==================== 统计数据 ====================

  const statistics = {
    totalRecords: data.length,
    avgSales: data.length > 0 ? (data.reduce((sum, d) => sum + (d.sales_volume || 0), 0) / data.length).toFixed(1) : '0',
    avgStaff: data.length > 0 ? Math.round(data.reduce((sum, d) => sum + (d.actual_staff || 0), 0) / data.length) : 0,
    avgEfficiency: data.length > 0 && data.filter(d => d.actual_staff > 0).length > 0
      ? (data.reduce((sum, d) => sum + (d.sales_volume || 0) / (d.actual_staff || 1), 0) / data.filter(d => d.actual_staff > 0).length).toFixed(2)
      : '0'
  };

  // ==================== 同比/环比分析核心算法 ====================

  // 类型定义
  interface PeriodData {
    period: string;
    year: number;
    periodNum: number; // 月份(1-12)或周数(1-53)
    avgSales: number;
    avgStaff: number;
    avgEfficiency: number;
    recordCount: number;
  }

  interface GrowthComparison {
    period: string;
    currentSales: number;
    currentStaff: number;
    currentEfficiency: number;
    previousSales: number;
    previousStaff: number;
    previousEfficiency: number;
    salesGrowth: number;
    staffGrowth: number;
    efficiencyGrowth: number;
  }

  // 数据分组和聚合
  const groupDataByPeriod = (records: HistoryDataRecord[], period: 'week' | 'month'): Map<string, HistoryDataRecord[]> => {
    const map = new Map<string, HistoryDataRecord[]>();

    records.forEach(record => {
      const date = dayjs(record.data_date);
      const key = period === 'month'
        ? date.format('YYYY-MM')
        : date.format('YYYY-[W]WW');

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(record);
    });

    return map;
  };

  // 计算周期平均值
  const calculatePeriodAverages = (periodMap: Map<string, HistoryDataRecord[]>, period: 'week' | 'month'): PeriodData[] => {
    const periods: PeriodData[] = [];

    periodMap.forEach((records, key) => {
      const validRecords = records.filter(r => r.actual_staff > 0);
      if (validRecords.length === 0) return;

      const avgSales = records.reduce((sum, r) => sum + (r.sales_volume || 0), 0) / records.length;
      const avgStaff = records.reduce((sum, r) => sum + (r.actual_staff || 0), 0) / records.length;
      const avgEfficiency = validRecords.reduce((sum, r) =>
        sum + (r.sales_volume || 0) / (r.actual_staff || 1), 0
      ) / validRecords.length;

      // 解析周期信息
      let year: number;
      let periodNum: number;

      if (period === 'month') {
        const [yearStr, monthStr] = key.split('-');
        year = parseInt(yearStr);
        periodNum = parseInt(monthStr);
      } else {
        // 格式: 2026-W10
        const match = key.match(/(\d{4})-W(\d{2})/);
        if (match) {
          year = parseInt(match[1]);
          periodNum = parseInt(match[2]);
        } else {
          return;
        }
      }

      periods.push({
        period: key,
        year,
        periodNum,
        avgSales,
        avgStaff,
        avgEfficiency,
        recordCount: records.length
      });
    });

    return periods.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.periodNum - b.periodNum;
    });
  };

  // 同比计算 (Year-over-Year)
  const calculateYoY = (): GrowthComparison[] => {
    if (data.length < 14) return [];

    const periodMap = groupDataByPeriod(data, analysisPeriod);
    const periods = calculatePeriodAverages(periodMap, analysisPeriod);

    const comparisons: GrowthComparison[] = [];

    periods.forEach(current => {
      // 查找去年同期数据
      const lastYear = periods.find(p =>
        p.year === current.year - 1 &&
        p.periodNum === current.periodNum
      );

      if (lastYear) {
        comparisons.push({
          period: current.period,
          currentSales: current.avgSales,
          currentStaff: current.avgStaff,
          currentEfficiency: current.avgEfficiency,
          previousSales: lastYear.avgSales,
          previousStaff: lastYear.avgStaff,
          previousEfficiency: lastYear.avgEfficiency,
          salesGrowth: lastYear.avgSales > 0
            ? ((current.avgSales - lastYear.avgSales) / lastYear.avgSales * 100)
            : 0,
          staffGrowth: lastYear.avgStaff > 0
            ? ((current.avgStaff - lastYear.avgStaff) / lastYear.avgStaff * 100)
            : 0,
          efficiencyGrowth: lastYear.avgEfficiency > 0
            ? ((current.avgEfficiency - lastYear.avgEfficiency) / lastYear.avgEfficiency * 100)
            : 0
        });
      }
    });

    return comparisons;
  };

  // 环比计算 (Month-over-Month / Week-over-Week)
  const calculateMoM = (): GrowthComparison[] => {
    if (data.length < 7) return [];

    const periodMap = groupDataByPeriod(data, analysisPeriod);
    const periods = calculatePeriodAverages(periodMap, analysisPeriod);

    if (periods.length < 2) return [];

    const comparisons: GrowthComparison[] = [];

    for (let i = 1; i < periods.length; i++) {
      const current = periods[i];
      const previous = periods[i - 1];

      comparisons.push({
        period: current.period,
        currentSales: current.avgSales,
        currentStaff: current.avgStaff,
        currentEfficiency: current.avgEfficiency,
        previousSales: previous.avgSales,
        previousStaff: previous.avgStaff,
        previousEfficiency: previous.avgEfficiency,
        salesGrowth: previous.avgSales > 0
          ? ((current.avgSales - previous.avgSales) / previous.avgSales * 100)
          : 0,
        staffGrowth: previous.avgStaff > 0
          ? ((current.avgStaff - previous.avgStaff) / previous.avgStaff * 100)
          : 0,
        efficiencyGrowth: previous.avgEfficiency > 0
          ? ((current.avgEfficiency - previous.avgEfficiency) / previous.avgEfficiency * 100)
          : 0
      });
    }

    return comparisons;
  };

  // 获取分析数据
  const getAnalysisData = (): GrowthComparison[] => {
    return analysisType === 'yoy' ? calculateYoY() : calculateMoM();
  };

  // 显示同比/环比分析
  const showYoyMomAnalysis = () => {
    if (!currentProject || data.length < 14) {
      Message.warning('数据不足，至少需要14天的数据才能进行分析');
      return;
    }
    setYoyMomModalVisible(true);
  };

  // 获取同比/环比图表数据
  const getYoyMomChartData = () => {
    const analysisData = getAnalysisData();
    if (analysisData.length === 0) return null;

    return {
      labels: analysisData.map(d => d.period),
      datasets: [
        {
          label: '销售额增长率(%)',
          data: analysisData.map(d => d.salesGrowth),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: '人数增长率(%)',
          data: analysisData.map(d => d.staffGrowth),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: '效率增长率(%)',
          data: analysisData.map(d => d.efficiencyGrowth),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.4,
          fill: false
        }
      ]
    };
  };

  const yoyMomChartOptions = {
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
        text: analysisType === 'yoy' ? '同比增长率分析' : '环比增长率分析'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += context.parsed.y.toFixed(2) + '%';
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: '增长率(%)'
        },
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      },
      x: {
        title: {
          display: true,
          text: analysisPeriod === 'month' ? '月份' : '周'
        }
      }
    },
  };

  // 格式化增长率显示
  const formatGrowth = (value: number) => {
    const formatted = value.toFixed(2) + '%';
    const icon = value > 0 ? '↑' : value < 0 ? '↓' : '→';
    const color = value > 0 ? '#00b42a' : value < 0 ? '#f53f3f' : '#86909c';
    return (
      <Text style={{ color, fontWeight: 500 }}>
        {icon} {formatted}
      </Text>
    );
  };

  // ==================== 渲染 ====================

  return (
    <div className='h-full flex flex-col' style={{ background: '#f8f9fa' }}>
      {/* 顶部标题栏 */}
      <div className='bg-white' style={{ borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className='max-w-7xl mx-auto px-8 py-6'>
          <div className='flex justify-between items-center'>
            <div>
              <Title heading={3} style={{ margin: 0, marginBottom: 4, color: '#1f2937' }}>
                🗂️ 历史数据管理
              </Title>
              <Text type='secondary' style={{ color: '#6b7280' }}>
                多项目/多店铺的历史业务数据管理与趋势分析
              </Text>
            </div>
            <Space>
              <Button icon={<IconRefresh />} onClick={loadData} size='large'>
                刷新
              </Button>
              <Button
                type='primary'
                icon={<IconFolderAdd />}
                onClick={handleAddProject}
                size='large'
              >
                新建项目
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className='flex-1 overflow-y-auto p-6'>
        <div className='max-w-7xl mx-auto'>
          {/* 项目选择和工具栏 */}
          <Card
            bordered={false}
            style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-4 flex-1'>
                <Text style={{ fontSize: 14, fontWeight: 500 }}>当前项目:</Text>
                <Select
                  placeholder="选择项目"
                  value={currentProject?.id}
                  onChange={handleProjectChange}
                  style={{ width: 300 }}
                  size='large'
                >
                  {projects.map(p => (
                    <Select.Option key={p.id} value={p.id}>
                      <Space>
                        {p.project_name}
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          ({data.filter(d => d.project_id === p.id).length}条数据)
                        </Text>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>

                {currentProject && (
                  <Space>
                    <Button
                      icon={<IconEdit />}
                      onClick={() => handleEditProject(currentProject)}
                      size='small'
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title='确定删除此项目吗？'
                      onOk={() => handleDeleteProject(currentProject.id, currentProject.project_name)}
                    >
                      <Button
                        icon={<IconDelete />}
                        status='danger'
                        size='small'
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* 统计信息 */}
            {currentProject && (
              <div className='grid grid-cols-4 gap-4 mb-4'>
                <Statistic
                  title="总记录数"
                  value={statistics.totalRecords}
                  suffix="条"
                  styleValue={{ color: '#3f8600' }}
                />
                <Statistic
                  title="平均销售额"
                  value={statistics.avgSales}
                  suffix="万"
                  styleValue={{ color: '#165DFF' }}
                />
                <Statistic
                  title="平均人数"
                  value={statistics.avgStaff}
                  suffix="人"
                  styleValue={{ color: '#FF7D00' }}
                />
                <Statistic
                  title="人均效率"
                  value={statistics.avgEfficiency}
                  suffix="万/人"
                  styleValue={{ color: '#722ED1' }}
                />
              </div>
            )}

            <Divider style={{ margin: '16px 0' }} />

            {/* 操作按钮 */}
            <Space>
              <Button
                type='primary'
                icon={<IconHistory />}
                onClick={showChart}
                disabled={!currentProject || data.length === 0}
              >
                趋势图
              </Button>
              <Button
                type='primary'
                status='success'
                onClick={showYoyMomAnalysis}
                disabled={!currentProject || data.length < 14}
              >
                📈 同比/环比
              </Button>
              <Button
                icon={<IconDownload />}
                onClick={downloadTemplate}
              >
                下载模板
              </Button>
              <Upload
                accept='.xlsx,.xls'
                beforeUpload={handleImport}
                showUploadList={false}
              >
                <Button
                  type='primary'
                  status='success'
                  icon={<IconUpload />}
                  disabled={!currentProject}
                >
                  导入Excel
                </Button>
              </Upload>
              <Button
                icon={<IconDownload />}
                onClick={handleExport}
                disabled={!currentProject || data.length === 0}
              >
                导出Excel
              </Button>
              <Button
                status='danger'
                icon={<IconDelete />}
                onClick={handleDelete}
                disabled={selectedRowKeys.length === 0}
              >
                删除选中 ({selectedRowKeys.length})
              </Button>
            </Space>
          </Card>

          {/* 数据表格 */}
          {currentProject ? (
            <Card
              bordered={false}
              style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <Table
                columns={columns}
                data={data}
                loading={loading}
                rowKey='id'
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys
                }}
                pagination={{
                  pageSize: 20,
                  showTotal: (total) => `共 ${total} 条数据`,
                  showJumper: true,
                  sizeCanChange: true
                }}
                stripe
                hover
              />
            </Card>
          ) : (
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                textAlign: 'center',
                padding: '60px 20px'
              }}
            >
              <Empty
                description={
                  projects.length === 0
                    ? '暂无项目，请先创建项目'
                    : '请选择一个项目查看数据'
                }
              />
              {projects.length === 0 && (
                <Button
                  type='primary'
                  icon={<IconPlus />}
                  onClick={handleAddProject}
                  size='large'
                  style={{ marginTop: 20 }}
                >
                  创建第一个项目
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* 项目管理模态框 */}
      <Modal
        title={
          <Space>
            <IconFolderAdd />
            <Text bold>{editingProject ? '编辑项目' : '创建新项目'}</Text>
          </Space>
        }
        visible={projectModalVisible}
        onCancel={() => {
          setProjectModalVisible(false);
          setEditingProject(null);
        }}
        footer={null}
        style={{ width: 600 }}
      >
        <Form
          form={projectForm}
          layout='vertical'
          onSubmit={handleProjectSubmit}
          autoComplete='off'
        >
          <Form.Item
            label="项目名称"
            field="name"
            rules={[
              { required: true, message: '请输入项目名称' },
              { minLength: 2, message: '项目名称至少2个字符' }
            ]}
          >
            <Input
              placeholder="例如: 天猫旗舰店、京东自营店、抖音小店"
              size='large'
              prefix="📁"
            />
          </Form.Item>

          <Form.Item label="项目描述" field="description">
            <Input.TextArea
              placeholder="描述项目的详细信息、业务特点等（可选）"
              rows={4}
              showWordLimit
              maxLength={200}
            />
          </Form.Item>

          <div
            className='p-4 rounded-lg mb-4'
            style={{ background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)' }}
          >
            <Text style={{ fontSize: 13, color: '#00695c', lineHeight: 1.8 }}>
              <strong>💡 使用提示：</strong><br />
              • 为每个店铺或业务线创建独立项目<br />
              • 项目可以管理该店铺的所有历史业务数据<br />
              • 支持导入 Excel、查看趋势图、数据分析等功能
            </Text>
          </div>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setProjectModalVisible(false);
                  setEditingProject(null);
                }}
                size='large'
              >
                取消
              </Button>
              <Button
                type='primary'
                htmlType='submit'
                size='large'
                style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                {editingProject ? '更新项目' : '创建项目'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 趋势图模态框 */}
      <Modal
        title={<><IconHistory /> 业务趋势分析</>}
        visible={chartVisible}
        onCancel={() => setChartVisible(false)}
        footer={null}
        style={{ width: 1200 }}
      >
        <div style={{ height: 500 }}>
          {getChartData() && (
            <Line data={getChartData()!} options={chartOptions} />
          )}
        </div>

        <div
          className='mt-4 p-4 rounded-lg'
          style={{ background: '#f5f5f5' }}
        >
          <Text style={{ fontSize: 13 }}>
            <strong>📊 图表说明：</strong> 三条曲线分别代表销售额、在岗人数和咨询量的变化趋势。
            通过观察曲线走势，可以分析业务高峰期、人力配置效率等关键指标。
          </Text>
        </div>
      </Modal>

      {/* 同比/环比分析模态框 */}
      <Modal
        title={<><span style={{ fontSize: 20 }}>📈</span> 同比/环比数据分析</>}
        visible={yoyMomModalVisible}
        onCancel={() => setYoyMomModalVisible(false)}
        footer={null}
        style={{ width: 1400 }}
      >
        <div className='space-y-4'>
          {/* 分析类型和周期选择 */}
          <Card bordered={false} style={{ background: '#f7f8fa' }}>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <Text bold style={{ display: 'block', marginBottom: 8 }}>分析类型</Text>
                <Space>
                  <Button
                    type={analysisType === 'yoy' ? 'primary' : 'default'}
                    onClick={() => setAnalysisType('yoy')}
                    size='large'
                  >
                    ⚪ 同比 (YoY)
                  </Button>
                  <Button
                    type={analysisType === 'mom' ? 'primary' : 'default'}
                    onClick={() => setAnalysisType('mom')}
                    size='large'
                  >
                    ⚪ 环比 (MoM)
                  </Button>
                </Space>
              </div>
              <div>
                <Text bold style={{ display: 'block', marginBottom: 8 }}>统计周期</Text>
                <Space>
                  <Button
                    type={analysisPeriod === 'month' ? 'primary' : 'default'}
                    onClick={() => setAnalysisPeriod('month')}
                    size='large'
                  >
                    ⚪ 按月
                  </Button>
                  <Button
                    type={analysisPeriod === 'week' ? 'primary' : 'default'}
                    onClick={() => setAnalysisPeriod('week')}
                    size='large'
                  >
                    ⚪ 按周
                  </Button>
                </Space>
              </div>
            </div>
          </Card>

          {/* 说明卡片 */}
          <Card
            bordered={false}
            style={{
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              border: '1px solid #90caf9'
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 1.8, color: '#01579b' }}>
              <strong>💡 说明：</strong>
              {analysisType === 'yoy' ? (
                <>
                  <strong>同比</strong>是指与去年同期相比，例如2026年1月与2025年1月对比。
                  同比分析能够消除季节性因素影响，反映真实的年度增长趋势，适合评估长期业务发展。
                </>
              ) : (
                <>
                  <strong>环比</strong>是指与上一个周期相比，例如2月与1月对比，或第10周与第9周对比。
                  环比分析能够快速响应短期变化，适合监控业务波动和及时调整运营策略。
                </>
              )}
            </Text>
          </Card>

          {/* 增长率趋势图 */}
          <Card bordered={false} title="增长率趋势图">
            <div style={{ height: 400 }}>
              {getYoyMomChartData() ? (
                <Line data={getYoyMomChartData()!} options={yoyMomChartOptions} />
              ) : (
                <Empty description="暂无数据可分析" />
              )}
            </div>
          </Card>

          {/* 增长率数据明细表格 */}
          <Card bordered={false} title="增长率数据明细">
            {(() => {
              const analysisData = getAnalysisData();
              if (analysisData.length === 0) {
                return <Empty description="暂无数据可分析" />;
              }

              const columns = [
                {
                  title: '周期',
                  dataIndex: 'period',
                  width: 120,
                  render: (value: string) => (
                    <Text bold style={{ fontSize: 14 }}>{value}</Text>
                  )
                },
                {
                  title: '销售额增长率',
                  dataIndex: 'salesGrowth',
                  width: 140,
                  render: (value: number) => formatGrowth(value),
                  sorter: (a: GrowthComparison, b: GrowthComparison) => a.salesGrowth - b.salesGrowth
                },
                {
                  title: '人数增长率',
                  dataIndex: 'staffGrowth',
                  width: 140,
                  render: (value: number) => formatGrowth(value),
                  sorter: (a: GrowthComparison, b: GrowthComparison) => a.staffGrowth - b.staffGrowth
                },
                {
                  title: '效率增长率',
                  dataIndex: 'efficiencyGrowth',
                  width: 140,
                  render: (value: number) => formatGrowth(value),
                  sorter: (a: GrowthComparison, b: GrowthComparison) => a.efficiencyGrowth - b.efficiencyGrowth
                },
                {
                  title: '当前销售额',
                  dataIndex: 'currentSales',
                  width: 120,
                  render: (value: number) => (
                    <Text>{value.toFixed(1)}万</Text>
                  )
                },
                {
                  title: '当前人数',
                  dataIndex: 'currentStaff',
                  width: 100,
                  render: (value: number) => (
                    <Text>{value.toFixed(1)}人</Text>
                  )
                },
                {
                  title: '当前效率',
                  dataIndex: 'currentEfficiency',
                  width: 120,
                  render: (value: number) => (
                    <Text>{value.toFixed(2)}万/人</Text>
                  )
                },
                {
                  title: analysisType === 'yoy' ? '去年同期销售额' : '上期销售额',
                  dataIndex: 'previousSales',
                  width: 140,
                  render: (value: number) => (
                    <Text type='secondary'>{value.toFixed(1)}万</Text>
                  )
                },
                {
                  title: analysisType === 'yoy' ? '去年同期人数' : '上期人数',
                  dataIndex: 'previousStaff',
                  width: 130,
                  render: (value: number) => (
                    <Text type='secondary'>{value.toFixed(1)}人</Text>
                  )
                },
                {
                  title: analysisType === 'yoy' ? '去年同期效率' : '上期效率',
                  dataIndex: 'previousEfficiency',
                  width: 140,
                  render: (value: number) => (
                    <Text type='secondary'>{value.toFixed(2)}万/人</Text>
                  )
                }
              ];

              return (
                <Table
                  columns={columns}
                  data={analysisData}
                  pagination={false}
                  scroll={{ x: 1300 }}
                  stripe
                />
              );
            })()}
          </Card>

          {/* 数据洞察 */}
          <Card
            bordered={false}
            style={{
              background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
              border: '1px solid #ce93d8'
            }}
          >
            <Text bold style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#4a148c' }}>
              📊 数据洞察
            </Text>
            <div style={{ fontSize: 13, lineHeight: 2, color: '#6a1b9a' }}>
              {(() => {
                const analysisData = getAnalysisData();
                if (analysisData.length === 0) return <Text>暂无数据</Text>;

                const avgSalesGrowth = analysisData.reduce((sum, d) => sum + d.salesGrowth, 0) / analysisData.length;
                const avgStaffGrowth = analysisData.reduce((sum, d) => sum + d.staffGrowth, 0) / analysisData.length;
                const avgEfficiencyGrowth = analysisData.reduce((sum, d) => sum + d.efficiencyGrowth, 0) / analysisData.length;

                const insights = [];

                // 销售额趋势
                if (avgSalesGrowth > 10) {
                  insights.push('• 销售额保持强劲增长，业务发展良好 ✨');
                } else if (avgSalesGrowth > 0) {
                  insights.push('• 销售额平稳增长，整体趋势健康 ✓');
                } else {
                  insights.push('• 销售额出现下滑，需要关注业务情况 ⚠️');
                }

                // 效率分析
                if (avgEfficiencyGrowth > 5) {
                  insights.push('• 人效持续提升，运营效率优秀 🎯');
                } else if (avgEfficiencyGrowth > 0) {
                  insights.push('• 人效稳步提升，运营管理良好 ✓');
                } else if (avgEfficiencyGrowth > -5) {
                  insights.push('• 人效略有下降，建议优化人员配置 ⚠️');
                } else {
                  insights.push('• 人效明显下降，需要立即调查原因并改进 ❗');
                }

                // 人数与销售额匹配度
                if (avgSalesGrowth > avgStaffGrowth + 5) {
                  insights.push('• 效率驱动型增长，人力投入产出比高 ⭐');
                } else if (avgStaffGrowth > avgSalesGrowth + 5) {
                  insights.push('• 人力增长快于销售增长，存在人员冗余风险 ⚠️');
                }

                // 增长稳定性
                const salesGrowthStd = Math.sqrt(
                  analysisData.reduce((sum, d) => sum + Math.pow(d.salesGrowth - avgSalesGrowth, 2), 0) / analysisData.length
                );
                if (salesGrowthStd < 5) {
                  insights.push('• 增长率波动较小，业务稳定性好 ✓');
                } else if (salesGrowthStd > 15) {
                  insights.push('• 增长率波动较大，建议分析波动原因 ℹ️');
                }

                return insights.map((insight, index) => (
                  <div key={index}>{insight}</div>
                ));
              })()}
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
};
