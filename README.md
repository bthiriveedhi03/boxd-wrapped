# Boxd Wrapped 🎬

Type a Letterboxd username, get a hand-drawn **16:9 (1920×1080) monthly wrapped** you can download as a PNG.

```bash
npm start      # http://localhost:3000  — needs Node 18+, no npm install required
```

Try the username `demo` to see it with sample data.

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
