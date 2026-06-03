import { Line, Bar, Pie, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TimelineChartProps {
  data: Array<{
    date: string;
    staff: number;
    presale: number;
    midsale: number;
    aftersale: number;
  }>;
}

export const TimelineChart = ({ data }: TimelineChartProps) => {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: '总人数',
        data: data.map(d => d.staff),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        fill: true,
      },
      {
        label: '售前',
        data: data.map(d => d.presale),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        fill: true,
      },
      {
        label: '售中',
        data: data.map(d => d.midsale),
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        fill: true,
      },
      {
        label: '售后',
        data: data.map(d => d.aftersale),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 13
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45
        }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  return <Line data={chartData} options={options} />;
};

interface HourlyChartProps {
  hourlyTotal: number[];
  hourlyPresale: number[];
  hourlyMidsale: number[];
  hourlyAftersale: number[];
}

export const HourlyChart = ({ hourlyTotal, hourlyPresale, hourlyMidsale, hourlyAftersale }: HourlyChartProps) => {
  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: '售前',
        data: hourlyPresale,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        stack: 'Stack 0',
      },
      {
        label: '售中',
        data: hourlyMidsale,
        backgroundColor: 'rgba(236, 72, 153, 0.8)',
        stack: 'Stack 0',
      },
      {
        label: '售后',
        data: hourlyAftersale,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        stack: 'Stack 0',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 13
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          footer: (tooltipItems: any) => {
            const total = tooltipItems.reduce((sum: number, item: any) => sum + item.parsed.y, 0);
            return `总计: ${total.toFixed(1)} 人`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

interface PieChartProps {
  presale: number;
  midsale: number;
  aftersale: number;
}

export const PieChart = ({ presale, midsale, aftersale }: PieChartProps) => {
  const chartData = {
    labels: ['售前咨询', '售中处理', '售后服务'],
    datasets: [
      {
        data: [presale, midsale, aftersale],
        backgroundColor: [
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: [
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(16, 185, 129)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = presale + midsale + aftersale;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value}人 (${percentage}%)`;
          }
        }
      },
    },
  };

  return <Pie data={chartData} options={options} />;
};

interface RadarChartProps {
  data: {
    label: string;
    presale: number;
    midsale: number;
    aftersale: number;
  }[];
}

export const RadarChart = ({ data }: RadarChartProps) => {
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: '售前',
        data: data.map(d => d.presale),
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(139, 92, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(139, 92, 246)',
      },
      {
        label: '售中',
        data: data.map(d => d.midsale),
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        borderColor: 'rgb(236, 72, 153)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(236, 72, 153)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(236, 72, 153)',
      },
      {
        label: '售后',
        data: data.map(d => d.aftersale),
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(16, 185, 129)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11
          }
        },
        pointLabels: {
          font: {
            size: 12
          }
        }
      },
    },
  };

  return <Radar data={chartData} options={options} />;
};
