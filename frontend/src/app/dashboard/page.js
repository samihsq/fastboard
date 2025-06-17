'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineUpload } from 'react-icons/hi';
import DashboardGrid from '../../components/DashboardGrid';
import GradientBackground from '../../components/background';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

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

  const generateNewDashboard = async (prompt) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/generate-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
        })
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

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      // TODO: Handle CSV file upload
      console.log('CSV file selected:', file);
      // For now, just show an alert - you can implement the actual CSV processing here
      alert('CSV upload functionality to be implemented');
    } else {
      alert('Please select a valid CSV file');
    }
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
            
            {/* Data Source Badge */}
            {dashboardData?.data_source && (
              <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-200 rounded-full text-sm font-medium">
                📡 {dashboardData.data_source}
              </span>
            )}
            
            {/* Model Badge */}
            {dashboardData?.model_used && (
              <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-200 rounded-full text-sm font-medium">
                🤖 {dashboardData.model_used}
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
            }
          }}>
            <div className="backdrop-blur-md bg-white/10 border border-white/20 text-white rounded-2xl px-5 py-3 shadow-md flex items-center gap-4">
              <input
                name="prompt"
                placeholder="Generate a new dashboard..."
                className="flex-1 bg-transparent text-white placeholder:text-gray-300 outline-none border-none focus:ring-0 text-base"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        </div>

        {/* Enhanced Footer Info */}
        {dashboardData && (
          <div className="mt-8 text-center text-gray-400 text-sm">
            <div className="flex flex-wrap justify-center gap-4">
              <span>
                📊 {dashboardData.widgets?.length || 0} widgets
              </span>
              {dashboardData.generated_at && (
                <span>
                  🕒 Generated {new Date(dashboardData.generated_at * 1000).toLocaleTimeString()}
                </span>
              )}
              {dashboardData.data_source && (
                <span>
                  🔍 Powered by {dashboardData.data_source}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 