import {
  Typography, Card, Space, Message, Modal, Form, Input, InputNumber,
  Button, Tag, Slider
} from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { IconPlus, IconEdit, IconDelete, IconRefresh, IconFire } from '@arco-design/web-react/icon';
import { InlineLoading } from '../components/LoadingScreen';
import { PageHeader } from '../components/common';

const { Title, Text, Paragraph } = Typography;

export const PromotionPage = () => {
  const [form] = Form.useForm();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [factorValue, setFactorValue] = useState(1.0);
  const [editingPromotion, setEditingPromotion] = useState<any>(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const data = await window.api.getPromotions();
      setPromotions(data);
    } catch (err) {
      console.error('加载失败:', err);
      Message.error('加载活动数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPromotion(null);
    form.resetFields();
    setFactorValue(1.0);
    setModalVisible(true);
  };

  const handleEdit = (promotion: any) => {
    setEditingPromotion(promotion);
    setFactorValue(promotion.factor);
    form.setFieldsValue({
      name: promotion.scheme_name,
      factor: promotion.factor,
      description: promotion.description || ''
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitLoading(true);
    try {
      const data = {
        name: values.name,
        factor: values.factor,
        desc: values.description || ''
      };

      if (editingPromotion) {
        // 更新活动
        await window.api.updatePromotion({
          id: editingPromotion.id,
          ...data
        });
        Message.success('✅ 活动更新成功');
      } else {
        // 新建活动
        await window.api.addPromotion(data);
        Message.success('✅ 活动创建成功');
      }

      setModalVisible(false);
      loadPromotions();
    } catch (err: any) {
      Message.error(`${editingPromotion ? '更新' : '创建'}失败: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除活动方案"${name}"吗？此操作不可撤销。`,
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          await window.api.deletePromotion(id);
          Message.success('删除成功');
          loadPromotions();
        } catch (err) {
          Message.error('删除失败');
        }
      }
    });
  };

  const getFactorLevel = (factor: number) => {
    if (factor >= 2.5) return { level: 'S', color: 'red', text: '超级大促' };
    if (factor >= 1.8) return { level: 'A', color: 'orangered', text: '大型活动' };
    if (factor >= 1.3) return { level: 'B', color: 'orange', text: '常规活动' };
    return { level: 'C', color: 'gray', text: '日常运营' };
  };

  if (loading) {
    return <InlineLoading tip="正在加载活动方案..." />;
  }

  return (
    <div className='page-container' style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      {/* 页面头部 */}
      <PageHeader
        title='活动规划'
        subtitle='配置不同级别的营销活动，精准预估流量爆发'
        icon='🔥'
        extra={
          <Space size='medium'>
            <Button
              icon={<IconRefresh />}
              onClick={loadPromotions}
              size='large'
            >
              刷新
            </Button>
            <Button
              type='primary'
              icon={<IconPlus />}
              onClick={handleAdd}
              size='large'
            >
              创建活动
            </Button>
          </Space>
        }
      />

      {/* 内容区域 */}
      <div className='page-content'>
          {promotions.length === 0 ? (
            <div className='empty-state'>
              <div className='text-6xl mb-4'>🎯</div>
              <Title heading={5} style={{ marginBottom: 12 }}>暂无活动方案</Title>
              <Text type='secondary' style={{ fontSize: 14, display: 'block', marginBottom: 24 }}>
                创建营销活动方案，让人力预算更精准
              </Text>
              <Button
                type='primary'
                icon={<IconPlus />}
                onClick={handleAdd}
                size='large'
              >
                创建活动
              </Button>
            </div>
          ) : (
            <div>
              {/* 活动方案卡片 */}
              <div className='grid grid-cols-4 gap-4'>
                {promotions.map(promo => {
                  const { level, color, text } = getFactorLevel(promo.factor);
                  const emojis: any = { 'S': '💥', 'A': '🚀', 'B': '🎪', 'C': '📦' };
                  const increase = ((promo.factor - 1) * 100).toFixed(0);

                  return (
                    <Card
                      key={promo.id}
                      hoverable
                      bordered={false}
                      style={{
                        borderRadius: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        border: '1px solid var(--color-border-2)',
                        background: 'var(--color-bg-2)'
                      }}
                    >
                      {/* 头部 */}
                      <div className='text-center mb-3'>
                        <div className='text-3xl mb-2'>{emojis[level] || '🔥'}</div>
                        <div
                          className='inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white text-sm mb-2'
                          style={{ background: color }}
                        >
                          {level}
                        </div>
                        <div className='font-bold text-base mb-1'>{promo.scheme_name}</div>
                        <Tag color='arcoblue' size='small'>{text}</Tag>
                      </div>

                      {/* 系数显示 */}
                      <div className='text-center p-3 rounded-lg mb-3' style={{ background: `${color}10` }}>
                        <div className='flex items-center justify-center gap-1 mb-1'>
                          <span className='text-2xl font-bold' style={{ color }}>×{promo.factor.toFixed(1)}</span>
                        </div>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          流量提升 +{increase}%
                        </Text>
                      </div>

                      {/* 操作按钮 */}
                      <div className='flex gap-2'>
                        <Button
                          size='small'
                          type='outline'
                          icon={<IconEdit />}
                          onClick={() => handleEdit(promo)}
                          style={{ flex: 1, borderRadius: 6 }}
                        >
                          编辑
                        </Button>
                        <Button
                          size='small'
                          status='danger'
                          icon={<IconDelete />}
                          onClick={() => handleDelete(promo.id, promo.scheme_name)}
                          style={{ flex: 1, borderRadius: 6 }}
                        >
                          删除
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className='info-banner' style={{ marginTop: 'var(--spacing-medium)', background: 'var(--color-fill-1)', border: '1px solid var(--color-border-1)', borderRadius: 8 }}>
                <div className='flex items-center justify-between text-sm' style={{ color: 'var(--color-text-1)' }}>
                  <Space size='large'>
                    <span><strong>S级</strong>: 2.5+ 倍</span>
                    <span><strong>A级</strong>: 1.8-2.5 倍</span>
                    <span><strong>B级</strong>: 1.3-1.8 倍</span>
                    <span><strong>C级</strong>: 1.0-1.3 倍</span>
                  </Space>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    💡 系数越高，预估流量越大
                  </Text>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* 创建/编辑活动模态框 */}
      <Modal
        title={
          <Space>
            <IconFire style={{ color: '#4a90e2' }} />
            <Text bold>{editingPromotion ? '编辑活动方案' : '创建活动方案'}</Text>
          </Space>
        }
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPromotion(null);
        }}
        footer={null}
        style={{ width: 700 }}
      >
        <Form
          form={form}
          layout='vertical'
          onSubmit={handleSubmit}
          autoComplete='off'
          initialValues={{ factor: 1.0 }}
        >
          <Form.Item
            label="活动名称"
            field="name"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input placeholder="例如: 双11超级大促" size='large' prefix="📝" />
          </Form.Item>

          <Form.Item
            label={
              <div className='flex justify-between items-center w-full'>
                <Space>
                  <span>流量爆发系数</span>
                  <Tag color='orangered' size='large'>×{factorValue.toFixed(1)}</Tag>
                </Space>
                <Tag color='arcoblue'>{getFactorLevel(factorValue).text}</Tag>
              </div>
            }
            field="factor"
            rules={[{ required: true, message: '请设置流量系数' }]}
          >
            <div>
              <Slider
                min={1.0}
                max={5.0}
                step={0.1}
                value={factorValue}
                onChange={(v) => {
                  const val = Array.isArray(v) ? v[0] : v;
                  setFactorValue(val);
                  form.setFieldValue('factor', val);
                }}
                marks={{
                  1.0: '1.0x',
                  1.5: '1.5x',
                  2.0: '2.0x',
                  2.5: '2.5x',
                  3.0: '3.0x',
                  4.0: '4.0x',
                  5.0: '5.0x'
                }}
                style={{ marginBottom: 20, marginTop: 12 }}
              />
              <InputNumber
                value={factorValue}
                onChange={(v) => {
                  const val = v || 1.0;
                  setFactorValue(val);
                  form.setFieldValue('factor', val);
                }}
                min={1.0}
                max={5.0}
                step={0.1}
                precision={1}
                style={{ width: '100%' }}
                size='large'
                prefix="×"
              />
            </div>
          </Form.Item>

          <Form.Item label="方案说明" field="description">
            <Input.TextArea
              placeholder="描述活动的特点、适用场景等（可选）"
              rows={4}
              showWordLimit
              maxLength={200}
            />
          </Form.Item>

          <div className='p-5 rounded-lg mb-4' style={{ background: 'var(--color-primary-light-1)', border: '1px solid var(--color-primary-light-2)' }}>
            <Paragraph style={{ margin: 0, fontSize: 13, color: 'var(--color-primary-6)', lineHeight: 1.8 }}>
              <strong>💡 系数设置指南：</strong><br/>
              • <strong>1.0 - 1.3 (C级)</strong>：日常运营期，无特殊促销<br/>
              • <strong>1.3 - 1.8 (B级)</strong>：品类日、主题促销活动<br/>
              • <strong>1.8 - 2.5 (A级)</strong>：会员日、品牌周年庆<br/>
              • <strong>2.5+ (S级)</strong>：双11、618等超级购物节
            </Paragraph>
          </div>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingPromotion(null);
              }} size='large'>取消</Button>
              <Button
                type='primary'
                htmlType='submit'
                loading={submitLoading}
                size='large'
                style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                {editingPromotion ? '更新活动' : '确认创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
