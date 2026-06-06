import type { RenderState } from '../renderState';
import {
  buildingSlots,
  floorCells,
  floorFrameAt,
  propSlots,
  treeCells,
} from '../map';
import { propScaleMul, type AtlasFrame } from '../atlas';
import { AtlasSprite } from './AtlasSprite';
import { PlayerToken } from './PlayerToken';
import { useAtlas } from './useAtlas';
import { eventBus } from '../EventBus';

interface Props {
  renderState: RenderState;
  drivingPlayerId?: number;
}

export function CityScene({ renderState, drivingPlayerId }: Props) {
  const { texture, atlas, ready } = useAtlas();

  const onPick = (gx: number, gy: number) => {
    eventBus.emitTileClick({ x: gx, y: gy });
  };

  if (!ready) return null;

  const floors = [...floorCells()].sort(
    (a, b) => a.gx + a.gy - (b.gx + b.gy),
  );
  const buildings = [...buildingSlots()].sort(
    (a, b) => a.gx + a.gy - (b.gx + b.gy),
  );

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

      {renderState.tokens.map((tok) => (
        <PlayerToken
          key={tok.playerId}
          token={tok}
          driven={tok.playerId === drivingPlayerId}
        />
      ))}
    </group>
  );
}
