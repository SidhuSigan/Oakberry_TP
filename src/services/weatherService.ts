import { WeatherData } from '@/types';
import { loadWeatherCache, saveWeatherCache } from './storageService';

const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const ZURICH_COORDS = {
  lat: 47.3769,
  lon: 8.5417
};

// You'll need to add your API key here or load it from settings
const getApiKey = (): string => {
  // In production, this should come from user settings
  return import.meta.env.VITE_OPENWEATHER_API_KEY || '';
};

export async function fetchWeatherData(): Promise<WeatherData[]> {
  try {
    // Check cache first
    const cache = loadWeatherCache();
    if (cache && cache.data) {
      return parseWeatherResponse(cache.data);
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('No OpenWeather API key configured');
      return generateMockWeatherData();
    }

    const url = `${OPENWEATHER_API_URL}?lat=${ZURICH_COORDS.lat}&lon=${ZURICH_COORDS.lon}&appid=${apiKey}&units=metric&cnt=56`; // 7 days * 8 (3-hour intervals)

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();
    saveWeatherCache(data);

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

  dailyData.forEach((dayItems, dateKey) => {
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

    // Determine if sunny/hot
    const isSunny = ['clear', 'few clouds'].includes(mainCondition.description.toLowerCase());
    const isHot = tempMax >= 25; // 25°C threshold for "hot"

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

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // Generate realistic weather for Zurich
    const baseTemp = 15 + Math.random() * 10; // 15-25°C
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isSunny = Math.random() > 0.4; // 60% chance of sun

    data.push({
      date,
      temp: baseTemp,
      tempMax: baseTemp + 5,
      tempMin: baseTemp - 5,
      description: isSunny ? 'Clear sky' : 'Partly cloudy',
      icon: isSunny ? '01d' : '02d',
      precipitation: isSunny ? 0 : Math.random() * 5,
      isSunny,
      isHot: baseTemp > 22 && isSunny
    });
  }

  return data;
}

export function getWeatherIcon(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

export function getWeatherEmoji(weather: WeatherData): string {
  if (weather.isSunny && weather.isHot) return '☀️🔥';
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
    return '🔥 Very busy day expected! Consider 5-6 staff during peak hours.';
  } else if (weather.isHot || (weather.isSunny && isWeekend)) {
    return '☀️ Busy day expected. Consider 4-5 staff during peak hours.';
  } else if (weather.precipitation > 5) {
    return '🌧️ Slower day expected due to rain. Normal staffing should be fine.';
  }

  return 'Normal staffing levels recommended.';
}