'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HiOutlineUpload } from 'react-icons/hi';

export default function PromptInput() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prompt = e.target.prompt.value;
    
    if (prompt.trim()) {
      setLoading(true);
      setError(null);
      
      try {
        // Call the Flask backend to generate dashboard
        const response = await fetch('http://localhost:8000/generate-dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            model: "gpt-4.1-nano"
          })
        });

        if (!response.ok) {
          throw new Error('Failed to generate dashboard');
        }

        const data = await response.json();
        
        if (data.success) {
          // Store the dashboard data in sessionStorage
          sessionStorage.setItem('dashboardData', JSON.stringify(data.dashboard));
          
          // Navigate to dashboard
          router.push('/dashboard');
        } else {
          throw new Error(data.error || 'Unknown error occurred');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
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

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <form onSubmit={handleSubmit}>
        <div className="backdrop-blur-md bg-white/10 border border-white/20 text-white rounded-2xl px-5 py-4 shadow-md flex items-center gap-4">
          <textarea
            name="prompt"
            rows={1}
            placeholder="What kind of dashboard would you like?"
            className="flex-2 resize-none bg-transparent text-white placeholder:text-gray-300 outline-none border-none focus:ring-0 text-base"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Send'}
          </button>
        </div>
      </form>
      
      {/* CSV Upload Button */}
      <div className="mt-4 flex justify-center">
        <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 transition-colors text-white text-sm font-medium rounded-xl cursor-pointer disabled:opacity-50">
          <HiOutlineUpload className="w-4 h-4" />
          Upload CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
            disabled={loading}
          />
        </label>
      </div>
      
      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-lg text-sm">
          Error: {error}
        </div>
      )}
    </div>
  );
}
  