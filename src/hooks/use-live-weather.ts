import { useCallback, useEffect, useState, useRef } from "react";
import { fetchRealWeather, fetchRealWeatherForState, simulateWeather, WeatherData } from "@/lib/agri-data";

interface UseLiveWeatherOptions {
  autoFetch?: boolean;
  fallbackToSimulated?: boolean;
  stateName?: string; // If provided, fetch weather for this state instead of geolocation
}

export function useLiveWeather(options: UseLiveWeatherOptions = {}) {
  const { autoFetch = true, fallbackToSimulated = false, stateName } = options;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the last successfully fetched state to avoid re-fetching unnecessarily
  const lastFetchedStateRef = useRef<string | undefined>(undefined);
  const weatherCacheRef = useRef<WeatherData | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let live: WeatherData;
      if (stateName && stateName.trim()) {
        // Fetch weather for the specified state
        live = await fetchRealWeatherForState(stateName);
      } else {
        // Fall back to browser geolocation only if we have a state
        throw new Error("No location provided and geolocation not available");
      }
      
      setWeather(live);
      weatherCacheRef.current = live;
      lastFetchedStateRef.current = stateName;
      return live;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch live weather";
      setError(message);
      console.error("Weather fetch error:", message);
      
      // Only show cached weather if we have it, don't generate random data
      if (weatherCacheRef.current) {
        setWeather(weatherCacheRef.current);
        return weatherCacheRef.current;
      }
      
      if (fallbackToSimulated) {
        const simulated = simulateWeather();
        setWeather(simulated);
        return simulated;
      }
      
      setWeather(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fallbackToSimulated, stateName]);

  useEffect(() => {
    if (!autoFetch) return;
    
    // Only fetch if the state has changed from the last fetch
    if (lastFetchedStateRef.current !== stateName) {
      void refresh();
    }
  }, [autoFetch, refresh, stateName]);

  return {
    weather,
    loading,
    error,
    refresh,
  };
}