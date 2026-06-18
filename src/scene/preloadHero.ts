import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

import { HERO_SCENE_GLB_URL } from './heroAssetUrls'

/** Warm the R3F loader cache for the hero GLB. */
export function preloadHeroGlb(): void {
  useLoader.preload(GLTFLoader, HERO_SCENE_GLB_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder)
  })
}
