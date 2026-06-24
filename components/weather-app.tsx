"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Forecast,
  GeocodingResult,
  WeatherError,
  describeWeatherCode,
  fetchForecast,
  searchCities
} from "@/lib/weather";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const defaultCity: GeocodingResult = {
  id: 5128581,
  name: "New York",
  country: "United States",
  countryCode: "US",
  latitude: 40.71427,
  longitude: -74.00597,
  timezone: "America/New_York",
  admin1: "New York"
};

function formatHour(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    timeZone
  }).format(new Date(iso));
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(`${iso}T12:00:00`));
}

function locationLabel(city: GeocodingResult) {
  return [city.name, city.admin1, city.country].filter(Boolean).join(", ");
}

export function WeatherApp() {
  const [query, setQuery] = useState(defaultCity.name);
  const [city, setCity] = useState<GeocodingResult>(defaultCity);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(savedTheme ? savedTheme === "dark" : prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => setOfflineReady(true))
      .catch(() => setOfflineReady(false));
  }, []);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2 || trimmed === city.name) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    searchCities(trimmed, controller.signal)
      .then(setResults)
      .catch((requestError: unknown) => {
        if ((requestError as Error).name !== "AbortError") {
          setResults([]);
        }
      })
      .finally(() => setIsSearching(false));

    return () => controller.abort();
  }, [city.name, debouncedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingWeather(true);
    setError(null);

    fetchForecast(city, controller.signal)
      .then(setForecast)
      .catch((requestError: unknown) => {
        if ((requestError as Error).name === "AbortError") {
          return;
        }

        setError(requestError instanceof WeatherError ? requestError.message : "Unable to load the forecast right now.");
      })
      .finally(() => setIsLoadingWeather(false));

    return () => controller.abort();
  }, [city]);

  const currentSummary = useMemo(() => {
    if (!forecast) {
      return null;
    }

    return describeWeatherCode(forecast.current.weatherCode);
  }, [forecast]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstResult = results[0];
    if (firstResult) {
      setCity(firstResult);
      setQuery(firstResult.name);
      setResults([]);
    }
  };

  const selectCity = (nextCity: GeocodingResult) => {
    setCity(nextCity);
    setQuery(nextCity.name);
    setResults([]);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/72 p-4 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-950/68 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Weather PWA</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">Forecast for {city.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:block">
            {offlineReady ? "Offline cache ready" : "Live weather"}
          </span>
          <button
            type="button"
            onClick={() => setIsDark((value) => !value)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-sky-400"
            aria-pressed={isDark}
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <div className="flex flex-col gap-6">
          <form
            onSubmit={handleSubmit}
            className="relative rounded-3xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-950/70"
          >
            <label htmlFor="city-search" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Search city
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="city-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try London, Tokyo, Lagos..."
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-sky-950"
                autoComplete="off"
              />
              <button
                type="submit"
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!results.length}
              >
                Search
              </button>
            </div>

            {(isSearching || results.length > 0) && (
              <div className="absolute left-4 right-4 top-[6.7rem] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                {isSearching && <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-300">Searching cities...</div>}
                {results.map((result) => (
                  <button
                    type="button"
                    key={`${result.id}-${result.latitude}-${result.longitude}`}
                    onClick={() => selectCity(result)}
                    className="block w-full px-4 py-3 text-left transition hover:bg-sky-50 dark:hover:bg-slate-800"
                  >
                    <span className="block font-semibold text-slate-900 dark:text-white">{locationLabel(result)}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {result.latitude.toFixed(2)}, {result.longitude.toFixed(2)} · {result.timezone}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Current weather</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{locationLabel(city)}</h2>
              </div>
              <div className="rounded-2xl bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                {forecast?.timezone ?? city.timezone}
              </div>
            </div>

            {isLoadingWeather && <WeatherSkeleton />}

            {!isLoadingWeather && error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}

            {!isLoadingWeather && forecast && currentSummary && (
              <div className="mt-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-6xl font-black tracking-tight text-slate-950 dark:text-white">
                      {Math.round(forecast.current.temperature)}°
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-200">{currentSummary.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{currentSummary.description}</p>
                  </div>
                  <div className="text-right text-sm text-slate-600 dark:text-slate-300">
                    <p>Feels like {Math.round(forecast.current.apparentTemperature)}°</p>
                    <p>Wind {Math.round(forecast.current.windSpeed)} km/h</p>
                    <p>Humidity {forecast.current.humidity}%</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Precipitation" value={`${forecast.current.precipitationProbability}%`} />
                  <Metric label="Pressure" value={`${Math.round(forecast.current.pressure)} hPa`} />
                  <Metric label="UV index" value={forecast.current.uvIndex.toFixed(1)} />
                  <Metric label="Cloud cover" value={`${forecast.current.cloudCover}%`} />
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Next 24 hours</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Hourly forecast</p>
            </div>

            <div className="mt-4 grid auto-cols-[8.75rem] grid-flow-col gap-3 overflow-x-auto pb-2">
              {(forecast?.hourly ?? []).slice(0, 24).map((hour) => {
                const summary = describeWeatherCode(hour.weatherCode);
                return (
                  <article key={hour.time} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{formatHour(hour.time, forecast?.timezone ?? city.timezone)}</p>
                    <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{Math.round(hour.temperature)}°</p>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600 dark:text-slate-300">{summary.title}</p>
                    <p className="mt-3 text-xs font-semibold text-sky-700 dark:text-sky-300">{hour.precipitationProbability}% rain</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">7-day forecast</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daily outlook</p>
            </div>

            <div className="mt-4 grid gap-3">
              {(forecast?.daily ?? []).map((day) => {
                const summary = describeWeatherCode(day.weatherCode);
                return (
                  <article
                    key={day.date}
                    className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div>
                      <p className="font-bold text-slate-950 dark:text-white">{formatDay(day.date)}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{summary.title}</p>
                    </div>
                    <div className="hidden text-sm text-slate-600 dark:text-slate-300 sm:block">
                      <p>Sunrise {day.sunrise}</p>
                      <p>Sunset {day.sunset}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-950 dark:text-white">
                        {Math.round(day.temperatureMax)}° / {Math.round(day.temperatureMin)}°
                      </p>
                      <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">{day.precipitationProbabilityMax}% rain</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="h-16 w-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 h-5 w-44 rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}
