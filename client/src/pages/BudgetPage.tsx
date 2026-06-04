import { useState, useEffect } from 'react';
import { Form, Message, Steps, Layout, Card, Typography, Button, Space, Tag } from '@arco-design/web-react';
import { PageHeader } from '../components/common';
import { IconRobot, IconInfoCircle } from '@arco-design/web-react/icon';
import dayjs from 'dayjs';

import { BudgetFormData } from './budget/types';
import { TargetStep } from './budget/TargetStep';
import { TimeStep } from './budget/TimeStep';
import { ShiftStep } from './budget/ShiftStep';
import { HistoryStep } from './budget/HistoryStep';
import { ResultStep } from './budget/ResultStep';

const { Step } = Steps;
const { Content, Sider } = Layout;

export const BudgetPage = ({ onDirtyChange }: { onDirtyChange?: (isDirty: boolean) => void }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Data states
  const [schemes, setSchemes] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [historyProjects, setHistoryProjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<BudgetFormData>({
    schemeId: null,
    driveMode: 'sales',
    targetValue: '',
    promotionId: null,
    dateRange: [dayjs().format('YYYY-MM-DD'), dayjs().add(7, 'day').format('YYYY-MM-DD')],
    peakDates: [],
    selectedShifts: [],
    useHistoryData: false,
    historyProjectId: null,
  });

  useEffect(() => {
    // Re-initialize data fetching logic here
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateFormData = (key: keyof BudgetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const stepProps = { formData, updateFormData, form, schemes, promotions, shifts, historyProjects };

  const renderContent = () => {
    switch (currentStep) {
      case 0: return <TargetStep {...stepProps} />;
      case 1: return <TimeStep {...stepProps} />;
      case 2: return <ShiftStep {...stepProps} />;
      case 3: return <HistoryStep {...stepProps} />;
      case 4: return <ResultStep result={result} formData={formData} handleReset={() => {setCurrentStep(0); setResult(null);}} handleExport={() => {}} />;
      default: return null;
    }
  };

  return (
    <Layout style={{ height: '100%', padding: '16px', background: 'var(--color-fill-1)' }}>
      <PageHeader title='人力精算建模' subtitle='自动化测算人力需求与最优方案生成' icon={<IconRobot />} />
      
      <Layout style={{ marginTop: 16 }}>
        <Sider width={200} style={{ background: 'transparent' }}>
          <Steps direction='vertical' current={currentStep + 1} style={{ background: '#fff', padding: '16px', borderRadius: 'var(--radius-large)' }}>
            <Step title='目标设定' />
            <Step title='时间规划' />
            <Step title='班次配置' />
            <Step title='历史数据' />
            <Step title='查看结果' />
          </Steps>
        </Sider>

        <Content style={{ marginLeft: 16 }}>
          <Card bordered={false} style={{ height: '100%', borderRadius: 'var(--radius-large)' }}>
            <div style={{ marginBottom: 16 }}>
               <Typography.Title heading={5}>
                 {['业务目标', '时间规划', '班次方案', '历史参考', '建模结果'][currentStep]}
               </Typography.Title>
            </div>
            
            {renderContent()}

            {currentStep < 4 && (
                <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border-2)', paddingTop: 16 }}>
                    <Button onClick={() => setCurrentStep(c => c - 1)} disabled={currentStep === 0} style={{ marginRight: 8 }}>上一步</Button>
                    <Button type='primary' onClick={() => setCurrentStep(c => c + 1)}>下一步</Button>
                </div>
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};
