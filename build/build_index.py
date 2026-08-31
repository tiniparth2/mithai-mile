"""Regenerates index.html from cities.py + the atlas section.

Run from this directory: python3 build_index.py
Writes to ../index.html.

Reconstructed 2026-08-31 from the deployed index.html after the original
scratchpad copy of this script was lost to a session change. If you edit
this file, keep the static chunks (PRE_STAGE, MID_TAIL_1, etc.) untouched
unless you're deliberately changing that part of the page shell.

The TAIL chunk includes the Vercel Web Analytics script tag
(/_vercel/insights/script.js). That only reports data once Web
Analytics is switched on for this project in the Vercel dashboard
(Project -> Analytics -> Enable) -- the tag is inert until then.
"""
import os
import pickle
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cities import CITIES

with open(os.path.join(HERE, "_bootstrap.pkl"), "rb") as f:
    _boot = pickle.load(f)
CHUNKS = _boot["chunks"]
MOTIF_LABELS = _boot["motif_labels"]

with open(os.path.join(HERE, "current_atlas_section.html"), encoding="utf-8") as f:
    ATLAS_SECTION = f.read()

# equirectangular calibration matching Wikipedia's Module:Location_map/data/India
TOP_LAT, BOTTOM_LAT, LEFT_LON, RIGHT_LON = 37.5, 5.0, 67.0, 99.0

# real lat/long per city, verified via Wikipedia's prop=coordinates API / infobox
COORDS = {
    "Kolkata": (22.5675, 88.37), "Jaipur": (26.915, 75.82), "Delhi": (28.61, 77.23),
    "Agra": (27.18, 78.02), "Varanasi": (25.31889, 83.01278), "Amritsar": (31.64, 74.86),
    "Mysore": (12.30861111, 76.65305556), "Hyderabad": (17.3617, 78.4747),
    "Tirunelveli": (8.71361111, 77.75666667), "Patna": (25.59388889, 85.1375),
    "Pune": (18.52111111, 73.85527778), "Raipur": (21.24444444, 81.63055556),
    "Surat": (21.205, 72.84), "Kozhikode": (11.24888889, 75.78388889),
    "Puri": (19.81056, 85.83139), "Almora": (29.5971, 79.6591),
    "Panaji": (15.49888889, 73.82777778), "Srinagar": (34.09, 74.79),
    "Puducherry": (11.917, 79.817), "Imphal": (24.8074, 93.9384),
    "Guwahati": (26.17222222, 91.74583333), "Tirupati": (13.6355, 79.4236),
    "Gwalior": (26.2125, 78.1775), "Ranchi": (23.36, 85.33),
    "Kurukshetra": (29.965717, 76.837006), "Kullu": (31.95, 77.11),
    "Anantnag": (33.73527778, 75.14777778), "Mumbai": (19.07611111, 72.8775),
    "Mainpuri": (27.23, 79.02),
}


def esc(s):
    return (str(s).replace("&", "&amp;").replace('"', "&quot;")
            .replace("<", "&lt;").replace(">", "&gt;"))


scenes, dots, pins, list_items = [], [], [], []
for i, c in enumerate(CITIES):
    active = " is-active" if i == 0 else ""
    motif_label = MOTIF_LABELS[c["motif"]]
    wiki_url = f"https://en.wikipedia.org/wiki/{c['city'].replace(' ', '_')}"
    places_html = "\n".join(f"            <li>{p}</li>" for p in c["places"])

    scenes.append(f'''    <div class="scene{active}" data-index="{i}" data-video-id="{c['video']}" data-start="{c['start']}" data-song="{esc(c['song'])}" style="--accent:{c['accent']}">
      <div class="sweet-panel">
        <img class="scene-photo" src="{c['bg']}" alt="{esc(c['bg_alt'])}">
        <div class="scene-scrim" aria-hidden="true"></div>
        <div class="sweet-header">
          <p class="scene-eyebrow">{esc(c['region'])}</p>
          <h1 class="scene-title">{esc(c['sweet'])}</h1>
        </div>
        <div class="sweet-footer">
          <p class="scene-note">{c['note']}</p>
        </div>
      </div>
      <div class="city-panel">
        <div class="city-motif motif-{c['motif']}" title="Backdrop motif: {motif_label}" aria-hidden="true"></div>
        <div class="bento-cell bento-landmark">
          <img src="{c['landmark_img']}" alt="{esc(c['landmark_name'])}, {esc(c['region'])}" loading="lazy">
          <div>
            <span class="bento-label">Landmark</span>
            <h3>{esc(c['landmark_name'])}</h3>
          </div>
        </div>
        <div class="bento-cell bento-history">
          <span class="bento-label">History</span>
          <p>{c['history']}</p>
        </div>
        <div class="bento-cell bento-places">
          <span class="bento-label">Places to visit</span>
          <ul>
{places_html}
          </ul>
        </div>
        <a class="wiki-link" href="{wiki_url}" target="_blank" rel="noopener">Read more about {c['city']} on Wikipedia &nearr;</a>
        <p class="motif-credit">Backdrop pattern: {motif_label}</p>
      </div>
    </div>''')

    dots.append(f'        <button class="dot{" is-active" if i == 0 else ""}" data-index="{i}" aria-label="Go to {c["city"]}"></button>')

    lat, lon = COORDS[c["city"]]
    x = (lon - LEFT_LON) / (RIGHT_LON - LEFT_LON) * 100
    y = (TOP_LAT - lat) / (TOP_LAT - BOTTOM_LAT) * 100
    pin_classes = ["map-pin"]
    if y < 16:
        pin_classes.append("card-below")
    if x > 82:
        pin_classes.append("card-align-left")
    elif x < 14:
        pin_classes.append("card-align-right")
    pins.append(f'''      <button class="{" ".join(pin_classes)}" style="left:{x:.2f}%; top:{y:.2f}%; --accent:{c['accent']}; --i:{i}" data-index="{i}" aria-label="Jump to {c['city']}, {esc(c['sweet'])}">
        <span class="map-pin-dot"></span>
        <span class="map-pin-card">
          <img src="{c['bg']}" alt="" loading="lazy">
          <span class="map-pin-card-text">
            <strong>{c['city']}</strong>
            <em>{esc(c['sweet'])}</em>
            <small>{esc(c['song'])}</small>
          </span>
        </span>
      </button>''')

for i, c in sorted(enumerate(CITIES), key=lambda p: p[1]["city"]):
    list_items.append(f'''        <li><button class="map-list-item" data-index="{i}" style="--accent:{c['accent']}">
          <span class="map-list-city">{c['city']}</span>
          <span class="map-list-sweet">{esc(c['sweet'])}</span>
        </button></li>''')

html = (
    CHUNKS["PRE_STAGE"]
    + "\n" + "\n".join(scenes) + "\n\n  "
    + CHUNKS["MID_TAIL_1"] + "\n"
    + "\n".join(dots) + "\n  "
    + CHUNKS["MID_TAIL_2"]
    + CHUNKS["ATLAS_MODAL_PREFIX"] + ATLAS_SECTION + CHUNKS["ATLAS_MODAL_SUFFIX"]
    + CHUNKS["MAP_MODAL_PREFIX"]
    + "\n".join(pins)
    + CHUNKS["MAP_PINS_TO_LIST_OPEN"] + "\n"
    + "\n".join(list_items) + "\n    "
    + CHUNKS["LIST_TO_END"]
    + CHUNKS["HERO_BLOCK"]
    + CHUNKS["TAIL"]
)

out_path = os.path.join(HERE, "..", "index.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(html)
print("wrote", out_path, "-", len(html), "bytes,", len(CITIES), "cities")
