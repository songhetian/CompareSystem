import { Table, TableProps } from '@arco-design/web-react';
import React from 'react';

interface DataTableProps extends TableProps {
  data: any[];
  columns: any[];
}

export const DataTable: React.FC<DataTableProps> = ({ data, columns, ...props }) => {
  // 样式化列头并居中对齐
  const styledColumns = columns.map(col => ({
    ...col,
    align: col.align || 'center',
    headerCellStyle: {
      backgroundColor: '#f7f8fa',
      fontWeight: 600,
      textAlign: 'center',
      ...col.headerCellStyle
    }
  }));

  return (
    <Table
      {...props}
      data={data}
      columns={styledColumns}
      pagination={props.pagination ? {
        size: 'small',
        showTotal: true,
        pageSize: 10,
        sizeCanChange: true,
        ...(props.pagination as object)
      } : false}
      border={{
        wrapper: true,
        headerCell: true,
        cell: true
      }}
      stripe
      hover
      size={props.size || 'default'}
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        ...props.style
      }}
    />
  );
};
