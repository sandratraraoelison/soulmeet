export const mockMatches = [
  {
    slug: 'julia',
    name: 'Julia',
    age: 27,
    job: 'Architect',
    match: '82%',
    score: '75%–85%',
    compatibility: 'Safe Compatibility',
    impression:
      'Soft eyes, often seen with a sketchbook, a presence that feels like a quiet afternoon.',
    persona: 'Principled, observant, and deeply loyal.',
    insight:
      'You and Julia have a surprisingly strong emotional balance. She brings stability, but she’s still emotionally playful enough for you not to get bored.',
  },
  {
    slug: 'caro',
    name: 'Caro',
    age: 25,
    job: 'Creative Director',
    match: '79%',
    score: '65%–95%',
    compatibility: 'Intense Compatibility',
    impression:
      'Electrifying energy, expressive hands, a smile that challenges the room.',
    persona: 'Spontaneous, fiercely independent, and emotionally intense.',
    insight:
      'This one is risky. I’m not gonna lie. But the emotional chemistry between you two could become insane if you manage to understand each other correctly.',
  },
  {
    slug: 'tiphaine',
    name: 'Tiphaine',
    age: 29,
    job: 'Pediatrician',
    match: '73%',
    score: '70%–75%',
    compatibility: 'Steady Compatibility',
    impression:
      'Warm, grounded stature, a voice that calms even the loudest storms.',
    persona: 'Empathetic, realistic, and focused on growth.',
    insight:
      'Maybe not the craziest butterflies instantly, but honestly? This is the kind of person who could really see you building something healthy and long-term with.',
  },
] as const;

export type MockMatch = (typeof mockMatches)[number];
