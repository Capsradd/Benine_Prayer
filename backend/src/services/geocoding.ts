interface GeocodeResult {
    city: string;
    lat: number;
    lon: number;
}

interface CacheEntry {
    value: GeocodeResult;
    expiresAt: number;
}

const geocodeCache = new Map<string, CacheEntry>();

const GEOCODE_CACHE_TTL_MS = (() => {
    const parsed = Number(process.env.GEOCODE_CACHE_TTL_MS ?? 60 * 60 * 1000);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 1000;
})();

export const geocodeCity = async (cityName: string): Promise<GeocodeResult> => {
    const normalizedCity = cityName.trim().toLowerCase();
    const cached = geocodeCache.get(normalizedCity);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
        return cached.value;
    }

    if (cached) {
        geocodeCache.delete(normalizedCity);
    }

    const UserAgent = process.env.user_agent!;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': UserAgent
        }
    });

    if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
        throw new Error("City not found");
    }

    const result: GeocodeResult = {
        city: data[0].display_name,
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };

    geocodeCache.set(normalizedCity, {
        value: result,
        expiresAt: now + GEOCODE_CACHE_TTL_MS
    });

    return result;
}
