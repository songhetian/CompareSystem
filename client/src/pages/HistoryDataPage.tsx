import { useState, useEffect } from 'react';
import {
  Typography, Card, Button, Table, Space, Message, Modal, Form, Input,
  Select, Upload, Tag, Empty, Popconfirm
} from '@arco-design/web-react';
import {
  IconDownload, IconUpload, IconDelete, IconRefresh,
  IconPlus, IconEdit, IconHistory, IconFolderAdd,
  IconFile, IconDashboard, IconUserGroup, IconThunderbolt, IconFolder, IconBulb
} from '@arco-design/web-react/icon';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { PageHeader, StatsCard } from '../components/common';
import { TrendChart } from './historyData/TrendChart';

dayjs.extend(weekOfYear);
dayjs.locale('zh-cn');

const { Text } = Typography;

export const HistoryDataPage = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProject, setCurrentProject] = useState<any | null>(null);
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [projectForm] = Form.useForm();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [chartVisible, setChartVisible] = useState(false);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (currentProject) loadData(); }, [currentProject]);

  const loadProjects = async () => {
    try {
      const result = await window.api.getHistoryProjects();
      setProjects(result);
      if (result.length > 0 && !currentProject) setCurrentProject(result[0]);
    } catch (err) { Message.error('加载项目失败'); }
  };

  const handleAddProject = () => { setEditingProject(null); projectForm.resetFields(); setProjectModalVisible(true); };
  const handleEditProject = (project: any) => { setEditingProject(project); projectForm.setFieldsValue({ name: project.project_name, description: project.description }); setProjectModalVisible(true); };

  const handleProjectSubmit = async (values: any) => {
    try {
      if (editingProject) {
        await window.api.updateHistoryProject({ id: editingProject.id, name: values.name, description: values.description || '' });
        Message.success('项目更新成功');
      } else {
        await window.api.addHistoryProject({ name: values.name, description: values.description || '' });
        Message.success('项目创建成功');
      }
      setProjectModalVisible(false);
      loadProjects();
    } catch (err) { Message.error('保存项目失败'); }
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目"${projectName}"吗？该项目下的所有历史数据也将被删除。`,
      onOk: async () => {
        try {
          await window.api.deleteHistoryProject(projectId);
          Message.success('项目删除成功');
          if (currentProject?.id === projectId) setCurrentProject(null);
          loadProjects();
        } catch (err) { Message.error('删除项目失败'); }
      }
    });
  };

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const result = await window.api.getHistoryData(currentProject.id, 1000);
      setData(result);
    } catch (err) { Message.error('加载数据失败'); } finally { setLoading(false); }
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
        const records = jsonData.map((row: any) => ({
          date: row['日期'] || row['日期(YYYY-MM-DD)'],
          sales: parseFloat(row['销售额(万)']) || 0,
          staff: parseInt(row['实际在岗人数']) || 0,
          consults: parseFloat(row['咨询量']) || 0,
          conversionRate: parseFloat(row['转化率']) || 0,
          remark: row['备注'] || ''
        })).filter(r => r.date);
        await window.api.batchHistoryData(currentProject.id, records);
        Message.success(`成功导入 ${records.length} 条数据`);
        loadData();
      } catch (err) { Message.error('导入失败'); }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '历史数据');
    XLSX.writeFile(wb, `${currentProject?.project_name}_导出.xlsx`);
  };

  const columns = [
    { title: '日期', dataIndex: 'data_date', width: 120 },
    { title: '销售额(万)', dataIndex: 'sales_volume', width: 120, render: (v: number) => v?.toFixed(1) },
    { title: '在岗人数', dataIndex: 'actual_staff', width: 100 },
    { title: '咨询量', dataIndex: 'actual_consult', width: 100 },
    { title: '备注', dataIndex: 'remark', ellipsis: true }
  ];

  return (
    <div className='page-container' style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <PageHeader title='业务历史看板' subtitle='多维度历史业务指标管理' icon={<IconHistory />} extra={<Space><Button icon={<IconRefresh />} onClick={loadData} size="small">刷新</Button><Button type='primary' icon={<IconFolderAdd />} onClick={handleAddProject} size="small">新建项目</Button></Space>} />
      
      <div className='page-content'>
        <Card bordered={false} style={{ marginBottom: 16 }}>
          <Space>
            <Text bold>当前项目:</Text>
            <Select value={currentProject?.id} onChange={(v) => setCurrentProject(projects.find(p => p.id === v))} style={{ width: 260 }} size="small">
              {projects.map(p => <Select.Option key={p.id} value={p.id}>{p.project_name}</Select.Option>)}
            </Select>
            {currentProject && <Space><Button icon={<IconEdit />} onClick={() => handleEditProject(currentProject)} size="small" /><Button status="danger" icon={<IconDelete />} onClick={() => handleDeleteProject(currentProject.id, currentProject.project_name)} size="small" /></Space>}
          </Space>
        </Card>

        {currentProject && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
            <StatsCard title="总记录数" value={data.length} suffix="条" icon={<IconFile />} />
            <StatsCard title="平均销售额" value={(data.reduce((sum, d) => sum + (d.sales_volume || 0), 0) / (data.length || 1)).toFixed(1)} suffix="万" icon={<IconDashboard />} />
            <StatsCard title="平均人数" value={Math.round(data.reduce((sum, d) => sum + (d.actual_staff || 0), 0) / (data.length || 1))} suffix="人" icon={<IconUserGroup />} />
            <StatsCard title="人均效率" value={(data.reduce((sum, d) => sum + (d.sales_volume || 0) / (d.actual_staff || 1), 0) / (data.filter(d => d.actual_staff > 0).length || 1)).toFixed(2)} suffix="万/人" icon={<IconThunderbolt />} />
          </div>
        )}

        <Card bordered={false}>
          <Space style={{ marginBottom: 16 }}>
            <Button type='primary' icon={<IconHistory />} onClick={() => setChartVisible(true)} disabled={selectedRowKeys.length === 0} size="small">分析趋势</Button>
            <Upload accept='.xlsx,.xls' beforeUpload={handleImport} showUploadList={false}><Button icon={<IconUpload />} size="small">导入数据</Button></Upload>
            <Button icon={<IconDownload />} onClick={handleExport} size="small">导出数据</Button>
          </Space>
          <Table columns={columns} data={data} loading={loading} rowKey='id' rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} pagination={{ size: 'small', pageSize: 15 }} size="small" />
        </Card>
      </div>

      <Modal title={<Space><IconFolderAdd /> {editingProject ? '编辑项目' : '创建项目'}</Space>} visible={projectModalVisible} onCancel={() => setProjectModalVisible(false)} footer={null} style={{ width: 480 }}>
        <Form form={projectForm} layout='vertical' onSubmit={handleProjectSubmit} size="small">
          <Form.Item label="项目名称" field="name" rules={[{ required: true }]}><Input prefix={<IconFolder />} /></Form.Item>
          <Form.Item label="描述" field="description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" long>保存</Button></Form.Item>
        </Form>
      </Modal>

      <TrendChart visible={chartVisible} onCancel={() => setChartVisible(false)} data={data.filter(d => selectedRowKeys.includes(d.id))} projectName={currentProject?.project_name || ''} />
    </div>
  );
};
