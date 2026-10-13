import Phaser from 'phaser';
import type { NpcDef, Waypoint } from '@/core/types';
import { findPath, nearestWalkable } from '../logic/pathfinding';
import { facingFromVector } from '../logic/interact';
import { TILE, type Facing, type Pt } from '../logic/types';
import { resolveNpcSprite } from '../keys';
import { charFrame } from '../art';

const FEET_DY = 22;
export const tileToFeet = (t: Pt): Pt => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + FEET_DY });
export const feetToTile = (p: Pt): Pt => ({ x: Math.floor(p.x / TILE), y: Math.floor((p.y - 4) / TILE) });

const wpId = (w: Waypoint | undefined) => (w ? `${w.time}:${w.x},${w.y}:${w.sceneId ?? ''}` : '');

/** 일정에 따라 걷고 일하는 NPC. 플레이어(관측자)를 보지 못하므로 반응하지 않는다. */
export class NpcActor {
  readonly def: NpcDef;
  readonly spriteKey: string;
  sprite: Phaser.GameObjects.Sprite;
  x = 0;
  y = 0;
  present = false;
  facing: Facing = 'down';
  private path: Pt[] = [];
  private action: string | undefined;
  private moving = false;
  private curWp = '';
  private speed = 46;

  constructor(
    private scene: Phaser.Scene,
    def: NpcDef,
    private sceneId: string,
    private getSolid: () => boolean[][],
  ) {
    this.def = def;
    this.spriteKey = resolveNpcSprite(def.spriteKey);
    this.sprite = scene.add.sprite(0, 0, this.spriteKey, charFrame('down')).setOrigin(12 / 24, 34 / 36).setVisible(false);
  }

  get tile(): Pt {
    return feetToTile(this);
  }

  /** 현재 시각의 웨이포인트로 이동 목표를 갱신. snap 이면 즉시 위치시킨다. */
  setWaypoint(wp: Waypoint | undefined, snap: boolean): void {
    const id = wpId(wp);
    if (id === this.curWp && !snap) return;
    this.curWp = id;
    if (!wp) return;
    const targetScene = wp.sceneId ?? this.def.sceneId;
    if (targetScene !== this.sceneId) {
      this.present = false;
      this.sprite.setVisible(false);
      this.path = [];
      return;
    }
    const solid = this.getSolid();
    const goal = nearestWalkable(solid, { x: wp.x, y: wp.y }) ?? { x: wp.x, y: wp.y };
    this.action = wp.action;
    if (snap || !this.present) {
      const f = tileToFeet(goal);
      this.x = f.x;
      this.y = f.y;
      this.path = [];
      this.present = true;
      this.sprite.setVisible(true);
      this.moving = false;
      if (this.action) this.facing = 'down';
      this.refreshAnim();
      this.sync();
      return;
    }
    const path = findPath(solid, this.tile, goal);
    if (path === null) {
      const f = tileToFeet(goal);
      this.x = f.x;
      this.y = f.y;
      this.path = [];
    } else {
      this.path = path;
    }
    this.refreshAnim();
  }

  private animKey(): string {
    const k = this.spriteKey;
    const ex = (a: string) => this.scene.anims.exists(a);
    if (this.moving) return `${k}_walk_${this.facing}`;
    if (this.action === 'write' && ex(`${k}_write`)) return `${k}_write`;
    if (this.action === 'read' && ex(`${k}_read`)) return `${k}_read`;
    if (this.action === 'bow' && ex(`${k}_bow`)) return `${k}_bow`;
    return `${k}_idle_${this.facing}`;
  }

  refreshAnim(): void {
    const key = this.animKey();
    if (this.scene.anims.exists(key) && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
  }

  setFrozen(frozen: boolean): void {
    if (frozen) this.sprite.anims.pause();
    else this.sprite.anims.resume();
  }

  private sync(): void {
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y));
    this.sprite.setDepth(this.y);
  }

  update(dt: number, frozen: boolean): void {
    if (!this.present || frozen) return;
    if (this.path.length === 0) {
      if (this.moving) {
        this.moving = false;
        if (this.action) this.facing = 'down';
        this.refreshAnim();
      }
      return;
    }
    const t = tileToFeet(this.path[0]);
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (!this.moving) {
      this.moving = true;
    }
    this.facing = facingFromVector(dx, dy, this.facing);
    if (d <= step) {
      this.x = t.x;
      this.y = t.y;
      this.path.shift();
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
    }
    this.refreshAnim();
    this.sync();
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
