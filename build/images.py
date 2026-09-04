"""Turn the hardcoded Wikimedia 500px thumbnails into responsive srcsets.

Every image URL in cities.py and the atlas section points at Commons'
thumbnailer, e.g.

    .../commons/thumb/7/72/Rasmalai1.jpg/500px-Rasmalai1.jpg

500px was fine for a thumbnail and far too small for the full-bleed scene and
hero photos, which cover the whole viewport and then run through the posterize
filter, so every soft pixel gets banded into mush. That is the "images quality
blur" complaint.

Two hard constraints on what can be asked for:

1. Wikimedia only serves hotlinked thumbnails at the standard widths in
   STANDARD_WIDTHS. Any other width is rejected with a 400 ("Use thumbnail
   sizes listed on https://w.wiki/GHai"), not quietly rounded, so a request for
   640px yields a broken image. See MediaWiki's $wgThumbnailSteps and T414805.
2. A thumbnail wider than the source is never generated.

So every requested width is snapped DOWN to a standard size that the source can
actually fill. Where snapping down would waste a lot of a small source (a 958px
original dropping to the 500px step), the original file is linked instead,
which is both sharper and, at these dimensions, no heavier.
"""
import re
import urllib.parse

from image_sizes import SOURCE_WIDTHS

# $wgThumbnailSteps in Wikimedia production. Direct/hotlinked requests for any
# other width are rejected outright.
STANDARD_WIDTHS = (20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840)

# Below this, linking the original file instead of a thumbnail is worth it when
# the standard ladder would round the source down. Above it, originals are
# multi-megabyte camera JPEGs and never worth serving.
ORIGINAL_MAX_WIDTH = 960

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


def _snap(width):
    """Largest standard width that is <= `width`."""
    usable = [w for w in STANDARD_WIDTHS if w <= width]
    return usable[-1] if usable else STANDARD_WIDTHS[0]


def _original(base):
    """The full-size file, i.e. the thumb URL with the /thumb/ segment gone."""
    return base.replace("/wikipedia/commons/thumb/", "/wikipedia/commons/", 1)


def effective_width(url, width):
    """The pixel width `thumb(url, width)` will actually deliver."""
    parts = _parts(url)
    if parts is None:
        return width
    _, _, source_width = parts
    if width >= source_width:
        return source_width
    snapped = _snap(width)
    if source_width <= ORIGINAL_MAX_WIDTH and source_width > snapped:
        return source_width
    return snapped


def thumb(url, width):
    """`url` re-pointed at the best size that is <= `width` and really served."""
    parts = _parts(url)
    if parts is None:
        return url
    base, tail, source_width = parts
    if width >= source_width:
        return _original(base) if source_width <= ORIGINAL_MAX_WIDTH \
            else f"{base}/{_snap(source_width)}px-{tail}"
    snapped = _snap(width)
    if source_width <= ORIGINAL_MAX_WIDTH and source_width > snapped:
        return _original(base)
    return f"{base}/{snapped}px-{tail}"


def candidates(url, widths):
    """(url, real width) per distinct size this file can serve, smallest first.

    Sizes that collapse onto the same delivered width, because the ladder
    snapped them together or the source ran out, are de-duplicated, so a 316px
    original contributes one candidate rather than four identical ones.
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
