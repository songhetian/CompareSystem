import { Space, Card, Button, Message, Typography, Descriptions, Grid, Divider, Tag, Empty } from '@arco-design/web-react';
import { StatsCard } from '../../components/common';
import dayjs from 'dayjs';
import { useState, useMemo } from 'react';
import { 
  IconRefresh, IconDownload, IconSave, IconUserGroup, IconPhone, 
  IconMessage, IconSettings, IconThunderbolt, IconSchedule 
} from '@arco-design/web-react/icon';
import { VChart } from '@visactor/react-vchart';
import { BudgetFormData } from './types';

const { Text } = Typography;
const { Row, Col } = Grid;

export const ResultStep = ({ result, formData, handleReset, handleExport }: { result: any, formData: BudgetFormData, handleReset: () => void, handleExport: () => void }) => {
  const [saving, setSaving] = useState(false);

  // 趋势图配置
  const trendSpec = useMemo(() => {
    if (!result || !result.daily_results) return null;
    const values = result.daily_results.flatMap((d: any) => [
      { time: d.date, type: '售前', value: d.presale },
      { time: d.date, type: '售中', value: d.midsale },
      { time: d.date, type: '售后', value: d.aftersale },
      { time: d.date, type: '总计', value: d.staff },
    ]);

    return {
      type: 'common',
      data: [{ id: 'table', values }],
      series: [
        { 
            type: 'bar', xField: 'time', yField: 'value', seriesField: 'type', stack: true, 
            dataFilter: (datum: any) => datum.type !== '总计',
            barMaxWidth: 30
        },
        { 
            type: 'line', xField: 'time', yField: 'value', seriesField: 'type',
            dataFilter: (datum: any) => datum.type === '总计',
            line: { style: { lineWidth: 3 } }
        }
      ],
      legends: { visible: true, orient: 'bottom' as any },
      axes: [{ orient: 'bottom' as any }, { orient: 'left' as any }],
    } as any;
  }, [result]);

  if (!result) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Empty description="测算结果为空，请重新进行智能测算。" />
        <div style={{ marginTop: 24 }}>
          <Button onClick={handleReset} type="primary">返回重测</Button>
        </div>
      </div>
    );
  }

  const handleSaveToHistory = async () => {
    setSaving(true);
    try {
      const reportName = `精算报告_${dayjs().format('MMDD_HHmm')}`;
      await window.api.addHistory({
        name: reportName,
        params: { ...result.params, plannedShiftIds: formData.selectedShifts },
        result: result,
        desc: `基于目标值 ${formData.targetValue} 的智能测算结果`,
        startDate: formData.dateRange[0],
        endDate: formData.dateRange[1]
      });
      Message.success('报告已成功保存至历史库');
    } catch (err) {
      Message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '4px' }}>
      <Space direction='vertical' size={20} style={{ width: '100%' }}>
        {/* 顶部核心指标 */}
        <Row gutter={16}>
          <Col span={6}>
            <StatsCard title='建议总编制' value={result.needed_staff} suffix='人' icon={<IconUserGroup />} />
          </Col>
          <Col span={6}>
            <StatsCard title='售前人力' value={result.presale_staff} suffix='人' icon={<IconPhone />} />
          </Col>
          <Col span={6}>
            <StatsCard title='售中人力' value={result.midsale_staff} suffix='人' icon={<IconMessage />} />
          </Col>
          <Col span={6}>
            <StatsCard title='售后人力' value={result.aftersale_staff} suffix='人' icon={<IconSettings />} />
          </Col>
        </Row>

        {/* 趋势图与参数摘要 */}
        <Row gutter={16}>
          <Col span={16}>
            <Card title={<Space><IconThunderbolt /> 每日人力资源需求趋势</Space>} bordered={false} style={{ height: 420 }}>
              <div style={{ height: 340 }}>
                {trendSpec && <VChart spec={trendSpec} />}
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card title={<Space><IconSchedule /> 测算输入参数审计</Space>} bordered={false} style={{ height: 420 }}>
              <Descriptions
                column={1}
                size="small"
                layout="horizontal"
                labelStyle={{ color: 'var(--color-text-3)', width: 100 }}
                data={[
                  { label: '业务驱动', value: <Tag color="arcoblue">{formData.driveMode === 'sales' ? '销售额驱动' : '访客数驱动'}</Tag> },
                  { label: '目标数值', value: <Text bold>{formData.targetValue} {formData.driveMode === 'sales' ? '万元' : '人'}</Text> },
                  { label: '测算周期', value: `${dayjs(formData.dateRange[0]).format('MM-DD')} ~ ${dayjs(formData.dateRange[1]).format('MM-DD')}` },
                  { label: '关联活动', value: result.eventType || '无' },
                  { label: '班次数量', value: `${formData.selectedShifts.length} 个已选` },
                ]}
              />
              <Divider style={{ margin: '16px 0' }} />
              <div style={{ background: 'var(--color-fill-2)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 8 }}>AI 精算建议总结</div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  本次测算建议编制 <Text bold style={{ color: 'var(--color-danger-6)' }}>{result.needed_staff}人</Text>，
                  核心压力点位于 <Text bold>{result.daily_results?.sort((a:any, b:any)=>b.staff-a.staff)[0]?.date || '周期内'}</Text>。
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 操作区 */}
        <Card bordered={false} bodyStyle={{ padding: '16px 24px', textAlign: 'center', background: 'var(--color-fill-1)' }}>
          <Space size={24}>
            <Button size='small' onClick={handleReset} icon={<IconRefresh />}>重新调整参数</Button>
            <Button size='small' type='primary' onClick={handleSaveToHistory} loading={saving} icon={<IconSave />}>采纳方案并归档</Button>
            <Button size='small' onClick={handleExport} icon={<IconDownload />}>导出精算报表</Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
};
