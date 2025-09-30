import React from 'react';

interface RequestsViewProps {
  type: string;
  onBack: () => void;
  onStartChat: (id: string) => void;
}

const RequestsView: React.FC<RequestsViewProps> = ({ type, onBack, onStartChat }) => {
  return (
    <div className="p-4">
      <button 
        onClick={onBack}
        className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Back
      </button>
      <h2 className="text-xl font-bold mb-4">{type} Requests</h2>
      <p>No requests available.</p>
    </div>
  );
};

export default RequestsView;