(() => {
  const { draw, stars, defs, C, INK } = window.Doodles;
  const $ = s => document.querySelector(s);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const POSTER_COLORS = [C.orange, C.green, C.blue, C.pink, C.yellow];

  let feed = null;

  // ---------- landing decorations ----------
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute">${defs}</svg>`);
  $('.hero-doodles').innerHTML = [
    draw('popcorn', { size: 110, cls: 'float f1' }),
    draw('star', { size: 70, cls: 'float f2' }),
    draw('reel', { size: 96, cls: 'float f3' }),
    draw('heart', { size: 64, cls: 'float f4' }),
    draw('clapper', { size: 92, cls: 'float f5' }),
    draw('sparkle', { size: 54, cls: 'float f6' }),
    draw('ticket', { size: 90, cls: 'float f7', color: C.green }),
  ].join('');
  $('.spinner-reel').innerHTML = draw('reel', { size: 90 });

  // ---------- data ----------
  async function load(user) {
    $('#error').hidden = true;
    $('#loading').hidden = false;
    try {
      const r = await fetch(`/api/feed?user=${encodeURIComponent(user)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not load that profile.');
      if (!data.entries.length) throw new Error('That profile has no public diary entries yet.');
      feed = data;
      setupMonths();
      showResult();
    } catch (e) {
      showLanding();
      $('#error').textContent = e.message;
      $('#error').hidden = false;
    } finally {
      $('#loading').hidden = true;
    }
  }

  function setupMonths() {
    const months = [...new Set(feed.entries.map(e => e.watchedDate.slice(0, 7)))].sort().reverse();
    const params = new URLSearchParams(location.search);
    const wanted = params.get('m');
    $('#month').innerHTML = months.map(m => {
      const [y, mo] = m.split('-');
      return `<option value="${m}">${MONTHS[+mo - 1]} ${y}</option>`;
    }).join('');
    $('#month').value = months.includes(wanted) ? wanted : months[0];
  }

  function computeStats(month) {
    const list = feed.entries.filter(e => e.watchedDate.startsWith(month))
      .sort((a, b) => a.watchedDate.localeCompare(b.watchedDate));
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const rated = list.filter(e => e.rating != null);
    const avg = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : null;

    const perDay = Array(daysInMonth + 1).fill(0);
    list.forEach(e => perDay[+e.watchedDate.slice(8, 10)]++);
    let busiest = 1;
    perDay.forEach((c, d) => { if (c > perDay[busiest]) busiest = d; });
    let streak = 0, best = 0;
    for (let d = 1; d <= daysInMonth; d++) { streak = perDay[d] ? streak + 1 : 0; best = Math.max(best, streak); }

    const weekday = Array(7).fill(0);
    list.forEach(e => weekday[new Date(e.watchedDate + 'T12:00').getDay()]++);
    const favWeekday = weekday.indexOf(Math.max(...weekday));

    const dist = {};
    for (let r = 0.5; r <= 5; r += 0.5) dist[r] = 0;
    rated.forEach(e => dist[e.rating]++);

    const withYear = list.filter(e => e.year);
    const decades = {};
    withYear.forEach(e => { const d = Math.floor(e.year / 10) * 10; decades[d] = (decades[d] || 0) + 1; });
    const favDecade = Object.entries(decades).sort((a, b) => b[1] - a[1])[0]?.[0];
    const oldest = withYear.reduce((a, e) => (!a || e.year < a.year ? e : a), null);

    const score = e => (e.rating ?? 2.5) * 2 + (e.liked ? 1.5 : 0) + (e.review ? 0.5 : 0) + (e.rewatch ? 0.25 : 0);
    const filmOfMonth = [...list].sort((a, b) => score(b) - score(a) || b.watchedDate.localeCompare(a.watchedDate))[0];
    const lowest = rated.length > 2 ? rated.reduce((a, e) => (e.rating < a.rating ? e : a)) : null;

    const reviews = list.filter(e => e.review)
      .map(e => ({ e, s: (e.rating ?? 2.5) + (e.liked ? 1 : 0) + Math.min(e.review.length, 280) / 140 - (e.spoilers ? 1 : 0) }))
      .sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.e);

    return {
      month, y, m, daysInMonth, list, rated, avg, perDay, busiest, streak: best, favWeekday, weekday,
      dist, favDecade, oldest, filmOfMonth, lowest, reviews,
      liked: list.filter(e => e.liked).length,
      rewatches: list.filter(e => e.rewatch).length,
      reviewCount: list.filter(e => e.review).length,
      firstDow: new Date(y, m - 1, 1).getDay(),
    };
  }

  // ---------- rendering ----------
  const posterSrc = url => (url ? `/api/img?url=${encodeURIComponent(url)}` : '');
  function poster(e, cls = '') {
    const color = POSTER_COLORS[[...e.title].reduce((s, c) => s + c.charCodeAt(0), 0) % POSTER_COLORS.length];
    const fallback = `<div class="poster-fallback" style="background:${color}"><span>${esc(e.title)}</span><small>${e.year ?? ''}</small></div>`;
    return `<div class="poster ${cls}">${fallback}${e.poster ? `<img src="${posterSrc(e.poster)}" alt="" crossorigin="anonymous" onerror="this.remove()">` : ''}</div>`;
  }

  function funFacts(s) {
    const facts = [];
    const date = d => `${MONTHS[s.m - 1].slice(0, 3)} ${d}`;
    if (s.perDay[s.busiest] > 1) facts.push([`binge day`, `${date(s.busiest)} — ${s.perDay[s.busiest]} films in one sitting(ish)`]);
    if (s.streak > 1) facts.push(['longest streak', `${s.streak} days in a row with a film`]);
    facts.push(['go-to movie night', `${DAYS[s.favWeekday]}s`]);
    if (s.favDecade) facts.push(['favourite decade', `the ${s.favDecade}s`]);
    if (s.oldest) facts.push(['oldest watch', `${s.oldest.title} (${s.oldest.year})`]);
    if (s.lowest && s.lowest.rating <= 2) facts.push(['the one that hurt', `${s.lowest.title} — ${s.lowest.rating}★`]);
    return facts.slice(0, 4);
  }

  function renderCard(s) {
    const name = feed.username;
    const fom = s.filmOfMonth;
    const facts = funFacts(s);
    const avgText = s.avg != null ? s.avg.toFixed(1) : '—';
    const factIcons = ['sparkle', 'star', 'heart', 'sparkle'];

    // calendar cells
    let cal = DAYS.map(d => `<div class="cal-head">${d[0]}</div>`).join('');
    for (let i = 0; i < s.firstDow; i++) cal += '<div></div>';
    for (let d = 1; d <= s.daysInMonth; d++) {
      const n = s.perDay[d];
      cal += `<div class="cal-day${n ? ' hit' : ''}" data-n="${n}"><span>${d}</span>${n > 1 ? `<b>×${n}</b>` : ''}</div>`;
    }

    const reviewNotes = s.reviews.length ? s.reviews.map((e, i) => {
      const text = e.review.length > 190 ? e.review.slice(0, 185).replace(/\s+\S*$/, '') + '…' : e.review;
      return `<div class="note-card n${i}">
        <div class="tape">${draw('tape', { w: 110, h: 40, vb: '0 0 100 50' })}</div>
        <div class="note-head"><span class="note-title">${esc(e.title)}</span>${stars(e.rating, 24)}${e.liked ? draw('heart', { size: 26 }) : ''}</div>
        ${e.spoilers ? `<p class="spoiler">⚠ spoilers inside — read it on Letterboxd!</p>` : `<p>“${esc(text)}”</p>`}
      </div>`;
    }).join('') : `<div class="note-card n0 empty"><p>No reviews this month — a person of few words. Mysterious.</p></div>`;

    const posters = s.list.slice(-14);

    return `
    <div class="card" id="card">
      <svg width="0" height="0" style="position:absolute">${defs}</svg>
      <div class="paper-grain"></div>

      <div class="col col-1">
        <div class="kicker">@${esc(name)}’s</div>
        <h2 class="month-title">${MONTHS[s.m - 1]}<svg class="sq" width="470" height="34" viewBox="0 0 470 34" fill="none" stroke="${C.orange}" stroke-width="7" stroke-linecap="round"><path filter="url(#wobble)" d="M6 20 Q40 4 80 18 T160 18 T240 16 T320 18 T400 16 T464 14"/></svg></h2>
        <div class="sub">${s.y} in film · wrapped ${draw('clapper', { size: 54 })}</div>

        <div class="tiles">
          <div class="tile" data-fill="${C.yellow}"><div class="big">${s.list.length}</div><div class="lbl">films watched</div><div class="ic">${draw('eye', { size: 56 })}</div></div>
          <div class="tile" data-fill="${C.orange}"><div class="big">${avgText}<small>★</small></div><div class="lbl">average rating</div><div class="ic">${draw('star', { size: 52 })}</div></div>
          <div class="tile" data-fill="${C.pink}"><div class="big">${s.liked}</div><div class="lbl">films hearted</div><div class="ic">${draw('heart', { size: 52 })}</div></div>
          <div class="tile" data-fill="${C.green}"><div class="big">${s.rewatches}</div><div class="lbl">rewatches</div><div class="ic">${draw('rewatch', { size: 52 })}</div></div>
        </div>

        <ul class="facts">
          ${facts.map(([k, v], i) => `<li>${draw(factIcons[i], { size: 30 })}<div><b>${esc(k)}</b><span>${esc(v)}</span></div></li>`).join('')}
        </ul>
      </div>

      <div class="col col-2">
        <div class="fom-wrap">
          <div class="fom-label">film of the month ${draw('arrow', { size: 70, style: 'transform:rotate(60deg) scaleX(-1)' })}</div>
          <div class="polaroid">
            <div class="tape tl">${draw('tape', { w: 120, h: 44, vb: '0 0 100 50', color: 'rgba(74,168,224,.6)' })}</div>
            ${poster(fom, 'big')}
            <div class="pol-title">${esc(fom.title)}${fom.year ? ` <small>(${fom.year})</small>` : ''}</div>
            <div class="pol-stars">${stars(fom.rating, 34)} ${fom.liked ? draw('heart', { size: 34 }) : ''}</div>
          </div>
          <div class="fom-doodles">${draw('sparkle', { size: 48, cls: 'sp1' })}${draw('sparkle', { size: 30, cls: 'sp2', color: C.pink })}${draw('popcorn', { size: 96, cls: 'pc' })}</div>
        </div>

        <div class="cal-box">
          <div class="box-title">diary doodle</div>
          <div class="cal">${cal}</div>
        </div>
      </div>

      <div class="col col-3">
        <div class="box-title right">top reviews ${draw('star', { size: 40 })}</div>
        <div class="notes">${reviewNotes}</div>

        <div class="chart-box">
          <div class="box-title">how you rated</div>
          <svg class="chart" width="500" height="190"></svg>
        </div>
      </div>

      <div class="strip">
        ${posters.map(e => poster(e, 'mini')).join('')}
        <div class="strip-sign">${s.list.length > posters.length ? `+${s.list.length - posters.length} more` : ''}</div>
      </div>
      <div class="footer">${s.reviewCount} review${s.reviewCount === 1 ? '' : 's'} written · made with boxd wrapped</div>
    </div>`;
  }

  function roughen(card, s) {
    const seedOpts = { seed: 7, roughness: 1.6, bowing: 1.2, stroke: INK, strokeWidth: 2.6 };
    // sketchy boxes behind stat tiles
    card.querySelectorAll('.tile').forEach((t, i) => {
      const w = t.offsetWidth, h = t.offsetHeight;
      const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sv.setAttribute('width', w + 16); sv.setAttribute('height', h + 16); sv.classList.add('rough-bg');
      const rc = rough.svg(sv);
      sv.appendChild(rc.rectangle(8, 8, w, h, { ...seedOpts, seed: 11 + i, fill: t.dataset.fill, fillStyle: 'hachure', hachureGap: 9, fillWeight: 2.2, hachureAngle: -40 + i * 25 }));
      t.prepend(sv);
    });

    // circles around diary days
    card.querySelectorAll('.cal-day.hit').forEach((d, i) => {
      const n = +d.dataset.n;
      const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sv.setAttribute('width', 64); sv.setAttribute('height', 56); sv.classList.add('rough-bg');
      const rc = rough.svg(sv);
      const fill = n > 2 ? C.orange : n > 1 ? C.yellow : C.green;
      sv.appendChild(rc.ellipse(32, 28, 54, 46, { ...seedOpts, seed: 40 + i, fill, fillStyle: n > 1 ? 'cross-hatch' : 'zigzag', hachureGap: 6, fillWeight: 1.6, strokeWidth: 2 }));
      d.prepend(sv);
    });

    // rating distribution bars
    const chart = card.querySelector('.chart');
    const rc = rough.svg(chart);
    const keys = Object.keys(s.dist).map(Number).sort((a, b) => a - b);
    const max = Math.max(1, ...keys.map(k => s.dist[k]));
    const W = 500, H = 190, base = 150, bw = 36, gap = (W - 20 - keys.length * bw) / (keys.length - 1);
    chart.appendChild(rc.line(4, base, W - 4, base, { ...seedOpts, strokeWidth: 3 }));
    keys.forEach((k, i) => {
      const x = 10 + i * (bw + gap);
      const h = (s.dist[k] / max) * 120;
      const color = k >= 4.5 ? C.green : k >= 3 ? C.blue : k >= 2 ? C.yellow : C.pink;
      if (h > 0) chart.appendChild(rc.rectangle(x, base - h, bw, h, { ...seedOpts, seed: 70 + i, fill: color, fillStyle: 'hachure', hachureGap: 5, fillWeight: 2 }));
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', x + bw / 2); t.setAttribute('y', base + 30); t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'axis');
      t.textContent = k === 0.5 ? '½' : k % 1 ? '·' : k + '★';
      chart.appendChild(t);
      if (s.dist[k]) {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        c.setAttribute('x', x + bw / 2); c.setAttribute('y', base - h - 8); c.setAttribute('text-anchor', 'middle'); c.setAttribute('class', 'count');
        c.textContent = s.dist[k];
        chart.appendChild(c);
      }
    });
  }

  function fit() {
    const holder = $('#card-holder');
    const card = $('#card');
    if (!card) return;
    const scale = Math.min(1, $('#stage').clientWidth / 1920);
    card.style.transform = `scale(${scale})`;
    holder.style.height = 1080 * scale + 'px';
    holder.style.width = 1920 * scale + 'px';
  }

  function render() {
    const month = $('#month').value;
    const s = computeStats(month);
    $('#card-holder').innerHTML = renderCard(s);
    roughen($('#card'), s);
    fit();

    // the RSS feed only holds recent entries; warn if this month might be cut off
    const oldest = feed.entries.reduce((a, e) => (e.watchedDate < a ? e.watchedDate : a), '9999');
    const note = $('#note');
    note.hidden = !(oldest.startsWith(month) && feed.entries.length >= 45);
    note.textContent = 'Heads up: Letterboxd’s public feed only goes back ~50 entries, so the start of this month may be missing.';

    const url = new URL(location.href);
    url.searchParams.set('u', feed.username); url.searchParams.set('m', month);
    history.replaceState(null, '', url);
  }

  function showResult() { $('#landing').hidden = true; $('#result').hidden = false; render(); }
  function showLanding() { $('#landing').hidden = false; $('#result').hidden = true; history.replaceState(null, '', location.pathname); }

  // ---------- events ----------
  $('#form').addEventListener('submit', e => { e.preventDefault(); load($('#username').value.trim().replace(/^@/, '')); });
  $('#demo-link').addEventListener('click', e => { e.preventDefault(); load('demo'); });
  $('#back').addEventListener('click', showLanding);
  $('#month').addEventListener('change', render);
  window.addEventListener('resize', fit);

  $('#download').addEventListener('click', async () => {
    const btn = $('#download');
    const card = $('#card');
    btn.disabled = true; btn.textContent = 'developing film…';
    try {
      await document.fonts.ready;
      const png = await htmlToImage.toPng(card, { width: 1920, height: 1080, pixelRatio: 1, style: { transform: 'none' }, cacheBust: false });
      const a = document.createElement('a');
      a.download = `${feed.username}-${$('#month').value}-wrapped.png`;
      a.href = png; a.click();
    } catch (err) {
      console.error(err);
      alert('Could not export the image — try again in a moment.');
    } finally {
      btn.disabled = false; btn.textContent = 'download PNG ↓';
    }
  });

  const startUser = new URLSearchParams(location.search).get('u');
  if (startUser) { $('#username').value = startUser; load(startUser); }
})();
