import { useState } from 'react'

interface VirtualLocation {
  lat: number
  lng: number
}

function readVirtualLocationFromURL(): VirtualLocation | null {
  const params = new URLSearchParams(window.location.search)
  const lat = params.get('lat')
  const lng = params.get('lng')
  if (lat && lng) {
    return { lat: parseFloat(lat), lng: parseFloat(lng) }
  }
  return null
}

export function useVirtualLocation() {
  const [virtualLocation, setVirtualLocation] = useState<VirtualLocation | null>(
    readVirtualLocationFromURL
  )
  
  // 提供设置方法
  const setVirtual = (lat: number, lng: number) => {
    setVirtualLocation({ lat, lng })
    // 更新 URL
    const url = new URL(window.location.href)
    url.searchParams.set('lat', lat.toString())
    url.searchParams.set('lng', lng.toString())
    window.history.replaceState({}, '', url.toString())
  }
  
  return { virtualLocation, setVirtual }
}