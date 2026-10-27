import { useQuery } from '@tanstack/react-query'

// Live weather for the wall display: the National Weather Service forecast
// for Appleton International Airport and the latest KATW METAR. Fetched
// straight from the browser (both APIs allow it), so no backend is involved.

export const STATION = 'KATW'
// Appleton International Airport.
const LAT = 44.2581
const LON = -88.5192

const NWS = 'https://api.weather.gov'
const nwsGet = async url => {
  const res = await fetch(url, { headers: { Accept: 'application/geo+json' } })
  if (!res.ok) throw new Error(`NWS ${res.status}`)
  return res.json()
}

// The forecast URL for a point never changes, so look it up once.
const usePointForecastUrl = () =>
  useQuery({
    queryKey: ['weather', 'point', LAT, LON],
    queryFn: async () => {
      const data = await nwsGet(`${NWS}/points/${LAT},${LON}`)
      return data?.properties?.forecast || null
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 3,
    retryDelay: 30 * 1000,
  })

// Twice-daily periods ("Today", "Tonight", "Wednesday", ...).
export const useForecast = () => {
  const { data: url } = usePointForecastUrl()
  return useQuery({
    queryKey: ['weather', 'forecast', url],
    enabled: Boolean(url),
    queryFn: async () => {
      const data = await nwsGet(url)
      return data?.properties?.periods || []
    },
    refetchInterval: 30 * 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 15 * 60 * 1000,
    retry: 2,
  })
}

const cToF = c => (c == null ? null : Math.round((c * 9) / 5 + 32))

// Latest METAR at the airport. Asks both the Aviation Weather Center and
// NWS (NWS often runs an hour behind) and keeps whichever is newer.
const awcMetar = async () => {
  const res = await fetch(
    `https://aviationweather.gov/api/data/metar?ids=${STATION}&format=json`,
  )
  if (!res.ok) throw new Error(`AWC ${res.status}`)
  const [m] = await res.json()
  if (!m?.rawOb) throw new Error('AWC empty')
  return {
    raw: m.rawOb.trim(),
    tempF: cToF(m.temp),
    text: '',
    time: m.obsTime ? new Date(m.obsTime * 1000) : null,
  }
}

const nwsMetar = async () => {
  const data = await nwsGet(`${NWS}/stations/${STATION}/observations/latest`)
  const p = data?.properties || {}
  return {
    raw: (p.rawMessage || '').trim(),
    tempF: cToF(p.temperature?.value),
    text: p.textDescription || '',
    time: p.timestamp ? new Date(p.timestamp) : null,
  }
}

export const useMetar = () =>
  useQuery({
    queryKey: ['weather', 'metar', STATION],
    queryFn: async () => {
      const [awc, nws] = await Promise.allSettled([awcMetar(), nwsMetar()])
      const got = [awc, nws]
        .filter(r => r.status === 'fulfilled' && r.value.raw)
        .map(r => r.value)
        .sort((a, b) => (b.time || 0) - (a.time || 0))
      if (!got.length) throw new Error('No METAR')
      const best = got[0]
      // NWS has the plain-English sky description; borrow it if missing.
      if (!best.text && nws.status === 'fulfilled') best.text = nws.value.text
      return best
    },
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  })

// Collapse NWS periods into "today" and "tomorrow" cards. Before about 6pm
// NWS leads with the daytime period (high), after that with "Tonight" (low).
export const todayTomorrow = periods => {
  if (!periods?.length) return { today: null, tomorrow: null }
  const card = (day, night, label) => ({
    label,
    high: day?.temperature ?? null,
    low: night?.temperature ?? null,
    short: (day || night)?.shortForecast || '',
    isNight: !day,
    // Chance of precipitation for the period whose wording is shown.
    pop: (day || night)?.probabilityOfPrecipitation?.value ?? 0,
  })
  const [p0, p1, p2, p3] = periods
  if (p0.isDaytime) {
    return {
      today: card(p0, p1?.isDaytime ? null : p1, 'Today'),
      tomorrow: card(p2, p3, 'Tomorrow'),
    }
  }
  return {
    today: card(null, p0, 'Tonight'),
    tomorrow: card(p1, p2, 'Tomorrow'),
  }
}

// Pick an icon family from the NWS short forecast wording.
export const conditionKind = (short = '', isNight = false) => {
  const s = short.toLowerCase()
  if (/thunder|t-storm/.test(s)) return 'storm'
  if (/snow|flurr|sleet|ice|freezing|blizzard/.test(s)) return 'snow'
  if (/rain|shower|drizzle/.test(s)) return 'rain'
  if (/fog|haze|smoke|mist/.test(s)) return 'fog'
  if (/wind|breezy|blustery/.test(s) && !/cloud/.test(s)) return 'wind'
  if (/mostly cloudy|cloudy|overcast/.test(s) && !/partly/.test(s))
    return 'cloud'
  if (/partly|mostly sunny|mostly clear/.test(s))
    return isNight ? 'partlyNight' : 'partly'
  return isNight ? 'clearNight' : 'sun'
}
