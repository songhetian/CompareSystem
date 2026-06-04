import React from 'react';
import { VChart } from '@visactor/react-vchart';

const commonOptions = {
  animation: true,
  color: ['#165DFF', '#722ED1', '#00B42A', '#FF7D00'],
};

export const TimelineChart = ({ data }: any) => {
  const spec = {
    type: 'line',
    data: [{ id: 'table', values: data }],
    xField: 'date',
    yField: 'staff',
    ...commonOptions,
  };
  return <VChart spec={spec} style={{ height: '100%', width: '100%' }} />;
};

export const HourlyChart = ({ hourlyTotal, hourlyPresale, hourlyMidsale, hourlyAftersale }: any) => {
  const values = Array.from({ length: 24 }, (_, i) => [
    { time: `${i}:00`, type: '售前', value: hourlyPresale[i] },
    { time: `${i}:00`, type: '售中', value: hourlyMidsale[i] },
    { time: `${i}:00`, type: '售后', value: hourlyAftersale[i] },
  ]).flat();

  const spec = {
    type: 'bar',
    data: [{ id: 'table', values }],
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    stack: true,
    barMaxWidth: 30, // 强制限制柱子最大宽度，确保精致感
    ...commonOptions,
  };
  return <VChart spec={spec} style={{ height: '100%', width: '100%' }} />;
};

export const PieChart = ({ presale, midsale, aftersale }: any) => {
  const values = [
    { type: '售前', value: presale },
    { type: '售中', value: midsale },
    { type: '售后', value: aftersale },
  ];

  const spec = {
    type: 'pie',
    data: [{ id: 'table', values }],
    valueField: 'value',
    categoryField: 'type',
    ...commonOptions,
  };
  return <VChart spec={spec} style={{ height: '100%', width: '100%' }} />;
};

export const RadarChart = ({ data }: any) => {
  const spec = {
    type: 'radar',
    data: [{ id: 'table', values: data }],
    valueField: 'value',
    categoryField: 'label',
    ...commonOptions,
  };
  return <VChart spec={spec} style={{ height: '100%', width: '100%' }} />;
};
