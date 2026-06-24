# Weather

A production-ready weather Progressive Web App built with Next.js 15, TypeScript, Tailwind CSS, and the free Open-Meteo APIs.

## Features

- City search powered by the Open-Meteo Geocoding API
- Current weather, hourly forecast, and 7-day forecast
- Dark mode with saved preference
- Responsive dashboard layout
- Installable PWA manifest and service worker
- Offline app shell and weather API response caching
- Vercel-ready configuration

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

## API Notes

This app calls public Open-Meteo endpoints directly from the browser, so no API key or server environment variables are required.
