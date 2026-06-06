import { useMemo } from 'react';
import * as THREE from 'three';
import { boardZFromOrder, gridToGround, isoRenderOrder, screenToBoard } from '../iso';
import type { RenderToken } from '../renderState';

interface Props {
  token: RenderToken;
  driven?: boolean;
}

export function PlayerToken({ token, driven }: Props) {
  const ground = gridToGround(token.x, token.y);
  const renderOrder = isoRenderOrder(
    Math.round(token.x),
    Math.round(token.y),
    'player',
    0.1,
  );
  const [x, y, z] = screenToBoard(ground.x, ground.y, boardZFromOrder(renderOrder));
  const color = useMemo(() => new THREE.Color(token.color), [token.color]);
  const shade = useMemo(() => color.clone().multiplyScalar(0.65), [color]);

  return (
    <group position={[x, y, z]} renderOrder={renderOrder}>
      {driven && (
        <mesh position={[0, 2, 0]}>
          <ringGeometry args={[10, 12, 24]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, -14, 0]}>
        <boxGeometry args={[12, 18, 1]} />
        <meshBasicMaterial color={shade} />
      </mesh>
      <mesh position={[0, -5, 0]}>
        <boxGeometry args={[12, 9, 1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 6, 0]}>
        <circleGeometry args={[5, 16]} />
        <meshBasicMaterial color="#ffd9b3" />
      </mesh>
    </group>
  );
}
