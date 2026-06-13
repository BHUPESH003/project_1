import { useState } from 'react'

interface GeoState {
  loading: boolean
  error: string | null
}

/** Imperative wrapper over navigator.geolocation. */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ loading: false, error: null })

  function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        const msg = 'Location is not supported on this device'
        setState({ loading: false, error: msg })
        reject(new Error(msg))
        return
      }
      setState({ loading: true, error: null })
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState({ loading: false, error: null })
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        },
        (err) => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Search for your area instead.'
              : 'Could not get your location. Try again.'
          setState({ loading: false, error: msg })
          reject(new Error(msg))
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      )
    })
  }

  return { ...state, getCurrentPosition }
}
