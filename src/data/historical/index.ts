// 검증된 역사 라이브러리(v3 에서 쓰던 인물·사료·유물·사건·장소, verified·reconstructed 만). v5 에피소드 1 은 src/data/v5 를 쓴다.
import { persons } from './persons';
import { artifacts } from './artifacts';
import { sources } from './sources';
import { events } from './events';
import { places } from './places';

export const historical = { persons, artifacts, sources, events, places };
