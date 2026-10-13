// 맵 배치(상호작용 오브젝트, NPC 동선·대사). 대사마다 provenance 표기.
import type { ContentModule } from '@/core/types';
import { worldObjects } from './worldObjects';
import { npcs } from './npcs';

export const world: ContentModule = { worldObjects, npcs };
