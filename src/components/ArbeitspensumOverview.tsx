import React from 'react';
import { Worker, WorkerStats } from '../types';

interface ArbeitspensumOverviewProps {
  workers: Worker[];
  workerStats: WorkerStats[];
}

const ArbeitspensumOverview: React.FC<ArbeitspensumOverviewProps> = ({
  workers,
  workerStats
}) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Arbeitspensum Overview</h2>
      <p className="text-gray-600">This component will show worker statistics and Arbeitspensum tracking.</p>
      {/* TODO: Implement Arbeitspensum overview functionality */}
    </div>
  );
};

export default ArbeitspensumOverview;