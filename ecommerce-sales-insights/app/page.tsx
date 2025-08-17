'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { 
  FiSun, 
  FiMoon, 
  FiUpload, 
  FiDownload, 
  FiFilter, 
  FiRefreshCw,
  FiMenu,
  FiX,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { format, parseISO, isWithinInterval } from 'date-fns';
import * as XLSX from 'xlsx';
import { useResponsive } from '@/hooks/useResponsive';

// Dynamically import charts to avoid SSR issues
const SalesTrendChart = dynamic(() => import('@/components/charts/sales-trend'), { ssr: false });
const TopProductsChart = dynamic(() => import('@/components/charts/top-products'), { ssr: false });
const RegionalSalesChart = dynamic(() => import('@/components/charts/regional-sales'), { ssr: false });

// Types
type SalesData = {
  orderId: string;
  orderDate: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  sales: number;
  profit: number;
  region: string;
  country: string;
  [key: string]: any;
};

type Filters = {
  dateRange: { start: string; end: string };
  category: string;
  region: string;
};

const Home = () => {
  const { theme, setTheme } = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    dateRange: { 
      start: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    category: '',
    region: ''
  });

  // Load data from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedData = localStorage.getItem('salesData');
    if (savedData) {
      setData(JSON.parse(savedData));
    } else {
      // Load sample data if no data exists
      fetch('/sample-data.json')
        .then(res => res.json())
        .then(sampleData => {
          setData(sampleData);
          localStorage.setItem('salesData', JSON.stringify(sampleData));
        });
    }
  }, []);

  // Get unique categories and regions for filter dropdowns
  const { categories, regions } = useMemo(() => {
    const cats = new Set<string>();
    const regs = new Set<string>();
    
    data.forEach(item => {
      if (item.category) cats.add(item.category);
      if (item.region) regs.add(item.region);
    });
    
    return {
      categories: Array.from(cats).sort(),
      regions: Array.from(regs).sort()
    };
  }, [data]);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Filter by date range
      if (filters.dateRange.start && filters.dateRange.end) {
        const orderDate = parseISO(item.orderDate);
        const startDate = parseISO(filters.dateRange.start);
        const endDate = parseISO(filters.dateRange.end);
        
        if (!isWithinInterval(orderDate, { start: startDate, end: endDate })) {
          return false;
        }
      }
      
      // Filter by category
      if (filters.category && item.category !== filters.category) {
        return false;
      }
      
      // Filter by region
      if (filters.region && item.region !== filters.region) {
        return false;
      }
      
      return true;
    });
  }, [data, filters]);

  // Handle file upload for both JSON and Excel files
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        setData(jsonData);
        localStorage.setItem('salesData', text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<SalesData>(firstSheet);
        setData(jsonData);
        localStorage.setItem('salesData', JSON.stringify(jsonData));
      } else {
        throw new Error('Unsupported file format. Please upload a JSON or Excel file.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to process file'}`);
    } finally {
      setIsLoading(false);
      // Reset file input
      if (event.target) event.target.value = '';
    }
  };

  // Export chart as PNG
  const exportChart = async (chartId: string) => {
    const chartElement = document.getElementById(chartId)?.querySelector('svg, canvas');
    if (!chartElement) return;
    
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(chartElement as HTMLElement);
      
      const link = document.createElement('a');
      link.download = `${chartId}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting chart:', error);
      alert('Failed to export chart. Please try again.');
    }
  };

  // Export data as CSV
  const exportData = () => {
    if (!filteredData.length) return;
    
    try {
      // Convert data to CSV
      const headers = Object.keys(filteredData[0]);
      const csvContent = [
        headers.join(','),
        ...filteredData.map(row => 
          headers.map(fieldName => 
            `"${String(row[fieldName] || '').replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-data-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      dateRange: { 
        start: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
      },
      category: '',
      region: ''
    });
    if (isMobile) {
      setShowMobileFilters(false);
    }
  };

  // Toggle chart expansion
  const toggleChartExpansion = (chartId: string) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };

  if (!mounted) return null;

  // Chart components with responsive settings
  const chartComponents = [
    {
      id: 'sales-trend',
      title: 'Sales Trend',
      component: <SalesTrendChart data={filteredData} isMobile={isMobile} />,
      colSpan: 'lg:col-span-1',
      height: expandedChart === 'sales-trend' || !isMobile ? 'h-96' : 'h-64'
    },
    {
      id: 'top-products',
      title: 'Top Products',
      component: <TopProductsChart data={filteredData} isMobile={isMobile} />,
      colSpan: 'lg:col-span-1',
      height: expandedChart === 'top-products' || !isMobile ? 'h-96' : 'h-64'
    },
    {
      id: 'regional-sales',
      title: 'Regional Sales',
      component: <RegionalSalesChart data={filteredData} isMobile={isMobile} />,
      colSpan: 'lg:col-span-2',
      height: expandedChart === 'regional-sales' || !isMobile ? 'h-[500px]' : 'h-96'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-bold truncate max-w-[200px] sm:max-w-none">
                E-Commerce Sales Insights
              </h1>
              {isMobile && (
                <button 
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors sm:hidden ml-2"
                  aria-label={showMobileFilters ? 'Hide filters' : 'Show filters'}
                >
                  {showMobileFilters ? <FiX size={24} /> : <FiMenu size={24} />}
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>
            <button
              onClick={exportData}
              disabled={!filteredData.length}
              className={`p-2 rounded-lg transition-colors ${
                filteredData.length 
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-current' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title="Export Data"
            >
              <FiDownload size={20} />
            </button>
            <label 
              className={`cursor-pointer p-2 rounded-lg transition-colors ${
                isLoading 
                  ? 'text-gray-400 cursor-wait' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Upload Data"
            >
              <FiUpload size={20} />
              <input 
                type="file" 
                accept=".json,.xlsx,.xls,.csv" 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={isLoading}
              />
            </label>
            <button
              onClick={resetFilters}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Reset Filters"
            >
              <FiRefreshCw size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Filters - Mobile Toggle */}
        {isMobile && !showMobileFilters && (
          <button
            onClick={() => setShowMobileFilters(true)}
            className="w-full mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <FiFilter />
              <span>Show Filters</span>
            </div>
            <FiChevronDown />
          </button>
        )}

        {/* Filters */}
        <div 
          className={`mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow transition-all duration-300 ${
            isMobile && !showMobileFilters ? 'hidden' : 'block'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FiFilter />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'} found
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <input
                    type="date"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                    value={filters.dateRange.start}
                    max={filters.dateRange.end}
                    onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, start: e.target.value}})}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-sm text-gray-500">to</span>
                </div>
                <div className="col-span-2">
                  <input
                    type="date"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                    value={filters.dateRange.end}
                    min={filters.dateRange.start}
                    onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, end: e.target.value}})}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select 
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Region</label>
              <select 
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                value={filters.region}
                onChange={(e) => setFilters({...filters, region: e.target.value})}
              >
                <option value="">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-lg font-medium">Processing data...</p>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {chartComponents.map(({ id, title, component, colSpan, height }) => (
            <div 
              key={id}
              className={`bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow transition-all ${
                expandedChart === id ? 'fixed inset-4 z-50 bg-white dark:bg-gray-800 p-4 overflow-auto' : ''
              } ${colSpan}`}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold truncate flex-1">{title}</h2>
                <div className="flex space-x-2">
                  {isMobile && (
                    <button
                      onClick={() => toggleChartExpansion(id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title={expandedChart === id ? 'Minimize' : 'Expand'}
                    >
                      {expandedChart === id ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                    </button>
                  )}
                  <button 
                    onClick={() => exportChart(`${id}-chart`)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Export Chart"
                  >
                    <FiDownload size={18} />
                  </button>
                  {expandedChart === id && (
                    <button
                      onClick={() => setExpandedChart(null)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors sm:hidden"
                      title="Close"
                    >
                      <FiX size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div id={`${id}-chart`} className={height}>
                {component}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!isLoading && filteredData.length === 0 && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <h3 className="text-lg font-medium mb-2">No data available</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {data.length === 0 
                ? 'Upload a JSON, CSV, or Excel file to get started.'
                : 'No records match the current filters.'}
            </p>
            {data.length === 0 && (
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                <FiUpload className="mr-2" />
                Upload Data
                <input 
                  type="file" 
                  accept=".json,.xlsx,.xls,.csv" 
                  onChange={handleFileUpload} 
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>E-Commerce Sales Insights Dashboard &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
