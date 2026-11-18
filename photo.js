// Gallery: photoreal Blender Cycles visualisations + real drone photos of the plot (13.11.2026)
const PH = [
  ['DJI_0192', 38], ['DJI_0189', 33], ['DJI_0172', 78], ['DJI_0175', 101],
  ['DJI_0194', 23], ['DJI_0183', 19], ['DJI_0181', 8], ['DJI_0176', 68],
];
const CAP = {
  et: (h) => `Krunt täna · droonifoto 13.11.2026 · kõrgus ${h} m`,
  en: (h) => `The plot today · drone photo 13 Nov 2026 · altitude ${h} m`,
  ru: (h) => `Участок сегодня · фото с дрона 13.11.2026 · высота ${h} м`,
};
const RN = [
  ['terrace', 'Terrass õhtupäikeses', 'Terrace in the evening sun', 'Терраса в вечернем солнце'],
  ['entry', 'Peafassaad ja sissepääs', 'Main facade and entrance', 'Главный фасад и вход'],
  ['aerial', 'Maja ja meri linnulennult', 'The house and the sea from above', 'Дом и море с высоты'],
  ['balcony', 'Vaade magamistoast rõdule ja merele', 'From the master bedroom to the balcony and the sea', 'Из спальни на балкон и море'],
  ['livB', 'Elutuba', 'Living room', 'Гостиная'],
  ['kitchen', 'Köök ja söögituba', 'Kitchen and dining', 'Кухня-столовая'],
  ['master', 'Master-magamistuba', 'Master bedroom', 'Главная спальня'],
];
const NOTE = { et: 'visualiseering · sisekujundus illustratiivne', en: 'visualisation · interior is illustrative', ru: 'визуализация · интерьер иллюстративный' };
const SETS = { et: ['Visualiseeringud', 'Krunt täna'], en: ['Visualisations', 'The plot today'], ru: ['Визуализации', 'Участок сегодня'] };
const LI = { et: 1, en: 2, ru: 3 };
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
  // two sets: renders (default) and drone photos
  const sets = document.createElement('div'); sets.className = 'ph-sets'; stage.append(sets);
  let set = 0, cur = 0;
  const items = () => set === 0 ? RN.map(r => ({ src: `assets/renders/${r[0]}.jpg`, th: `assets/renders/t_${r[0]}.jpg`, cap: `${r[LI[LANG()]]} · ${NOTE[LANG()]}` }))
                                : PH.map(([n, h]) => ({ src: `assets/photos/${n}.jpg`, th: `assets/photos/t_${n}.jpg`, cap: CAP[LANG()](h) }));
  const build = () => {
    sets.innerHTML = SETS[LANG()].map((t, k) => `<button class="${k === set ? 'on' : ''}" data-k="${k}">${t}</button>`).join('');
    sets.querySelectorAll('button').forEach(b => b.onclick = () => { set = +b.dataset.k; build(); show(0); });
    th.innerHTML = items().map((it, i) => `<img src="${it.th}" data-i="${i}" alt="" draggable="false">`).join('');
    th.querySelectorAll('img').forEach(t => t.onclick = () => show(+t.dataset.i));
  };
  const show = i => { const L = items(); cur = (i + L.length) % L.length; img.src = L[cur].src; note.textContent = L[cur].cap; cnt.textContent = `${cur + 1} / ${L.length}`;
    th.querySelectorAll('img').forEach((t, k) => t.classList.toggle('on', k === cur));
    const t = th.children[cur]; if (t) th.scrollTo({ left: t.offsetLeft - th.clientWidth / 2 + t.clientWidth / 2, behavior: 'smooth' }); };
  prev.onclick = () => show(cur - 1); next.onclick = () => show(cur + 1);
  // swipe on the photo
  let sx = null, sy = null;
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  addEventListener('keydown', e => { if (view.classList.contains('hidden')) return; if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
  build(); show(0);
  window.__galleryLang = () => { build(); show(cur); };
  return true;
}
