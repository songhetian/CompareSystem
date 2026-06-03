import { useState, useEffect } from 'react';
import {
  Typography, Card, Button, Table, Space, Message, Modal, Form, Input,
  Select, Upload, Tag, Empty, Statistic, Divider, Popconfirm
} from '@arco-design/web-react';
import {
  IconDownload, IconUpload, IconDelete, IconRefresh,
  IconPlus, IconEdit, IconBarChart, IconFolderAdd
} from '@arco-design/web-react/icon';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
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
                icon={<IconBarChart />}
                onClick={showChart}
                disabled={!currentProject || data.length === 0}
              >
                趋势图
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
        title={<><IconBarChart /> 业务趋势分析</>}
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
    </div>
  );
};
