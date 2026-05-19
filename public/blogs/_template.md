# Ride title

A short intro paragraph. The first line above is rendered as a big heading by
the blog page, so use it for the post title (it doesn't have to match the ride
title exactly).

## How to use this template

1. Copy this file and rename it to match the ride slug, e.g.
   `public/blogs/spokeys-2019-lord-whisky.md`.
2. In `src/data/rides.ts`, set `hasBlog: true` on the matching ride entry.
   (If that ride also has a `blogUrl`, the external link wins.)
3. Commit and push. The ride detail page will show a **Read the blog →**
   button that links to `/rides/<slug>/blog`.

## Writing tips

You can use any standard Markdown:

- **Bold** and *italic* text
- Bullet lists like this one
- [Links to other pages](https://example.com)
- Tables, blockquotes, fenced code blocks — `remark-gfm` is enabled.

### Adding images

The site is served from the root path (custom domain `spokeys.uk`), so you
can use absolute paths from the site root. A photo from the ride's photo
folder is reached like this:

```
![A view from the top](/photos/spokeys-2019-lord-whisky/img-001.jpg)
```

If you ever switch back to the `<user>.github.io/spokeys/` host, paths under
`public/` will move to `/spokeys/...`, so prefer linking to assets in the
same folder as the post: drop images at `public/blogs/<slug>/img-001.jpg`
and reference them as `./<slug>/img-001.jpg`. Relative paths work the same
in dev and prod regardless of base URL.

> Tip: write the post as plain prose first, then drop in photos. Markdown
> renders fastest when there's not too much going on per paragraph.
