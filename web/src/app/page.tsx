import Image from 'next/image';
import Link from 'next/link';
import {
  Apple,
  ArrowRight,
  Brain,
  Heart,
  LockKeyhole,
  MessageCircleHeart,
  Play,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Reveal } from '@/components/ui/reveal';

const features = [
  {
    icon: MessageCircleHeart,
    title: 'A Coach who keeps the thread',
    text: 'Talk through a date, a difficult message, or the pattern you keep noticing. Your Coach uses the context you choose to share.',
  },
  {
    icon: Brain,
    title: 'A SoulPrint you control',
    text: 'Turn conversations into a living picture of your values, needs, boundaries, and relationship goals. Confirm, correct, or keep every insight private.',
  },
  {
    icon: TrendingUp,
    title: 'Growth that feels human',
    text: 'Set small goals, check in weekly, and practice the skills that make connection feel steadier in real life.',
  },
  {
    icon: Heart,
    title: 'More thoughtful connections',
    text: 'Explore reciprocal recommendations grounded in compatibility, not endless swiping or invented scores.',
  },
];

const showcases = [
  {
    eyebrow: '01 — Your Coach',
    title: 'A conversation that remembers what matters.',
    text: 'Arrive directly in one continuous conversation. Ask for perspective before a date, unpack what happened afterward, or find words for the message you want to send.',
    bullets: ['Streaming responses with interruption and retry', 'Context restored when you return', 'A Coach personality you can shape'],
    image: '/screens/coach.png',
    alt: 'Coach conversation in Soulmeet',
    reverse: false,
    link: true,
  },
  {
    eyebrow: '02 — SoulPrint',
    title: 'A clearer picture of who you are.',
    text: 'Your SoulPrint brings together confirmed insights about your values, communication, boundaries, and hopes for a relationship.',
    bullets: ['Review and correct Coach reflections', 'Choose what can support matching', 'Delete anything that no longer feels true'],
    image: '/screens/soulprint.png',
    alt: 'SoulPrint personal insights interface',
    reverse: true,
    link: false,
  },
  {
    eyebrow: '03 — Growth',
    title: 'Insight becomes something you can practice.',
    text: 'Build confidence through small goals, private check-ins, gentle exercises, and guided paths designed for real relationship moments.',
    bullets: ['Personal and Coach-suggested goals', 'Weekly mood and reflection check-ins', 'Progress without pressure or shame'],
    image: '/screens/growth.png',
    alt: 'Soulmeet personal growth tools',
    reverse: false,
    link: false,
  },
];

export default function Landing() {
  return (
    <main className="marketing">
      <header className="marketing-nav">
        <div className="container marketing-nav-inner">
          <Brand />
          <nav>
            <Link href="#experience">How it works</Link>
            <Link href="#privacy">Privacy</Link>
            <Link className="button secondary" href="/login">
              Sign in
            </Link>
            <Link className="button" href="/register">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="orb-float orb-a" aria-hidden="true" />
        <div className="orb-float orb-b" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-pill">
              <Sparkles size={13} /> A wise, luminous companion
            </div>
            <h1>
              Know yourself.
              <br />
              <em>Connect better.</em>
            </h1>
            <p>
              Soulmeet is a private AI dating Coach, a living SoulPrint, and a calmer way to turn
              relationship insight into action.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/register">
                Meet your Coach <ArrowRight size={18} />
              </Link>
              <Link className="text-link" href="#experience">
                See the experience <ArrowRight size={17} />
              </Link>
            </div>
            <div className="trust-line">
              <span>
                <LockKeyhole size={15} /> Private by design
              </span>
              <span>
                <ShieldCheck size={15} /> You stay in control
              </span>
              <span>
                <Sparkles size={15} /> Built around your real life
              </span>
            </div>
          </div>
          <div className="hero-device">
            <div className="device-glow" />
            <Image
              className="device-img"
              src="/screens/coach.png"
              alt="Soulmeet AI relationship Coach conversation"
              width={944}
              height={1674}
              priority
              sizes="(max-width: 760px) 78vw, 390px"
            />
            <div className="device-badge">
              <span className="pulse-dot" /> Your Coach is ready
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-intro">
        <Reveal>
          <div className="eyebrow">Less performance. More honesty.</div>
          <h2>Dating gets clearer when you can hear yourself think.</h2>
          <p>
            Soulmeet gives you a warm private space to reflect, prepare, learn, and choose with
            intention.
          </p>
        </Reveal>
      </section>

      <section className="marketing-features">
        {features.map(({ icon: Icon, title, text }, index) => (
          <Reveal as="article" key={title} delay={index * 90}>
            <span className="feature-icon">
              <Icon size={24} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </Reveal>
        ))}
      </section>

      {showcases.map((s) => (
        <section
          key={s.eyebrow}
          id={s.eyebrow.startsWith('01') ? 'experience' : undefined}
          className={`showcase ${s.reverse ? 'reverse' : ''}`}
        >
          <Reveal className="showcase-copy">
            <div className="eyebrow">{s.eyebrow}</div>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
            <ul>
              {s.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            {s.link && (
              <Link href="/register" className="text-link">
                Start a conversation <ArrowRight size={17} />
              </Link>
            )}
          </Reveal>
          <Reveal className="showcase-screen" delay={120}>
            <Image
              src={s.image}
              alt={s.alt}
              width={944}
              height={1674}
              sizes="(max-width: 760px) 80vw, 380px"
            />
          </Reveal>
        </section>
      ))}

      <section id="privacy" className="privacy-band">
        <Reveal className="privacy-inner">
          <span className="privacy-icon">
            <LockKeyhole size={24} />
          </span>
          <div>
            <div className="eyebrow">Private by design</div>
            <h2>Your inner life is not content.</h2>
            <p>
              Your session uses secure HttpOnly cookies. SoulPrint lets you decide which insights
              remain private, support Coaching, or may support matching.
            </p>
          </div>
          <Link className="button secondary" href="/privacy">
            Read our privacy policy
          </Link>
        </Reveal>
      </section>

      <section className="closing">
        <Reveal>
          <div className="eyebrow">A better next conversation starts here</div>
          <h2>Meet yourself before you meet someone else.</h2>
          <p>Create your private Soulmeet space and choose the Coach who feels right for you.</p>
          <Link className="button button-lg" href="/register">
            Begin your journey <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>

      <section className="apps-band">
        <Reveal>
          <div className="eyebrow">Native apps</div>
          <h2>Soulmeet goes with you.</h2>
          <p>
            Available on iPhone and Android — with notifications, voice notes, and your Coach on
            the go.
          </p>
          <div className="apps-store">
            <span className="store-badge" aria-disabled="true">
              <Apple size={26} />
              <span className="store-badge-text">
                <small>Download on the</small>
                <strong>App Store</strong>
              </span>
              <span className="soon-tag">Soon</span>
            </span>
            <span className="store-badge" aria-disabled="true">
              <Play size={26} />
              <span className="store-badge-text">
                <small>Get it on</small>
                <strong>Google Play</strong>
              </span>
              <span className="soon-tag">Soon</span>
            </span>
          </div>
        </Reveal>
      </section>

      <footer className="marketing-footer">
        <Brand />
        <p>© 2026 Soulmeet. Dating clarity and relationship growth.</p>
        <nav>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </footer>
    </main>
  );
}