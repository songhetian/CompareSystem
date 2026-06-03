// 全局类型定义

declare global {
  interface Window {
    api: {
      // 计算相关
      calculateManpower: (data: any) => Promise<any>;

      // 方案管理
      getSchemes: () => Promise<any[]>;
      addScheme: (data: any) => Promise<any>;
      updateScheme: (data: any) => Promise<any>;
      deleteScheme: (id: number) => Promise<any>;
      setDefaultScheme: (id: number) => Promise<any>;

      // 班次管理
      getShifts: () => Promise<any[]>;
      addShift: (data: any) => Promise<any>;
      updateShift: (data: any) => Promise<any>;
      deleteShift: (id: number) => Promise<any>;

      // 活动管理
      getPromotions: () => Promise<any[]>;
      addPromotion: (data: any) => Promise<any>;
      updatePromotion: (data: any) => Promise<any>;
      deletePromotion: (id: number) => Promise<any>;

      // 历史记录
      getHistory: () => Promise<any[]>;
      deleteHistory: (id: number) => Promise<any>;

      // 历史项目管理
      getHistoryProjects: () => Promise<HistoryProject[]>;
      addHistoryProject: (data: { name: string; description: string }) => Promise<any>;
      updateHistoryProject: (data: { id: number; name: string; description: string }) => Promise<any>;
      deleteHistoryProject: (id: number) => Promise<any>;

      // 历史业务数据
      getHistoryData: (projectId?: number, limit?: number) => Promise<HistoryDataRecord[]>;
      addHistoryData: (data: {
        projectId: number;
        date: string;
        sales: number;
        staff: number;
        consults: number;
        conversionRate: number;
        remark: string;
      }) => Promise<any>;
      batchHistoryData: (
        projectId: number,
        records: Array<{
          date: string;
          sales: number;
          staff: number;
          consults: number;
          conversionRate: number;
          remark: string;
        }>
      ) => Promise<{ success: boolean; count: number }>;
      deleteHistoryData: (ids: number[]) => Promise<any>;
    };
  }

  interface HistoryProject {
    id: number;
    project_name: string;
    description: string;
    is_active: number;
    create_time: string;
    update_time: string;
  }

  interface HistoryDataRecord {
    id: number;
    project_id: number;
    data_date: string;
    sales_volume: number;
    actual_staff: number;
    actual_consult: number;
    conversion_rate: number;
    remark: string;
    create_time: string;
  }
}

export {};
