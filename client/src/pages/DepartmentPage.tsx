/**
 * 部门管理页面
 */
import { useState, useEffect } from 'react';
import {
  Table, Card, Space, Button, Input, Modal, Form, Message, Popconfirm, Typography
} from '@arco-design/web-react';
import { IconPlus, IconEdit, IconDelete, IconRefresh, IconHome } from '@arco-design/web-react/icon';
import { PageHeader } from '../components/common';

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
            width: 24, height: 24, borderRadius: 4, 
            background: 'var(--color-primary-light-1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-primary-6)', fontSize: 14
          }}>
            <IconHome />
          </div>
          <Text bold style={{ fontSize: 13 }}>{val}</Text>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (val: string) => <Text type="secondary" style={{ fontSize: 12 }}>{val || '暂无描述'}</Text>
    },
    {
      title: '操作',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" size="small" icon={<IconEdit />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确定要删除该部门吗？" onOk={() => handleDelete(record.id)}>
            <Button type="text" size="small" status="danger" icon={<IconDelete />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className='page-container' style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <PageHeader
        title='组织架构档案'
        subtitle='维护客服中心多层级组织节点'
        icon={<IconHome />}
        extra={
          <Space size="medium">
            <Button icon={<IconRefresh />} onClick={fetchData} size="small">刷新</Button>
            <Button type='primary' icon={<IconPlus />} onClick={handleAdd} size="small">添加部门</Button>
          </Space>
        }
      />

      <Card bordered={false} style={{ borderRadius: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder='搜索部门名称...'
            style={{ width: 260 }}
            value={searchText}
            size="small"
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
          size="small"
          pagination={{
            size: 'small',
            showTotal: true,
            pageSize: 10,
          }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑部门' : '添加部门'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        style={{ width: 480 }}
      >
        <Form form={form} layout='vertical' size="small">
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
