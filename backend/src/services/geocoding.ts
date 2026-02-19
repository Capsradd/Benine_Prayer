export const geocodeCity = async (cityName: string) => {
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

    return {
        city: data[0].display_name,
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
}
