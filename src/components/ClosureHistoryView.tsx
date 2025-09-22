import React from 'react';

interface ClosureHistoryViewProps {
  onBack: () => void;
}

const ClosureHistoryView: React.FC<ClosureHistoryViewProps> = ({ onBack }) => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold">Closure History</h2>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          Your closure history will appear here.
        </p>
      </div>
    </div>
  );
};

export default ClosureHistoryView;