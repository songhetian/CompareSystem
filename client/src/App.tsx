import { Layout, Menu, Typography, Tag, Space, Button } from '@arco-design/web-react';
import {
  IconDashboard,
  IconCalendar,
  IconSettings,
  IconFile,
  IconFire,
  IconStorage,
  IconRight,
  IconLeft,
  IconUserGroup,
  IconClockCircle,
  IconRobot,
} from '@arco-design/web-react/icon';
import { useState } from 'react';
import { BudgetPage } from './pages/BudgetPage';
import { ShiftPage as ShiftConfigPage } from './pages/ShiftPage';
import { DepartmentPage } from './pages/DepartmentPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { ShiftAssignmentPage } from './pages/ShiftAssignmentPage';
import { PromotionPage } from './pages/PromotionPage';
import { ParamPage } from './pages/ParamPage';
import { ReportPage } from './pages/ReportPage';
import { HistoryDataPage } from './pages/HistoryDataPage';
import './theme/global.css';

import { DashboardPage } from './pages/DashboardPage';

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;
const { Text } = Typography;

// 页面配置 - 优化话术
const PAGE_CONFIG = {
  dashboard: { title: '决策看板', subtitle: '全场景人力数据概览与辅助决策' },
  actuarial: { title: '人力精算建模', subtitle: '自动化测算人力需求与最优方案生成' },
  shift: { title: '智能排班分配', subtitle: '基于精算结果进行排班调度' },
  dept: { title: '组织架构', subtitle: '维护部门关系与岗位节点' },
  personnel: { title: '人员信息管理', subtitle: '员工档案、技能与状态维护' },
  shiftConfig: { title: '班次方案配置', subtitle: '设定标准化班次规则' },
  promo: { title: '活动营销库', subtitle: '活动计划与业务影响参数设定' },
  param: { title: '系统参数策略', subtitle: '全局精算参数与策略控制' },
  historyData: { title: '历史数据分析', subtitle: '历史话务指标与趋势洞察' },
  report: { title: '精算分析报告', subtitle: '历史报告归档与对比评估' },
};

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'actuarial':
        return <BudgetPage />;
      case 'shift':
        return <ShiftAssignmentPage />;
      case 'dept':
        return <DepartmentPage />;
      case 'personnel':
        return <PersonnelPage />;
      case 'shiftConfig':
        return <ShiftConfigPage />;
      case 'promo':
        return <PromotionPage />;
      case 'param':
        return <ParamPage />;
      case 'report':
        return <ReportPage />;
      case 'historyData':
        return <HistoryDataPage />;
      default:
        return <div className='p-6'>功能开发中...</div>;
    }
  };

  const getCurrentPageInfo = () => {
    return PAGE_CONFIG[currentPage as keyof typeof PAGE_CONFIG] || PAGE_CONFIG.dashboard;
  };

  return (
    <Layout className='h-screen'>
      {/* 侧边栏 */}
      <Layout.Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsible
        trigger={null}
        width={240}
        style={{
          background: '#FFFFFF',
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
          zIndex: 100,
          position: 'relative'
        }}
      >
        {/* 折叠触发器 (右侧居中) */}
        <Button
          size='mini'
          shape='circle'
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            right: -12,
            top: '50%',
            zIndex: 101,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          icon={collapsed ? <IconRight /> : <IconLeft />}
        />

        {/* Logo 区域 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: '1px solid var(--gray-3)',
            transition: 'all 0.2s',
          }}
        >
          <Space size={10} align='center'>
            <IconRobot style={{ fontSize: 28, color: 'var(--primary-color)' }} />
            {!collapsed && (
              <Text
                bold
                style={{
                  fontSize: 16,
                  background: 'linear-gradient(135deg, #165DFF 0%, #722ED1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                雷犀人力精算引擎
              </Text>
            )}
          </Space>
        </div>

        {/* 导航菜单 */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            defaultSelectedKeys={['dashboard']}
            selectedKeys={[currentPage]}
            style={{ width: '100%', marginTop: 8 }}
            onClickMenuItem={setCurrentPage}
            collapse={collapsed}
          >
            <SubMenu key='decision' title={<span><IconDashboard />决策中心</span>}>
              <MenuItem key='dashboard'>数据看板</MenuItem>
              <MenuItem key='actuarial'>测算建模</MenuItem>
              <MenuItem key='shift'>排班调度</MenuItem>
            </SubMenu>

            <SubMenu key='data' title={<span><IconStorage />数据资产</span>}>
              <MenuItem key='report'>分析报告</MenuItem>
              <MenuItem key='historyData'>历史数据</MenuItem>
            </SubMenu>

            <SubMenu key='resource' title={<span><IconUserGroup />资源管理</span>}>
              <MenuItem key='dept'>组织架构</MenuItem>
              <MenuItem key='personnel'>人员档案</MenuItem>
              <MenuItem key='shiftConfig'>班次规则</MenuItem>
            </SubMenu>

            <SubMenu key='strategy' title={<span><IconSettings />控制策略</span>}>
              <MenuItem key='promo'>活动策略</MenuItem>
              <MenuItem key='param'>精算参数</MenuItem>
            </SubMenu>
          </Menu>
        </div>

      </Layout.Sider>

      {/* 主内容区 */}
      <Layout>
        {/* 顶部栏 */}
        <Layout.Header
          style={{
            height: 64,
            background: '#FFFFFF',
            borderBottom: '1px solid var(--gray-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          <Space size={16} align='center'>
            {/* 页面标题 */}
            <Space direction='vertical' size={0}>
              <Text style={{ fontSize: 16, fontWeight: 600 }}>
                {getCurrentPageInfo().title}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {getCurrentPageInfo().subtitle}
              </Text>
            </Space>
          </Space>

          {/* 右侧信息 */}
          <Space size={16}>
            <Tag color='green' icon={<span>✓</span>}>
              系统正常
            </Tag>
          </Space>
        </Layout.Header>

        {/* 内容区域 */}
        <Layout.Content
          style={{
            background: 'var(--gray-1)',
            overflow: 'auto',
          }}
        >
          {renderPage()}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export default App;
