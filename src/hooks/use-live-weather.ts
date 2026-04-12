import { useCallback, useEffect, useState } from "react";
import { fetchRealWeather, simulateWeather, WeatherData } from "@/lib/agri-data";

interface UseLiveWeatherOptions {
  autoFetch?: boolean;
  fallbackToSimulated?: boolean;
}

export function useLiveWeather(options: UseLiveWeatherOptions = {}) {
  const { autoFetch = true, fallbackToSimulated = true } = options;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const live = await fetchRealWeather();
      setWeather(live);
      return live;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch live weather";
      setError(message);
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
  }, [fallbackToSimulated]);

  useEffect(() => {
    if (!autoFetch) return;
    void refresh();
  }, [autoFetch, refresh]);

  return {
    weather,
    loading,
    error,
    refresh,
  };
}