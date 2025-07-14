'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineUpload, HiOutlineX } from 'react-icons/hi';
import DashboardGrid from '../../components/DashboardGrid';
import GradientBackground from '../../components/background';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const textareaRef = useRef(null);
  const router = useRouter();

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset to single line height first
      textarea.style.height = '1.5rem'; // Single line height
      
      // Only expand if content requires more space
      if (textarea.scrollHeight > textarea.clientHeight) {
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; // Max height of 120px
      }
    }
  };

  const handleTextareaInput = (e) => {
    adjustTextareaHeight();
  };

  useEffect(() => {
    // Get dashboard data from sessionStorage
    const storedData = sessionStorage.getItem('dashboardData');
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setDashboardData(parsedData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    } else {
      // If no data in sessionStorage, redirect to home
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    // Set initial height on component mount
    if (textareaRef.current) {
      textareaRef.current.style.height = '1.5rem';
    }
  }, []);

  const generateNewDashboard = async (prompt) => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '/api/generate-dashboard';
      let payload = { prompt: prompt };

      // If CSV is uploaded, use the CSV endpoint
      if (csvData) {
        endpoint = '/api/generate-csv-dashboard';
        payload = { 
          prompt: prompt,
          csv_data: csvData 
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to generate dashboard');
      }

      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.dashboard);
        sessionStorage.setItem('dashboardData', JSON.stringify(data.dashboard));
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      
      // Read file content based on type
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target.result;
        setCsvData(fileContent); // Keep the same state name for compatibility
      };
      
      // Read as text for most file types
      if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        // For binary files, read as text anyway for now - Perplexity can handle various formats
        reader.readAsText(file);
      }
      
      // Clear any previous errors
      setError(null);
    } else {
      setError('Please select a valid file');
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setCsvData(null);
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  const handleWidgetReplace = (widgetIndex, newWidget) => {
    if (!dashboardData || !dashboardData.widgets) return;
    
    // Create a new dashboard data object with the replaced widget
    const updatedWidgets = [...dashboardData.widgets];
    updatedWidgets[widgetIndex] = newWidget;
    
    const updatedDashboardData = {
      ...dashboardData,
      widgets: updatedWidgets,
      generated_at: Date.now() / 1000
    };
    
    setDashboardData(updatedDashboardData);
    sessionStorage.setItem('dashboardData', JSON.stringify(updatedDashboardData));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <GradientBackground />
        <div className="relative z-20 text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Generating your dashboard...</p>
          <p className="text-sm text-gray-300 mt-2">AI is researching your topic...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <GradientBackground />
        <div className="relative z-20 text-white text-center">
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-6 py-4 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <GradientBackground />
      
      <div className="relative z-20 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-white">
              {dashboardData?.dash_name || 'Dashboard'}
            </h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
            >
              ← New Dashboard
            </button>
          </div>
          
          {/* Enhanced metadata section */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* Category Badge */}
            {dashboardData?.category && (
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-200 rounded-full text-sm font-medium">
                {dashboardData.category.toUpperCase()}
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-lg">
              Error: {error}
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        {dashboardData && dashboardData.widgets && (
          <DashboardGrid 
            widgets={dashboardData.widgets}
            category={dashboardData.category}
            dataSource={dashboardData.data_source}
            modelUsed={dashboardData.model_used}
            onWidgetReplace={handleWidgetReplace}
            csvData={csvData}
            dashboardContext={dashboardData.dash_name}
          />
        )}
                  
        {/* Regenerate Prompt */}
        <div className="w-2/3 mx-auto mt-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const prompt = e.target.prompt.value;
            if (prompt.trim()) {
              generateNewDashboard(prompt);
              e.target.prompt.value = '';
              // Reset textarea height after clearing
              setTimeout(() => adjustTextareaHeight(), 0);
            }
          }}>
            <div className="backdrop-blur-md bg-white/10 border border-white/20 text-white rounded-2xl px-5 py-3 shadow-md flex items-center gap-4">
              <textarea
                ref={textareaRef}
                name="prompt"
                rows={1}
                placeholder={
                  uploadedFile 
                    ? "What insights would you like from your data?" 
                    : "Generate a new dashboard..."
                }
                className="flex-1 resize-none bg-transparent text-white placeholder:text-gray-300 outline-none border-none focus:ring-0 text-base h-6 overflow-hidden leading-6"
                disabled={loading}
                onInput={handleTextareaInput}
                style={{ height: '1.5rem' }}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium disabled:opacity-50 flex-shrink-0"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>

          {/* File Upload Status - moved below prompt */}
          {uploadedFile && (
            <div className="mt-4 backdrop-blur-md bg-green-500/20 border border-green-500/30 text-green-200 rounded-2xl px-5 py-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-xl">📁</div>
                  <div>
                    <div className="font-medium">{uploadedFile.name}</div>
                    <div className="text-sm text-green-300">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • Ready for analysis
                    </div>
                  </div>
                </div>
                <button
                  onClick={removeUploadedFile}
                  className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
                  title="Remove file"
                >
                  <HiOutlineX className="w-5 h-5 text-red-300" />
                </button>
              </div>
            </div>
          )}

          {/* File Upload Button */}
          {!uploadedFile && (
            <div className="mt-4 flex justify-center">
              <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 transition-colors text-white text-sm font-medium rounded-xl cursor-pointer">
                <HiOutlineUpload className="w-4 h-4" />
                Upload File
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          )}
        </div>

        {/* Enhanced Footer Info */}
        {dashboardData && (
          <div className="mt-8 text-center text-gray-400 text-sm">
            <div className="flex flex-wrap justify-center gap-4">
              <span>
                📊 {dashboardData.widgets?.length || 0} widgets
              </span>
              {dashboardData.generated_at && (
                <>
                  <span>•</span>
                  <span>
                    🕒 Generated {new Date(dashboardData.generated_at * 1000).toLocaleTimeString()}
                  </span>
                </>
              )}
              
              <span>•</span>
              <span>
               Made with ❤️ by Samih and Nathan @ Corgi Hacks
              </span>
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 