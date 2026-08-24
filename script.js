// facade -> real YouTube embed, one playing at a time
document.querySelectorAll('.player').forEach(player => {
  player.querySelector('.play-btn').addEventListener('click', () => {
    document.querySelectorAll('.player iframe').forEach(frame => {
      const p = frame.closest('.player');
      const id = p.dataset.videoId;
      p.innerHTML = `
        <img class="thumb" src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
        <button class="play-btn" aria-label="Play">▶</button>
      `;
      p.querySelector('.play-btn').addEventListener('click', () => playVideo(p));
    });
    playVideo(player);
  });
});

function playVideo(player) {
  const id = player.dataset.videoId;
  player.innerHTML = `<iframe
    src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0"
    title="YouTube video player"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>`;
}

// scroll progress bar
const progressBar = document.getElementById('progressBar');
function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// reveal-on-scroll + stop counter
const stops = Array.from(document.querySelectorAll('section.stop'));
const counter = document.getElementById('stopCounter');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const inner = entry.target.querySelector('.stop-inner');
    if (entry.isIntersecting) {
      inner.classList.add('visible');
      const index = stops.indexOf(entry.target) + 1;
      const city = entry.target.dataset.city;
      counter.textContent = `${String(index).padStart(2, '0')} / ${stops.length} — ${city}`;
      const accent = getComputedStyle(entry.target).getPropertyValue('--accent').trim();
      if (accent) counter.style.color = accent;
    }
  });
}, { threshold: 0.4 });

stops.forEach(stop => observer.observe(stop));
