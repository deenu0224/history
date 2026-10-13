// Contract shared by world and UI. Implementation: world track (WebAudio synthesis, no asset files).
export type SfxName = 'discover' | 'success' | 'partial' | 'fail' | 'page' | 'step' | 'open' | 'close' | 'observe' | 'return' | 'select';
export type Ambience = 'past' | 'modern' | 'none';

export function unlockAudio(): void {}
export function playSfx(_name: SfxName): void {}
export function setAmbience(_kind: Ambience): void {}
export function setVolume(_master: number): void {}
