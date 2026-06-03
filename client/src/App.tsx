import { Layout, Menu } from '@arco-design/web-react';
import { IconDashboard, IconCalendar, IconSettings, IconFile, IconFire, IconStorage } from '@arco-design/web-react/icon';
import { useState } from 'react';
import { BudgetPage } from './pages/BudgetPage';
import { ShiftPage } from './pages/ShiftPage';
import { PromotionPage } from './pages/PromotionPage';
import { ParamPage } from './pages/ParamPage';
import { ReportPage } from './pages/ReportPage';
import { HistoryDataPage } from './pages/HistoryDataPage';

const MenuItem = Menu.Item;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <BudgetPage />;
      case 'shift': return <ShiftPage />;
      case 'promo': return <PromotionPage />;
      case 'param': return <ParamPage />;
      case 'report': return <ReportPage />;
      case 'historyData': return <HistoryDataPage />;
      default: return <div className='p-6'>功能开发中...</div>;
    }
  };

  return (
    <Layout className='h-screen'>
      <Layout.Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsible
        className='bg-[#f2f3f5]'
      >
        <div className='h-16 flex items-center justify-center font-bold text-lg'>
          {collapsed ? '🧠' : '🧠 客服人力精算'}
        </div>
        <Menu defaultSelectedKeys={['home']} style={{ width: '100%' }} onClickMenuItem={setCurrentPage}>
          <MenuItem key='home'><IconDashboard />测算工作室</MenuItem>
          <MenuItem key='shift'><IconCalendar />排班室(班次)</MenuItem>
          <MenuItem key='promo'><IconFire />活动规划</MenuItem>
          <MenuItem key='param'><IconSettings />测算模板</MenuItem>
          <MenuItem key='historyData'><IconStorage />业务数据导入</MenuItem>
          <MenuItem key='report'><IconFile />历史记录</MenuItem>
        </Menu>
      </Layout.Sider>
      <Layout>
        <Layout.Header className='h-16 bg-white border-b border-gray-200 flex items-center px-6'>
          <h2 className='text-lg font-medium'>人力预算仿真工作台</h2>
        </Layout.Header>
        <Layout.Content className='bg-[#f7f8fa]'>
          {renderPage()}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export default App;
