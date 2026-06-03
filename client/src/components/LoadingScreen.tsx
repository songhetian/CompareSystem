import { Spin } from '@arco-design/web-react';
import { IconLoading } from '@arco-design/web-react/icon';

interface LoadingScreenProps {
  tip?: string;
  size?: number;
}

export const LoadingScreen = ({ tip = '加载中...', size = 40 }: LoadingScreenProps) => {
  return (
    <div className='flex flex-col items-center justify-center h-full w-full'>
      <Spin size={size} icon={<IconLoading />} tip={tip} />
    </div>
  );
};

interface InlineLoadingProps {
  tip?: string;
}

export const InlineLoading = ({ tip = '处理中...' }: InlineLoadingProps) => {
  return (
    <div className='flex items-center justify-center py-8'>
      <Spin tip={tip} />
    </div>
  );
};
