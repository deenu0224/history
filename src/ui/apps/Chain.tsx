/**
 * 인과 사슬(주 퍼즐): 진술 카드를 순서대로 화살표로 잇고, 각 화살표마다 근거 카드를 붙여 제출한다.
 * 판정은 엔진(judgeCausal)이 계산하고, 연결마다 고유 피드백이 돌아온다. 정답 연결은 UI 에 없다.
 */
import { useState } from 'react';
import { evidenceView } from '@/core/content';
import type { CausalDeduction, CausalSubmissionLink, Id, JudgeResult } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { Empty } from '../components/kit';
import { VerdictPanel } from '../components/Verdict';
import { CONTENT, IDX } from '../lib/content';
import { fx } from '../lib/fx';

export const chainDeductions = (): CausalDeduction[] => CONTENT.deductions.filter((d): d is CausalDeduction => d.kind === 'causal');

interface Link {
  from: Id;
  to: Id;
  ev: Id[];
}

export function ChainPanel() {
  const flags = useGameStore((s) => s.flags);
  const solved = useGameStore((s) => s.solved);
  const list = chainDeductions().filter((d) => !d.requires || flags[d.requires]);
  const [sel, setSel] = useState<Id | undefined>();
  const cur = list.find((d) => d.id === sel) ?? list[0];
  if (!cur) return <Empty>아직 풀 수 있는 사슬이 없다.</Empty>;
  return (
    <>
      {list.length > 1 && (
        <div className="chooser">
          {list.map((d) => (
            <button key={d.id} className={`pill ${d.id === cur.id ? 'on' : ''}`} onClick={() => setSel(d.id)}>
              {d.title}
            </button>
          ))}
        </div>
      )}
      <h3 className="dtitle">
        {cur.title}
        {solved[cur.id] && <span className="dtag">{solved[cur.id]!.best === 'confirmed' ? '확정' : '부분 확정'}</span>}
      </h3>
      <ChainBuilder key={cur.id} d={cur} />
    </>
  );
}

function ChainBuilder({ d }: { d: CausalDeduction }) {
  const owned = useGameStore((s) => s.evidence);
  const submit = useGameStore((s) => s.submitDeduction);
  const [links, setLinks] = useState<Link[]>([]);
  const [pick, setPick] = useState<Id | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [res, setRes] = useState<{ r: JudgeResult; seq: number } | null>(null);
  const ownedIds = Object.keys(owned).filter((id) => IDX.evidence[id]);
  const node = (id: Id) => d.nodes.find((n) => n.id === id);

  const tapNode = (id: Id) => {
    fx('tap');
    if (!pick) return setPick(id);
    if (pick === id) return setPick(null);
    if (!links.some((l) => l.from === pick && l.to === id)) {
      setLinks([...links, { from: pick, to: id, ev: [] }]);
      setOpen(links.length);
      fx('link');
    }
    setPick(null);
  };
  const update = (i: number, patch: Partial<Link>) => setLinks(links.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const doSubmit = () => {
    const sub: CausalSubmissionLink[] = links.map((l) => ({ from: l.from, to: l.to, evidenceIds: l.ev }));
    const r = submit({ kind: 'causal', deductionId: d.id, links: sub });
    setRes({ r, seq: Date.now() });
    fx(r.verdict === 'confirmed' ? 'verdict_confirmed' : r.verdict === 'partial' ? 'verdict_partial' : 'verdict_wrong');
  };
  const fbFor = (l: Link) => res?.r.feedback.filter((f) => f.link && f.link.from === l.from && f.link.to === l.to) ?? [];

  return (
    <div className="dpanel chain" data-testid="chain-panel">
      <p className="dprompt">{d.prompt}</p>
      <h4>진술 카드 {pick && <small className="dim">— 이어질 카드를 누르세요</small>}</h4>
      <div className="nodes" role="group" aria-label="진술 카드">
        {d.nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`node ${pick === n.id ? 'on' : ''}`}
            data-testid={`node-${n.id}`}
            aria-pressed={pick === n.id}
            onClick={() => tapNode(n.id)}
          >
            {n.text}
          </button>
        ))}
      </div>
      <h4>연결</h4>
      {links.length === 0 && <p className="dim">카드 하나를 누르고, 이어서 다른 카드를 누르면 화살표로 이어집니다.</p>}
      <ol className="links">
        {links.map((l, i) => {
          const fb = fbFor(l);
          const bad = fb.some((f) => f.code === 'link_wrong' || f.code === 'link_reversed');
          return (
            <li key={`${l.from}>${l.to}`} className={`link ${bad ? 'bad' : fb.length ? 'warn' : ''}`} data-testid={`link-${i}`}>
              <div className="link-line">
                <span className="link-node">{node(l.from)?.text}</span>
                <span className="link-arrow" aria-label="이어짐">
                  <i />▶
                </span>
                <span className="link-node">{node(l.to)?.text}</span>
              </div>
              <div className="link-tools">
                <button className="btn btn-small" onClick={() => setOpen(open === i ? null : i)} data-testid={`link-ev-toggle-${i}`}>
                  근거 {l.ev.length}장 {open === i ? '▴' : '▾'}
                </button>
                <button
                  className="btn btn-small"
                  aria-label="방향 뒤집기"
                  onClick={() => update(i, { from: l.to, to: l.from })}
                  data-testid={`link-flip-${i}`}
                >
                  ⇄
                </button>
                <button className="btn btn-small" aria-label="연결 지우기" onClick={() => setLinks(links.filter((_, k) => k !== i))} data-testid={`link-remove-${i}`}>
                  ✕
                </button>
              </div>
              {open === i && (
                <div className="link-evs">
                  {ownedIds.length === 0 && <p className="dim">고를 수 있는 카드가 없다.</p>}
                  {ownedIds.map((id) => {
                    const on = l.ev.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`pill ${on ? 'on' : ''}`}
                        aria-pressed={on}
                        data-testid={`link-ev-${i}-${id}`}
                        onClick={() => update(i, { ev: on ? l.ev.filter((x) => x !== id) : [...l.ev, id] })}
                      >
                        {evidenceView(IDX.evidence[id]!, owned[id]!).label}
                      </button>
                    );
                  })}
                </div>
              )}
              {fb.map((f, k) => (
                <p key={k} className={`link-fb fb-${f.code}`}>
                  {f.message}
                </p>
              ))}
            </li>
          );
        })}
      </ol>
      <div className="dsubmit">
        <span className="dim">연결 {links.length}개</span>
        <button className="btn btn-primary btn-big" data-testid="submit-deduction" disabled={links.length === 0} onClick={doSubmit}>
          사슬 제출
        </button>
      </div>
      {res && <VerdictPanel result={{ ...res.r, feedback: res.r.feedback.filter((f) => !f.link) }} seq={res.seq} />}
    </div>
  );
}
