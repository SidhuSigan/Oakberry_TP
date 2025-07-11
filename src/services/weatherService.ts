import { WeatherData } from '@/types';
import { loadWeatherCache, saveWeatherCache } from './storageService';

const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const ZURICH_COORDS = {
  lat: 47.3769,
  lon: 8.5417
};

// Get API key from environment or localStorage
const getApiKey = (): string => {
  // First check environment variable
  if (import.meta.env.VITE_OPENWEATHER_API_KEY) {
    return import.meta.env.VITE_OPENWEATHER_API_KEY;
  }

  // Then check localStorage settings
  const settings = localStorage.getItem('oakberry_settings');
  if (settings) {
    const parsed = JSON.parse(settings);
    if (parsed.weatherApiKey) {
      return parsed.weatherApiKey;
    }
  }

  return '';
};

export async function fetchWeatherData(): Promise<WeatherData[]> {
  try {
    // Check cache first (1 hour cache)
    const cache = loadWeatherCache(3600000); // 1 hour
    if (cache && cache.data) {
      return parseWeatherResponse(cache.data);
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('No OpenWeather API key configured. Using mock data.');
      return generateMockWeatherData();
    }

    const url = `${OPENWEATHER_API_URL}?lat=${ZURICH_COORDS.lat}&lon=${ZURICH_COORDS.lon}&appid=${apiKey}&units=metric&cnt=56`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Weather API request failed:', response.status);
      return generateMockWeatherData();
    }

    const data = await response.json();
    saveWeatherCache(data, 'zurich');

    return parseWeatherResponse(data);
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    return generateMockWeatherData();
  }
}

function parseWeatherResponse(data: any): WeatherData[] {
  const dailyData = new Map<string, any[]>();

  // Group by day
  data.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toDateString();

    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, []);
    }

    dailyData.get(dateKey)!.push(item);
  });

  // Process each day
  const weatherData: WeatherData[] = [];

  Array.from(dailyData.entries()).forEach(([dateKey, dayItems]) => {
    const date = new Date(dateKey);

    // Calculate daily aggregates
    const temps = dayItems.map(item => item.main.temp);
    const tempMax = Math.max(...temps);
    const tempMin = Math.min(...temps);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

    // Get most common weather condition
    const conditions = dayItems.map(item => item.weather[0]);
    const mainCondition = getMostCommonCondition(conditions);

    // Calculate total precipitation
    const precipitation = dayItems.reduce((total, item) => {
      return total + (item.rain?.['3h'] || 0) + (item.snow?.['3h'] || 0);
    }, 0);

    // Determine if sunny/hot for Zurich standards
    const isSunny = ['clear', 'few clouds'].includes(mainCondition.description.toLowerCase()) ||
                    mainCondition.main.toLowerCase() === 'clear';
    const isHot = tempMax >= 25; // 25°C is considered hot in Zurich

    weatherData.push({
      date,
      temp: avgTemp,
      tempMax,
      tempMin,
      description: mainCondition.description,
      icon: mainCondition.icon,
      precipitation,
      isSunny,
      isHot
    });
  });

  // Return only next 7 days
  return weatherData.slice(0, 7);
}

function getMostCommonCondition(conditions: any[]): any {
  const counts = new Map<string, number>();

  conditions.forEach(condition => {
    const key = condition.main;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  let maxCount = 0;
  let mostCommon = conditions[0];

  counts.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = conditions.find(c => c.main === key);
    }
  });

  return mostCommon;
}

function generateMockWeatherData(): WeatherData[] {
  const data: WeatherData[] = [];
  const today = new Date();

  // Realistic Zurich weather patterns
  const weatherPatterns = [
    { temp: 18, isSunny: true, description: 'Clear sky' },
    { temp: 20, isSunny: true, description: 'Few clouds' },
    { temp: 16, isSunny: false, description: 'Partly cloudy' },
    { temp: 22, isSunny: true, description: 'Clear sky' },
    { temp: 25, isSunny: true, description: 'Sunny' },
    { temp: 23, isSunny: true, description: 'Few clouds' },
    { temp: 19, isSunny: false, description: 'Cloudy' }
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const pattern = weatherPatterns[i % weatherPatterns.length];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // Higher chance of good weather on weekends for demo
    const adjustedPattern = isWeekend && Math.random() > 0.3 ?
      { ...pattern, temp: pattern.temp + 3, isSunny: true } : pattern;

    data.push({
      date,
      temp: adjustedPattern.temp,
      tempMax: adjustedPattern.temp + 5,
      tempMin: adjustedPattern.temp - 5,
      description: adjustedPattern.description,
      icon: adjustedPattern.isSunny ? '01d' : '02d',
      precipitation: adjustedPattern.isSunny ? 0 : Math.random() * 5,
      isSunny: adjustedPattern.isSunny,
      isHot: adjustedPattern.temp >= 25
    });
  }

  return data;
}

export function getWeatherIcon(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

export function getWeatherEmoji(weather: WeatherData): string {
  if (weather.isHot && weather.isSunny) return '☀️🔥';
  if (weather.isSunny) return '☀️';
  if (weather.precipitation > 0) return '🌧️';
  if (weather.description.toLowerCase().includes('cloud')) return '☁️';
  return '🌤️';
}

export function needsExtraStaff(weather: WeatherData, isWeekend: boolean): boolean {
  // Extra staff needed on sunny/hot days, especially weekends
  return weather.isHot || (weather.isSunny && isWeekend);
}

export function getStaffingRecommendation(weather: WeatherData, date: Date): string {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  if (weather.isHot && isWeekend) {
    return '🔥 Very busy day expected! Schedule 5-6 staff during peak hours.';
  } else if (weather.isHot || (weather.isSunny && isWeekend)) {
    return '☀️ Busy day expected. Schedule 4-5 staff during peak hours.';
  } else if (weather.precipitation > 5) {
    return '🌧️ Slower day expected. Normal staffing (3-4) should be fine.';
  }

  return 'Normal staffing levels recommended (3-4 during peak).';
}