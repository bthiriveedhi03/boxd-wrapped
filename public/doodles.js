// Hand-drawn doodle library: little SVG sketches with a "wobble" filter so lines feel inked by hand.
window.Doodles = (() => {
  const INK = '#2b2622';
  const C = { orange: '#ff8a3d', green: '#3fbf6a', blue: '#4aa8e0', pink: '#ff7aa8', yellow: '#ffd35a', cream: '#fbf5e9' };

  const STAR = 'M50 8 L61 37 L93 38 L67 57 L77 90 L50 71 L23 90 L33 57 L7 38 L39 37 Z';
  const HEART = 'M50 86 C22 64 7 47 10 29 C13 12 38 7 50 28 C62 7 87 12 90 29 C93 47 78 64 50 86 Z';

  const defs = `
    <filter id="wobble" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;

  const svg = (inner, { size = 60, w = size, h = size, vb = '0 0 100 100', cls = '', style = '' } = {}) =>
    `<svg class="doodle ${cls}" style="${style}" width="${w}" height="${h}" viewBox="${vb}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><g filter="url(#wobble)">${inner}</g></svg>`;

  const shapes = {
    star: (fill = C.yellow) => `<path d="${STAR}" fill="${fill}"/>`,
    heart: (fill = C.pink) => `<path d="${HEART}" fill="${fill}"/><path d="M28 30 Q30 22 38 22" stroke="#fff" stroke-width="4"/>`,
    sparkle: (fill = C.yellow) => `<path d="M50 6 Q54 44 94 50 Q54 56 50 94 Q46 56 6 50 Q46 44 50 6 Z" fill="${fill}"/>`,
    reel: () => `<circle cx="50" cy="50" r="40" fill="${C.blue}"/>
      ${[0, 72, 144, 216, 288].map(a => { const r = a * Math.PI / 180; return `<circle cx="${50 + 22 * Math.cos(r)}" cy="${50 + 22 * Math.sin(r)}" r="9" fill="${C.cream}"/>`; }).join('')}
      <circle cx="50" cy="50" r="5" fill="${INK}"/>`,
    popcorn: () => `
      <path d="M24 40 L32 94 L68 94 L76 40 Z" fill="#fff"/>
      <path d="M36 40 L40 94 M50 40 L50 94 M64 40 L60 94" stroke="${C.orange}" stroke-width="7"/>
      <path d="M24 40 L32 94 L68 94 L76 40 Z"/>
      <path d="M22 42 Q16 30 28 26 Q28 12 42 16 Q50 4 60 16 Q74 12 74 26 Q86 30 78 42 Z" fill="${C.yellow}"/>
      <path d="M38 24 q4 -4 8 0 M56 22 q4 -4 8 0" />`,
    clapper: () => `
      <rect x="12" y="40" width="76" height="48" rx="4" fill="${INK}"/>
      <path d="M12 40 L86 22 L82 8 L10 26 Z" fill="#fff"/>
      <path d="M24 23 L32 36 M40 19 L48 32 M56 15 L64 28 M72 11 L78 22" stroke-width="5"/>
      <path d="M22 56 H78 M22 70 H62" stroke="#fff"/>`,
    ticket: (fill = C.orange) => `<path d="M8 28 H92 V42 Q82 50 92 58 V72 H8 V58 Q18 50 8 42 Z" fill="${fill}"/><path d="M30 30 V70" stroke-dasharray="4 7"/><path d="M44 46 H80 M44 56 H70" />`,
    arrow: () => `<path d="M10 80 C24 30 60 18 82 40"/><path d="M68 32 L84 40 L76 56"/>`,
    squiggle: () => `<path d="M4 60 Q14 40 24 60 T44 60 T64 60 T84 60 T104 60" />`,
    eye: () => `<path d="M8 50 Q50 10 92 50 Q50 90 8 50 Z" fill="#fff"/><circle cx="50" cy="50" r="15" fill="${C.green}"/><circle cx="50" cy="50" r="6" fill="${INK}"/>`,
    rewatch: () => `<path d="M78 40 A30 30 0 1 0 80 60" /><path d="M62 38 L80 40 L84 22"/>`,
    tape: (fill = 'rgba(255,211,90,.75)') => `<path d="M4 20 L96 12 L98 40 L6 48 Z" fill="${fill}" stroke="none"/>`,
  };

  function draw(name, opts = {}) {
    const { color, ...rest } = opts;
    return svg(shapes[name](color), rest);
  }

  let clipId = 0;
  // Hand-drawn star rating; supports halves.
  function stars(rating, size = 28, color = C.orange) {
    if (rating == null) return '';
    const n = Math.ceil(rating);
    const gap = size * 0.08;
    let out = '';
    for (let i = 0; i < n; i++) {
      const half = rating - i === 0.5;
      const id = `half${++clipId}`;
      out += `<svg class="star" width="${half ? size / 2 + 2 : size}" height="${size}" viewBox="0 0 ${half ? 54 : 100} 100" style="margin-right:${gap}px" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round">
        ${half ? `<defs><clipPath id="${id}"><rect x="0" y="0" width="52" height="100"/></clipPath></defs>` : ''}
        <g filter="url(#wobble)" ${half ? `clip-path="url(#${id})"` : ''}><path d="${STAR}" fill="${color}"/></g></svg>`;
    }
    return `<span class="stars">${out}</span>`;
  }

  return { defs, draw, stars, C, INK };
})();
