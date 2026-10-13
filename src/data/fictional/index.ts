// SF 설정(연구소·관측·말소) 관련 가상 콘텐츠. provenance 는 fictional.
import type { ContentModule } from '@/core/types';
import { persons } from './persons';
import { places } from './places';
import { events } from './events';

export const fictional: ContentModule = { persons, places, events };
