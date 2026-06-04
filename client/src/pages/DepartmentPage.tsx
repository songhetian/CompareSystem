/**
 * 部门管理页面
 */
import { useState, useEffect } from 'react';
import {
  Table, Card, Space, Button, Input, Modal, Form, Message, Popconfirm, Typography
} from '@arco-design/web-react';
import { IconPlus, IconEdit, IconDelete, IconSearch, IconRefresh } from '@arco-design/web-react/icon';
import { PageHeader, StatsCard } from '../components/common';

const { Text } = Typography;

export const DepartmentPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await window.api.getDepartments();
      setData(res);
    } catch (err) {
      Message.error('获取部门数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.dept_name,
      description: record.description
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await window.api.deleteDepartment(id);
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
        await window.api.updateDepartment({ id: editingId, ...values });
        Message.success('更新成功');
      } else {
        await window.api.addDepartment(values);
        Message.success('添加成功');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      // 验证失败不处理
    }
  };

  const filteredData = data.filter((item: any) => 
    item.dept_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: '部门名称',
      dataIndex: 'dept_name',
      render: (val: string) => (
        <Space>
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, 
            background: 'var(--color-primary-light-1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-primary-6)', fontSize: 16
          }}>
            🏢
          </div>
          <Text bold style={{ fontSize: 14 }}>{val}</Text>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (val: string) => <Text type="secondary">{val || '暂无描述'}</Text>
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      render: (val: string) => (
        <Text style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
          {new Date(val).toLocaleDateString()}
        </Text>
      )
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
            title="确定要删除该部门吗？" 
            focusLock
            onOk={() => handleDelete(record.id)}
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
    <div className='page-container' style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <PageHeader
        title='组织架构档案'
        subtitle='维护客服中心多层级组织节点，实现精细化人力核算与归属管理'
        icon='🏢'
        extra={
          <Space size="medium">
            <Button 
              icon={<IconRefresh />} 
              onClick={fetchData}
              style={{ borderRadius: 8 }}
            >
              刷新
            </Button>
            <Button 
              type='primary' 
              icon={<IconPlus />} 
              onClick={handleAdd}
              style={{ borderRadius: 8, background: 'linear-gradient(135deg, #165DFF 0%, #4080FF 100%)', border: 'none' }}
            >
              添加部门
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
          <Input.Search
            placeholder='搜索部门名称...'
            style={{ width: 320, borderRadius: 8 }}
            value={searchText}
            onChange={setSearchText}
            onSearch={setSearchText}
            allowClear
          />
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
          style={{ marginTop: 8 }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑部门' : '添加部门'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={form} layout='vertical'>
          <Form.Item label='部门名称' field='name' rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input placeholder='请输入部门名称' />
          </Form.Item>
          <Form.Item label='描述' field='description'>
            <Input.TextArea placeholder='请输入部门描述' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
