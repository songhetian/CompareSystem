import {
  Typography, Card, Space, Message, Modal, Form, Input, InputNumber,
  Button, Tag, Slider, Empty
} from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { 
  IconPlus, IconEdit, IconDelete, IconRefresh, IconFire, 
  IconThunderbolt, IconStar, IconCommon, IconBulb, IconFile 
} from '@arco-design/web-react/icon';
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
        await window.api.updatePromotion({
          id: editingPromotion.id,
          ...data
        });
        Message.success('活动更新成功');
      } else {
        await window.api.addPromotion(data);
        Message.success('活动创建成功');
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
    if (factor >= 2.5) return { level: 'S', color: 'red', text: '超级大促', icon: <IconFire /> };
    if (factor >= 1.8) return { level: 'A', color: 'orangered', text: '大型活动', icon: <IconThunderbolt /> };
    if (factor >= 1.3) return { level: 'B', color: 'orange', text: '常规活动', icon: <IconStar /> };
    return { level: 'C', color: 'gray', text: '日常运营', icon: <IconCommon /> };
  };

  if (loading) {
    return <InlineLoading tip="正在加载活动方案..." />;
  }

  return (
    <div className='page-container' style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <PageHeader
        title='营销计划库'
        subtitle='配置周期性营销活动与业务影响系数，精准预估流量爆发趋势'
        icon={<IconFire />}
        extra={
          <Space size='medium'>
            <Button icon={<IconRefresh />} onClick={loadPromotions} size='small'>刷新</Button>
            <Button type='primary' icon={<IconPlus />} onClick={handleAdd} size='small'>创建活动</Button>
          </Space>
        }
      />

      <div className='page-content'>
          {promotions.length === 0 ? (
            <Card bordered={false} style={{ textAlign: 'center', padding: '80px 0' }}>
              <Empty icon={<IconBulb style={{ fontSize: 48 }} />} description="暂无活动方案，创建营销活动方案，让人力预算更精准" />
              <Button type='primary' icon={<IconPlus />} onClick={handleAdd} style={{ marginTop: 24 }}>创建活动</Button>
            </Card>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {promotions.map(promo => {
                  const { level, color, text, icon } = getFactorLevel(promo.factor);
                  const increase = ((promo.factor - 1) * 100).toFixed(0);

                  return (
                    <Card
                      key={promo.id}
                      hoverable
                      bordered={false}
                      style={{
                        borderRadius: 12,
                        border: '1px solid var(--color-border-2)',
                        background: 'var(--color-bg-2)'
                      }}
                    >
                      <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 32, marginBottom: 8, color }}>{icon}</div>
                        <div
                          style={{ 
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                            width: 24, height: 24, borderRadius: '50%', background: color, 
                            color: '#fff', fontSize: 12, fontWeight: 'bold', marginBottom: 8 
                          }}
                        >
                          {level}
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>{promo.scheme_name}</div>
                        <Tag color='arcoblue' size='small'>{text}</Tag>
                      </div>

                      <div style={{ textAlign: 'center', padding: '12px', borderRadius: 8, background: `${color}10`, marginBottom: 12 }}>
                        <div style={{ fontSize: 20, fontWeight: 'bold', color }}>×{promo.factor.toFixed(1)}</div>
                        <Text type='secondary' style={{ fontSize: 11 }}>流量提升 +{increase}%</Text>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button size='small' type='outline' icon={<IconEdit />} onClick={() => handleEdit(promo)} style={{ flex: 1 }}>编辑</Button>
                        <Button size='small' status='danger' icon={<IconDelete />} onClick={() => handleDelete(promo.id, promo.scheme_name)} style={{ flex: 1 }}>删除</Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div style={{ marginTop: 24, padding: 12, background: 'var(--color-fill-1)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <Space size='large'>
                    <span><strong>S级</strong>: 2.5+ 倍</span>
                    <span><strong>A级</strong>: 1.8-2.5 倍</span>
                    <span><strong>B级</strong>: 1.3-1.8 倍</span>
                    <span><strong>C级</strong>: 1.0-1.3 倍</span>
                  </Space>
                  <Text type='secondary'>💡 系数越高，预估流量越大</Text>
                </div>
              </div>
            </div>
          )}
      </div>

      <Modal
        title={<Space><IconFire style={{ color: 'var(--primary-color)' }} /><Text bold>{editingPromotion ? '编辑活动方案' : '创建活动方案'}</Text></Space>}
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingPromotion(null); }}
        footer={null}
        style={{ width: 600 }}
      >
        <Form form={form} layout='vertical' onSubmit={handleSubmit} autoComplete='off' initialValues={{ factor: 1.0 }} size="small">
          <Form.Item label="活动名称" field="name" rules={[{ required: true, message: '请输入活动名称' }]}>
            <Input placeholder="例如: 双11超级大促" prefix={<IconFile />} />
          </Form.Item>

          <Form.Item label={<Space><span>流量爆发系数</span><Tag color='orangered'>×{factorValue.toFixed(1)}</Tag><Tag color='arcoblue'>{getFactorLevel(factorValue).text}</Tag></Space>} field="factor" rules={[{ required: true, message: '请设置流量系数' }]}>
            <div>
              <Slider min={1.0} max={5.0} step={0.1} value={factorValue} onChange={(v) => { const val = Array.isArray(v) ? v[0] : v; setFactorValue(val); form.setFieldValue('factor', val); }} style={{ marginBottom: 16 }} />
              <InputNumber value={factorValue} onChange={(v) => { const val = v || 1.0; setFactorValue(val); form.setFieldValue('factor', val); }} min={1.0} max={5.0} step={0.1} precision={1} style={{ width: '100%' }} prefix="×" />
            </div>
          </Form.Item>

          <Form.Item label="方案说明" field="description">
            <Input.TextArea placeholder="描述活动的特点、适用场景等（可选）" rows={3} showWordLimit maxLength={200} />
          </Form.Item>

          <div style={{ padding: 12, background: 'var(--color-primary-light-1)', borderRadius: 8, marginBottom: 20 }}>
            <Paragraph style={{ margin: 0, fontSize: 12, color: 'var(--color-primary-6)', lineHeight: 1.6 }}>
              <strong>💡 系数设置指南：</strong><br/>
              • 1.0 - 1.3 (C级)：日常运营期，无特殊促销<br/>
              • 1.3 - 1.8 (B级)：品类日、主题促销活动<br/>
              • 1.8 - 2.5 (A级)：会员日、品牌周年庆<br/>
              • 2.5+ (S级)：双11、618等超级购物节
            </Paragraph>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setModalVisible(false); setEditingPromotion(null); }}>取消</Button>
              <Button type='primary' htmlType='submit' loading={submitLoading}>确认保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
