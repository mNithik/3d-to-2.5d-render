import { useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { ATLAS_JSON, ATLAS_PATH, type AtlasData } from '../atlas';

export function useAtlas(): {
  texture: THREE.Texture;
  atlas: AtlasData;
  ready: boolean;
} {
  const texture = useLoader(THREE.TextureLoader, ATLAS_PATH);
  const [atlas, setAtlas] = useState<AtlasData | null>(null);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
  }, [texture]);

  useEffect(() => {
    let cancelled = false;
    fetch(ATLAS_JSON)
      .then((r) => r.json())
      .then((data: AtlasData) => {
        if (!cancelled) setAtlas(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { texture, atlas: atlas!, ready: atlas !== null };
}
