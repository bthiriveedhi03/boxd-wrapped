// Spotify-Wrapped-style story player: tap-through animated slides, then the 16:9 summary card.
window.Story = (() => {
  const $ = s => document.querySelector(s);
  const { draw, stars, defs, C, INK } = window.Doodles;
  const W = () => window.Wrapped;
  const NS = 'http://www.w3.org/2000/svg';

  let ctx = null;          // { feed, s, month, months, truncated, onMonth, onClose }
  let slides = [];         // [{ el, dur }]
  let idx = 0, elapsed = 0, last = 0, paused = false, raf = 0;
  let pressAt = 0, holdTimer = 0;

  // ---------- helpers ----------
  const d = (sec) => `style="--d:${sec}s"`;
  const pick = (arr, n) => arr.slice(0, n);
  const critic = avg => avg == null ? 'a person of mystery' : avg >= 4 ? 'a generous soul' : avg >= 3.3 ? 'a fair-minded critic' : avg >= 2.5 ? 'a tough crowd' : 'an absolute hater (affectionate)';

  function roughSvg(w, h, fn) {
    const sv = document.createElementNS(NS, 'svg');
    sv.setAttribute('viewBox', `0 0 ${w} ${h}`);
    fn(rough.svg(sv), sv);
    return sv;
  }

  // ---------- slides ----------
  function build() {
    const { feed, s } = ctx;
    const { MONTHS, DAYS, esc, poster, funFacts } = W();
    const name = esc(feed.username);
    const monthName = MONTHS[s.m - 1];
    const list = s.list;
    const out = [];

    // 1. intro
    out.push({ cls: 'bg-ink', dur: 4500, html: `
      <div class="center">
        <div class="kick a-up" ${d(.2)}>hey @${name} —</div>
        <div class="kick a-up" ${d(.6)}>let’s rewind your</div>
        <div class="mega a-pop orange" ${d(1.1)}>${monthName}</div>
        <div class="kick a-up" ${d(1.7)}>in film ${draw('clapper', { size: 60, cls: 'a-wiggle' })}</div>
      </div>
      <div class="deco" style="left:7%;top:12%">${draw('reel', { size: 120, cls: 'a-spin' })}</div>
      <div class="deco a-pop" ${d(1.4)} data-pos="right:8%;top:16%">${draw('star', { size: 80, cls: 'a-float' })}</div>
      <div class="deco a-pop" ${d(1.8)} data-pos="right:12%;bottom:12%">${draw('popcorn', { size: 130, cls: 'a-float' })}</div>
      <div class="deco a-pop" ${d(2.1)} data-pos="left:10%;bottom:14%">${draw('sparkle', { size: 70, cls: 'a-float' })}</div>
      <div class="tap-hint a-up" ${d(2.6)}>tap to continue →</div>` });

    // 2. film count + poster rain
    const perWeek = (list.length / (s.daysInMonth / 7)).toFixed(1);
    // [landscapeX, landscapeY, rotation, portraitX, portraitY] — kept clear of the centred text
    const spots = [[3, 8, -12, 3, 6], [83, 6, 10, 28, 12], [5, 60, 8, 53, 4], [84, 58, -9, 78, 10], [16, 78, -6, 5, 80], [70, 80, 14, 30, 86], [17, 10, 5, 55, 78], [91, 32, 12, 79, 84], [2, 34, -6], [30, 86, 9], [56, 87, -14], [76, 34, 7]];
    out.push({ cls: 'bg-yellow', dur: 5500, html: `
      ${pick(list, spots.length).map((e, i) => `<div class="rain${spots[i][3] == null ? ' wide-only' : ''}" style="--lx:${spots[i][0]}%;--ly:${spots[i][1]}%;--px:${spots[i][3]}%;--py:${spots[i][4]}%;--r:${spots[i][2]}deg;--d:${0.3 + i * 0.18}s">${poster(e, 'mini')}</div>`).join('')}
      <div class="center front">
        <div class="kick a-up" ${d(.1)}>in ${monthName} you watched</div>
        <div class="giga a-pop" ${d(.5)}><span data-count="${list.length}">0</span></div>
        <div class="kick a-up" ${d(1.4)}>film${list.length === 1 ? '' : 's'} ${draw('eye', { size: 54, cls: 'a-wiggle' })}</div>
        <div class="small a-up" ${d(2.2)}>that’s about <b>${perWeek}</b> a week. ${list.length >= 12 ? 'touch grass? never heard of her.' : list.length >= 6 ? 'a healthy habit.' : 'quality over quantity.'}</div>
      </div>` });

    // 3. calendar
    let cal = DAYS.map(x => `<div class="ch">${x[0]}</div>`).join('');
    for (let i = 0; i < s.firstDow; i++) cal += '<div></div>';
    let hitN = 0;
    for (let day = 1; day <= s.daysInMonth; day++) {
      const n = s.perDay[day];
      cal += `<div class="cd${n ? ' hit' : ''}" data-n="${n}" ${n ? `style="--d:${0.6 + (hitN++) * 0.12}s"` : ''}><span>${day}</span>${n > 1 ? `<b>×${n}</b>` : ''}</div>`;
    }
    const busy = s.perDay[s.busiest];
    out.push({ cls: 'bg-green', dur: 6000, html: `
      <div class="split">
        <div class="side">
          <div class="title a-up" ${d(.1)}>your diary,<br>doodled ${draw('arrow', { size: 70, cls: 'a-draw arrow-down' })}</div>
          <div class="small a-up" ${d(.4 + hitN * .12)}>${busy > 1 ? `biggest binge: <b>${monthName.slice(0, 3)} ${s.busiest}</b> with ${busy} films.` : `one film a day, max. very disciplined.`}${s.streak > 1 ? `<br>longest streak: <b>${s.streak} days</b> in a row.` : ''}</div>
        </div>
        <div class="cal-big">${cal}</div>
      </div>` , after(el) {
        el.querySelectorAll('.cd.hit').forEach((c, i) => {
          const n = +c.dataset.n;
          const sv = roughSvg(64, 56, () => {});
          const fill = n > 2 ? C.orange : n > 1 ? C.yellow : C.cream;
          sv.appendChild(rough.svg(sv).ellipse(32, 28, 54, 46, { seed: 40 + i, roughness: 1.6, stroke: INK, strokeWidth: 2.4, fill, fillStyle: n > 1 ? 'cross-hatch' : 'solid', hachureGap: 6 }));
          sv.classList.add('ring');
          c.prepend(sv);
        });
      } });

    // 4. ratings
    const keys = Object.keys(s.dist).map(Number).sort((a, b) => a - b);
    const avgRounded = s.avg == null ? null : Math.round(s.avg * 2) / 2;
    out.push({ cls: 'bg-blue', dur: 6500, html: `
      <div class="split">
        <div class="side center-text">
          <div class="kick a-up" ${d(.1)}>on average you gave</div>
          <div class="giga a-pop" ${d(.4)}><span data-count="${s.avg ?? 0}" data-dec="1">0</span><small>★</small></div>
          <div class="big-stars">${stars(avgRounded, 60)}</div>
          <div class="small a-up" ${d(2.2)}>officially: <b>${critic(s.avg)}</b>.</div>
        </div>
        <div class="hist a-up" ${d(1)}><svg class="hist-svg" viewBox="0 0 500 200"></svg></div>
      </div>`, after(el) {
        el.querySelectorAll('.big-stars .star').forEach((st, i) => { st.classList.add('a-pop'); st.style.setProperty('--d', `${1 + i * 0.18}s`); });
        const sv = el.querySelector('.hist-svg');
        const rc = rough.svg(sv);
        const max = Math.max(1, ...keys.map(k => s.dist[k]));
        const base = 160, bw = 38, gap = (480 - keys.length * bw) / (keys.length - 1);
        sv.appendChild(rc.line(4, base, 496, base, { seed: 2, stroke: INK, strokeWidth: 3 }));
        keys.forEach((k, i) => {
          const x = 10 + i * (bw + gap), h = (s.dist[k] / max) * 130;
          const g = document.createElementNS(NS, 'g');
          g.setAttribute('class', 'bar'); g.style.setProperty('--d', `${1.2 + i * 0.1}s`);
          if (h) g.appendChild(rc.rectangle(x, base - h, bw, h, { seed: 70 + i, stroke: INK, strokeWidth: 2.4, fill: k >= 4 ? C.yellow : k >= 3 ? C.cream : C.pink, fillStyle: 'hachure', hachureGap: 5, fillWeight: 2.2 }));
          if (s.dist[k]) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x + bw / 2); t.setAttribute('y', base - h - 8); t.setAttribute('class', 'cnt'); t.textContent = s.dist[k]; g.appendChild(t); }
          sv.appendChild(g);
          const lab = document.createElementNS(NS, 'text');
          lab.setAttribute('x', x + bw / 2); lab.setAttribute('y', base + 32); lab.setAttribute('class', 'ax');
          lab.textContent = k === 0.5 ? '½' : k % 1 ? '·' : k + '★';
          sv.appendChild(lab);
        });
      } });

    // 5. hearts & rewatches
    const heartSpots = [[8, 14], [84, 10], [14, 74], [78, 72], [46, 6], [92, 44], [4, 44], [30, 88], [62, 90], [70, 18]];
    out.push({ cls: 'bg-pink', dur: 5500, html: `
      ${heartSpots.slice(0, Math.max(3, Math.min(10, s.liked))).map(([x, y], i) => `<div class="deco a-pop" style="left:${x}%;top:${y}%;--d:${0.8 + i * 0.12}s">${draw('heart', { size: 50 + (i % 3) * 18, cls: 'a-float', color: i % 2 ? '#fff' : C.pink })}</div>`).join('')}
      <div class="center front">
        <div class="kick a-up" ${d(.1)}>you fell for</div>
        <div class="giga a-pop" ${d(.4)}><span data-count="${s.liked}">0</span> ${draw('heart', { size: 120, cls: 'a-beat', color: '#fff' })}</div>
        <div class="kick a-up" ${d(1.2)}>film${s.liked === 1 ? '' : 's'} hard enough to heart ${s.liked === 1 ? 'it' : 'them'}</div>
        <div class="pill-row">
          <div class="pill a-slap" ${d(2)}>${draw('rewatch', { size: 40 })} <b>${s.rewatches}</b> rewatch${s.rewatches === 1 ? '' : 'es'}</div>
          <div class="pill a-slap" ${d(2.4)}>${draw('ticket', { size: 44, color: C.yellow })} <b>${s.reviewCount}</b> review${s.reviewCount === 1 ? '' : 's'}</div>
        </div>
      </div>` });

    // 6. fun facts
    const facts = funFacts(s);
    const icons = ['sparkle', 'star', 'heart', 'popcorn'];
    out.push({ cls: 'bg-orange', dur: 6500, html: `
      <div class="title a-up center-text" ${d(.1)}>a few fun facts ${draw('sparkle', { size: 56, cls: 'a-spin-slow', color: C.yellow })}</div>
      <div class="facts-grid">
        ${facts.map(([k, v], i) => `<div class="fact a-slap" style="--d:${0.6 + i * 0.7}s;--r:${[-2, 1.5, 1, -1.5][i]}deg">${draw(icons[i], { size: 54 })}<div><b>${esc(k)}</b><span>${esc(v)}</span></div></div>`).join('')}
      </div>` });

    // 7. film of the month
    const fom = s.filmOfMonth;
    out.push({ cls: 'bg-paper', dur: 7000, html: `
      <div class="split">
        <div class="side center-text">
          <div class="kick a-up" ${d(.1)}>and your film of the month is…</div>
          <div class="drum a-up" ${d(.6)}>${draw('popcorn', { size: 90, cls: 'a-wiggle' })}</div>
          <div class="title a-pop" ${d(2.1)}>${esc(fom.title)}</div>
          <div class="small a-up" ${d(2.5)}>${fom.year ?? ''} ${fom.rewatch ? '· a rewatch, even' : ''}</div>
        </div>
        <div class="pol-wrap">
          <div class="polaroid-big a-drop" ${d(1.4)}>
            <div class="tape-t">${draw('tape', { w: 130, h: 48, vb: '0 0 100 50', color: 'rgba(74,168,224,.65)' })}</div>
            ${poster(fom, 'story-poster')}
            <div class="pol-stars">${stars(fom.rating, 40)} ${fom.liked ? draw('heart', { size: 40 }) : ''}</div>
          </div>
          <div class="deco a-pop" style="right:2%;top:6%;--d:2.4s">${draw('sparkle', { size: 64, cls: 'a-spin-slow' })}</div>
          <div class="deco a-pop" style="left:4%;bottom:10%;--d:2.7s">${draw('sparkle', { size: 44, color: C.pink, cls: 'a-spin-slow' })}</div>
        </div>
      </div>` });

    // 8. reviews
    const revs = s.reviews;
    out.push({ cls: 'bg-ink grid', dur: revs.length ? 4000 + revs.length * 2500 : 4500, html: `
      <div class="title a-up center-text" ${d(.1)}>in your own words ${draw('star', { size: 52, cls: 'a-wiggle' })}</div>
      <div class="notes-big">
        ${revs.length ? revs.map((e, i) => {
          const text = e.review.length > 200 ? e.review.slice(0, 195).replace(/\s+\S*$/, '') + '…' : e.review;
          return `<div class="sticky s${i} a-slap" style="--d:${0.6 + i * 1.6}s;--r:${[-2, 1.6, -1][i]}deg">
            <div class="sticky-head"><b>${esc(e.title)}</b>${stars(e.rating, 24)}${e.liked ? draw('heart', { size: 24 }) : ''}</div>
            ${e.spoilers ? '<p><i>⚠ spoilers — read it on Letterboxd!</i></p>' : `<p>“${esc(text)}”</p>`}
          </div>`;
        }).join('') : `<div class="sticky s0 a-slap" ${d(.6)}><p>no reviews this month. a person of few words. mysterious.</p></div>`}
      </div>` });

    // 9. finale with the 16:9 card
    out.push({ cls: 'bg-paper', dur: Infinity, final: true, html: `
      <div class="finale">
        <div class="title a-up center-text" ${d(.1)}>that’s a wrap, @${name}! ${draw('clapper', { size: 56, cls: 'a-wiggle' })}</div>
        <div class="card-frame a-pop" ${d(.4)}><div class="card-holder"></div></div>
        <div class="actions a-up" ${d(.8)}>
          <button class="btn primary" data-act="save">save image ↓</button>
          <button class="btn" data-act="replay">replay ↺</button>
          <label class="month-pick">${draw('star', { size: 30 })}<select data-act="month">${ctx.months.map(m => { const [y, mo] = m.split('-'); return `<option value="${m}" ${m === ctx.month ? 'selected' : ''}>${MONTHS[+mo - 1]} ${y}</option>`; }).join('')}</select></label>
          <button class="btn ghost" data-act="new">new username</button>
        </div>
        ${ctx.truncated ? '<p class="trunc">heads up: Letterboxd’s feed only keeps your last ~50 entries, so the start of this month may be missing.</p>' : ''}
      </div>`, after(el) {
        const holder = el.querySelector('.card-holder');
        holder.innerHTML = W().renderCard(s);
        W().roughen(holder.querySelector('.card'), s);
      } });

    return out;
  }

  // ---------- layout ----------
  function layout() {
    const stage = $('#stage');
    const vw = window.innerWidth, vh = window.innerHeight;
    const portrait = vh > vw * 1.05;
    const ratio = portrait ? 9 / 16 : 16 / 9;
    let w = vw, h = w / ratio;
    if (h > vh) { h = vh; w = h * ratio; }
    stage.style.width = `${Math.floor(w)}px`;
    stage.style.height = `${Math.floor(h)}px`;
    stage.classList.toggle('portrait', portrait);
    stage.classList.toggle('landscape', !portrait);
    fitCard();
  }

  function fitCard() {
    const frame = document.querySelector('.slide.active .card-frame');
    if (!frame) return;
    const card = frame.querySelector('.card');
    const holder = frame.querySelector('.card-holder');
    const scale = frame.clientWidth / 1920;
    card.style.transform = `scale(${scale})`;
    holder.style.width = `${1920 * scale}px`;
    holder.style.height = `${1080 * scale}px`;
  }

  // ---------- playback ----------
  function countUp(el) {
    el.querySelectorAll('[data-count]').forEach(n => {
      const target = parseFloat(n.dataset.count), dec = +(n.dataset.dec || 0);
      const delay = parseFloat(getComputedStyle(n.closest('[style*="--d"]') || n).getPropertyValue('--d')) * 1000 || 0;
      const t0 = performance.now() + delay, dur = 1200;
      const step = now => {
        const p = Math.min(1, Math.max(0, (now - t0) / dur));
        n.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
        if (p < 1 && el.classList.contains('active')) requestAnimationFrame(step);
      };
      n.textContent = (0).toFixed(dec);
      requestAnimationFrame(step);
    });
  }

  function go(i) {
    if (i < 0) i = 0;
    if (i >= slides.length) i = slides.length - 1;
    slides.forEach((sl, j) => sl.el.classList.remove('active', 'past'));
    slides.forEach((sl, j) => j < i && sl.el.classList.add('past'));
    idx = i; elapsed = 0; last = performance.now();
    const el = slides[i].el;
    void el.offsetWidth; // restart CSS animations
    el.classList.add('active');
    countUp(el);
    fitCard();
    document.querySelectorAll('#bars .bar-fill').forEach((b, j) => { b.style.width = j < i ? '100%' : '0%'; });
    $('#stage').classList.toggle('on-final', !!slides[i].final);
    $('#stage').dataset.theme = slides[i].cls.split(' ')[0];
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const sl = slides[idx];
    if (!sl) return;
    if (!paused && document.visibilityState === 'visible') elapsed += now - last;
    last = now;
    if (sl.dur === Infinity) return;
    const fill = document.querySelectorAll('#bars .bar-fill')[idx];
    if (fill) fill.style.width = `${Math.min(100, (elapsed / sl.dur) * 100)}%`;
    if (elapsed >= sl.dur) go(idx + 1);
  }

  async function exportCard(btn) {
    const card = document.querySelector('.slide.active .card');
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = 'developing film…';
    try {
      await document.fonts.ready;
      const blob = await htmlToImage.toBlob(card, { width: 1920, height: 1080, pixelRatio: 1, style: { transform: 'none' } });
      const fname = `${ctx.feed.username}-${ctx.month}-wrapped.png`;
      const file = new File([blob], fname, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ files: [file], title: 'my month in film' }).catch(() => {});
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = fname; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch (err) {
      console.error(err); alert('Could not save the image — try again in a moment.');
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  }

  // ---------- input ----------
  function onDown(e) {
    if (e.target.closest('button, select, label, a')) return;
    pressAt = performance.now();
    holdTimer = setTimeout(() => { paused = true; $('#stage').classList.add('paused'); }, 220);
  }
  function onUp(e) {
    if (!pressAt) return;
    clearTimeout(holdTimer);
    const held = performance.now() - pressAt;
    pressAt = 0;
    if (paused) { paused = false; $('#stage').classList.remove('paused'); if (held > 220) return; }
    if (slides[idx].final && !e.target.closest('.prev-zone')) {
      const r = $('#stage').getBoundingClientRect();
      if (e.clientX - r.left > r.width * 0.3) return; // on the finale, only "back" taps work
    }
    const r = $('#stage').getBoundingClientRect();
    go(e.clientX - r.left < r.width * 0.3 ? idx - 1 : idx + 1);
  }
  function onKey(e) {
    if ($('#story').hidden) return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft') go(idx - 1);
    if (e.key === 'Escape') ctx.onClose();
  }

  function open(c) {
    ctx = c;
    const defs0 = `<svg width="0" height="0" style="position:absolute">${defs}</svg>`;
    const built = build();
    $('#slides').innerHTML = defs0 + built.map((b, i) => `<section class="slide ${b.cls}" data-i="${i}">${b.html}</section>`).join('');
    // positions written as data-pos (so they don't fight animation transforms)
    $('#slides').querySelectorAll('[data-pos]').forEach(n => n.setAttribute('style', `${n.getAttribute('style') || ''};${n.dataset.pos}`));
    slides = built.map((b, i) => ({ ...b, el: $(`#slides .slide[data-i="${i}"]`) }));
    $('#bars').innerHTML = slides.filter(s0 => !s0.final).map(() => '<div class="bar"><div class="bar-fill"></div></div>').join('');
    $('#story').hidden = false;
    document.body.classList.add('story-open');
    layout();
    // doodles are authored in px; make them scale with the stage instead
    $('#slides').querySelectorAll('.slide svg.doodle, .slide svg.star').forEach(svgEl => {
      if (svgEl.closest('.card')) return;
      svgEl.style.width = `${svgEl.getAttribute('width') / 7}cqmin`;
      svgEl.style.height = `${svgEl.getAttribute('height') / 7}cqmin`;
    });
    slides.forEach(sl => {
      sl.el.querySelectorAll('.a-draw path').forEach(p => p.setAttribute('pathLength', '1'));
      sl.after && sl.after(sl.el);
    });
    go(0);
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function close() {
    cancelAnimationFrame(raf);
    $('#story').hidden = true;
    $('#slides').innerHTML = '';
    document.body.classList.remove('story-open');
  }

  // wire once
  document.addEventListener('DOMContentLoaded', () => {});
  const stage = $('#stage');
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', () => { clearTimeout(holdTimer); pressAt = 0; paused = false; });
  stage.addEventListener('contextmenu', e => e.preventDefault());
  stage.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'save') exportCard(e.target.closest('button'));
    if (act === 'replay') go(0);
    if (act === 'new') ctx.onClose();
  });
  stage.addEventListener('change', e => { if (e.target.dataset.act === 'month') ctx.onMonth(e.target.value); });
  $('#story-close').addEventListener('click', e => { e.stopPropagation(); ctx.onClose(); });
  window.addEventListener('resize', layout);
  window.addEventListener('keydown', onKey);

  return { open, close };
})();
