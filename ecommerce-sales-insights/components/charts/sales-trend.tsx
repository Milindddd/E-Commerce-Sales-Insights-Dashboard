'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface SalesTrendProps {
  data: any[];
  isMobile: boolean;
}

const SalesTrend = ({ data, isMobile }: SalesTrendProps) => {
  // Process data for the chart
  const processData = () => {
    if (!data || data.length === 0) return [];
    
    // Group by date and calculate total sales, profit, revenue
    const dailyData: { [key: string]: { date: string; sales: number; profit: number; revenue: number } } = {};
    
    data.forEach(item => {
      const date = item.date || item.orderDate;
      if (!date) return;
      
      const dateKey = format(new Date(date), 'yyyy-MM-dd');
      const saleAmount = parseFloat(item.sales || item.amount || 0);
      const profitAmount = parseFloat(item.profit || 0);
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          sales: 0,
          profit: 0,
          revenue: 0
        };
      }
      
      dailyData[dateKey].sales += saleAmount;
      dailyData[dateKey].profit += profitAmount;
      dailyData[dateKey].revenue += saleAmount - profitAmount; // Assuming profit is the actual profit amount
    });
    
    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const chartData = processData();

  const formattedData = chartData.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: isMobile ? '2-digit' : 'numeric'
    })
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={formattedData}
        margin={{
          top: 5,
          right: isMobile ? 10 : 30,
          left: isMobile ? 0 : 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: isMobile ? 10 : 12 }}
          tickMargin={isMobile ? 5 : 10}
          interval={isMobile ? 'preserveStartEnd' : 0}
        />
        <YAxis 
          tickFormatter={(value) => `$${isMobile && value >= 1000 ? `${value/1000}k` : value.toLocaleString()}`}
          tick={{ fontSize: isMobile ? 10 : 12 }}
          width={isMobile ? 40 : 80}
        />
        <Tooltip 
          formatter={(value: number, name: string) => [
            new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(value),
            name
          ]}
          labelFormatter={(label) => `Date: ${format(new Date(label), 'PPP')}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="sales" 
          name="Total Sales" 
          stroke="#8884d8" 
          activeDot={{ r: 8 }} 
        />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          name="Revenue" 
          stroke="#82ca9d" 
        />
        <Line 
          type="monotone" 
          dataKey="profit" 
          name="Profit" 
          stroke="#ffc658" 
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SalesTrend;
