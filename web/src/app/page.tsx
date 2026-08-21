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
    eyebrow: '01 — AI Dating Coach',
    title: 'A coach who actually gets you',
    text: "Tell it what's going on. It remembers your last talk, the patterns you keep repeating, the stuff you always trip on. No judgment, no scripts. Just someone in your corner who knows you.",
    bullets: [
      'Remembers the context that matters',
      'Spots the patterns you keep running into',
      'Always private, personal, and judgment-free',
    ],
    image: '/screens/ai-dating-coach-orange.png',
    alt: 'An AI dating coach remembering the context of an ongoing conversation',
    reverse: false,
    link: true,
  },
  {
    eyebrow: '02 — Adaptive Matchmaking',
    title: 'Matched on how you click, not how you look',
    text: 'We pay attention to how you think, what you actually want, how you connect. Then we put people in front of you who fit that, not just a good photo.',
    bullets: [
      'Compatibility shaped by your values and needs',
      'Recommendations that adapt as you grow',
      'More meaningful signals than a swipe',
    ],
    image: '/screens/adaptive-matchmaking-orange.png',
    alt: 'Two people connected through shared values and compatibility signals',
    reverse: true,
    link: false,
  },
  {
    eyebrow: '03 — Dating Guidance',
    title: "Before, during, after. We've got you.",
    text: 'Nervous before a date? Overthinking it after? Stuck on what to text back? Get real advice the moment you need it, not a week later.',
    bullets: [
      'Prepare for a date with more confidence',
      'Find the right words when you feel stuck',
      'Reflect afterward without overthinking alone',
    ],
    image: '/screens/dating-guidance-orange.png',
    alt: 'Dating guidance before, during, and after a date',
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
              <Sparkles size={13} /> Your private AI dating coach
            </div>
            <h1>
              What if someone actually
              <br />
              <em>understood how you love?</em>
            </h1>
            <p>
              No more profiles or swiping! Just talk to your coach. It figures out who you really
              are and helps you find someone who truly fits.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/register">
                Meet your coach <ArrowRight size={18} />
              </Link>
              <Link className="text-link" href="#experience">
                See how it works <ArrowRight size={17} />
              </Link>
            </div>
            <div className="trust-line">
              <span>
                <LockKeyhole size={15} /> Your chats stay private
              </span>
              <span>
                <ShieldCheck size={15} /> Talk about what you want
              </span>
              <span>
                <Sparkles size={15} /> Go at your own pace
              </span>
            </div>
          </div>
          <div className="hero-device">
            <div className="device-glow" />
            <Image
              className="device-img"
              src="/screens/hero-ai-coach-orange.png"
              alt="A person having a private conversation with a luminous AI dating coach"
              width={1024}
              height={1536}
              priority
              sizes="(max-width: 760px) 78vw, 390px"
            />
            <div className="device-badge">
              <span className="pulse-dot" /> Your coach is listening
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
            Available on iPhone and Android — with notifications, voice notes, and your Coach on the
            go.
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
