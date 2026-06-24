export type GeocodingResult = {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
};

type GeocodingApiResult = {
  id: number;
  name: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  admin1?: string;
};

type GeocodingResponse = {
  results?: GeocodingApiResult[];
};

type ForecastResponse = {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation_probability: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    uv_index: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

export type Forecast = {
  timezone: string;
  current: {
    time: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    precipitationProbability: number;
    weatherCode: number;
    cloudCover: number;
    pressure: number;
    windSpeed: number;
    uvIndex: number;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    apparentTemperature: number;
    precipitationProbability: number;
    weatherCode: number;
    windSpeed: number;
  }>;
  daily: Array<{
    date: string;
    weatherCode: number;
    temperatureMax: number;
    temperatureMin: number;
    precipitationProbabilityMax: number;
    sunrise: string;
    sunset: string;
  }>;
};

export class WeatherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherError";
  }
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: "7",
    language: "en",
    format: "json"
  });

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, {
    signal,
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new WeatherError("City search is unavailable right now.");
  }

  const data = (await response.json()) as GeocodingResponse;

  return (data.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    country: result.country ?? "Unknown country",
    countryCode: result.country_code ?? "",
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone ?? "auto",
    admin1: result.admin1
  }));
}

export async function fetchForecast(city: GeocodingResult, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    timezone: city.timezone || "auto",
    forecast_days: "7",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "uv_index"
    ].join(","),
    hourly: ["temperature_2m", "apparent_temperature", "precipitation_probability", "weather_code", "wind_speed_10m"].join(","),
    daily: ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max", "sunrise", "sunset"].join(",")
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    signal,
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new WeatherError("Forecast data is unavailable right now.");
  }

  const data = (await response.json()) as ForecastResponse;

  return {
    timezone: data.timezone,
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      precipitationProbability: data.current.precipitation_probability,
      weatherCode: data.current.weather_code,
      cloudCover: data.current.cloud_cover,
      pressure: data.current.pressure_msl,
      windSpeed: data.current.wind_speed_10m,
      uvIndex: data.current.uv_index
    },
    hourly: data.hourly.time.map((time, index) => ({
      time,
      temperature: data.hourly.temperature_2m[index],
      apparentTemperature: data.hourly.apparent_temperature[index],
      precipitationProbability: data.hourly.precipitation_probability[index],
      weatherCode: data.hourly.weather_code[index],
      windSpeed: data.hourly.wind_speed_10m[index]
    })),
    daily: data.daily.time.map((date, index) => ({
      date,
      weatherCode: data.daily.weather_code[index],
      temperatureMax: data.daily.temperature_2m_max[index],
      temperatureMin: data.daily.temperature_2m_min[index],
      precipitationProbabilityMax: data.daily.precipitation_probability_max[index],
      sunrise: formatTime(data.daily.sunrise[index]),
      sunset: formatTime(data.daily.sunset[index])
    }))
  };
}

export function describeWeatherCode(code: number) {
  const weatherCodes: Record<number, { title: string; description: string }> = {
    0: { title: "Clear sky", description: "Bright and settled conditions." },
    1: { title: "Mainly clear", description: "Mostly bright with a few clouds." },
    2: { title: "Partly cloudy", description: "A mix of sun and cloud cover." },
    3: { title: "Overcast", description: "Clouds are dominating the sky." },
    45: { title: "Fog", description: "Visibility may be reduced." },
    48: { title: "Rime fog", description: "Cold fog with icy deposits possible." },
    51: { title: "Light drizzle", description: "Light, patchy drizzle around." },
    53: { title: "Drizzle", description: "Steady drizzle is expected." },
    55: { title: "Dense drizzle", description: "Persistent drizzle could make roads slick." },
    56: { title: "Freezing drizzle", description: "Light freezing drizzle is possible." },
    57: { title: "Dense freezing drizzle", description: "Icy drizzle may affect travel." },
    61: { title: "Light rain", description: "A light rain spell is moving through." },
    63: { title: "Rain", description: "Steady rainfall is expected." },
    65: { title: "Heavy rain", description: "Heavy rainfall could reduce visibility." },
    66: { title: "Freezing rain", description: "Light freezing rain is possible." },
    67: { title: "Heavy freezing rain", description: "Icy rainfall may create hazards." },
    71: { title: "Light snow", description: "Light snowfall is expected." },
    73: { title: "Snow", description: "Steady snow is likely." },
    75: { title: "Heavy snow", description: "Heavy snow may affect travel." },
    77: { title: "Snow grains", description: "Small snow grains are possible." },
    80: { title: "Light showers", description: "Brief showers may pass through." },
    81: { title: "Showers", description: "Rain showers are likely." },
    82: { title: "Heavy showers", description: "Intense showers may arrive quickly." },
    85: { title: "Light snow showers", description: "Brief snow showers are possible." },
    86: { title: "Heavy snow showers", description: "Heavy snow showers may develop." },
    95: { title: "Thunderstorm", description: "Thunderstorms are possible." },
    96: { title: "Thunderstorm with hail", description: "Thunderstorms may bring small hail." },
    99: { title: "Severe thunderstorm", description: "Thunderstorms may bring heavy hail." }
  };

  return weatherCodes[code] ?? { title: "Variable weather", description: "Conditions may change through the day." };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
