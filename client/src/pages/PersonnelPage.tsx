/**
 * 人员管理页面
 */
import { useState, useEffect } from 'react';
import {
  Table, Card, Space, Button, Input, Modal, Form, Message, Popconfirm, Select, Tag, Typography
} from '@arco-design/web-react';
import { IconPlus, IconEdit, IconDelete, IconRefresh, IconUpload } from '@arco-design/web-react/icon';
import { PageHeader, StatsCard } from '../components/common';
import ExcelJS from 'exceljs';

const { Text } = Typography;

export const PersonnelPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [selectedDept, setSelectedDept] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchData();
    fetchDepartments();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await window.api.getPersonnel();
      setData(res);
    } catch (err) {
      Message.error('获取人员数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await window.api.getDepartments();
      setDepartments(res);
    } catch (err) {
      Message.error('获取部门数据失败');
    }
  };

  const handleImportExcel = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingMsg = Message.loading({ content: '正在解析 Excel...', duration: 0 });
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表');

      const importedData: any[] = [];
      const deptMap: any = {};
      departments.forEach(d => deptMap[d.dept_name] = d.id);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 跳过表头
        const name = row.getCell(1).text;
        const staffId = row.getCell(2).text;
        const deptName = row.getCell(3).text;
        const position = row.getCell(4).text;
        const phone = row.getCell(5).text;

        if (name) {
          importedData.push({
            name,
            staffId: staffId || null,
            deptId: deptMap[deptName] || null,
            position: position || '',
            phone: phone || ''
          });
        }
      });

      if (importedData.length === 0) {
        Message.warning('未在 Excel 中找到有效数据');
        return;
      }

      const res = await window.api.batchPersonnel(importedData);
      if (res.success) {
        Message.success(`成功导入 ${importedData.length} 名人员`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      Message.error('解析或导入失败，请检查 Excel 格式');
    } finally {
      (loadingMsg as any).close();
      e.target.value = '';
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    // Auto-generate employee ID
    form.setFieldsValue({ staffId: `ST-${Date.now().toString().slice(-6)}` });
    setModalVisible(true);
  };

  // 生成随机颜色工具
  const getAvatarColor = (name: string) => {
    const colors = ['#F53F3F', '#F77234', '#FF7D00', '#F7BA1E', '#00B42A', '#165DFF', '#3491FA', '#722ED1'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      staffId: record.staff_id,
      deptId: record.dept_id,
      position: record.position,
      phone: record.phone
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await window.api.deletePersonnel(id);
      Message.success('删除成功');
      fetchData();
    } catch (err) {
      Message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validate();
      if (editingId) {
        await window.api.updatePersonnel({ id: editingId, ...values });
        Message.success('更新成功');
      } else {
        await window.api.addPersonnel(values);
        Message.success('添加成功');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      // 验证失败不处理
    }
  };

  const filteredData = data.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.staff_id && item.staff_id.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.position && item.position.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesDept = selectedDept === 'all' || item.dept_id === selectedDept;
    
    return matchesSearch && matchesDept;
  });

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      render: (val: string, record: any) => (
        <Space>
          <div style={{ 
            width: 32, height: 32, borderRadius: '50%', 
            background: getAvatarColor(val), 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 600
          }}>
            {val.charAt(0)}
          </div>
          <Text bold style={{ fontSize: 14 }}>{val}</Text>
        </Space>
      )
    },
    {
      title: '工号',
      dataIndex: 'staff_id',
      render: (val: string) => <Text style={{ fontFamily: 'monospace', color: 'var(--color-text-2)' }}>{val || '-'}</Text>
    },
    {
      title: '所属部门',
      dataIndex: 'dept_name',
      render: (val: string) => (
        <Tag 
          color='arcoblue' 
          style={{ 
            borderRadius: 6, 
            padding: '0 8px',
            background: 'var(--color-primary-light-1)',
            color: 'var(--color-primary-6)',
            border: '1px solid var(--color-primary-light-2)'
          }}
        >
          {val || '未分配'}
        </Tag>
      )
    },
    {
      title: '职位',
      dataIndex: 'position',
      render: (val: string) => <Text type="secondary">{val || '-'}</Text>
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      render: (val: string) => <Text style={{ color: 'var(--color-text-3)' }}>{val || '-'}</Text>
    },
    {
      title: '操作',
      width: 160,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="text" 
            size="small"
            icon={<IconEdit />} 
            onClick={() => handleEdit(record)}
            style={{ borderRadius: 6 }}
          >
            编辑
          </Button>
          <Popconfirm 
            title="确定要删除该人员吗？" 
            onOk={() => handleDelete(record.id)}
            focusLock
          >
            <Button 
              type="text" 
              size="small"
              status="danger" 
              icon={<IconDelete />}
              style={{ borderRadius: 6 }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className='page-container' style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <PageHeader
        title='人力资源管理'
        subtitle='全量员工档案管理，关联组织架构，为智能排班调度提供人力资源支撑'
        icon='👥'
        extra={
          <Space size="medium">
            <Button 
              icon={<IconRefresh />} 
              onClick={fetchData}
              style={{ borderRadius: 8 }}
            >
              刷新
            </Button>
            <label>
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                style={{ display: 'none' }} 
                onChange={handleImportExcel} 
              />
              <Button 
                icon={<IconUpload />}
                style={{ borderRadius: 8 }}
              >
                导入 Excel
              </Button>
            </label>
            <Button 
              type='primary' 
              icon={<IconPlus />} 
              onClick={handleAdd}
              style={{ borderRadius: 8, background: 'linear-gradient(135deg, #00B42A 0%, #23C343 100%)', border: 'none' }}
            >
              添加人员
            </Button>
          </Space>
        }
      />

      <Card 
        bordered={false}
        style={{ 
          borderRadius: 12, 
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          background: 'var(--color-bg-2)'
        }}
      >
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="medium">
            <Input.Search
              placeholder='搜索姓名、工号、职位...'
              style={{ width: 320, borderRadius: 8 }}
              value={searchText}
              onChange={setSearchText}
              onSearch={setSearchText}
              allowClear
            />
            <Select
              placeholder="按部门筛选"
              style={{ width: 200, borderRadius: 8 }}
              value={selectedDept}
              onChange={setSelectedDept}
            >
              <Select.Option value="all">全部部门</Select.Option>
              {departments.map((d: any) => (
                <Select.Option key={d.id} value={d.id}>{d.dept_name}</Select.Option>
              ))}
            </Select>
          </Space>
        </div>
        <Table
          loading={loading}
          columns={columns}
          data={filteredData}
          rowKey="id"
          border={false}
          pagination={{
            size: 'small',
            showTotal: true,
            pageSize: 10,
          }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑人员' : '添加人员'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={form} layout='vertical'>
          <Form.Item label='姓名' field='name' rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder='请输入姓名' />
          </Form.Item>
          <Form.Item label='工号' field='staffId'>
            <Input placeholder='请输入工号' />
          </Form.Item>
          <Form.Item label='所属部门' field='deptId' rules={[{ required: true, message: '请选择部门' }]}>
            <Select placeholder='请选择部门'>
              {departments.map((d: any) => (
                <Select.Option key={d.id} value={d.id}>{d.dept_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label='职位' field='position'>
            <Input placeholder='请输入职位' />
          </Form.Item>
          <Form.Item label='手机号' field='phone'>
            <Input placeholder='请输入手机号' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
