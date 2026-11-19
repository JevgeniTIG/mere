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
const RN = [   // visualisations
  ['01_tanav', 'Peafassaad tänavalt', 'Main facade from the street', 'Главный фасад с улицы'],
  ['02_ohust', 'Maja ja meri linnulennult', 'The house and the sea from above', 'Дом и море с высоты'],
  ['03_terrass', 'Aiaterrass ja saunatsoon', 'Garden terrace and the sauna lounge', 'Терраса и зона сауны'],
  ['04_elutuba', 'Elutuba kaminaga, taga köök', 'Living room with fireplace, kitchen behind', 'Гостиная с камином, за ней кухня'],
  ['05_kook', 'Köök ja söögituba merevaatega', 'Kitchen and dining with a sea view', 'Кухня-столовая с видом на море'],
  ['06_master', 'Magamistuba rõdu ja merevaatega', 'Master bedroom with balcony and sea view', 'Спальня с балконом и видом на море'],
  ['07_saunatsoon', 'Saunatsoon ja saun', 'Sauna lounge and sauna', 'Зона отдыха и сауна'],
  ['08_vannituba', 'Vannituba', 'Bathroom', 'Ванная комната'],
  ['09_ohtu', 'Peafassaad õhtul', 'Main facade in the evening', 'Главный фасад вечером'],
];
const NOTE = { et: 'illustreeriv visualiseering', en: 'illustrative visualisation', ru: 'иллюстративная визуализация' };
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
  // the two sets are separate tabs now (Galerii = drone photos, Visualiseerimine = renders): no switcher inside
  let set = 1, cur = 0; sets.style.display = 'none';
  const items = () => set === 0 ? RN.map(r => ({ src: `assets/viz/${r[0]}.jpg`, th: `assets/viz/t_${r[0]}.jpg`, cap: `${r[LI[LANG()]]} · ${NOTE[LANG()]}` }))
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
  window.__gallerySet = k => { if (k === set) return; set = k; build(); show(0); };
  return true;
}
