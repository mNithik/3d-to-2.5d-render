import {
  buildingSlots,
  floorCells,
  floorFrameAt,
  propSlots,
  treeCells,
} from '../map';
import { propScaleMul, type AtlasFrame } from '../atlas';
import { isoDepth } from '../iso';
import { AtlasSprite } from './AtlasSprite';
import { PlayerToken } from './PlayerToken';
import { useAtlas } from './useAtlas';
import { eventBus } from '../EventBus';
import type { SimPlayer } from '../hooks/useLocalSimulation';

interface Props {
  players: SimPlayer[];
  driving: number;
  view: 'p1' | 'p2' | 'p3' | 'split' | 'spectator';
}

export function CityScene({ players, driving, view }: Props) {
  const { texture, atlas, ready } = useAtlas();

  const onPick = (gx: number, gy: number) => {
    eventBus.emitTileClick({ x: gx, y: gy });
  };

  if (!ready) return null;

  const floors = [...floorCells()].sort(
    (a, b) => isoDepth(a.gx, a.gy, -0.5) - isoDepth(b.gx, b.gy, -0.5),
  );
  const buildings = [...buildingSlots()].sort(
    (a, b) => isoDepth(a.gx, a.gy, 0.05) - isoDepth(b.gx, b.gy, 0.05),
  );

  const drivingId =
    view === 'spectator' ? undefined : players[driving]?.id;

  return (
    <group>
      {floors.map(({ gx, gy }) => (
        <AtlasSprite
          key={`f-${gx}-${gy}`}
          texture={texture}
          atlas={atlas}
          frame={floorFrameAt(gx, gy)}
          gx={gx}
          gy={gy}
          anchor="cell"
          scaleMode="floor"
          depthOffset={-0.5}
          onPick={onPick}
        />
      ))}

      {buildings.map(({ gx, gy, frame }) => (
        <AtlasSprite
          key={`bd-${gx}-${gy}`}
          texture={texture}
          atlas={atlas}
          frame={frame}
          gx={gx}
          gy={gy}
          anchor="ground"
          scaleMode="cell"
          depthOffset={0.05}
        />
      ))}

      {treeCells().map(({ gx, gy }) => (
        <AtlasSprite
          key={`tr-${gx}-${gy}`}
          texture={texture}
          atlas={atlas}
          frame="tree"
          gx={gx}
          gy={gy}
          anchor="ground"
          scaleMode="cell"
          scaleMul={propScaleMul('tree')}
          depthOffset={0.15}
        />
      ))}

      {propSlots().map(({ gx, gy, frame }) => (
        <AtlasSprite
          key={`pr-${gx}-${gy}-${frame}`}
          texture={texture}
          atlas={atlas}
          frame={frame as AtlasFrame}
          gx={gx}
          gy={gy}
          anchor="ground"
          scaleMode="cell"
          scaleMul={propScaleMul(frame as 'prop_manhole' | 'pickup_spawn')}
          depthOffset={frame === 'prop_manhole' ? -0.4 : 0.12}
        />
      ))}

      {players.map((p) => (
        <PlayerToken
          key={p.id}
          player={p}
          driven={view !== 'spectator' && p.id === drivingId}
        />
      ))}
    </group>
  );
}
