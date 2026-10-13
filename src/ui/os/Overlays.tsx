import { useEffect, useState } from 'react';
import { Px, appIconKey } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';
import { openPanel } from '../lib/nav';

/** 위에서 잠깐 내려오는 알림. 탭하면 그 앱으로. */
export function Banner() {
  const banner = useUi((s) => s.banner);
  const clear = useUi((s) => s.clearBanner);
  const panel = useUi((s) => s.panel);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => clear(banner.id), 6500);
    return () => clearTimeout(t);
  }, [banner, clear]);
  if (!banner || panel === 'messenger') return null;
  return (
    <button
      type="button"
      key={banner.id}
      className="banner"
      data-testid="banner"
      onClick={() => {
        fx('tap');
        const ui = useUi.getState();
        if (banner.thread) ui.openThread(banner.thread);
        openPanel('messenger');
        ui.dismissNotice(banner.id);
      }}
    >
      <Px k={appIconKey(CONTENT.apps.find((a) => a.app === banner.app)?.iconKey ?? 'app_messenger', true)} scale={2} />
      <span className="banner-text">
        <b>{banner.text}</b>
        {banner.sub && <small>{banner.sub}</small>}
      </span>
    </button>
  );
}

/** 짧은 한 줄, 실록 용어 풀이, 복원의 먹 번짐. */
export function Overlays() {
  const flash = useUi((s) => s.flash);
  const clearFlash = useUi((s) => s.clearFlash);
  const gloss = useUi((s) => s.gloss);
  const hideGloss = useUi((s) => s.hideGloss);
  const bloom = useUi((s) => s.inkBloom);
  const [bloomOn, setBloomOn] = useState(false);
  // 먹 번짐은 한 번 번지고 사라진다(남아서 화면을 밀지 않도록 치운다)
  useEffect(() => {
    if (!bloom) return;
    setBloomOn(true);
    const t = setTimeout(() => setBloomOn(false), 2400);
    return () => clearTimeout(t);
  }, [bloom]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(clearFlash, 3200);
    return () => clearTimeout(t);
  }, [flash, clearFlash]);
  useEffect(() => {
    if (!gloss) return;
    const t = setTimeout(hideGloss, 5000);
    const off = () => hideGloss();
    const arm = setTimeout(() => window.addEventListener('pointerdown', off, { once: true }), 200);
    return () => {
      clearTimeout(t);
      clearTimeout(arm);
      window.removeEventListener('pointerdown', off);
    };
  }, [gloss, hideGloss]);

  return (
    <>
      {flash && (
        <p className="flash" key={flash.nonce} role="status" data-testid="flash">
          {flash.text}
        </p>
      )}
      {gloss && (
        <p className="gloss-tip" key={gloss.nonce} role="status" data-testid="gloss-tip">
          <b>{gloss.term}</b> {gloss.text}
        </p>
      )}
      {bloomOn && <div className="bloom" key={bloom} aria-hidden="true" />}
    </>
  );
}
