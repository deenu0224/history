import { Viewer, Bubble, type EyeItem } from './viewer';
import { Screen } from './ui';
import { e1Cuts } from './cuts';

const eyes2: EyeItem[] = [
  { state: 'open', current: true, label: '첫 번째 기억' },
  { state: 'open', label: '두 번째 기억' },
  { state: 'never', label: '열리지 않음' },
];

export function ViewerScreen({ w = 390, h = 844, sat = 47, sab = 34, noDevice }: { w?: number; h?: number; sat?: number; sab?: number; noDevice?: boolean }) {
  const bottom = 14 + 56 + 8 + sab;
  const area = { w: w - 8, h: h - bottom };
  const specs = e1Cuts(area, { tagged: true });
  return (
    <Screen w={w} h={h} sat={sat} sab={sab} noDevice={noDevice}>
      <Viewer
        w={w} h={h} sat={sat} sab={sab} eyes={eyes2} title="첫 번째 기억" time="11:40" specs={specs} index={1}
        nameTags={{ red: '이극돈' }}
        bubbles={(hit, a) => {
          const s = hit.servant;
          if (!s) return null;
          return (
            <Bubble x={16} bottom={104} w={a.w - 32} tail={{ x: s.x + s.w / 2 - 16, side: 'top' }}>
              <div className="t-m" style={{ color: '#6b5e45', marginBottom: 2 }}>귓속말</div>
              <div className="t-b">「저 <span className="term">당상</span> 영감은 세조대왕 실록 때도 엮는 일을 맡으셨다지.」</div>
            </Bubble>
          );
        }}
        actions={<><button className="btn primary" style={{ flex: 1.15 }}>그날의 방</button><button className="btn secondary" style={{ flex: 1 }}>로그</button></>}
      />
    </Screen>
  );
}
