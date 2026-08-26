const scenes = Array.from(document.querySelectorAll('.scene'));
const dots = Array.from(document.querySelectorAll('.dot'));
let currentIndex = 0;
let isPlaying = false;

function videoIdOf(scene) {
  return scene.dataset.videoId;
}

function startOf(scene) {
  return scene.dataset.start || '0';
}

const npThumb = document.getElementById('npThumb');
const npTitle = document.getElementById('npTitle');
const npSub = document.getElementById('npSub');
const npPlay = document.getElementById('npPlay');
const nowPlaying = document.getElementById('nowPlaying');

function postToPlayer(iframe, func) {
  iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
}

function renderThumb() {
  const scene = scenes[currentIndex];
  const id = videoIdOf(scene);
  const existingIframe = npThumb.querySelector('iframe');
  const sameSceneIframe = existingIframe && existingIframe.dataset.sceneIndex === String(currentIndex);

  if (isPlaying) {
    if (sameSceneIframe) {
      // same video already loaded (just paused), so resume in place, don't reload it
      postToPlayer(existingIframe, 'playVideo');
    } else {
      const start = startOf(scene);
      npThumb.innerHTML = `<iframe
        data-scene-index="${currentIndex}"
        src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&start=${start}"
        title="now playing"
        frameborder="0"
        allow="autoplay; encrypted-media"></iframe>`;
    }
  } else if (sameSceneIframe) {
    // pause the live player instead of tearing it down, so resume picks up where it left off
    postToPlayer(existingIframe, 'pauseVideo');
  } else {
    npThumb.innerHTML = `<img src="https://img.youtube.com/vi/${id}/default.jpg" alt="">`;
  }
}

function setActive(index, playNow) {
  currentIndex = index;
  isPlaying = playNow;
  scenes.forEach((s, i) => s.classList.toggle('is-active', i === index));
  dots.forEach((d, i) => d.classList.toggle('is-active', i === index));

  const s = scenes[index];
  npTitle.textContent = s.dataset.song;
  npSub.textContent = `${s.querySelector('.scene-eyebrow').textContent} · ${s.querySelector('.scene-title').textContent}`;
  npPlay.textContent = isPlaying ? '⏸' : '▶';
  nowPlaying.classList.toggle('playing', isPlaying);
  renderThumb();
}

function goTo(index, playNow) {
  const wrapped = (index + scenes.length) % scenes.length;
  setActive(wrapped, playNow);
}

// --- carousel navigation ---
document.getElementById('prevBtn').addEventListener('click', () => goTo(currentIndex - 1, isPlaying));
document.getElementById('nextBtn').addEventListener('click', () => goTo(currentIndex + 1, isPlaying));

dots.forEach(dot => {
  dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index, 10), isPlaying));
});

document.addEventListener('keydown', (e) => {
  if (document.getElementById('atlasModal').classList.contains('is-open')) return;
  if (e.key === 'ArrowLeft') goTo(currentIndex - 1, isPlaying);
  if (e.key === 'ArrowRight') goTo(currentIndex + 1, isPlaying);
});

// --- swipe between cities on touch devices ---
// The city panel scrolls vertically, so the gesture locks to one axis on the
// first few pixels of movement and only hijacks the ones that are horizontal.
const stage = document.querySelector('.stage');
let startX = 0, startY = 0, axis = null, swiping = false;

const swipeHint = document.getElementById('swipeHint');
let hintGone = false;
function dismissSwipeHint() {
  if (hintGone) return;
  hintGone = true;
  swipeHint.classList.add('is-gone');
}
// clears itself if nobody swipes, so it never becomes furniture
setTimeout(dismissSwipeHint, 6000);

function modalOpen() {
  return document.getElementById('atlasModal').classList.contains('is-open')
      || document.getElementById('mapModal').classList.contains('is-open');
}

function resetDrag(scene) {
  scene.style.transition = '';
  scene.style.transform = '';
}

stage.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1 || modalOpen()) return;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  axis = null;
  swiping = true;
}, { passive: true });

stage.addEventListener('touchmove', (e) => {
  if (!swiping) return;
  const dx = e.touches[0].clientX - startX;
  const dy = e.touches[0].clientY - startY;

  if (axis === null) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    // needs to be clearly sideways, otherwise let the panel scroll
    axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
  }
  if (axis !== 'x') return;

  e.preventDefault();
  const scene = scenes[currentIndex];
  scene.style.transition = 'none';
  // damped so the card follows the thumb without running off screen
  scene.style.transform = `translateX(${dx * 0.4}px)`;
}, { passive: false });

stage.addEventListener('touchend', (e) => {
  if (!swiping) return;
  swiping = false;
  const scene = scenes[currentIndex];
  if (axis !== 'x') return;

  const dx = e.changedTouches[0].clientX - startX;
  resetDrag(scene);

  if (Math.abs(dx) > 55) {
    dismissSwipeHint();
    const dir = dx < 0 ? 1 : -1;
    goTo(currentIndex + dir, isPlaying);
    const incoming = scenes[currentIndex];
    incoming.classList.remove('slide-from-right', 'slide-from-left');
    // reflow so the animation restarts on a rapid second swipe
    void incoming.offsetWidth;
    incoming.classList.add(dir === 1 ? 'slide-from-right' : 'slide-from-left');
    incoming.addEventListener('animationend', function clear() {
      incoming.classList.remove('slide-from-right', 'slide-from-left');
      incoming.removeEventListener('animationend', clear);
    });
  }
}, { passive: true });

stage.addEventListener('touchcancel', () => {
  if (swiping) resetDrag(scenes[currentIndex]);
  swiping = false;
}, { passive: true });

// --- transport controls ---
npPlay.addEventListener('click', () => setActive(currentIndex, !isPlaying));
document.getElementById('npPrev').addEventListener('click', () => goTo(currentIndex - 1, isPlaying));
document.getElementById('npNext').addEventListener('click', () => goTo(currentIndex + 1, isPlaying));

// initial idle state: first scene cued, not playing
setActive(0, false);

// --- hero splash: try to autoplay Kolkata's song behind it; Explore reveals the stage ---
const heroSplash = document.getElementById('heroSplash');
const heroExplore = document.getElementById('heroExplore');

// attempt autoplay immediately; browsers usually block sound-on until a real
// user gesture, so this is a best-effort. The hint text covers the fallback
setActive(0, true);

function dismissHero() {
  heroSplash.classList.add('is-hidden');
  // this click is a genuine user gesture, so retry play in case the earlier
  // autoplay attempt was silently blocked by the browser
  setActive(currentIndex, true);
}

heroExplore.addEventListener('click', (e) => {
  e.stopPropagation();
  dismissHero();
});
heroSplash.addEventListener('click', dismissHero);

const heroMapCta = document.getElementById('heroMapCta');
heroMapCta.addEventListener('click', (e) => {
  e.stopPropagation();
  dismissHero();
  mapModal.classList.add('is-open');
});

// --- ambient "online" count: ticks gently up/down for a live feel ---
const heroLiveCount = document.getElementById('heroLiveCount');
let liveCount = parseInt(heroLiveCount.textContent, 10);
setInterval(() => {
  const delta = Math.floor(Math.random() * 5) - 2;
  liveCount = Math.min(48, Math.max(14, liveCount + delta));
  heroLiveCount.textContent = liveCount;
}, 4000);

// --- live IST clock ---
function updateClock() {
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  }).format(new Date());
  document.getElementById('liveClock').textContent = `${time} IST`;
}
updateClock();
setInterval(updateClock, 15000);

// --- atlas modal ---
const atlasModal = document.getElementById('atlasModal');
const atlasOpen = document.getElementById('atlasOpen');
const atlasClose = document.getElementById('atlasClose');

atlasOpen.addEventListener('click', () => atlasModal.classList.add('is-open'));
atlasClose.addEventListener('click', () => atlasModal.classList.remove('is-open'));
atlasModal.addEventListener('click', (e) => {
  if (e.target === atlasModal) atlasModal.classList.remove('is-open');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    atlasModal.classList.remove('is-open');
    mapModal.classList.remove('is-open');
  }
});

// --- map modal ---
const mapModal = document.getElementById('mapModal');
const mapOpen = document.getElementById('mapOpen');
const mapClose = document.getElementById('mapClose');
// pins on the map and rows in the phone list both carry data-index
const mapPins = Array.from(document.querySelectorAll('.map-pin, .map-list-item'));

mapOpen.addEventListener('click', () => mapModal.classList.add('is-open'));
mapClose.addEventListener('click', () => mapModal.classList.remove('is-open'));
mapModal.addEventListener('click', (e) => {
  if (e.target === mapModal) mapModal.classList.remove('is-open');
});

mapPins.forEach(pin => {
  pin.addEventListener('click', () => {
    mapModal.classList.remove('is-open');
    goTo(parseInt(pin.dataset.index, 10), true);
  });
});

// --- atlas region filter ---
const filterChips = document.querySelectorAll('.filter-chip');
const atlasRegions = document.querySelectorAll('.atlas-region');
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    const filter = chip.dataset.filter;
    atlasRegions.forEach(region => {
      const match = filter === 'All' || region.dataset.region === filter;
      region.classList.toggle('is-hidden', !match);
    });
  });
});
