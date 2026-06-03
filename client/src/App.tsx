import { Layout, Menu, Typography, Tag, Space } from '@arco-design/web-react';
import {
  IconDashboard,
  IconCalendar,
  IconSettings,
  IconFile,
  IconFire,
  IconStorage,
  IconMenuFold,
  IconMenuUnfold,
  IconUserGroup,
  IconClockCircle,
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

// 页面配置
const PAGE_CONFIG = {
  dashboard: { title: '决策大脑看板', subtitle: '全场景人力数据实时监控与辅助决策分析' },
  actuarial: { title: '人力精算建模', subtitle: '多维度人力需求精算与自动化方案生成' },
  shift: { title: '智能排班调度', subtitle: '基于测算结果的客服人员班次智能分配' },
  dept: { title: '组织架构档案', subtitle: '维护客服中心组织节点与归属关系' },
  personnel: { title: '人力资源管理', subtitle: '全量员工档案、技能组与在职状态管理' },
  shiftConfig: { title: '班次方案配置', subtitle: '标准化班次时段、工时与休息规则定义' },
  promo: { title: '营销计划库', subtitle: '周期性营销活动计划与业务影响系数配置' },
  param: { title: '精算参数管理', subtitle: '核心算法参数方案与全局策略控制' },
  historyData: { title: '业务历史看板', subtitle: '多维度历史话务指标与业务趋势分析' },
  report: { title: '测算分析报告', subtitle: '人力精算历史执行记录与对比分析报告' },
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
        }}
      >
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
            <span style={{ fontSize: 28 }}>🧠</span>
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
                人力精算引擎
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
            <Menu.ItemGroup label={collapsed ? '' : "决策中心"}>
              <MenuItem key='dashboard'>
                <IconDashboard />
                决策大脑看板
              </MenuItem>
              <MenuItem key='actuarial'>
                <IconFire />
                人力精算建模
              </MenuItem>
              <MenuItem key='shift'>
                <IconCalendar />
                智能排班调度
              </MenuItem>
            </Menu.ItemGroup>

            <Menu.ItemGroup label={collapsed ? '' : "数据资产"}>
              <MenuItem key='report'>
                <IconFile />
                测算分析报告
              </MenuItem>
              <MenuItem key='historyData'>
                <IconStorage />
                业务历史看板
              </MenuItem>
            </Menu.ItemGroup>

            <Menu.ItemGroup label={collapsed ? '' : "资源管理"}>
              <MenuItem key='dept'>
                <IconFile />
                组织架构档案
              </MenuItem>
              <MenuItem key='personnel'>
                <IconUserGroup />
                人力资源管理
              </MenuItem>
              <MenuItem key='shiftConfig'>
                <IconClockCircle />
                班次方案配置
              </MenuItem>
            </Menu.ItemGroup>

            <Menu.ItemGroup label={collapsed ? '' : "控制策略"}>
              <MenuItem key='promo'>
                <IconFire />
                营销计划库
              </MenuItem>
              <MenuItem key='param'>
                <IconSettings />
                精算参数管理
              </MenuItem>
            </Menu.ItemGroup>
          </Menu>
        </div>
        
        {/* 底部折叠切换 */}
        <div 
          style={{ 
            height: 48, 
            borderTop: '1px solid var(--gray-3)', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0 20px',
            cursor: 'pointer',
            color: 'var(--color-text-3)',
            marginTop: 'auto'
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <IconMenuUnfold style={{ fontSize: 18 }} /> : <Space><IconMenuFold style={{ fontSize: 18 }} /><Text size='small'>收起导航</Text></Space>}
        </div>

        {/* 版本信息 */}
        {!collapsed && (
          <div
            style={{
              padding: '12px 16px',
              textAlign: 'center',
            }}
          >
            <Tag color='arcoblue' size='small'>
              V7.0.0
            </Tag>
          </div>
        )}
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
            {/* 折叠按钮 */}
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                cursor: 'pointer',
                fontSize: 18,
                color: 'var(--gray-7)',
                transition: 'color var(--transition-normal)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-color)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray-7)')}
            >
              {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
            </div>

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
