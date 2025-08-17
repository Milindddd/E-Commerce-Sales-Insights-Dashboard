'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, useMemo } from 'recharts';

interface TopProductsProps {
  data: any[];
  isMobile: boolean;
}

const TopProducts = ({ data, isMobile }: TopProductsProps) => {
  const processData = () => {
    if (!data || data.length === 0) return [];
    
    // Group by product and calculate total quantity sold
    const productMap: { [key: string]: { name: string; quantity: number; sales: number } } = {};
    
    data.forEach(item => {
      const productName = item.productName || item.product || 'Unknown';
      const quantity = parseInt(item.quantity || '1', 10);
      const sales = parseFloat(item.sales || item.amount || 0);
      
      if (!productMap[productName]) {
        productMap[productName] = {
          name: productName,
          quantity: 0,
          sales: 0
        };
      }
      
      productMap[productName].quantity += quantity;
      productMap[productName].sales += sales;
    });
    
    // Sort by quantity and get top 10
    return Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, isMobile ? 5 : 10);
  };

  const topProducts = useMemo(() => {
    const processed = data
      .reduce((acc, item) => {
        const existing = acc.find(p => p.product === item.product);
        if (existing) {
          existing.quantity += item.quantity;
          existing.sales += item.quantity * item.price;
        } else {
          acc.push({
            product: item.product,
            quantity: item.quantity,
            sales: item.quantity * item.price
          });
        }
        return acc;
      }, [])
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, isMobile ? 5 : 10);
    
    return isMobile ? processed.reverse() : processed;
  }, [data, isMobile]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={topProducts}
        layout="vertical"
        margin={{
          top: 5,
          right: isMobile ? 10 : 30,
          left: isMobile ? 0 : 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          tickFormatter={(value) => `$${isMobile && value >= 1000 ? `${value/1000}k` : value.toLocaleString()}`}
          tick={{ fontSize: isMobile ? 10 : 12 }}
        />
        <YAxis 
          dataKey="product" 
          type="category" 
          width={isMobile ? 100 : 150}
          tick={{ fontSize: isMobile ? 10 : 12 }}
          interval={0}
        />
        <Tooltip 
          formatter={(value, name) => [
            name === 'sales' ? `$${Number(value).toLocaleString()}` : value,
            name === 'sales' ? 'Total Sales' : 'Quantity'
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
          wrapperStyle={{
            paddingTop: isMobile ? '10px' : '20px',
            fontSize: isMobile ? 12 : 14
          }}
        />
        <Bar 
          dataKey="quantity" 
          name="Quantity" 
          fill="#8884d8" 
          radius={isMobile ? 0 : [0, 4, 4, 0]}
          barSize={isMobile ? 20 : 30}
        />
        <Bar 
          dataKey="sales" 
          name="Sales" 
          fill="#82ca9d" 
          radius={isMobile ? 0 : [0, 4, 4, 0]}
          barSize={isMobile ? 20 : 30}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopProducts;
