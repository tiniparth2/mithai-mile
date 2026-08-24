const stops = Array.from(document.querySelectorAll('section.stop'));
let currentIndex = 0;
let isPlaying = false;

function videoIdOf(stop) {
  return stop.querySelector('.play-chip').dataset.videoId;
}

const npThumb = document.getElementById('npThumb');
const npTitle = document.getElementById('npTitle');
const npSub = document.getElementById('npSub');
const npPlay = document.getElementById('npPlay');
const nowPlaying = document.getElementById('nowPlaying');

function renderThumb() {
  const id = videoIdOf(stops[currentIndex]);
  if (isPlaying) {
    npThumb.innerHTML = `<iframe
      src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1"
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
  const s = stops[index];
  npTitle.textContent = s.dataset.song;
  npSub.textContent = `${s.dataset.city} · ${s.querySelector('h2').textContent}`;
  npPlay.textContent = isPlaying ? '⏸' : '▶';
  nowPlaying.classList.toggle('playing', isPlaying);
  renderThumb();
  syncCardButtons();
}

// keep every per-card play button in sync with what's actually playing,
// so there's one shared state instead of two controls that can disagree
function syncCardButtons() {
  stops.forEach((stop, i) => {
    const chip = stop.querySelector('.play-chip');
    const active = i === currentIndex;
    chip.classList.toggle('is-active', active && isPlaying);
    chip.textContent = active && isPlaying ? '⏸' : '▶';
  });
}

// --- transport controls ---
npPlay.addEventListener('click', () => setActive(currentIndex, !isPlaying));

document.getElementById('npPrev').addEventListener('click', () => {
  const i = (currentIndex - 1 + stops.length) % stops.length;
  setActive(i, isPlaying);
  stops[i].scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('npNext').addEventListener('click', () => {
  const i = (currentIndex + 1) % stops.length;
  setActive(i, isPlaying);
  stops[i].scrollIntoView({ behavior: 'smooth' });
});

// --- per-section play buttons: click toggles if it's the current song, otherwise jumps to it ---
stops.forEach((stop, index) => {
  stop.querySelector('.play-chip').addEventListener('click', () => {
    if (index === currentIndex) {
      setActive(index, !isPlaying);
    } else {
      setActive(index, true);
    }
  });
});

// initial idle state: first stop cued, not playing
setActive(0, false);

// --- scroll progress bar ---
const progressBar = document.getElementById('progressBar');
function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// --- live IST clock ---
function updateClock() {
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  }).format(new Date());
  document.getElementById('liveClock').textContent = `${time} IST`;
}
updateClock();
setInterval(updateClock, 15000);

// --- reveal on scroll + city chip + auto-advance track while playing ---
const stopChip = document.getElementById('stopChip');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const inner = entry.target.querySelector('.stop-inner');
    if (inner) inner.classList.add('visible');

    const index = stops.indexOf(entry.target);
    stopChip.textContent = `${String(index + 1).padStart(2, '0')} / ${stops.length} — ${entry.target.dataset.city}`;
    const accent = getComputedStyle(entry.target).getPropertyValue('--accent').trim();
    if (accent) stopChip.style.color = accent;

    if (isPlaying && index !== currentIndex) {
      setActive(index, true);
    }
  });
}, { threshold: 0.6 });

stops.forEach(stop => observer.observe(stop));

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
