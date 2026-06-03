import { Button, ButtonProps } from '@arco-design/web-react';
import React from 'react';

interface StyledButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export const StyledButton: React.FC<StyledButtonProps> = ({ children, ...props }) => {
  return (
    <Button 
      {...props} 
      style={{ borderRadius: '6px', ...props.style }}
    >
      {children}
    </Button>
  );
};
