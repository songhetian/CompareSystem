import {
  Typography, Card, Space, Message, Modal, Form, Input, Button,
  Slider, InputNumber, Tag, Tooltip
} from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import {
  IconPlus, IconDelete, IconRefresh, IconStar, IconStarFill, IconSave
} from '@arco-design/web-react/icon';
import { InlineLoading } from '../components/LoadingScreen';

const { Title, Text, Paragraph } = Typography;

// 参数配置卡片组件
const ParamCard = ({
  title,
  icon,
  color,
  params,
  values,
  onChange
}: any) => {
  return (
    <Card
      title={
        <Space>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <Text bold>{title}</Text>
        </Space>
      }
      bordered={false}
      style={{
        borderRadius: 12,
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <Space direction='vertical' style={{ width: '100%' }} size='large'>
        {params.map((param: any) => (
          <div key={param.key}>
            <div className='flex justify-between items-center mb-2'>
              <Tooltip content={param.description || param.label}>
                <Text>{param.label}</Text>
              </Tooltip>
              <Space>
                <InputNumber
                  value={values[param.key] || param.default || 0}
                  onChange={(v) => onChange(param.key, v)}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  precision={param.step < 1 ? 2 : 0}
                  style={{ width: 140 }}
                  suffix={param.unit}
                />
              </Space>
            </div>
            <Slider
              value={values[param.key] || param.default || 0}
              onChange={(v) => onChange(param.key, v)}
              min={param.min}
              max={param.max}
              step={param.step}
              marks={param.marks}
            />
          </div>
        ))}
      </Space>
    </Card>
  );
};

export const ParamPage = () => {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentScheme, setCurrentScheme] = useState<any>(null);
  const [paramValues, setParamValues] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);

  // 模态框
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const data = await window.api.getSchemes();
      setSchemes(data);
      const defaultScheme = data.find((s: any) => s.is_default);
      if (defaultScheme) {
        selectScheme(defaultScheme);
      }
    } catch (err) {
      Message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const selectScheme = (scheme: any) => {
    setCurrentScheme(scheme);
    const params = JSON.parse(scheme.params_json);
    setParamValues(params);
    setHasChanges(false);
  };

  const updateParam = (key: string, value: number | number[]) => {
    const val = Array.isArray(value) ? value[0] : value;
    setParamValues((prev: any) => ({ ...prev, [key]: val }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!currentScheme) return;

    try {
      await window.api.updateScheme({
        id: currentScheme.id,
        name: currentScheme.scheme_name,
        params: paramValues,
        desc: currentScheme.description
      });
      Message.success('保存成功');
      setHasChanges(false);
      loadSchemes();
    } catch (err) {
      Message.error('保存失败');
    }
  };

  const handleCreate = async (values: any) => {
    try {
      // 使用当前方案的参数作为模板
      const templateParams = currentScheme ? paramValues : {};

      await window.api.addScheme({
        name: values.name,
        params: templateParams,
        desc: values.description || ''
      });

      Message.success('创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadSchemes();
    } catch (err) {
      Message.error('创建失败');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await window.api.setDefaultScheme(id);
      Message.success('已设为默认');
      loadSchemes();
    } catch (err) {
      Message.error('设置失败');
    }
  };

  const handleDelete = (scheme: any) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除方案"${scheme.scheme_name}"吗？`,
      onOk: async () => {
        try {
          await window.api.deleteScheme(scheme.id);
          Message.success('删除成功');
          if (currentScheme?.id === scheme.id) {
            setCurrentScheme(null);
          }
          loadSchemes();
        } catch (err) {
          Message.error('删除失败');
        }
      }
    });
  };

  // 参数分类配置
  const paramCategories = [
    {
      title: '基础业务参数',
      icon: '💼',
      color: '#3b82f6',
      params: [
        { key: 'avg_order_value', label: '平均客单价', min: 50, max: 1000, step: 10, unit: '元', default: 160 },
        { key: 'daily_visitors', label: '日均访客数', min: 100, max: 100000, step: 100, unit: '人', default: 3800 },
        { key: 'peak_factor', label: '高峰系数', min: 1.0, max: 2.0, step: 0.1, unit: '', default: 1.2 },
        { key: 'safety_buffer', label: '安全冗余', min: 1.0, max: 2.0, step: 0.05, unit: '', default: 1.15 },
      ]
    },
    {
      title: '转化漏斗',
      icon: '🎯',
      color: '#8b5cf6',
      params: [
        { key: 'visitor_to_presale', label: '访客→咨询率', min: 0, max: 1, step: 0.01, unit: '', default: 0.25, marks: { 0: '0%', 0.5: '50%', 1: '100%' } },
        { key: 'consult_to_order', label: '咨询→下单率', min: 0, max: 1, step: 0.01, unit: '', default: 0.6, marks: { 0: '0%', 0.5: '50%', 1: '100%' } },
        { key: 'order_to_payment', label: '下单→付款率', min: 0, max: 1, step: 0.01, unit: '', default: 0.9, marks: { 0: '0%', 0.5: '50%', 1: '100%' } },
        { key: 'payment_to_aftersale', label: '付款→售后率', min: 0, max: 1, step: 0.01, unit: '', default: 0.15, marks: { 0: '0%', 0.5: '50%', 1: '100%' } },
        { key: 'midsale_ratio', label: '售中占比', min: 0, max: 1, step: 0.01, unit: '', default: 0.35, marks: { 0: '0%', 0.5: '50%', 1: '100%' } },
      ]
    },
    {
      title: '岗位效能',
      icon: '⚡',
      color: '#10b981',
      params: [
        { key: 'presale_handle_time', label: '售前处理时长', min: 1, max: 15, step: 0.5, unit: '分钟', default: 4.5 },
        { key: 'presale_saturation', label: '售前饱和度', min: 0.5, max: 1, step: 0.01, unit: '', default: 0.78 },
        { key: 'midsale_handle_time', label: '售中处理时长', min: 1, max: 15, step: 0.5, unit: '分钟', default: 3.0 },
        { key: 'midsale_saturation', label: '售中饱和度', min: 0.5, max: 1, step: 0.01, unit: '', default: 0.82 },
        { key: 'aftersale_handle_time', label: '售后处理时长', min: 1, max: 15, step: 0.5, unit: '分钟', default: 6.5 },
        { key: 'aftersale_saturation', label: '售后饱和度', min: 0.5, max: 1, step: 0.01, unit: '', default: 0.72 },
      ]
    },
    {
      title: '分时爆发',
      icon: '🔥',
      color: '#f59e0b',
      params: [
        { key: 'presale_burst_factor', label: '售前爆发倍数', min: 1, max: 5, step: 0.1, unit: '倍', default: 1.9 },
        { key: 'midsale_burst_factor', label: '售中爆发倍数', min: 1, max: 5, step: 0.1, unit: '倍', default: 2.3 },
        { key: 'aftersale_burst_factor', label: '售后爆发倍数', min: 1, max: 5, step: 0.1, unit: '倍', default: 2.6 },
      ]
    },
    {
      title: '大促系数',
      icon: '🎉',
      color: '#ef4444',
      params: [
        { key: 'event_s', label: 'S级大促', min: 1, max: 5, step: 0.1, unit: '倍', default: 2.8 },
        { key: 'event_a', label: 'A级活动', min: 1, max: 5, step: 0.1, unit: '倍', default: 1.9 },
      ]
    },
    {
      title: '时间偏移',
      icon: '⏰',
      color: '#6366f1',
      params: [
        { key: 'presale_time_offset', label: '售前偏移', min: -30, max: 30, step: 1, unit: '天', default: -2, marks: { '-30': '-30天', 0: '当天', 30: '+30天' } },
        { key: 'midsale_time_offset', label: '售中偏移', min: -30, max: 30, step: 1, unit: '天', default: 0, marks: { '-30': '-30天', 0: '当天', 30: '+30天' } },
        { key: 'aftersale_time_offset', label: '售后偏移', min: -30, max: 30, step: 1, unit: '天', default: 3, marks: { '-30': '-30天', 0: '当天', 30: '+30天' } },
      ]
    },
  ];

  if (loading) {
    return <InlineLoading tip="加载中..." />;
  }

  return (
    <div className='h-full flex' style={{ background: '#f8f9fa' }}>
      {/* 左侧方案列表 */}
      <div className='w-80 bg-white border-r' style={{ borderColor: '#e5e7eb' }}>
        <div className='p-6 border-b' style={{ borderColor: '#e5e7eb' }}>
          <Title heading={5} style={{ margin: 0, marginBottom: 8, color: '#1f2937' }}>
            参数方案
          </Title>
          <Text type='secondary' style={{ fontSize: 13, color: '#6b7280' }}>
            选择或创建测算模板
          </Text>
        </div>

        <div className='flex-1 overflow-y-auto p-4'>
          <Space direction='vertical' style={{ width: '100%' }} size='small'>
            {schemes.map(scheme => (
              <Card
                key={scheme.id}
                hoverable
                onClick={() => selectScheme(scheme)}
                style={{
                  cursor: 'pointer',
                  border: currentScheme?.id === scheme.id ? '2px solid #165DFF' : '1px solid #e5e7eb',
                  background: currentScheme?.id === scheme.id ? '#f0f5ff' : 'white'
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div className='flex justify-between items-start mb-2'>
                  <Text bold>{scheme.scheme_name}</Text>
                  {scheme.is_default && (
                    <IconStarFill style={{ color: '#f59e0b', fontSize: 16 }} />
                  )}
                </div>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {scheme.description || '暂无描述'}
                </Text>

                {currentScheme?.id === scheme.id && (
                  <div className='mt-3 flex gap-2'>
                    {!scheme.is_default && (
                      <>
                        <Button
                          size='mini'
                          type='text'
                          icon={<IconStar />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(scheme.id);
                          }}
                        >
                          设为默认
                        </Button>
                        <Button
                          size='mini'
                          type='text'
                          status='danger'
                          icon={<IconDelete />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(scheme);
                          }}
                        >
                          删除
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </Space>
        </div>

        <div className='p-4 border-t' style={{ borderColor: '#e5e7eb' }}>
          <Button
            type='primary'
            long
            icon={<IconPlus />}
            onClick={() => setCreateModalVisible(true)}
            style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            新建方案
          </Button>
        </div>
      </div>

      {/* 右侧参数配置 */}
      <div className='flex-1 overflow-y-auto'>
        {currentScheme ? (
          <div className='p-6'>
            {/* 顶部工具栏 */}
            <div className='flex justify-between items-center mb-6 bg-white rounded-xl p-6 shadow-sm'>
              <div>
                <Title heading={4} style={{ margin: 0, marginBottom: 4 }}>
                  {currentScheme.scheme_name}
                </Title>
                <Text type='secondary'>{currentScheme.description || '编辑参数配置'}</Text>
              </div>
              <Space>
                {hasChanges && (
                  <Tag color='orange'>未保存</Tag>
                )}
                <Button
                  icon={<IconRefresh />}
                  onClick={() => selectScheme(currentScheme)}
                  disabled={!hasChanges}
                >
                  重置
                </Button>
                <Button
                  type='primary'
                  icon={<IconSave />}
                  onClick={handleSave}
                  disabled={!hasChanges}
                >
                  保存修改
                </Button>
              </Space>
            </div>

            {/* 参数配置卡片 */}
            <div className='grid grid-cols-2 gap-6'>
              {paramCategories.map((category, index) => (
                <ParamCard
                  key={index}
                  title={category.title}
                  icon={category.icon}
                  color={category.color}
                  params={category.params}
                  values={paramValues}
                  onChange={updateParam}
                />
              ))}
            </div>

            {/* 底部提示 */}
            <Card
              bordered={false}
              style={{ marginTop: 24, background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}
            >
              <Paragraph style={{ margin: 0 }}>
                <strong>💡 使用提示：</strong><br/>
                1. 移动滑块或直接输入数值来调整参数<br/>
                2. 百分比参数使用 0-1 之间的小数表示（如 0.5 = 50%）<br/>
                3. 修改后记得点击"保存修改"按钮<br/>
                4. 可以基于当前方案创建新的变体方案
              </Paragraph>
            </Card>
          </div>
        ) : (
          <div className='h-full flex items-center justify-center'>
            <div className='text-center'>
              <div className='text-8xl mb-4'>⚙️</div>
              <Title heading={4}>请选择一个方案</Title>
              <Text type='secondary'>从左侧列表选择或创建新方案</Text>
            </div>
          </div>
        )}
      </div>

      {/* 创建方案模态框 */}
      <Modal
        title={<><IconPlus /> 创建新方案</>}
        visible={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout='vertical'
          onSubmit={handleCreate}
        >
          <Form.Item
            label="方案名称"
            field="name"
            rules={[{ required: true, message: '请输入方案名称' }]}
          >
            <Input placeholder="例如: 双11专用方案" size='large' />
          </Form.Item>

          <Form.Item label="描述" field="description">
            <Input.TextArea
              placeholder="描述方案的用途和特点（可选）"
              rows={3}
            />
          </Form.Item>

          <div className='p-4 bg-blue-50 rounded mb-4'>
            <Text style={{ fontSize: 13 }}>
              💡 新方案将复制当前选中方案的参数设置，创建后可自由调整
            </Text>
          </div>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type='primary' htmlType='submit'>
                确认创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
