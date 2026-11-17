// "Krunt täna" — real drone photos of the plot (13.11.2026)
const PH = [
  ['DJI_0192', 38], ['DJI_0189', 33], ['DJI_0172', 78], ['DJI_0175', 101],
  ['DJI_0194', 23], ['DJI_0183', 19], ['DJI_0181', 8], ['DJI_0176', 68],
];
const CAP = {
  et: (h) => `Krunt täna · droonifoto 13.11.2026 · kõrgus ${h} m`,
  en: (h) => `The plot today · drone photo 13 Nov 2026 · altitude ${h} m`,
  ru: (h) => `Участок сегодня · фото с дрона 13.11.2026 · высота ${h} м`,
};
export function initPhotos({ LANG }) {
  const view = document.querySelector('#photoview'), stage = view.querySelector('.ph-stage'), img = document.querySelector('#phimg');
  const bar = view.querySelector('.ph-bar'), th = document.querySelector('#phthumbs');
  bar.querySelector('label')?.remove();
  view.querySelector('#phcan')?.remove();
  // caption above the strip (wraps on phones)
  let note = view.querySelector('.ph-note'); if (!note) { note = document.createElement('div'); note.className = 'small ph-note'; }
  bar.prepend(note);
  // arrows + counter on the photo
  const prev = document.createElement('button'), next = document.createElement('button'), cnt = document.createElement('div');
  prev.className = 'ph-nav prev'; next.className = 'ph-nav next'; prev.innerHTML = '‹'; next.innerHTML = '›'; prev.setAttribute('aria-label', 'previous'); next.setAttribute('aria-label', 'next'); cnt.className = 'ph-count';
  stage.append(prev, next, cnt);
  th.innerHTML = PH.map(([n], i) => `<img src="assets/photos/t_${n}.jpg" data-i="${i}" alt="" draggable="false">`).join('');
  let cur = 0;
  const show = i => { cur = (i + PH.length) % PH.length; img.src = `assets/photos/${PH[cur][0]}.jpg`; note.textContent = CAP[LANG()](PH[cur][1]); cnt.textContent = `${cur + 1} / ${PH.length}`;
    th.querySelectorAll('img').forEach((t, k) => t.classList.toggle('on', k === cur));
    const t = th.children[cur]; if (t) th.scrollTo({ left: t.offsetLeft - th.clientWidth / 2 + t.clientWidth / 2, behavior: 'smooth' }); };
  th.querySelectorAll('img').forEach(t => t.onclick = () => show(+t.dataset.i));
  prev.onclick = () => show(cur - 1); next.onclick = () => show(cur + 1);
  // swipe on the photo
  let sx = null, sy = null;
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  addEventListener('keydown', e => { if (view.classList.contains('hidden')) return; if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
  show(0);
  return true;
}
