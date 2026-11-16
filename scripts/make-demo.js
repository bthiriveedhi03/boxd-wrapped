// Generates fixtures/demo.xml — a fake Letterboxd RSS feed used by the "demo" username.
const fs = require('fs'); const path = require('path');
const films = [
  ['2026-11-01','Paddington 2',2017,5,1,0,'Every frame is a marmalade sandwich. I would die for Mr. Curry’s neighbourhood watch.'],
  ['2026-11-01','Spirited Away',2001,4.5,1,1,''],
  ['2026-11-02','Past Lives',2023,4.5,1,0,'Sat in silence for the whole credits. In-yun is real and it is ruining my life.'],
  ['2026-11-04','The Grand Budapest Hotel',2014,4,0,1,''],
  ['2026-11-05','Jaws',1975,4,0,0,'Watched this with my mum who screamed at the head in the boat like it was 1975.'],
  ['2026-11-07','Barbie',2023,3.5,0,0,''],
  ['2026-11-08','Mad Max: Fury Road',2015,5,1,1,'Two hours of a guitar that shoots fire. Cinema peaked and I was there (on my couch).'],
  ['2026-11-08','Alien',1979,4.5,1,0,''],
  ['2026-11-08','Aliens',1986,4,0,0,'Get away from her, you… okay I’m a Ripley girl now, no notes.'],
  ['2026-11-09','Cats',2019,1,0,0,'I have seen things you people wouldn’t believe. Judi Dench breaking the fourth wall to explain cats to me.'],
  ['2026-11-11','In the Mood for Love',2000,5,1,0,'The hallway. The rain. The qipaos. The noodle soup. I need to lie down.'],
  ['2026-11-12','Knives Out',2019,4,0,1,''],
  ['2026-11-13','Seven Samurai',1954,4.5,1,0,''],
  ['2026-11-14','Everything Everywhere All at Once',2022,4.5,1,1,'Hot dog fingers made me cry twice. Be kind, especially when we don’t know what’s going on.'],
  ['2026-11-15','Ratatouille',2007,4,1,0,''],
  ['2026-11-15','The Room',2003,0.5,0,0,'Oh hi rating. Half a star for the football in tuxedos scene alone.'],
  ['2026-10-28','Hereditary',2018,4,0,0,''],
  ['2026-10-30','Scream',1996,3.5,0,1,''],
  ['2026-10-31','Halloween',1978,4,1,0,'Annual tradition. The music is still the scariest thing about it.'],
  ['2026-10-12','Aftersun',2022,5,1,0,'Under Pressure will never be the same.'],
];
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const items = films.map(([d,t,y,r,like,rw,rev],i) => {
  const desc = `<p><img src=""/></p> ${rev ? `<p>${esc(rev)}</p>` : `<p>Watched on Saturday November 1, 2026.</p>`}`;
  return `<item><title>${esc(t)}, ${y}</title><link>https://letterboxd.com/demo/film/${t.toLowerCase().replace(/[^a-z0-9]+/g,'-')}/</link>
<guid isPermaLink="false">letterboxd-review-${i}</guid><pubDate>${new Date(d).toUTCString()}</pubDate>
<letterboxd:watchedDate>${d}</letterboxd:watchedDate><letterboxd:rewatch>${rw?'Yes':'No'}</letterboxd:rewatch>
<letterboxd:filmTitle>${esc(t)}</letterboxd:filmTitle><letterboxd:filmYear>${y}</letterboxd:filmYear>
<letterboxd:memberRating>${r.toFixed(1)}</letterboxd:memberRating><letterboxd:memberLike>${like?'Yes':'No'}</letterboxd:memberLike>
<description><![CDATA[${desc}]]></description><dc:creator>Demo Viewer</dc:creator></item>`;
});
// one list item, which the parser should skip
items.push('<item><title>My favourite comfort films</title><link>https://letterboxd.com/demo/list/x/</link><description><![CDATA[<p>a list</p>]]></description></item>');
const xml = `<?xml version="1.0" encoding="utf-8"?><rss version="2.0" xmlns:letterboxd="https://letterboxd.com" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Letterboxd - Demo Viewer</title>${items.join('\n')}</channel></rss>`;
fs.writeFileSync(path.join(__dirname,'..','fixtures','demo.xml'), xml);
console.log('wrote demo.xml with', films.length, 'entries');
