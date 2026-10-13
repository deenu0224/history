import { useState } from 'react';
import { playSfx } from '@/game/audio';
import { isTyping, useKey, useTypewriter } from '../hooks';
import { SCRIPT } from '../lib/script';
import { useUi } from '../uiStore';

const TITLES = { prologue: '프롤로그', epilogue: '에필로그', teaser: '다음 이야기' } as const;

export function SequenceScreen() {
  const kind = useUi((s) => s.sequence);
  const end = useUi((s) => s.endSequence);
  if (!kind) return null;
  const seq = SCRIPT[kind];
  if (!seq) {
    queueMicrotask(end);
    return null;
  }
  return <Pages key={kind} kind={kind} pages={seq.pages} title={seq.title ?? TITLES[kind]} onEnd={end} />;
}

function Pages({ kind, pages, title, onEnd }: { kind: keyof typeof TITLES; pages: { speaker?: string; text: string }[]; title: string; onEnd(): void }) {
  const [i, setI] = useState(0);
  const page = pages[i]!;
  const tw = useTypewriter(page.text, 1.2);
  const next = () => {
    if (!tw.done) return tw.finish();
    if (i + 1 >= pages.length) return onEnd();
    playSfx('page');
    setI(i + 1);
  };
  useKey((e) => {
    if (isTyping(e) || e.repeat) return;
    if (e.key === 'Escape') return onEnd();
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  });
  return (
    <div className={`seq seq-${kind}`} onPointerDown={next}>
      <div className="seq-title">{title}</div>
      <div className="seq-page">
        {page.speaker && <div className="seq-speaker">{page.speaker}</div>}
        <p>
          {tw.shown}
          <span className="dialog-ghost">{page.text.slice(tw.shown.length)}</span>
        </p>
      </div>
      <div className="seq-foot">
        <span>
          {i + 1} / {pages.length}
        </span>
        <span className="seq-hint">{tw.done ? (i + 1 >= pages.length ? '탭하여 계속' : '탭하여 다음') : ''}</span>
        <button
          className="btn btn-ghost"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onEnd();
          }}
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
