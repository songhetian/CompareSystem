import {
  Typography, Card, Space, Message, Modal, Form, Input, Button,
  Slider, InputNumber, Tag, Tooltip, Drawer, Collapse, Empty
} from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import {
  IconPlus, IconDelete, IconRefresh, IconStar, IconStarFill, IconSave,
  IconEdit, IconSettings, IconDice, IconThunderbolt, IconLoop, IconUserGroup,
  IconDashboard, IconSafe, IconPushpin, IconExclamationCircle, IconBulb, IconHistory
} from '@arco-design/web-react/icon';
import { InlineLoading } from '../components/LoadingScreen';
import { PageHeader } from '../components/common';

const { Text } = Typography;
const CollapseItem = Collapse.Item;

const getPrecision = (step: number): number => {
  if (!step || step >= 1) return 0;
  const s = step.toString();
  return s.includes('.') ? s.split('.')[1].length : 0;
};

const ParamRow = ({ param, value, onChange, onEdit, onDelete, accentColor, isLast }: any) => {
  const isPercentage = param.unit === '%';
  const uiValue = isPercentage ? +(value * 100).toFixed(4) : value;
  const uiMin = isPercentage ? +(param.min * 100).toFixed(4) : param.min;
  const uiMax = isPercentage ? +(param.max * 100).toFixed(4) : param.max;
  const uiStep = isPercentage ? +(param.step * 100).toFixed(4) : param.step;
  const precision = getPrecision(uiStep);

  const handleChange = (v: number | number[] | null) => {
    if (v === null || v === undefined) return;
    const num = Array.isArray(v) ? v[0] : v;
    onChange(param.key, isPercentage ? +(num / 100).toFixed(6) : num);
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', borderRadius: 6 }}>
        <Tooltip content={param.description || ''} mini disabled={!param.description}>
          <Text style={{ width: 88, flexShrink: 0, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{param.label}</Text>
        </Tooltip>
        <Slider value={uiValue} min={uiMin} max={uiMax} step={uiStep} onChange={handleChange} style={{ flex: 1, marginBottom: 0 }} />
        <InputNumber size="small" value={uiValue} min={uiMin} max={uiMax} step={uiStep} precision={precision} onChange={handleChange} style={{ width: 80, flexShrink: 0 }} />
        <Button size="mini" type="text" icon={<IconEdit />} onClick={() => onEdit(param)} />
        <Button size="mini" type="text" status="danger" icon={<IconDelete />} onClick={() => onDelete(param.key)} />
      </div>
      {!isLast && <div style={{ height: 1, background: 'var(--color-border-1)', margin: '0 4px' }} />}
    </>
  );
};

const CategoryContent = ({ category, values, onChange, onEditParam, onDeleteParam }: any) => (
  <div>
    {category.params.length === 0 && <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-text-3)', fontSize: 12 }}>暂无参数</div>}
    {category.params.map((param: any, idx: number) => (
      <ParamRow key={param.key} param={param} value={values[param.key] ?? param.default ?? 0} onChange={onChange} onEdit={onEditParam} onDelete={onDeleteParam} accentColor={category.color} isLast={idx === category.params.length - 1} />
    ))}
  </div>
);

export const ParamPage = () => {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentScheme, setCurrentScheme] = useState<any>(null);
  const [paramValues, setParamValues] = useState<any>({});
  const [paramCategories, setParamCategories] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editSchemeModalVisible, setEditSchemeModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [paramForm] = Form.useForm();
  const [editingParam, setEditingParam] = useState<any>(null);
  const [targetCategory, setTargetCategory] = useState<string>('');

  const defaultCategories = [
    { title: '基础业务参数', icon: <IconDice />, color: '#3b82f6', params: [{ key: 'avg_order_value', label: '平均客单价', min: 1, max: 100000, step: 10, unit: '元', default: 160 }, { key: 'daily_visitors', label: '日均访客数', min: 100, max: 100000, step: 100, unit: '人', default: 3800 }] },
    { title: '转化漏斗', icon: <IconLoop />, color: '#8b5cf6', params: [{ key: 'visitor_to_presale', label: '访客→咨询率', min: 0, max: 1, step: 0.01, unit: '%', default: 0.25 }] },
    { title: '岗位效能', icon: <IconThunderbolt />, color: '#10b981', params: [{ key: 'presale_handle_time', label: '售前处理时长', min: 1, max: 15, step: 0.5, unit: '分钟', default: 4.5 }] },
  ];

  useEffect(() => { loadSchemes(); }, []);

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const data = await window.api.getSchemes();
      setSchemes(data);
      if (currentScheme) {
        const updated = data.find((s: any) => s.id === currentScheme.id);
        if (updated) selectScheme(updated);
      } else {
        const def = data.find((s: any) => s.is_default);
        if (def) selectScheme(def);
      }
    } catch { Message.error('加载失败'); } finally { setLoading(false); }
  };

  const selectScheme = (scheme: any) => {
    setCurrentScheme(scheme);
    const parsed = JSON.parse(scheme.params_json);
    if (parsed._config) {
      setParamCategories(parsed._config);
      const { _config, ...vals } = parsed;
      setParamValues(vals);
    } else {
      setParamCategories(defaultCategories);
      setParamValues(parsed);
    }
    setHasChanges(false);
  };

  const updateParam = (key: string, value: number) => {
    setParamValues((prev: any) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!currentScheme) return;
    try {
      await window.api.updateScheme({ id: currentScheme.id, name: currentScheme.scheme_name, params: { ...paramValues, _config: paramCategories }, desc: currentScheme.description });
      Message.success('保存成功');
      setHasChanges(false);
      loadSchemes();
    } catch { Message.error('保存失败'); }
  };

  const handleLoadDefaultParams = () => {
    Modal.confirm({
      title: '加载默认参数',
      content: '是否用默认参数覆盖当前配置？',
      onOk: async () => {
        if (!currentScheme) return;
        try {
          const defaultParams: any = {};
          defaultCategories.forEach(cat => cat.params.forEach((param: any) => { defaultParams[param.key] = param.default ?? 0; }));
          await window.api.updateScheme({ id: currentScheme.id, name: currentScheme.scheme_name, params: { ...defaultParams, _config: defaultCategories }, desc: currentScheme.description });
          Message.success('已加载');
          loadSchemes();
          const updated = schemes.find((s: any) => s.id === currentScheme.id);
          if (updated) selectScheme(updated);
        } catch { Message.error('加载失败'); }
      }
    });
  };

  const handleEditScheme = (scheme: any) => { setCurrentScheme(scheme); editForm.setFieldsValue({ name: scheme.scheme_name, description: scheme.description }); setEditSchemeModalVisible(true); };

  const handleUpdateSchemeInfo = async (values: any) => {
    if (!currentScheme) return;
    try {
      await window.api.updateScheme({ id: currentScheme.id, name: values.name, params: JSON.parse(currentScheme.params_json), desc: values.description || '' });
      Message.success('更新成功');
      setEditSchemeModalVisible(false);
      loadSchemes();
    } catch { Message.error('更新失败'); }
  };

  const handleCreate = async (values: any) => {
    try {
      await window.api.addScheme({ name: values.name, params: { ...paramValues, _config: paramCategories }, desc: values.description || '' });
      Message.success('创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadSchemes();
    } catch { Message.error('创建失败'); }
  };

  const handleEditParam = (param: any, categoryTitle?: string) => {
    setEditingParam(param);
    if (param) {
      const isPercentage = param.unit === '%';
      paramForm.setFieldsValue({ ...param, min: isPercentage ? +(param.min * 100).toFixed(4) : param.min, max: isPercentage ? +(param.max * 100).toFixed(4) : param.max, step: isPercentage ? +(param.step * 100).toFixed(4) : param.step, default: isPercentage ? +(param.default * 100).toFixed(4) : param.default, isPercentage });
    } else { paramForm.resetFields(); setTargetCategory(categoryTitle || ''); }
    setEditDrawerVisible(true);
  };

  const handleDeleteParam = (key: string) => {
    Modal.confirm({ title: '确认删除', onOk: () => { setParamCategories(cats => cats.map(cat => ({ ...cat, params: cat.params.filter((p: any) => p.key !== key) }))); setHasChanges(true); } });
  };

  const handleSaveParam = (values: any) => {
    const isPercentage = values.unit === '%';
    const finalParam = { ...values, min: isPercentage ? +(values.min / 100) : values.min, max: isPercentage ? +(values.max / 100) : values.max, step: isPercentage ? +(values.step / 100) : values.step, default: isPercentage ? +(values.default / 100) : values.default };
    delete finalParam.isPercentage;
    const newCategories = paramCategories.map(cat => ({ ...cat, params: [...cat.params] }));
    if (editingParam) { newCategories.forEach(cat => { const idx = cat.params.findIndex((p: any) => p.key === editingParam.key); if (idx !== -1) cat.params[idx] = { ...cat.params[idx], ...finalParam }; }); }
    else { const catIdx = newCategories.findIndex(cat => cat.title === targetCategory); if (catIdx !== -1) { newCategories[catIdx].params.push({ ...finalParam }); setParamValues((prev: any) => ({ ...prev, [finalParam.key]: finalParam.default ?? 0 })); } }
    setParamCategories(newCategories);
    setEditDrawerVisible(false);
    paramForm.resetFields();
    setHasChanges(true);
  };

  const handleSetDefault = async (id: number) => { try { await window.api.setDefaultScheme(id); Message.success('已设为默认'); loadSchemes(); } catch { Message.error('设置失败'); } };

  if (loading) return <InlineLoading tip="加载中..." />;

  return (
    <div className="page-container" style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 260, background: 'var(--color-bg-2)', borderRight: '1px solid var(--color-border-2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconSettings style={{ fontSize: 18 }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>精算参数方案</span>
          </div>
          <Button type="primary" long icon={<IconPlus />} onClick={() => setCreateModalVisible(true)} size="small">新建方案</Button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {schemes.map(scheme => {
              const isActive = currentScheme?.id === scheme.id;
              return (
                <div key={scheme.id} onClick={() => selectScheme(scheme)} style={{ padding: '10px 12px', borderRadius: 6, cursor: 'pointer', border: isActive ? '1px solid var(--color-primary-6)' : '1px solid transparent', background: isActive ? 'var(--color-primary-light-1)' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text bold={isActive} style={{ fontSize: 13 }}>{scheme.scheme_name}</Text>
                    {scheme.is_default && <IconStarFill style={{ color: '#f59e0b', fontSize: 12 }} />}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{scheme.description || '暂无描述'}</Text>
                  {isActive && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <Button size="mini" type="text" icon={<IconEdit />} onClick={e => { e.stopPropagation(); handleEditScheme(scheme); }}>编辑</Button>
                      {!scheme.is_default && <Button size="mini" type="text" icon={<IconStar />} onClick={e => { e.stopPropagation(); handleSetDefault(scheme.id); }}>设为默认</Button>}
                    </div>
                  )}
                </div>
              );
            })}
          </Space>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg-3)' }}>
        {currentScheme ? (
          <>
            <PageHeader title={currentScheme.scheme_name} subtitle={currentScheme.description} extra={
              <Space>
                {hasChanges && <Tag color="orange" size="small">未保存</Tag>}
                <Button icon={<IconHistory />} onClick={handleLoadDefaultParams} size="small">加载默认</Button>
                <Button type="primary" icon={<IconSave />} onClick={handleSave} disabled={!hasChanges} size="small">保存修改</Button>
              </Space>
            } />
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              <Collapse defaultActiveKey={paramCategories.map((_, i) => String(i))} bordered={false} style={{ background: 'transparent' }}>
                {paramCategories.map((category: any, index: number) => (
                  <CollapseItem key={String(index)} name={String(index)} header={<Space><span style={{ color: category.color }}>{category.icon}</span><Text bold>{category.title}</Text></Space>} style={{ marginBottom: 8, background: 'var(--color-bg-2)', borderRadius: 8, borderLeft: `3px solid ${category.color}`, boxShadow: 'var(--shadow-light)' }}>
                    <CategoryContent category={category} values={paramValues} onChange={updateParam} onEditParam={handleEditParam} onDeleteParam={handleDeleteParam} />
                  </CollapseItem>
                ))}
              </Collapse>
              <div style={{ marginTop: 16, padding: '12px', background: 'var(--color-fill-2)', borderRadius: 8, fontSize: 12 }}>
                <Space direction="vertical" size={4}><Text bold><IconBulb /> 使用说明</Text><Text type="secondary">· 调整参数后点击右上角“保存修改”即可生效。</Text></Space>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Empty icon={<IconDashboard style={{ fontSize: 60 }} />} description="请从左侧选择一个参数方案" />
          </div>
        )}
      </div>
      <Modal title={<Space><IconPlus />创建方案</Space>} visible={createModalVisible} onCancel={() => setCreateModalVisible(false)} footer={null} style={{ width: 480 }}><Form form={form} layout="vertical" onSubmit={handleCreate} size="small"><Form.Item label="方案名称" field="name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="描述" field="description"><Input.TextArea /></Form.Item><Form.Item><Button type="primary" htmlType="submit" long>确认创建</Button></Form.Item></Form></Modal>
      <Modal title={<Space><IconEdit />修改方案</Space>} visible={editSchemeModalVisible} onCancel={() => setEditSchemeModalVisible(false)} footer={null} style={{ width: 480 }}><Form form={editForm} layout="vertical" onSubmit={handleUpdateSchemeInfo} size="small"><Form.Item label="方案名称" field="name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="描述" field="description"><Input.TextArea /></Form.Item><Form.Item><Button type="primary" htmlType="submit" long>确认修改</Button></Form.Item></Form></Modal>
      <Drawer width={320} title={editingParam ? "编辑参数" : "添加参数"} visible={editDrawerVisible} onCancel={() => setEditDrawerVisible(false)} footer={<Button type="primary" onClick={() => paramForm.submit()} long>保存</Button>}><Form form={paramForm} layout="vertical" onSubmit={handleSaveParam} size="small"><Form.Item label="Key" field="key" rules={[{ required: true }]}><Input disabled={!!editingParam} /></Form.Item><Form.Item label="名称" field="label" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="单位" field="unit"><Input /></Form.Item><Form.Item label="最小值" field="min"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item label="最大值" field="max"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item label="步长" field="step"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item label="默认值" field="default"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item label="描述" field="description"><Input.TextArea /></Form.Item></Form></Drawer>
    </div>
  );
};
