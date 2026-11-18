import { Phone, Stage, type Act } from '../../kit'
import './twake-mobile.css'

// Twake Chat (mobile, Flutter): "Copy link" on a message (twake-on-matrix #3604).
// A long press on Emma's message opens the context menu over a dimmed room;
// tapping "Copy link" closes it and the snackbar says "Link copied".
//
// Self-contained: no shared CSS or icon package, so a clone of this folder runs.
// Colors are linagora_design_flutter LinagoraSysColors.material(); strings are
// assets/l10n/intl_en.arb (copyLink, linkCopied, reply, forward, copy, select, report).

type S = { menu: boolean; toast: boolean }

const initial: S = { menu: false, toast: false }
// The poster: the snackbar showing, as the last frame
const poster: S = { menu: false, toast: true }

const REST = { x: 200, y: 330 }

async function script(a: Act<S>) {
  await a.wait(1000)
  a.mark('press')
  await a.move({ at: 'bubble', x: 0.5, y: 0.5 })
  await a.click()
  await a.wait(450) // the hold before the menu opens
  await a.set({ menu: true })
  await a.wait(1800)
  a.mark('copy')
  await a.move({ at: 'copylink', x: 0.4, y: 0.5 })
  await a.click()
  await a.set({ menu: false, toast: true })
  await a.move(REST)
  await a.wait(3600)
  a.mark('done')
  await a.set({ toast: false })
  await a.wait(500)
}

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const ICONS: Record<string, JSX.Element> = {
  reply: <path d="M9 7 4 12l5 5M4 12h9a7 7 0 0 1 7 7" />,
  forward: <path d="m15 7 5 5-5 5M20 12h-9a7 7 0 0 0-7 7" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  select: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  back: <path d="m15 5-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
}
function Ic({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg className="tm-ic" viewBox="0 0 24 24" width={size} height={size} aria-hidden {...P}>
      {ICONS[name]}
    </svg>
  )
}

function Ticks() {
  return (
    <svg className="tm-ticks" width="16" height="10" viewBox="0 0 16 10" aria-hidden>
      <path d="M1 5.2 4 8.2 10 1.8M6.5 8.2 13 1.8" />
    </svg>
  )
}

const ITEMS: [string, string, string?][] = [
  ['reply', 'Reply'],
  ['forward', 'Forward'],
  ['copy', 'Copy'],
  ['link', 'Copy link', 'copylink'],
  ['select', 'Select'],
  ['flag', 'Report', 'danger'],
]

export default function TwakeMobile() {
  return (
    <Stage<S>
      width={400}
      height={720}
      compact={{ below: 400, width: 358, height: 720 }}
      initial={initial}
      poster={poster}
      script={script}
      cursor={{ at: REST, style: 'touch' }}
      className="tm"
    >
      {(s, _rect, layout) => (
        <Phone width={layout === 'compact' ? 300 : 300} className="tm-phone">
          <div className="tm-room" data-dim={s.menu || undefined}>
            <header className="tm-bar">
              <Ic name="back" />
              <span className="tm-avatar">DS</span>
              <span className="tm-title">
                <b>Design Squad</b>
                <i>5 members</i>
              </span>
            </header>
            <div className="tm-feed">
              <p className="tm-day">Today</p>
              <div className="tm-msg">
                <span className="tm-avatar tm-avatar--s">EL</span>
                <div className="tm-bubble" data-target="bubble" data-lift={s.menu || undefined}>
                  <b className="tm-author">Emma Laurent</b>
                  New onboarding flow is ready for review
                  <time>10:42</time>
                </div>
              </div>
              <div className="tm-msg tm-msg--mine">
                <div className="tm-bubble tm-bubble--mine">
                  On it, I'll check tonight
                  <time>
                    10:44 <Ticks />
                  </time>
                </div>
              </div>
            </div>
            <footer className="tm-compose">
              <span className="tm-field">Message</span>
            </footer>
          </div>

          <div className="tm-scrim" data-show={s.menu || undefined} />
          <ul className="tm-menu" data-show={s.menu || undefined}>
            {ITEMS.map(([icon, label, tag]) => (
              <li key={label} className="tm-item" data-danger={tag === 'danger' || undefined} data-target={tag === 'copylink' ? 'copylink' : undefined}>
                <Ic name={icon} size={22} />
                {label}
              </li>
            ))}
          </ul>

          <div className="tm-snack" data-show={s.toast || undefined} role="status">
            <span>Link copied</span>
            <Ic name="close" size={22} />
          </div>
        </Phone>
      )}
    </Stage>
  )
}
