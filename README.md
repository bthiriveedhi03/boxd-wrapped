# Boxd Wrapped 🎬

Type a Letterboxd username and get an animated, hand-drawn monthly wrapped: tap-through story slides (like Spotify Wrapped) that end on a **16:9 (1920×1080) summary card** you can save or share.

Slides fill the screen: 16:9 on desktop/landscape, vertical 9:16 on a phone held upright.
Tap right to go forward, left to go back, hold to pause (arrow keys / Esc on desktop).

```bash
npm start      # http://localhost:3000  — needs Node 18+, no npm install required
```

Try the username `demo` to see it with sample data.

## Slides
intro → films watched (poster rain) → diary calendar → average rating + histogram → hearts & rewatches → fun facts → film of the month → top reviews → the summary card

## What's on the card
- films watched, average rating, films hearted, rewatches (sketchy rough.js tiles)
- **film of the month** polaroid (highest rated, liked/reviewed tie-breaks)
- **top 3 reviews** as sticky notes (spoiler reviews are hidden)
- diary calendar with doodled circles for each watch day
- hand-drawn rating histogram
- fun facts: binge day, longest streak, go-to movie night, favourite decade, oldest watch, "the one that hurt"
- a film-strip of the month's posters

## How it works
Letterboxd has no public API, so `server.js` reads the user's public RSS feed
(`letterboxd.com/<user>/rss/`), parses diary entries, and proxies poster images so
the card can be exported as an image. The feed only holds the ~50 most recent entries,
so very old months (or very busy ones) may be incomplete — the app warns you when that's likely.

Libraries (rough.js, html-to-image) and fonts (Caveat, Patrick Hand) are vendored in `public/`.
