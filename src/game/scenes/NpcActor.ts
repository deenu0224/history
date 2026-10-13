import type Phaser from 'phaser';
import type { NpcPose } from '@/core/observation';
import { charFrame } from '../art';
import { resolveNpcSprite } from '../keys';
import { facingFromVector, pointAlong, walkRoute, type Facing4, type Solid } from '../logic/route';
import { TILE, type Pt } from '../logic/types';

const FEET_DY = 22;
/** 타일(실수 좌표 가능) → 발 위치(월드 px) */
export const tileToFeet = (t: Pt): Pt => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + FEET_DY });
export const feetToTile = (p: Pt): Pt => ({ x: Math.floor(p.x / TILE), y: Math.floor((p.y - 4) / TILE) });

const routeKey = (a: Pt, b: Pt) => `${a.x},${a.y}>${b.x},${b.y}`;

/**
 * 관측 속 인물. 위치는 스크럽 시각의 포즈(npcPoseAt)가 정하고, 화면 위치는 거기로 짧게 걸어가 따라붙는다.
 * 스크럽이 빠르면 길을 따라 빠르게 달려가므로 순간이동 대신 타임랩스처럼 보인다.
 */
export class NpcActor {
  readonly spriteKey: string;
  readonly sprite: Phaser.GameObjects.Sprite;
  x = 0;
  y = 0;
  facing: Facing4 = 'down';
  moving = false;
  shown = true;
  private placed = false;
  private goal: Pt = { x: 0, y: 0 };
  private chase: Pt[] = [];
  private action: string | undefined;
  private poseMoving = false;
  private cache = new Map<string, Pt[]>();

  constructor(
    private scene: Phaser.Scene,
    readonly id: string,
    spriteKey: string,
    private solid: () => Solid,
  ) {
    this.spriteKey = resolveNpcSprite(spriteKey);
    this.sprite = scene.add.sprite(0, 0, this.spriteKey, charFrame('down')).setOrigin(12 / 24, 34 / 36).setVisible(false);
  }

  /** 두 타일 사이 경로(타일 좌표 꺾은선), 캐시 */
  private route(a: Pt, b: Pt): Pt[] {
    const k = routeKey(a, b);
    let r = this.cache.get(k);
    if (!r) this.cache.set(k, (r = walkRoute(this.solid(), a, b)));
    return r;
  }

  /** 포즈의 목표 위치(타일 실수 좌표): 이동 중이면 경로를 따라간 점 */
  poseTile(p: NpcPose): Pt {
    if (!p.moving) return { x: p.to.x, y: p.to.y };
    return pointAlong(this.route(p.from, p.to), p.progress);
  }

  setPose(p: NpcPose, snap: boolean): void {
    this.action = p.action;
    this.poseMoving = p.moving;
    const goalTile = this.poseTile(p);
    const goal = tileToFeet(goalTile);
    const first = !this.placed;
    this.placed = true;
    if (snap || first) {
      this.x = goal.x;
      this.y = goal.y;
      this.goal = goal;
      this.chase = [];
      this.moving = false;
      if (!p.moving) this.facing = 'down';
      this.refreshAnim();
      this.sync();
      return;
    }
    if (Math.hypot(goal.x - this.goal.x, goal.y - this.goal.y) < 0.01) return;
    this.goal = goal;
    // 현재 위치에서 목표까지 길 따라 쫓는다. 가까우면 직선.
    const near = Math.hypot(goal.x - this.x, goal.y - this.y) < TILE * 1.5;
    if (near) {
      this.chase = [goal];
    } else {
      const here = feetToTile({ x: this.x, y: this.y });
      const there = { x: Math.round(goalTile.x), y: Math.round(goalTile.y) };
      const r = walkRoute(this.solid(), here, there).slice(1);
      this.chase = [...r.map(tileToFeet), goal];
    }
  }

  setShown(v: boolean): void {
    if (v === this.shown) return;
    this.shown = v;
    this.sprite.setVisible(v && this.placed);
  }

  private animKey(): string {
    const k = this.spriteKey;
    const ex = (a: string) => this.scene.anims.exists(a);
    if (this.moving) return `${k}_walk_${this.facing}`;
    if (!this.poseMoving) {
      if (this.action === 'write' && ex(`${k}_write`)) return `${k}_write`;
      if (this.action === 'read' && ex(`${k}_read`)) return `${k}_read`;
      if (this.action === 'bow' && ex(`${k}_bow`)) return `${k}_bow`;
    }
    return `${k}_idle_${this.facing}`;
  }

  private refreshAnim(): void {
    const key = this.animKey();
    if (this.scene.anims.exists(key) && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
  }

  private sync(): void {
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y)).setDepth(this.y);
    this.sprite.setVisible(this.shown && this.placed);
  }

  update(dt: number): void {
    if (this.chase.length === 0) {
      if (this.moving) {
        this.moving = false;
        if (this.action) this.facing = 'down';
        this.refreshAnim();
      }
      this.sync();
      return;
    }
    let remain = 0;
    let px = this.x;
    let py = this.y;
    for (const c of this.chase) {
      remain += Math.hypot(c.x - px, c.y - py);
      px = c.x;
      py = c.y;
    }
    // 가까우면 느긋하게(걸음), 멀면 빠르게(타임랩스).
    let step = Math.max(42, remain * 6) * dt;
    this.moving = true;
    while (step > 0 && this.chase.length) {
      const t = this.chase[0]!;
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.5) this.facing = facingFromVector(dx, dy, this.facing);
      if (d <= step) {
        this.x = t.x;
        this.y = t.y;
        this.chase.shift();
        step -= d;
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        step = 0;
      }
    }
    if (this.chase.length === 0) {
      this.moving = false;
      if (this.action && !this.poseMoving) this.facing = 'down';
    }
    this.refreshAnim();
    this.sync();
  }

  /** 시각적 경계(월드 px) */
  bounds(): Phaser.Geom.Rectangle {
    return this.sprite.getBounds();
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

