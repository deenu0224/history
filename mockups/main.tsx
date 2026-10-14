import { createRoot } from 'react-dom/client';
import { SPRITES, toDataURL, OS_KEYS } from '../src/game/art';
const keys = [...OS_KEYS.apps, ...OS_KEYS.appsSmall, ...OS_KEYS.avatars, ...OS_KEYS.statusIcons, ...OS_KEYS.exhibits, 'os_wallpaper_portrait', 'os_badge','os_badge_dot', 'os_btn_primary', ...OS_KEYS.overlays, ...OS_KEYS.notebook];
createRoot(document.getElementById('root')!).render(
  <div style={{ color: '#dde3e7', font: '11px sans-serif', padding: 10, background:'#182130', display:'flex', flexWrap:'wrap', gap:8 }}>
    {keys.map((k) => { const s = SPRITES[k]; if(!s) return <div key={k}>missing {k}</div>; return <div key={k} style={{textAlign:'center', maxWidth:110}}><img src={toDataURL(k,0, s.w>100?1:3)} style={{imageRendering:'pixelated', maxWidth:100}}/><div>{k} {s.w}x{s.h}</div></div>; })}
  </div>,
);
