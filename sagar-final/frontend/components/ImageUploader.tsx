import React, { useState } from 'react';

interface ImageUploaderProps {
  onImagesSelected: (files: { [key: string]: File }) => void;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, isLoading }) => {
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    lane1: null,
    lane2: null,
    lane3: null,
    lane4: null,
  });

  const handleFileChange = (lane: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [lane]: e.target.files![0] }));
    }
  };

  const isReady = Object.values(files).every(f => f !== null);

  const handleSubmit = () => {
    if (isReady) {
      // Cast to non-null since isReady checks it
      onImagesSelected(files as { [key: string]: File });
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-md w-full max-w-4xl">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Upload Lane Images</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {['lane1', 'lane2', 'lane3', 'lane4'].map((lane) => (
          <div key={lane} className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{lane}</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(lane, e)}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {files[lane] && (
              <div className="text-xs text-green-600 truncate">
                Selected: {files[lane]?.name}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <button
        onClick={handleSubmit}
        disabled={!isReady || isLoading}
        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
          isReady && !isLoading 
            ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' 
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {isLoading ? 'Processing...' : 'Start Simulation'}
      </button>
    </div>
  );
};
