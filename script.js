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

function renderThumb() {
  const scene = scenes[currentIndex];
  const id = videoIdOf(scene);
  if (isPlaying) {
    const start = startOf(scene);
    npThumb.innerHTML = `<iframe
      src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1&start=${start}"
      title="now playing"
      frameborder="0"
      allow="autoplay; encrypted-media"></iframe>`;
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
// user gesture, so this is a best-effort — the hint text covers the fallback
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
const mapPins = Array.from(document.querySelectorAll('.map-pin'));

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
