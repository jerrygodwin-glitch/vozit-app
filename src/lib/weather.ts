// @ts-nocheck
// Weather isn't captured by the phone — there's no weather sensor — so this
// looks up the real recorded conditions for a location from an external
// source. Uses Open-Meteo (free, no API key required) rather than a
// key-gated provider, so this works out of the box with zero setup.
//
// Captures CURRENT conditions at the location, which is accurate for the
// live/breaking-news case this app is built around. Matching weather to an
// older claimed event time (via Open-Meteo's historical archive endpoint)
// is a reasonable future enhancement, not implemented here.
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
}

export async function lookupWeather(lat: number, lng: number): Promise<{
  condition: string
  temp_c: number | null
  windspeed_kmh: number | null
  checked_at: string
} | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const cw = data.current_weather
    if (!cw) return null
    return {
      condition: WMO_DESCRIPTIONS[cw.weathercode] || `WMO code ${cw.weathercode}`,
      temp_c: typeof cw.temperature === 'number' ? cw.temperature : null,
      windspeed_kmh: typeof cw.windspeed === 'number' ? cw.windspeed : null,
      checked_at: new Date().toISOString(),
    }
  } catch {
    return null
  }
}
