import React from 'react';
import { Worker } from '../types';

interface HolidayCalendarProps {
  workers: Worker[];
  onUpdateWorker: (worker: Worker) => void;
}

const HolidayCalendar: React.FC<HolidayCalendarProps> = ({
  workers,
  onUpdateWorker
}) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Holiday Calendar</h2>
      <p className="text-gray-600">This component will allow managing worker holidays and absences.</p>
      {/* TODO: Implement holiday calendar functionality */}
    </div>
  );
};

export default HolidayCalendar;