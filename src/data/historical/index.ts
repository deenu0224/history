// 검증된 역사 사실(verified, 출처 url 필수) 또는 사실 기반 재구성(reconstructed). fictional 금지.
import type { ContentModule } from '@/core/types';
import { persons } from './persons';
import { artifacts } from './artifacts';
import { sources } from './sources';
import { events } from './events';
import { places } from './places';

export const historical: ContentModule = { persons, artifacts, sources, events, places };
