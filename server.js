// Letterboxd Wrapped — tiny zero-dependency server.
// Serves the static site, fetches + parses a user's public Letterboxd RSS feed,
// and proxies poster images so the wrapped card can be exported as a PNG.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const UA = 'Mozilla/5.0 (compatible; letterboxd-wrapped/1.0)';
const cache = new Map(); // username -> { at, data }
const CACHE_MS = 5 * 60 * 1000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!m) return '';
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
}

function parseFeed(xml) {
  const channelTitle = decodeEntities(tag(xml.split('<item>')[0], 'title'));
  const displayName = channelTitle.replace(/^Letterboxd\s*-\s*/i, '').trim();
  const items = xml.split('<item>').slice(1).map(c => c.split('</item>')[0]);
  const entries = [];
  for (const it of items) {
    const filmTitle = tag(it, 'letterboxd:filmTitle');
    const watchedDate = tag(it, 'letterboxd:watchedDate');
    if (!filmTitle || !watchedDate) continue; // lists, etc.
    const desc = tag(it, 'description');
    const poster = (desc.match(/<img[^>]+src="([^"]+)"/) || [])[1] || null;
    // Review text = all <p> blocks except the poster and the auto "Watched on ..." line.
    const paras = [...desc.matchAll(/<p>([\s\S]*?)<\/p>/g)]
      .map(m => m[1])
      .filter(p => !/<img/i.test(p));
    const spoilers = paras.some(p => /may contain spoilers/i.test(p));
    const reviewParas = paras
      .filter(p => !/may contain spoilers/i.test(p))
      .map(p => decodeEntities(p.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim())
      .filter(p => p && !/^Watched on \w+ \w+ \d+, \d{4}\.?$/.test(p));
    const rating = parseFloat(tag(it, 'letterboxd:memberRating'));
    entries.push({
      title: decodeEntities(filmTitle),
      year: parseInt(tag(it, 'letterboxd:filmYear'), 10) || null,
      watchedDate,
      rating: Number.isFinite(rating) ? rating : null,
      rewatch: /^yes$/i.test(tag(it, 'letterboxd:rewatch')),
      liked: /^yes$/i.test(tag(it, 'letterboxd:memberLike')),
      link: tag(it, 'link'),
      poster,
      review: reviewParas.join('\n\n'),
      spoilers,
    });
  }
  return { displayName, entries };
}

async function getFeed(username) {
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  let xml;
  if (username === 'demo') {
    xml = fs.readFileSync(path.join(__dirname, 'fixtures', 'demo.xml'), 'utf8');
  } else {
    const res = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' },
    });
    if (res.status === 404) { const e = new Error('No Letterboxd user with that name.'); e.status = 404; throw e; }
    if (!res.ok) { const e = new Error(`Letterboxd responded with ${res.status}.`); e.status = 502; throw e; }
    xml = await res.text();
  }
  const data = { username, ...parseFeed(xml) };
  cache.set(username, { at: Date.now(), data });
  return data;
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/feed') {
      const user = (url.searchParams.get('user') || '').trim().replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9_]{1,40}$/.test(user)) return send(res, 400, { error: 'That doesn’t look like a Letterboxd username.' });
      return send(res, 200, await getFeed(user));
    }

    if (url.pathname === '/api/img') {
      const target = new URL(url.searchParams.get('url') || '');
      if (target.protocol !== 'https:' || !/(^|\.)ltrbxd\.com$/.test(target.hostname)) return send(res, 400, { error: 'bad image host' });
      const r = await fetch(target, { headers: { 'User-Agent': UA } });
      if (!r.ok) return send(res, 502, { error: 'image fetch failed' });
      res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }

    // static files
    let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
    if (!file.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain');
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) file = path.join(PUBLIC, 'index.html'); // SPA fallback
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    send(res, err.status || 500, { error: err.message || 'Something went wrong.' });
  }
});

server.listen(PORT, () => console.log(`🎬 Letterboxd Wrapped running at http://localhost:${PORT}`));
