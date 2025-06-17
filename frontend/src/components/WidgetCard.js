'use client';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useRef, useEffect } from 'react';
import { HiOutlineX, HiOutlinePencil } from 'react-icons/hi';

const getIcon = (type) => {
  switch (type) {
    case 'bar': return '📊';
    case 'line': return '📈';
    case 'number': return '🔢';
    default: return '📊';
  }
};

// Format numbers with k/M/B/T suffix
const formatNumber = (value) => {
  if (typeof value !== 'number') return value;
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000000000) {
    return (value / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
  } else if (absValue >= 1000000000) {
    return (value / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  } else if (absValue >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (absValue >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  } else {
    return value.toString();
  }
};

export default function WidgetCard({ widget, category, index, dataSource = "AI Research", onWidgetReplace, csvData, dashboardContext }) {
  const { name, type, data, source_url } = widget;
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replacePrompt, setReplacePrompt] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceError, setReplaceError] = useState(null);
  const textareaRef = useRef(null);
  
  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '2.5rem'; // Better minimum height
      if (textarea.scrollHeight > textarea.clientHeight) {
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current && showReplaceModal) {
      textareaRef.current.style.height = '2.5rem'; // Better minimum height
    }
  }, [showReplaceModal]);

  const handleReplaceWidget = async (e) => {
    e.preventDefault();
    if (!replacePrompt.trim() || !onWidgetReplace) return;

    setIsReplacing(true);
    setReplaceError(null);

    try {
      const payload = {
        prompt: replacePrompt,
        widget_type: 'auto',
        dashboard_context: dashboardContext || ''
      };

      // Include CSV data if available
      if (csvData) {
        payload.csv_data = csvData;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const response = await fetch(baseUrl + '/generate-single-widget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to generate replacement widget');
      }

      const data = await response.json();
      
      if (data.success) {
        // Call the parent component's replace function
        onWidgetReplace(index, data.widget);
        setShowReplaceModal(false);
        setReplacePrompt('');
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setReplaceError(err.message);
    } finally {
      setIsReplacing(false);
    }
  };

  // Extract domain name from URL for cleaner display
  const getSourceName = (url) => {
    if (!url) return dataSource;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };

  const renderChart = () => {
    if (!data) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
            <p>Loading data...</p>
          </div>
        </div>
      );
    }

    switch (type) {
      case 'bar':
        if (Array.isArray(data) && data.length > 0) {
          return (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tick={{ fill: '#9CA3AF' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={formatNumber}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#E5E7EB'
                  }}
                  formatter={(value) => [formatNumber(value), 'Value']}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          );
        }
        break;
      
      case 'line':
        if (Array.isArray(data) && data.length > 0) {
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tick={{ fill: '#9CA3AF' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={formatNumber}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#E5E7EB'
                  }}
                  formatter={(value) => [formatNumber(value), 'Value']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          );
        }
        break;
      
      case 'number':
        if (data && typeof data === 'object' && 'value' in data) {
          return (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="text-6xl font-bold text-blue-400 mb-2">
                {typeof data.value === 'number' ? 
                  formatNumber(data.value) : 
                  data.value
                }
              </div>
              <div className="text-gray-400 text-sm text-center px-2">
                {data.label || 'Metric'}
              </div>
            </div>
          );
        }
        break;
    }
    
    // Fallback for when data doesn't match expected format
    return (
      <div className="h-48 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">{getIcon(type)}</div>
          <p className="text-sm">Data format not supported</p>
          <p className="text-xs mt-1">
            {Array.isArray(data) ? `${data.length} items` : 'Invalid data'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 shadow-lg hover:bg-white/15 transition-all duration-300 cursor-pointer relative group"
        onClick={() => setShowReplaceModal(true)}
      >
        {/* Replace Button (visible on hover) - moved to bottom right */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-full p-2 backdrop-blur-sm">
            <HiOutlinePencil className="w-4 h-4 text-blue-300" />
          </div>
        </div>

        {/* Widget Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white truncate flex-1 pr-2">
            {name}
          </h3>
          <div className="text-2xl">
            {getIcon(type)}
          </div>
        </div>
        
        {/* Widget Content */}
        <div className="mb-4">
          {renderChart()}
        </div>
        
        {/* Widget Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="truncate flex-1">
            <span className="font-medium">Source:</span>{' '}
            {source_url ? (
              <a 
                href={source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-blue-400 hover:underline transition-colors"
                title={source_url}
                onClick={(e) => e.stopPropagation()}
              >
                {getSourceName(source_url)}
              </a>
            ) : (
              getSourceName()
            )}
          </div>
          <div className="ml-2 px-2 py-1 bg-gray-700/50 rounded-full">
            {type.toUpperCase()}
          </div>
        </div>
        
        {/* Data validation info */}
        {data && Array.isArray(data) && data.length > 0 && (
          <div className="mt-2 text-xs text-green-400">
            ✓ {data.length} data points loaded
          </div>
        )}
        
        {data && !Array.isArray(data) && data.value && (
          <div className="mt-2 text-xs text-green-400">
            ✓ Real-time data
          </div>
        )}
        
        {/* Click hint */}
        <div className="mt-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Click to replace this widget
        </div>
      </div>

      {/* Replace Widget Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Replace Widget</h3>
              <button
                onClick={() => {
                  setShowReplaceModal(false);
                  setReplacePrompt('');
                  setReplaceError(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-300 text-sm mb-4">
              What would you like to show instead of &lsquo;{name}&rsquo;?
              {dashboardContext && (
                <span className="block text-gray-400 text-xs mt-1">
                  Context: {dashboardContext}
                </span>
              )}
            </p>
            
            <form onSubmit={handleReplaceWidget}>
              <textarea
                ref={textareaRef}
                value={replacePrompt}
                onChange={(e) => {
                  setReplacePrompt(e.target.value);
                  adjustTextareaHeight();
                }}
                placeholder={
                  "What else would you like to know?"
                }
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-3 text-white placeholder:text-gray-400 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                style={{ height: '3rem', minHeight: '3rem' }}
                disabled={isReplacing}
              />
              
              {replaceError && (
                <div className="mt-2 text-red-400 text-sm">
                  Error: {replaceError}
                </div>
              )}
              
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplaceModal(false);
                    setReplacePrompt('');
                    setReplaceError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                  disabled={isReplacing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReplacing || !replacePrompt.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                >
                  {isReplacing ? 'Generating...' : 'Replace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 