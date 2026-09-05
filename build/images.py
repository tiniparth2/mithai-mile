"""Turn the hardcoded Wikimedia 500px thumbnails into responsive srcsets.

Every image URL in cities.py and the atlas section points at Commons'
thumbnailer, e.g.

    .../commons/thumb/7/72/Rasmalai1.jpg/500px-Rasmalai1.jpg

500px was fine for a thumbnail and far too small for the full-bleed scene and
hero photos, which cover the whole viewport and then run through the posterize
filter, so every soft pixel gets banded into mush. That is the "images quality
blur" complaint.

Three things govern what can be asked for:

1. Wikimedia only serves hotlinked thumbnails at the standard widths in
   STANDARD_WIDTHS. Any other width is rejected with a 400 ("Use thumbnail
   sizes listed on https://w.wiki/GHai"), not quietly rounded, so a request for
   640px yields a broken image. See MediaWiki's $wgThumbnailSteps and T414805.
2. A width above the source is served, by upscaling. That adds bytes and never
   adds detail, so it is worth avoiding, but it does not break.
3. Original files (the /commons/ path without /thumb/) must not be linked.
   Thumbnails are CDN-cached and answer reliably; originals are rate-limited
   and return 429 to hotlinkers, browser User-Agent or not.

So a request is capped at the detail the source actually holds, and then
rounded UP to the next standard step. Rounding up rather than down matters: a
200px source asked for at the 120px step would throw away real detail, while
serving it at 250px keeps all of it. The srcset descriptor reports the source's
true width, not the step, so the browser is never told an upscale is sharper
than it is.
"""
import re
import urllib.parse

from image_sizes import SOURCE_WIDTHS

# $wgThumbnailSteps in Wikimedia production. Direct/hotlinked requests for any
# other width are rejected outright.
STANDARD_WIDTHS = (20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840)

THUMB_RE = re.compile(
    r'^(?P<base>https://upload\.wikimedia\.org/wikipedia/commons/thumb/'
    r'[0-9a-f]/[0-9a-f]{2}/(?P<file>[^/]+))/\d+px-(?P<tail>.+)$'
)


def _parts(url):
    m = THUMB_RE.match(url)
    if not m:
        return None
    name = urllib.parse.unquote(m.group("file"))
    width = SOURCE_WIDTHS.get(name) or SOURCE_WIDTHS.get(m.group("file"))
    if width is None:
        return None
    return m.group("base"), m.group("tail"), width


def _step_at_or_above(width):
    """Smallest standard width that is >= `width`, so no detail is dropped."""
    for step in STANDARD_WIDTHS:
        if step >= width:
            return step
    return STANDARD_WIDTHS[-1]


def effective_width(url, width):
    """The real detail `thumb(url, width)` carries, for the srcset descriptor.

    Capped by the source: asking for more than the file holds returns an
    upscale, which is not worth describing as extra resolution.
    """
    parts = _parts(url)
    if parts is None:
        return width
    _, _, source_width = parts
    return min(width, source_width)


def thumb(url, width):
    """`url` re-pointed at the smallest standard step that keeps all the detail."""
    parts = _parts(url)
    if parts is None:
        return url
    base, tail, _ = parts
    return f"{base}/{_step_at_or_above(effective_width(url, width))}px-{tail}"


def candidates(url, widths):
    """(url, real width) per distinct size this file can serve, smallest first.

    Sizes that collapse onto the same width, because the source ran out before
    the requested size did, are de-duplicated, so a 316px source contributes
    one candidate rather than four identical ones.
    """
    seen, out = set(), []
    for w in sorted(widths):
        real = effective_width(url, w)
        if real in seen:
            continue
        seen.add(real)
        out.append((thumb(url, w), real))
    return out


def _srcset(cands):
    return ", ".join(f"{u} {w}w" for u, w in cands)


def responsive_attrs(url, widths, sizes, fallback=None):
    """`src`/`srcset`/`sizes` attributes, ready to drop into an img tag.

    `fallback` is the width used for `src`, for browsers that ignore srcset;
    it defaults to the smallest candidate.
    """
    cands = candidates(url, widths)
    if not cands:
        return f'src="{url}"'
    src_url = thumb(url, fallback) if fallback is not None else cands[0][0]
    attrs = f'src="{src_url}"'
    if len(cands) > 1:
        attrs += f' srcset="{_srcset(cands)}" sizes="{sizes}"'
    return attrs


def deferred_attrs(url, widths, sizes, placeholder):
    """Like `responsive_attrs`, but the hi-res set is parked in data-* attrs.

    All the scenes sit stacked in the viewport under `visibility: hidden`, so
    the browser eagerly downloads every scene photo on load. Handing all of
    them a full srcset would multiply the page weight by the upgrade factor.
    Instead each scene ships a light placeholder and script.js promotes the
    active scene (and its two neighbours) to the real srcset on demand.
    """
    cands = candidates(url, widths)
    if not cands:
        return f'src="{url}"'
    attrs = f'src="{thumb(url, placeholder)}"'
    if len(cands) > 1:
        attrs += f' data-srcset="{_srcset(cands)}" data-sizes="{sizes}"'
    return attrs


ATLAS_IMG_RE = re.compile(r'<img src="(?P<url>https://upload\.wikimedia\.org/[^"]+)"')


def upgrade_atlas_images(html, widths, sizes):
    """Add a srcset to every plain <img src=...> in the atlas section."""
    def repl(m):
        # single-candidate files still get rewritten, so a URL never asks for
        # a non-standard width or an upscale that would 400
        return f'<img {responsive_attrs(m.group("url"), widths, sizes)}'
    return ATLAS_IMG_RE.sub(repl, html)
