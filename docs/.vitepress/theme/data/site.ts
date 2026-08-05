export const site = {
  hero: {
    eyebrow: { zh: '随写随记', en: 'Field notes' },
    mono: { zh: '№ 01 — 个人记录', en: '№ 01 — a personal log' },
    title: { zh: '写下来，免得忘记。', en: "Things I write down so I won't forget." },
    sub: {
      zh: '关于工程、阅读与日常思考的个人记录。不求完整，只记下值得回头看的东西。',
      en: 'A personal record of engineering, reading, and everyday thinking — not finished pieces, just things worth coming back to.',
    },
    author: { zh: '你的名字', en: 'Your Name' },
    date: '2026-08-05',
  },
  about: {
    body: {
      zh: [
        '我是 Your Name，一名工程师。这里是我随手记下的工程笔记、阅读摘抄与偶尔的想法。没有排期，也不追热点——想到什么写什么，权当给自己的备忘。',
        '如果某篇对你有用，那就算我没白写。',
      ],
      en: [
        "I'm Your Name, an engineer. This is where I keep engineering notes, reading highlights, and the occasional thought. No schedule, no hot takes — just things I didn't want to forget.",
        'If a note happens to be useful to you, it was worth writing down.',
      ],
    },
    how: {
      zh: '先写给三个月后的自己看；再写给同样在折腾这件事的人看。能具体就具体，能短就短。',
      en: 'Write for myself three months from now first; for someone else wrestling with the same thing second. Be specific, be brief.',
    },
  },
  links: {
    github: 'https://github.com/wei-qx/wei-qx.github.io',
    rss: '#',
    email: '#',
  },
  footer: {
    note: {
      zh: '一名工程师的个人记录。关于工程、阅读与日常思考。',
      en: 'A personal log from an engineer. On engineering, reading, and everyday thinking.',
    },
    copy: { zh: '© 2026 你的名字。随手写于某处。', en: '© 2026 Your Name. Scribbled somewhere.' },
    deployed: { zh: '部署于 GitHub Pages', en: 'Deployed on GitHub Pages' },
  },
}

export type Site = typeof site
