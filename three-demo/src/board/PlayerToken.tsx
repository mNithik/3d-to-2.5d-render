import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { gridToGround, gridToScreen, isoDepth, screenToBoard } from '../iso';
import type { SimPlayer } from '../hooks/useLocalSimulation';

interface Props {
  player: SimPlayer;
  driven?: boolean;
}

/** Flat token — feet at ground anchor, matches phaser CityScene.drawToken. */
export function PlayerToken({ player, driven }: Props) {
  const ground = gridToGround(player.px, player.py);
  const depth = isoDepth(Math.round(player.px), Math.round(player.py), 0.1);
  const [x, y, z] = screenToBoard(ground.x, ground.y, depth);
  const color = useMemo(() => new THREE.Color(player.color), [player.color]);
  const shade = useMemo(() => new THREE.Color(player.shade), [player.shade]);
  const order = Math.round(depth);

  let arrowEnd: [number, number] | null = null;
  if (player.fx || player.fy) {
    const n = gridToScreen(player.fx, player.fy);
    const m = Math.hypot(n.x, n.y) || 1;
    arrowEnd = [(n.x / m) * 9, (n.y / m) * 9];
  }

  return (
    <group position={[x, y, z]}>
      {driven && (
        <mesh position={[0, -2, 0.003]} renderOrder={order}>
          <ringGeometry args={[10, 12, 24]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, -2, 0]} renderOrder={order}>
        <circleGeometry args={[9, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 9, 0.001]} renderOrder={order}>
        <planeGeometry args={[12, 18]} />
        <meshBasicMaterial color={shade} />
      </mesh>
      <mesh position={[0, 13.5, 0.002]} renderOrder={order}>
        <planeGeometry args={[12, 9]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 22, 0.003]} renderOrder={order}>
        <circleGeometry args={[5, 16]} />
        <meshBasicMaterial color="#ffd9b3" />
      </mesh>
      {arrowEnd && (
        <Line
          points={[
            [0, 22, 0.004],
            [arrowEnd[0], 22 - arrowEnd[1], 0.004],
          ]}
          color="#ffffff"
          lineWidth={2}
        />
      )}
    </group>
  );
}
