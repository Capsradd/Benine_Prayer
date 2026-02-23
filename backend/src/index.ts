import { Elysia, t } from "elysia";
import cors from "@elysiajs/cors";
import { getPrayerTimes } from "./services/islamicApi";
import { geocodeCity } from "./services/geocoding";

// Schema definitions
const schemas = {
  prayerDataQuery: t.Object({
    city: t.String({ minLength: 1, maxLength: 100 })
  }),
  prayerDataResponse: t.Object({
    city: t.String(),
    lat: t.Number(),
    lon: t.Number(), 
    prayerTimes: t.Any(),
    isIndonesia: t.Boolean(),
    currentTime: t.Object({
      timestamp: t.Number(),
      formatted: t.String(),
      utcOffset: t.String()
    })
  })
} as const;

interface PrayerDataResponse {
  city: string;
  lat: number;
  lon: number;
  prayerTimes: any;
  isIndonesia: boolean;
  currentTime: {
    timestamp: number;
    formatted: string;
    utcOffset: string;
  };
}

interface CacheEntry {
  value: PrayerDataResponse;
  expiresAt: number;
}

// Cache utilities
const createCacheUtilities = () => {
  const cache = new Map<string, CacheEntry>();
  const TTL_MS = (() => {
    const parsed = Number(process.env.PRAYER_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 6 * 60 * 60 * 1000;
  })();

  const getCacheKey = (cityName: string): string => {
    const today = new Date().toISOString().split('T')[0];
    return `${cityName.trim().toLowerCase()}:${today}`;
  };

  const calculateCityTime = (utcOffset: string) => {
    const offsetSign = utcOffset.charAt(0) === '-' ? -1 : 1;
    const offsetHours = parseInt(utcOffset.substring(1, 3));
    const offsetMinutes = parseInt(utcOffset.substring(4, 6));
    const totalOffsetMs = offsetSign * (offsetHours * 60 + offsetMinutes) * 60000;

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cityTime = new Date(utc + totalOffsetMs);
    
    return {
      timestamp: cityTime.getTime(),
      formatted: cityTime.toISOString(),
      utcOffset
    };
  };

  return { cache, TTL_MS, getCacheKey, calculateCityTime };
};

const { cache: prayerDataCache, TTL_MS: PRAYER_CACHE_TTL_MS, getCacheKey, calculateCityTime } = createCacheUtilities();

const app = new Elysia({
    name: 'prayer-api',
    aot: true,
    normalize: true,
    detail: {
      tags: ['Prayer API'],
      description: 'Islamic Prayer Times API with caching'
    }
  })
  .use(cors())
  .derive(({ headers }) => ({
    userAgent: headers['user-agent'] ?? 'prayer-app'
  }))
  .model(schemas)
  .get(
    "/api/prayer-data",
    async ({ query, set }) => {
    const cacheKey = getCacheKey(query.city);
    const cached = prayerDataCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    if (cached) {
      prayerDataCache.delete(cacheKey);
    }

    try {
      const geoData = await geocodeCity(query.city);

      const isIndonesia = geoData.city.toLowerCase().includes("indonesia");
      const method = isIndonesia ? 20 : 3;

      const prayerTimes = await getPrayerTimes(geoData.lat, geoData.lon, method);
      
      // Calculate current time for the city timezone
      const timezone = prayerTimes?.data?.timezone;
      const utcOffset = timezone?.utc_offset || '+00:00';
      const currentTime = calculateCityTime(utcOffset);
      
      const result: PrayerDataResponse = {
        city: geoData.city,
        lat: geoData.lat,
        lon: geoData.lon,
        prayerTimes,
        isIndonesia,
        currentTime
      };

      prayerDataCache.set(cacheKey, {
        value: result,
        expiresAt: now + PRAYER_CACHE_TTL_MS
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.toLowerCase().includes("city not found")) {
        set.status = 404;
        return {
          error: "NOT_FOUND",
          message: "City not found"
        };
      }

      set.status = 500;
      return {
        error: "INTERNAL_ERROR", 
        message: `Internal Server Error: ${message}`
      };
    }
    },
    {
      query: 'prayerDataQuery',
      response: {
        200: 'prayerDataResponse',
        404: t.Object({
          error: t.Literal('NOT_FOUND'),
          message: t.String()
        }),
        500: t.Object({
          error: t.Literal('INTERNAL_ERROR'),
          message: t.String()
        })
      },
      detail: {
        summary: 'Get prayer times for a city',
        description: 'Fetches Islamic prayer times for a given city with automatic geocoding and caching',
        tags: ['Prayer Times']
      }
    }
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
