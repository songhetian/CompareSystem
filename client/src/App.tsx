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

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;
const { Text } = Typography;

// 页面配置
const PAGE_CONFIG = {
  home: { title: '智能测算', subtitle: '智能人力需求测算与方案生成' },
  shift: { title: '人员排班', subtitle: '为人员分配每日班次' },
  dept: { title: '部门管理', subtitle: '配置组织架构与部门信息' },
  personnel: { title: '人员管理', subtitle: '管理客服中心人员基本信息' },
  shiftConfig: { title: '班次定义', subtitle: '设计班次时间与时长' },
  promo: { title: '活动规划', subtitle: '促销活动管理与系数配置' },
  param: { title: '参数方案', subtitle: '参数方案配置与管理' },
  historyData: { title: '业务参考', subtitle: '多项目历史业务数据管理与分析' },
  report: { title: '测算报告', subtitle: '测算历史记录查看与管理' },
};

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
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
    return PAGE_CONFIG[currentPage as keyof typeof PAGE_CONFIG] || PAGE_CONFIG.home;
  };

  return (
    <Layout className='h-screen'>
      {/* 侧边栏 */}
      <Layout.Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsible
        trigger={null}
        style={{
          background: '#FFFFFF',
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            borderBottom: '1px solid var(--gray-3)',
          }}
        >
          {!collapsed ? (
            <Space size={8} align='center'>
              <span style={{ fontSize: 28 }}>🧠</span>
              <Text
                bold
                style={{
                  fontSize: 16,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                客服人力精算
              </Text>
            </Space>
          ) : (
            <span style={{ fontSize: 28 }}>🧠</span>
          )}
        </div>

        {/* 导航菜单 */}
        <Menu
          defaultSelectedKeys={['home']}
          selectedKeys={[currentPage]}
          style={{ width: '100%', marginTop: 8 }}
          onClickMenuItem={setCurrentPage}
        >
          <Menu.ItemGroup label="核心测算">
            <MenuItem key='home'>
              <IconDashboard />
              智能测算
            </MenuItem>
            <MenuItem key='historyData'>
              <IconStorage />
              业务参考
            </MenuItem>
            <MenuItem key='report'>
              <IconFile />
              测算报告
            </MenuItem>
          </Menu.ItemGroup>

          <Menu.ItemGroup label="人员组织">
            <MenuItem key='dept'>
              <IconFile />
              部门管理
            </MenuItem>
            <MenuItem key='personnel'>
              <IconUserGroup />
              人员管理
            </MenuItem>
            <MenuItem key='shift'>
              <IconCalendar />
              人员排班
            </MenuItem>
          </Menu.ItemGroup>

          <Menu.ItemGroup label="参数配置">
            <MenuItem key='shiftConfig'>
              <IconClockCircle />
              班次定义
            </MenuItem>
            <MenuItem key='promo'>
              <IconFire />
              活动规划
            </MenuItem>
            <MenuItem key='param'>
              <IconSettings />
              参数方案
            </MenuItem>
          </Menu.ItemGroup>
        </Menu>

        {/* 版本信息 */}
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              padding: '0 16px',
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
