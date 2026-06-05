import { useState, useEffect } from 'react'

interface VirtualLocation {
  lat: number
  lng: number
}

export function useVirtualLocation() {
  const [virtualLocation, setVirtualLocation] = useState<VirtualLocation | null>(null)
  
  // 从 URL 参数读取虚拟位置
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const lat = params.get('lat')
    const lng = params.get('lng')
    if (lat && lng) {
      setVirtualLocation({ lat: parseFloat(lat), lng: parseFloat(lng) })
    }
  }, [])
  
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