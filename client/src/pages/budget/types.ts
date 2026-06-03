export interface BudgetFormData {
  schemeId: number | null;
  driveMode: 'sales' | 'traffic';
  targetValue: string | number;
  promotionId: number | null;
  dateRange: [string, string];
  peakDates: string[];
  selectedShifts: number[];
  useHistoryData: boolean;
  historyProjectId: number | null;
}

export interface StepProps {
  formData: BudgetFormData;
  updateFormData: (key: keyof BudgetFormData, value: any) => void;
  form: any;
  schemes?: any[];
  promotions?: any[];
  shifts?: any[];
  historyProjects?: any[];
}
