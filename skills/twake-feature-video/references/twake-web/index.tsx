import {
  Bell,
  CircleHelp,
  EllipsisVertical,
  Grip,
  MessageCircle,
  Mic,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Smile,
  SquarePen,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { Bar, Collapse, Roll, Stage, Text, Window, type Act } from '../../kit'
import logo from './twake-chat-logo.svg'
import './twake-web.css'

// Twake Chat (React), in the Design Squad room. Emma asks for a review, the
// user answers from the composer, the ticks turn read, Emma types and her
// reply grows out of the typing dots. The room's row in the list follows the
// last message each time. Holds on the finished exchange.
//
// Look from twake-space-chat: Inter, primary #006bd8, own bubbles the primary
// at 12% on white, others white with a 1px shadow, 16px corners, the name of
// the author in primary.dark, the gradient chat background, 12px buttons.
// Icons: Lucide stands in for @linagora/twake-icons (same outline weight).

type S = {
  asked: boolean
  focus: boolean
  typing: boolean
  draft: string
  sent: boolean
  read: boolean
  emmaTyping: boolean
  replied: boolean
}

const initial: S = { asked: false, focus: false, typing: false, draft: '', sent: false, read: false, emmaTyping: false, replied: false }
// The finished exchange: the poster and the reduced-motion frame
const poster: S = { ...initial, asked: true, sent: true, read: true, replied: true }

const ASK = 'Can you review the new onboarding before Friday?'
const MINE = "On it, I'll check tonight"
const REPLY = 'Perfect, thank you! 🙌'
const REST = { wide: { x: 640, y: 250 }, compact: { x: 250, y: 120 } }

async function script(a: Act<S>) {
  await a.wait(900)

  // Emma's question lands at the foot of the room
  a.mark('ask')
  await a.set({ asked: true })
  await a.wait(1500)

  // Answer from the composer
  await a.move({ at: 'compose', x: 0.3, y: 0.5 })
  await a.click()
  await a.set({ focus: true })
  await a.wait(300)
  await a.set({ typing: true })
  await a.type('draft', MINE, { interval: 48 })
  await a.set({ typing: false })
  await a.wait(400)
  a.mark('send')
  await a.move({ at: 'send', x: 0.5, y: 0.5 })
  await a.click()
  // The field clears in the same update that adds the bubble
  await a.set({ sent: true, draft: '', focus: false })
  await a.wait(300)
  await a.move(a.layout === 'compact' ? REST.compact : REST.wide)
  await a.wait(700)
  a.mark('read')
  await a.set({ read: true })
  await a.wait(800)

  // Emma types, then her reply grows out of the dots
  await a.set({ emmaTyping: true })
  await a.wait(1600)
  a.mark('reply')
  await a.set({ emmaTyping: false, replied: true })
  await a.wait(2600)
  a.mark('done')
}

function I({ icon: Glyph, size = 18 }: { icon: LucideIcon; size?: number }) {
  return <Glyph size={size} strokeWidth={1.75} className="tc-i" aria-hidden />
}

type Who = 'ds' | 'el' | 'np' | 'lm' | 'do' | 'ev' | 'ma' | 'sc'
const INITIALS: Record<Who, string> = { ds: 'DS', el: 'EL', np: 'NP', lm: 'LM', do: 'DO', ev: 'E2', ma: 'MA', sc: 'SC' }

function Face({ who, size = 36 }: { who: Who; size?: number }) {
  return (
    <span className="tc-face" data-who={who} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {INITIALS[who]}
    </span>
  )
}

function Ticks({ read }: { read?: boolean }) {
  // One tick sent, a second one drawn beside it once read
  return (
    <svg className="tc-ticks" data-read={read || undefined} width="16" height="10" viewBox="0 0 16 10" aria-hidden>
      <path d="M1 5.2 4 8.2 10 1.8" />
      <path className="tc-ticks__2" d="M6.5 8.2 13 1.8" />
    </svg>
  )
}

/* ---- Room list ---- */

const FILLER: { who: Who; name: number; line: number; time: number; unread?: boolean }[] = [
  { who: 'np', name: 64, line: 110, time: 30 },
  { who: 'lm', name: 82, line: 92, time: 30, unread: true },
  { who: 'do', name: 70, line: 124, time: 30 },
  { who: 'ev', name: 58, line: 104, time: 30 },
  { who: 'ma', name: 76, line: 88, time: 30 },
]

function RoomList({ preview }: { preview: string }) {
  return (
    <aside className="tc-list">
      <header className="tc-list__head">
        <Text className="tc-list__title">Chats</Text>
        <span className="tc-grow" />
        <span className="tc-iconbtn tc-iconbtn--primary">
          <I icon={Bell} size={17} />
        </span>
        <span className="tc-iconbtn tc-iconbtn--primary">
          <I icon={SquarePen} size={17} />
        </span>
      </header>
      <div className="tc-search">
        <I icon={Search} size={15} />
        <Text>Search</Text>
      </div>
      <div className="tc-chips">
        <span className="tc-chip" data-active>
          All
        </span>
        <span className="tc-chip">Unread</span>
        <span className="tc-chip">Broadcast</span>
        <span className="tc-chip">Direct</span>
      </div>
      <div className="tc-rows">
        <div className="tc-room" data-active>
          <Face who="ds" size={38} />
          <div className="tc-room__body">
            <div className="tc-room__line">
              <Text className="tc-room__name">Design Squad</Text>
              <span className="tc-grow" />
              <Text className="tc-room__time">10:42</Text>
            </div>
            <div className="tc-room__preview">
              <Roll variant="fade">{preview}</Roll>
            </div>
          </div>
        </div>
        {FILLER.map((r, i) => (
          <div key={i} className="tc-room">
            <Face who={r.who} size={38} />
            <div className="tc-room__body">
              <div className="tc-room__line">
                <Bar w={r.name} h={7} tone={4} />
                <span className="tc-grow" />
                <Bar w={r.time} h={5} tone={2} />
              </div>
              <div className="tc-room__line">
                <Bar w={r.line} h={6} tone={2} />
                <span className="tc-grow" />
                {r.unread && <span className="tc-badge">2</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <nav className="tc-nav">
        <span className="tc-nav__item">
          <I icon={Users} size={18} />
          <Text>Contacts</Text>
        </span>
        <span className="tc-nav__item" data-active>
          <span className="tc-nav__pill">
            <I icon={MessageCircle} size={18} />
          </span>
          <Text>Chat</Text>
        </span>
        <span className="tc-nav__item">
          <I icon={Settings} size={18} />
          <Text>Settings</Text>
        </span>
      </nav>
    </aside>
  )
}

/* ---- Messages ---- */

function Older({ who, lines }: { who: Who; lines: number[] }) {
  return (
    <div className="tc-msg">
      <Face who={who} size={30} />
      <div className="tc-bubble">
        <Bar w={58} h={6} tone={3} className="tc-bubble__namebar" />
        {lines.map((w, i) => (
          <Bar key={i} w={w} h={6} tone={2} />
        ))}
      </div>
    </div>
  )
}

function OlderMine({ w }: { w: number }) {
  return (
    <div className="tc-msg tc-msg--mine">
      <div className="tc-bubble tc-bubble--mine">
        <Bar w={w} h={6} tone={2} />
      </div>
    </div>
  )
}

function Dots() {
  return (
    <span className="tc-dots" aria-label="Emma is typing">
      <i />
      <i />
      <i />
    </span>
  )
}

function Room(s: S) {
  return (
    <section className="tc-room-pane">
      <header className="tc-room-head">
        <Face who="ds" size={30} />
        <div className="tc-room-head__text">
          <Text className="tc-room-head__name">Design Squad</Text>
          <Text className="tc-room-head__sub">3 members</Text>
        </div>
        <span className="tc-grow" />
        <span className="tc-iconbtn">
          <I icon={Video} />
        </span>
        <span className="tc-iconbtn">
          <I icon={Search} />
        </span>
        <span className="tc-iconbtn">
          <I icon={EllipsisVertical} />
        </span>
      </header>

      <div className="tc-feed" data-crop>
        <div className="tc-feed__stack">
          <Older who="np" lines={[150]} />
          <OlderMine w={120} />
          <Older who="lm" lines={[190, 120]} />

          <Collapse open={s.asked} reveal="drop" from="below">
            <div className="tc-msg">
              <Face who="el" size={30} />
              <div className="tc-bubble">
                <span className="tc-bubble__name">Emma Laurent</span>
                <p className="tc-bubble__text">
                  {ASK}
                  <span className="tc-bubble__meta">10:41</span>
                </p>
              </div>
            </div>
          </Collapse>

          <Collapse open={s.sent} reveal="drop" from="below">
            <div className="tc-msg tc-msg--mine">
              <div className="tc-bubble tc-bubble--mine">
                <p className="tc-bubble__text">
                  {MINE}
                  <span className="tc-bubble__meta">
                    10:42 <Ticks read={s.read} />
                  </span>
                </p>
              </div>
            </div>
          </Collapse>

          <Collapse open={s.emmaTyping || s.replied} reveal="drop" from="below">
            <div className="tc-msg">
              <Face who="el" size={30} />
              <div className="tc-bubble tc-bubble--grow" data-done={s.replied || undefined}>
                <Dots />
                <p className="tc-bubble__text">
                  {REPLY}
                  <span className="tc-bubble__meta">10:42</span>
                </p>
              </div>
            </div>
          </Collapse>
        </div>
      </div>

      <div className="tc-compose">
        <span className="tc-iconbtn">
          <I icon={Plus} size={20} />
        </span>
        <div className="tc-field" data-focus={s.focus || undefined} data-target="compose" data-cursor="ibeam">
          <span className="tc-field__ph" data-hide={s.draft ? '' : undefined}>
            Message
          </span>
          <span className="tc-field__text" data-target="draft">
            {s.draft}
          </span>
          <span className="tc-caret" data-show={s.focus || undefined} data-typing={s.typing || undefined} />
          <span className="tc-grow" />
          <I icon={Smile} size={19} />
        </div>
        <span className="tc-send" data-target="send" data-cursor="pointer" data-ready={s.draft ? '' : undefined}>
          <span className="tc-send__glyph" data-show={s.draft ? undefined : ''}>
            <I icon={Mic} size={18} />
          </span>
          <span className="tc-send__glyph" data-show={s.draft ? '' : undefined}>
            <I icon={SendHorizontal} size={17} />
          </span>
        </span>
      </div>
    </section>
  )
}

/* ---- Scene ---- */

export default function TwakeChatDemo() {
  return (
    <Stage
      width={960}
      height={540}
      compact={{ below: 640, width: 380, height: 320 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: REST }}
      className="tc"
      keys="bottom-right"
    >
      {(s, _rect, layout) => {
        const preview = s.replied ? `Emma: ${REPLY}` : s.sent ? `You: ${MINE}` : s.asked ? `Emma: ${ASK}` : 'Nina: Checking the dark theme now'
        return (
          <Window className="tc-win">
            <div className="tc-app">
              <header className="tc-appbar">
                <img src={logo} alt="Twake Chat" className="tc-logo" />
                <span className="tc-grow" />
                <span className="tc-iconbtn">
                  <I icon={CircleHelp} />
                </span>
                <span className="tc-iconbtn">
                  <I icon={Grip} />
                </span>
                <Face who="sc" size={28} />
              </header>
              <div className="tc-body">
                {layout === 'wide' && <RoomList preview={preview} />}
                <Room {...s} />
                {layout === 'wide' && (
                <aside className="tc-info" aria-hidden>
                  <Face who="ds" size={56} />
                  <Bar w={110} h={8} tone={4} />
                  <Bar w={70} h={6} tone={2} />
                  <div className="tc-info__tiles">
                    <span className="tc-info__tile">
                      <I icon={MessageCircle} size={18} />
                    </span>
                    <span className="tc-info__tile">
                      <I icon={Video} size={18} />
                    </span>
                    <span className="tc-info__tile">
                      <I icon={Search} size={18} />
                    </span>
                  </div>
                  <Bar w={150} h={6} tone={2} />
                  <Bar w={120} h={6} tone={2} />
                </aside>
                )}
              </div>
            </div>
          </Window>
        )
      }}
    </Stage>
  )
}
