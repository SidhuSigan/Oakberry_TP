import React from 'react';
import { WeatherData } from '../types';

interface WeatherViewProps {
  weather: WeatherData[];
  isLoading?: boolean;
}

const WeatherView: React.FC<WeatherViewProps> = ({
  weather,
  isLoading = false
}) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Weather Forecast</h2>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="spinner"></div>
        </div>
      ) : (
        <p className="text-gray-600">This component will show weather information for Zurich.</p>
      )}
      {/* TODO: Implement weather view functionality */}
    </div>
  );
};

export default WeatherView;