import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Box, Paper, Stack, Text } from '@mantine/core'
import type { Mesh } from 'three'

function SpinningCube() {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += delta * 0.6
    meshRef.current.rotation.y += delta * 0.9
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.4, 1.4, 1.4]} />
      <meshStandardMaterial color="#4dabf7" metalness={0.35} roughness={0.25} />
    </mesh>
  )
}

export default function Scene3D() {
  return (
    <Paper withBorder radius="md" p="md" h={420}>
      <Stack gap="xs" h="100%">
        <Text size="sm" c="dimmed">
          Three.js via React Three Fiber — ready for fast WebGL rendering
        </Text>
        <Box flex={1} style={{ minHeight: 0 }}>
          <Canvas shadows dpr={[1, 2]}>
            <Suspense fallback={null}>
              <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />
              <ambientLight intensity={0.4} />
              <directionalLight position={[4, 6, 3]} intensity={1.2} castShadow />
              <SpinningCube />
              <OrbitControls enableDamping dampingFactor={0.08} />
            </Suspense>
          </Canvas>
        </Box>
      </Stack>
    </Paper>
  )
}
