'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HiOutlineUpload, HiOutlineX } from 'react-icons/hi';

export default function PromptInput() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prompt = e.target.prompt.value;
    
    if (prompt.trim()) {
      setLoading(true);
      setError(null);
      
      try {
        let endpoint = 'http://localhost:8000/generate-dashboard';
        let payload = { prompt: prompt };

        // If CSV is uploaded, use the CSV endpoint
        if (csvData) {
          endpoint = 'http://localhost:8000/generate-csv-dashboard';
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

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <form onSubmit={handleSubmit}>
        <div className="backdrop-blur-md bg-white/10 border border-white/20 text-white rounded-2xl px-5 py-4 shadow-md flex items-center gap-4">
          <textarea
            name="prompt"
            rows={1}
            placeholder={
              uploadedFile 
                ? "What insights would you like from your data?" 
                : "What kind of dashboard would you like?"
            }
            className="flex-2 resize-none bg-transparent text-white placeholder:text-gray-300 outline-none border-none focus:ring-0 text-base"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 transition-colors text-white text-sm font-medium rounded-xl cursor-pointer disabled:opacity-50">
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
      
      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-lg text-sm">
          Error: {error}
        </div>
      )}
    </div>
  );
}
  