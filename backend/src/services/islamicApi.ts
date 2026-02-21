export const getPrayerTimes = async (lat : number, lon : number, method = 3, school = 1) => {
    const apiKey = process.env.ISLAMIC_API_KEY;
    const url = `https://islamicapi.com/api/v1/prayer-time/?lat=${lat}&lon=${lon}&method=${method}&school=${school}&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching prayer times: ${response.statusText}`);
    }
    return await response.json();
}
