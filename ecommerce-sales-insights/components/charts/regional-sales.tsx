'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

interface RegionalSalesProps {
  data: any[];
  isMobile: boolean;
}

interface ChartData {
  name: string;
  value: number;
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
  name: string;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
  '#A4DE6C', '#D0ED57', '#FFC658', '#8884d8', '#82ca9d'
];

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
  index = 0,
  name = ''
}: Partial<LabelProps>) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: '12px',
        fontWeight: 'bold',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
      }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const RegionalSales = ({ data, isMobile }: RegionalSalesProps) => {
  // Process data for the chart
  const chartData: ChartData[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const regionMap = data.reduce<Record<string, number>>((acc, item) => {
      const region = item.region || 'Unknown';
      if (!acc[region]) {
        acc[region] = 0;
      }
      acc[region] += (item.price || 0) * (item.quantity || 0);
      return acc;
    }, {});
    
    // Sort by value and limit to top regions on mobile
    const sortedData = Object.entries(regionMap)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value);
    
    // On mobile, group smaller regions into "Other"
    if (isMobile && sortedData.length > 5) {
      const topRegions = sortedData.slice(0, 4);
      const otherRegions = sortedData.slice(4);
      const otherTotal = otherRegions.reduce((sum, region) => sum + region.value, 0);
      
      return [
        ...topRegions,
        { name: 'Other', value: Number(otherTotal.toFixed(2)) }
      ];
    }
    
    return sortedData;
  }, [data, isMobile]);
  
  // Calculate chart dimensions based on screen size
  const chartSize = isMobile ? 250 : 400;
  const outerRadius = isMobile ? 100 : 150;
  
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={chartSize}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={outerRadius}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={!isMobile ? 
              ({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%` : 
              (props: Partial<LabelProps>) => {
                const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
                const radius = isMobile ? innerRadius + (outerRadius - innerRadius) * 0.3 : innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                
                // Only show labels for larger segments on mobile
                if (isMobile && percent < 0.1) return null;
                
                return (
                  <text
                    x={x}
                    y={y}
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                      fontSize: isMobile ? '10px' : '12px',
                      fontWeight: 'bold',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
            paddingAngle={isMobile ? 2 : 5}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [
              new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(value),
              'Sales'
            ]}
            contentStyle={{
              fontSize: isMobile ? 12 : 14,
              padding: isMobile ? '4px 8px' : '8px 12px',
              borderRadius: '4px',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
          <Legend 
            layout={isMobile ? 'horizontal' : 'vertical'}
            verticalAlign={isMobile ? 'bottom' : 'middle'}
            align={isMobile ? 'center' : 'right'}
            wrapperStyle={{
              paddingTop: isMobile ? '10px' : '20px',
              fontSize: isMobile ? 12 : 14
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
        Total Sales: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSales)}
      </div>
    </div>
  );
};

export default RegionalSales;
