import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Capsule } from '../types'
import { haversineDistance, calculateBearing } from '../hooks/useGeolocation'

interface ARSceneProps {
  userLat: number
  userLng: number
  deviceAlpha: number | null
  capsules: Capsule[]
  onCapsuleClick?: (id: string) => void
}

export default function ARScene({
  userLat,
  userLng,
  deviceAlpha,
  capsules,
  onCapsuleClick,
}: ARSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const capsuleMeshesRef = useRef<Map<string, THREE.Group>>(new Map())
  const animFrameRef = useRef<number>(0)

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera (matches device FOV)
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    cameraRef.current = camera

    // Renderer (transparent background)
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer
    containerRef.current.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    scene.add(directionalLight)

    // Point light for glow effect
    const pointLight = new THREE.PointLight(0xf59e0b, 1, 10)
    pointLight.position.set(0, 2, -3)
    scene.add(pointLight)

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Update capsule positions based on GPS + orientation
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return

    const scene = sceneRef.current
    const camera = cameraRef.current
    const renderer = rendererRef.current

    // Remove old meshes that are no longer in capsules list
    const currentIds = new Set(capsules.map((c) => c.id))
    capsuleMeshesRef.current.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        scene.remove(mesh)
        capsuleMeshesRef.current.delete(id)
      }
    })

    // Add/update capsule meshes
    capsules.forEach((capsule) => {
      const distance = haversineDistance(userLat, userLng, capsule.latitude, capsule.longitude)
      const bearing = calculateBearing(userLat, userLng, capsule.latitude, capsule.longitude)

      // Only render capsules within 500m
      if (distance > 500) return

      let group = capsuleMeshesRef.current.get(capsule.id)
      if (!group) {
        group = createCapsuleMesh(capsule)
        scene.add(group)
        capsuleMeshesRef.current.set(capsule.id, group)
      }

      // Position based on bearing relative to device heading
      const heading = deviceAlpha ?? 0
      let angleDiff = bearing - heading
      if (angleDiff > 180) angleDiff -= 360
      if (angleDiff < -180) angleDiff += 360

      // Only show if within ±60° field of view
      const visible = Math.abs(angleDiff) <= 60
      group.visible = visible

      if (visible) {
        // Convert angle to screen-space position
        const x = (angleDiff / 60) * 3 // spread across scene width
        const y = 0.5 // slightly above center
        const z = -Math.max(1, distance / 50) // further = more negative z

        group.position.set(x, y, z)

        // Scale based on distance
        const scale = Math.max(0.1, 1 - distance / 500)
        group.scale.setScalar(scale)
      }
    })

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      // Float animation for all visible capsules
      const time = Date.now() * 0.001
      capsuleMeshesRef.current.forEach((group) => {
        if (group.visible) {
          group.position.y += Math.sin(time * 2 + group.position.x) * 0.001
          group.rotation.y += 0.005
        }
      })

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [userLat, userLng, deviceAlpha, capsules])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}

/** Create a 3D envelope mesh group */
function createCapsuleMesh(capsule: Capsule): THREE.Group {
  const group = new THREE.Group()

  // Envelope body
  const envelopeGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.05)
  const envelopeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.3,
    metalness: 0.3,
    roughness: 0.7,
  })
  const envelope = new THREE.Mesh(envelopeGeometry, envelopeMaterial)
  group.add(envelope)

  // Envelope flap (triangle on top)
  const flapGeometry = new THREE.ConeGeometry(0.3, 0.2, 4)
  const flapMaterial = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xd97706,
    emissiveIntensity: 0.2,
    metalness: 0.3,
    roughness: 0.7,
  })
  const flap = new THREE.Mesh(flapGeometry, flapMaterial)
  flap.position.set(0, 0.25, 0)
  flap.rotation.z = Math.PI
  group.add(flap)

  // Glow particles
  const particlesGeometry = new THREE.BufferGeometry()
  const particleCount = 30
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 1.2
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const particlesMaterial = new THREE.PointsMaterial({
    color: 0xfbbf24,
    size: 0.03,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  })
  const particles = new THREE.Points(particlesGeometry, particlesMaterial)
  group.add(particles)

  // Store capsule ID for click detection
  group.userData = { capsuleId: capsule.id }

  return group
}
