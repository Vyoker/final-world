(function () {
  'use strict';
  const { Auth, IMG } = FW;
  const sess = Auth.require('developer'); if (!sess) return;
  const $ = (id) => document.getElementById(id);
  const KEY = 'fw_data';
  let D;
  try { D = JSON.parse(localStorage.getItem(KEY)) || JSON.parse(JSON.stringify(window.GAME_DATA)); } catch (e) { D = JSON.parse(JSON.stringify(window.GAME_DATA)); }
  let tab = 'classes', sel = 0;

  const ids = (arr) => arr.map((o) => o.id);
  const SLOTS = ['weapon', 'armor', 'head', 'accessory'];
  const S = {
    classes: { title: 'Karakter / Class', get: () => D.classes, fields: [['id', 'ID', 'text'], ['name', 'Nama', 'text'], ['hp', 'HP', 'number'], ['mp', 'MP', 'number'], ['atk', 'ATK', 'number'], ['def', 'DEF', 'number'], ['mag', 'MAG', 'number'], ['spd', 'SPD', 'number'], ['color', 'Warna', 'color'], ['sprite', 'Sprite jalan (sheet 3 kolom frame × 4 baris arah: bawah, atas, kiri, kanan)', 'img', { w: 192, h: 256 }]], blank: () => ({ sprite: '', id: 'cls' + Date.now() % 10000, name: 'Class Baru', hp: 25, mp: 5, atk: 5, def: 3, mag: 3, spd: 5, color: '#cccccc' }) },
    items: { title: 'Item', get: () => D.items, fields: [['id', 'ID', 'text'], ['name', 'Nama', 'text'], ['type', 'Tipe', 'select', ['consumable', 'key']], ['effect', 'Efek', 'select', ['heal', 'mp', 'revive', 'none']], ['value', 'Nilai', 'number'], ['price', 'Harga', 'number'], ['desc', 'Deskripsi', 'textarea']], blank: () => ({ id: 'item' + Date.now() % 10000, name: 'Item Baru', type: 'consumable', effect: 'heal', value: 10, price: 10, desc: '' }) },
    equipment: { title: 'Equipment', get: () => D.equipment, fields: [['id', 'ID', 'text'], ['name', 'Nama', 'text'], ['slot', 'Slot', 'select', SLOTS], ['atk', 'ATK', 'number'], ['def', 'DEF', 'number'], ['mag', 'MAG', 'number'], ['spd', 'SPD', 'number'], ['price', 'Harga', 'number'], ['classes', 'Class (kosong = semua)', 'multi', () => ids(D.classes)]], blank: () => ({ id: 'eq' + Date.now() % 10000, name: 'Equip Baru', slot: 'weapon', atk: 1, def: 0, mag: 0, spd: 0, price: 50, classes: [] }) },
    skills: { title: 'Skill', get: () => D.skills, fields: [['id', 'ID', 'text'], ['name', 'Nama', 'text'], ['type', 'Tipe', 'select', ['damage', 'heal']], ['mp', 'Biaya MP', 'number'], ['power', 'Power', 'number'], ['fx', 'Efek visual', 'select', ['slash', 'fire', 'ice', 'thunder', 'heal']], ['classes', 'Class pemakai (kosong = semua)', 'multi', () => ids(D.classes)]], blank: () => ({ id: 'sk' + Date.now() % 10000, name: 'Skill Baru', mp: 3, power: 10, type: 'damage', fx: 'fire', classes: [] }) },
    enemies: { title: 'Musuh', get: () => D.enemies, fields: [['id', 'ID', 'text'], ['name', 'Nama', 'text'], ['hp', 'HP', 'number'], ['atk', 'ATK', 'number'], ['def', 'DEF', 'number'], ['spd', 'SPD', 'number'], ['exp', 'EXP', 'number'], ['gold', 'Gil', 'number'], ['color', 'Warna', 'color'], ['boss', 'Bos', 'bool'], ['img', 'Gambar musuh (PNG, maks 96px)', 'img', { w: 96, h: 96 }]], blank: () => ({ img: '', id: 'en' + Date.now() % 10000, name: 'Musuh Baru', hp: 20, atk: 6, def: 2, spd: 4, exp: 5, gold: 8, color: '#aa4444' }) },
    quests: { title: 'Misi', get: () => D.quests, fields: [['id', 'ID', 'text'], ['name', 'Nama', 'text'], ['desc', 'Deskripsi', 'textarea'], ['type', 'Tipe', 'select', ['talk', 'kill']], ['target', 'Target (ID NPC / musuh)', 'text'], ['count', 'Jumlah', 'number'], ['rewardGold', 'Hadiah Gil', 'number'], ['rewardExp', 'Hadiah EXP', 'number'], ['rewardItems', 'Hadiah Item', 'multi', () => ids(D.items.concat(D.equipment))], ['next', 'Misi berikutnya', 'select', () => [''].concat(ids(D.quests))]], blank: () => ({ id: 'q' + Date.now() % 10000, name: 'Misi Baru', desc: '', type: 'kill', target: 'goblin', count: 1, rewardGold: 10, rewardExp: 5, rewardItems: [], next: '' }) },
    tileset: { title: 'Tileset', custom: true }, maps: { title: 'Map & Event', custom: true }, meta: { title: 'Pengaturan', custom: true }
  };

  function toast(t) { const e = $('toast'); e.textContent = t; e.className = 'on'; setTimeout(() => (e.className = ''), 1400); }
  function save() { localStorage.setItem(KEY, JSON.stringify(D)); toast('Tersimpan'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function renderTabs() {
    $('tabs').innerHTML = Object.keys(S).map((k) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${S[k].title}</button>`).join('');
  }
  $('tabs').onclick = (e) => { const t = e.target.dataset.t; if (t) { tab = t; sel = 0; render(); } };

  function fieldHTML(f, obj) {
    const [k, label, type, opts] = f, v = obj[k], o = typeof opts === 'function' ? opts() : opts;
    let inp;
    if (type === 'img') return `<label>${label}</label><div class="imgf">${v ? `<img src="${IMG.resolve(v)}">` : '<span class="small">(belum ada)</span>'}<input type="file" accept="image/*" data-img="${k}" data-w="${o.w}" data-h="${o.h}"><button class="sec" data-imgclr="${k}" type="button">Hapus</button></div>`;
    if (type === 'textarea') inp = `<textarea data-k="${k}">${esc(v || '')}</textarea>`;
    else if (type === 'select') inp = `<select data-k="${k}">${o.map((x) => `<option value="${esc(x)}" ${x === v ? 'selected' : ''}>${esc(x) || '(tidak ada)'}</option>`).join('')}</select>`;
    else if (type === 'multi') inp = `<select data-k="${k}" data-multi="1" multiple size="4">${o.map((x) => `<option value="${esc(x)}" ${(v || []).includes(x) ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    else if (type === 'bool') inp = `<select data-k="${k}" data-bool="1"><option value="0">Tidak</option><option value="1" ${v ? 'selected' : ''}>Ya</option></select>`;
    else inp = `<input data-k="${k}" type="${type === 'number' ? 'number' : type === 'color' ? 'color' : 'text'}" value="${esc(v === undefined ? '' : v)}">`;
    return `<label>${label}</label>${inp}`;
  }
  function readField(el, obj) {
    const k = el.dataset.k;
    if (el.dataset.multi) obj[k] = [...el.selectedOptions].map((o) => o.value);
    else if (el.dataset.bool) obj[k] = el.value === '1';
    else if (el.type === 'number') obj[k] = +el.value;
    else obj[k] = el.value;
  }

  function bindImgs(obj) {
    $('main').querySelectorAll('[data-img]').forEach((el) => el.addEventListener('change', async () => { const f = el.files[0]; if (!f) return; try { obj[el.dataset.img] = await IMG.fromFile(f, +el.dataset.w, +el.dataset.h); render(); } catch (e) { toast('Gambar gagal dibaca'); } }));
    $('main').querySelectorAll('[data-imgclr]').forEach((b) => (b.onclick = () => { obj[b.dataset.imgclr] = ''; render(); }));
  }
  function renderCrud() {
    const sc = S[tab], arr = sc.get(); if (sel >= arr.length) sel = Math.max(0, arr.length - 1);
    const cur = arr[sel];
    $('main').innerHTML = `<div class="split"><div class="list">${arr.map((o, i) => `<div class="${i === sel ? 'on' : ''}" data-i="${i}">${esc(o.name || o.id)}</div>`).join('')}</div>
      <div class="form">${cur ? sc.fields.map((f) => fieldHTML(f, cur)).join('') : '<p>Kosong.</p>'}
      <div class="row"><button id="add">+ Baru</button><button class="sec" id="dup">Duplikat</button><button class="dng" id="del">Hapus</button></div></div></div>`;
    $('main').querySelector('.list').onclick = (e) => { const i = e.target.dataset.i; if (i !== undefined) { sel = +i; render(); } };
    $('main').querySelectorAll('[data-k]').forEach((el) => el.addEventListener('change', () => { readField(el, cur); if (['name'].includes(el.dataset.k)) render(); }));
    bindImgs(cur);
    $('add').onclick = () => { arr.push(sc.blank()); sel = arr.length - 1; render(); };
    $('dup').onclick = () => { if (!cur) return; const c = JSON.parse(JSON.stringify(cur)); c.id += '_c'; c.name += ' (salinan)'; arr.push(c); sel = arr.length - 1; render(); };
    $('del').onclick = () => { if (cur && confirm('Hapus?')) { arr.splice(sel, 1); sel = 0; render(); } };
  }

  // ---------- tileset ----------
  function renderTileset() {
    const keys = Object.keys(D.tileset);
    $('main').innerHTML = `<div class="form">${keys.map((k) => { const t = D.tileset[k]; return `<div class="ev"><b>Kode "${esc(k)}"</b><div class="g2"><div><label>Nama</label><input data-tk="${esc(k)}" data-f="name" value="${esc(t.name)}"></div><div class="g2"><div><label>Warna cadangan</label><input type="color" data-tk="${esc(k)}" data-f="color" value="${t.color}"></div><div><label>Solid</label><select data-tk="${esc(k)}" data-f="solid"><option value="0">Tidak</option><option value="1" ${t.solid ? 'selected' : ''}>Ya</option></select></div></div></div>
      <label>Gambar tile (PNG, otomatis diperkecil ke 32px)</label><div class="imgf">${t.img ? `<img src="${IMG.resolve(t.img)}">` : '<span class="small">(belum ada)</span>'}<input type="file" accept="image/*" data-timg="${esc(k)}"><button class="sec" data-tclr="${esc(k)}" type="button">Hapus</button></div></div>`; }).join('')}
      <div class="row"><input id="ntk" maxlength="1" placeholder="Kode 1 karakter" style="width:140px"><button id="addt">+ Tile baru</button></div></div>`;
    $('main').querySelectorAll('[data-tk]').forEach((el) => el.addEventListener('change', () => { const t = D.tileset[el.dataset.tk]; t[el.dataset.f] = el.dataset.f === 'solid' ? el.value === '1' : el.value; }));
    $('main').querySelectorAll('[data-timg]').forEach((el) => el.addEventListener('change', async () => { const f = el.files[0]; if (!f) return; try { D.tileset[el.dataset.timg].img = await IMG.fromFile(f, 32, 32); render(); } catch (e) { toast('Gambar gagal dibaca'); } }));
    $('main').querySelectorAll('[data-tclr]').forEach((b) => (b.onclick = () => { D.tileset[b.dataset.tclr].img = ''; render(); }));
    $('addt').onclick = () => { const c = $('ntk').value; if (!c || D.tileset[c]) return toast('Kode tidak valid / sudah ada'); D.tileset[c] = { name: 'Tile ' + c, color: '#888888', solid: false, img: '' }; render(); };
  }

  // ---------- map editor ----------
  const TS = 24; let brush = 'G', tool = 'paint', evSel = -1, painting = false;
  function renderMaps() {
    const maps = D.maps; if (sel >= maps.length) sel = 0; const m = maps[sel];
    $('main').innerHTML = `<div class="split"><div class="list">${maps.map((o, i) => `<div class="${i === sel ? 'on' : ''}" data-i="${i}">${esc(o.name)}</div>`).join('')}<div><button id="addm" style="width:100%">+ Map baru</button></div></div>
      <div class="form"><div class="g2"><div><label>ID</label><input id="mid" value="${esc(m.id)}"></div><div><label>Nama</label><input id="mname" value="${esc(m.name)}"></div>
      <div><label>Lebar</label><input id="mw" type="number" min="4" max="60" value="${m.w}"></div><div><label>Tinggi</label><input id="mh" type="number" min="4" max="60" value="${m.h}"></div>
      <div><label>Encounter (1/n langkah, 0=off)</label><input id="menc" type="number" value="${m.encounter}"></div><div><label>Musuh acak</label><select id="mene" multiple size="3">${ids(D.enemies).map((x) => `<option ${m.enemies.includes(x) ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
      <div class="palette" id="pal">${Object.keys(D.tileset).map((k) => `<button data-b="${esc(k)}" class="${k === brush && tool === 'paint' ? 'on' : ''}"><i style="background:${D.tileset[k].img ? 'url(' + IMG.resolve(D.tileset[k].img) + ') center/cover' : D.tileset[k].color};image-rendering:pixelated"></i>${esc(D.tileset[k].name)}</button>`).join('')}</div>
      <div class="row"><button class="${tool === 'paint' ? '' : 'sec'}" data-tool="paint">Cat tile</button><button class="${tool === 'event' ? '' : 'sec'}" data-tool="event">Tempatkan event</button><button class="${tool === 'erase' ? '' : 'sec'}" data-tool="erase">Hapus event</button></div>
      <canvas id="mc" width="${m.w * TS}" height="${m.h * TS}" style="width:${Math.min(m.w * TS * 1.5, 760)}px"></canvas>
      <div id="evbox"></div>
      <div class="row"><button class="dng" id="delm">Hapus map</button></div></div></div>`;
    $('main').querySelector('.list').onclick = (e) => { const i = e.target.dataset.i; if (i !== undefined) { sel = +i; evSel = -1; render(); } };
    $('addm').onclick = () => { maps.push({ id: 'map' + Date.now() % 10000, name: 'Map Baru', w: 16, h: 12, encounter: 0, enemies: [], tiles: Array.from({ length: 12 }, () => 'G'.repeat(16)), events: [] }); sel = maps.length - 1; render(); };
    $('mid').onchange = (e) => { m.id = e.target.value; }; $('mname').onchange = (e) => { m.name = e.target.value; render(); };
    $('menc').onchange = (e) => { m.encounter = +e.target.value; };
    $('mene').onchange = (e) => { m.enemies = [...e.target.selectedOptions].map((o) => o.value); };
    const resize = () => { const w = Math.max(4, Math.min(60, +$('mw').value)), h = Math.max(4, Math.min(60, +$('mh').value)); const rows = []; for (let y = 0; y < h; y++) { const old = m.tiles[y] || ''; rows.push((old + 'G'.repeat(w)).slice(0, w)); } m.tiles = rows; m.w = w; m.h = h; render(); };
    $('mw').onchange = resize; $('mh').onchange = resize;
    $('pal').onclick = (e) => { const b = e.target.closest('[data-b]'); if (b) { brush = b.dataset.b; tool = 'paint'; render(); } };
    $('main').querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => { tool = b.dataset.tool; render(); }));
    $('delm').onclick = () => { if (maps.length > 1 && confirm('Hapus map?')) { maps.splice(sel, 1); sel = 0; render(); } };
    drawMap(m);
    const cvs = $('mc');
    const pos = (e) => { const r = cvs.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return [Math.floor((t.clientX - r.left) / r.width * m.w), Math.floor((t.clientY - r.top) / r.height * m.h)]; };
    const act = (e) => {
      const [x, y] = pos(e); if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
      if (tool === 'paint') { const r = m.tiles[y]; m.tiles[y] = r.slice(0, x) + brush + r.slice(x + 1); drawMap(m); }
      else if (tool === 'erase') { m.events = m.events.filter((v) => !(v.x === x && v.y === y)); evSel = -1; drawMap(m); renderEvBox(m); }
      else if (tool === 'event') { let i = m.events.findIndex((v) => v.x === x && v.y === y); if (i < 0) { m.events.push({ x, y, kind: 'npc', id: 'npc' + m.events.length, name: 'NPC', text: ['Halo!'] }); i = m.events.length - 1; } evSel = i; drawMap(m); renderEvBox(m); }
    };
    cvs.addEventListener('mousedown', (e) => { painting = true; act(e); }); cvs.addEventListener('mousemove', (e) => { if (painting && tool === 'paint') act(e); }); addEventListener('mouseup', () => (painting = false));
    cvs.addEventListener('touchstart', (e) => { e.preventDefault(); painting = true; act(e); }, { passive: false }); cvs.addEventListener('touchmove', (e) => { e.preventDefault(); if (painting && tool === 'paint') act(e); }, { passive: false }); cvs.addEventListener('touchend', () => (painting = false));
    renderEvBox(m);
  }
  const EVD = { npc: 'assets/chars/npc.png', shop: 'assets/chars/merchant.png', chest: 'assets/events/chest.png', heal: 'assets/events/heal.png' };
  function drawMap(m) {
    const c = $('mc').getContext('2d'); c.imageSmoothingEnabled = false;
    const get = (src) => { const im = IMG.get(src); if (im && !im.complete && !im._h) { im._h = 1; im.addEventListener('load', () => { if ($('mc')) drawMap(m); }); } return IMG.ready(src); };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const t = D.tileset[m.tiles[y][x]], im = t && t.img && get(t.img); if (im) c.drawImage(im, x * TS, y * TS, TS, TS); else { c.fillStyle = t ? t.color : '#f0f'; c.fillRect(x * TS, y * TS, TS, TS); } c.strokeStyle = 'rgba(0,0,0,.15)'; c.strokeRect(x * TS, y * TS, TS, TS); }
    const col = { npc: '#ffcc80', shop: '#ffd54f', warp: '#fff', chest: '#a1662f', boss: '#ff9800', heal: '#e0e0e0' };
    m.events.forEach((e, i) => {
      let src = e.img || EVD[e.kind]; if (e.kind === 'boss') { const en = D.enemies.find((q) => q.id === e.enemy); src = en && en.img; }
      const im = src && get(src);
      if (im) { const fh = im.naturalHeight; if (e.kind === 'boss') c.drawImage(im, e.x * TS - 6, e.y * TS - 14, TS * 1.5, TS * 1.5); else { const r = IMG.rect(im, 0, 0); c.drawImage(im, r[0], r[1], r[2], r[3], e.x * TS, e.y * TS, TS, TS); } }
      else { c.fillStyle = col[e.kind] || '#fff'; c.fillRect(e.x * TS + 3, e.y * TS + 3, TS - 6, TS - 6); }
      c.fillStyle = '#fff'; c.font = 'bold 9px sans-serif'; c.strokeStyle = '#000'; c.lineWidth = 2; c.strokeText(e.kind[0].toUpperCase(), e.x * TS + 2, e.y * TS + 10); c.fillText(e.kind[0].toUpperCase(), e.x * TS + 2, e.y * TS + 10); c.lineWidth = 1;
      if (i === evSel) { c.strokeStyle = '#f00'; c.lineWidth = 2; c.strokeRect(e.x * TS + 1, e.y * TS + 1, TS - 2, TS - 2); c.lineWidth = 1; }
    });
  }
  function renderEvBox(m) {
    const box = $('evbox'); const e = m.events[evSel];
    if (!e) { box.innerHTML = '<div class="small">Pilih "Tempatkan event", lalu tap tile. Daftar event: ' + m.events.length + '</div>'; return; }
    const kinds = ['npc', 'shop', 'warp', 'chest', 'boss', 'heal'];
    let h = `<div class="ev"><b>Event (${e.x},${e.y})</b><label>Jenis</label><select id="ek">${kinds.map((k) => `<option ${k === e.kind ? 'selected' : ''}>${k}</option>`).join('')}</select>`;
    if (['npc', 'shop', 'heal', 'boss'].includes(e.kind)) h += `<label>Nama</label><input data-e="name" value="${esc(e.name || '')}">`;
    if (['npc', 'shop'].includes(e.kind)) h += `<label>ID (dipakai misi "talk")</label><input data-e="id" value="${esc(e.id || '')}"><label>Dialog (satu baris per kotak teks)</label><textarea data-e="text">${esc((e.text || []).join('\n'))}</textarea>`;
    if (['npc', 'shop'].includes(e.kind)) h += `<label>Sprite (sheet 3×4 atau 1 gambar)</label><div class="imgf">${e.img ? `<img src="${IMG.resolve(e.img)}">` : '<span class="small">(bawaan)</span>'}<input type="file" accept="image/*" id="evimg"><button class="sec" id="evclr" type="button">Hapus</button></div>`;
    if (e.kind === 'shop') h += `<label>Stok</label><select data-e="stock" multiple size="6">${ids(D.items.concat(D.equipment)).map((x) => `<option ${(e.stock || []).includes(x) ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
    if (e.kind === 'heal') h += `<label>Harga</label><input type="number" data-e="price" value="${e.price || 0}">`;
    if (e.kind === 'warp') h += `<label>Map tujuan</label><select data-e="map">${ids(D.maps).map((x) => `<option ${x === e.map ? 'selected' : ''}>${x}</option>`).join('')}</select><div class="g2"><div><label>X</label><input type="number" data-e="tx" value="${e.tx || 0}"></div><div><label>Y</label><input type="number" data-e="ty" value="${e.ty || 0}"></div></div>`;
    if (e.kind === 'chest') h += `<label>Item</label><select data-e="item">${ids(D.items.concat(D.equipment)).map((x) => `<option ${x === e.item ? 'selected' : ''}>${x}</option>`).join('')}</select><label>Flag unik</label><input data-e="flag" value="${esc(e.flag || 'chest_' + e.x + e.y)}">`;
    if (e.kind === 'boss') h += `<label>Musuh</label><select data-e="enemy">${ids(D.enemies).map((x) => `<option ${x === e.enemy ? 'selected' : ''}>${x}</option>`).join('')}</select><label>Flag unik</label><input data-e="flag" value="${esc(e.flag || 'boss_' + e.x + e.y)}">`;
    h += '</div>'; box.innerHTML = h;
    $('ek').onchange = (ev) => { const k = ev.target.value; const base = { x: e.x, y: e.y, kind: k }; if (k === 'npc') Object.assign(base, { id: 'npc', name: 'NPC', text: ['Halo!'] }); if (k === 'shop') Object.assign(base, { id: 'shop', name: 'Toko', text: ['Silakan.'], stock: [] }); if (k === 'warp') Object.assign(base, { map: D.maps[0].id, tx: 1, ty: 1 }); if (k === 'chest') Object.assign(base, { item: D.items[0].id, flag: 'chest_' + e.x + e.y }); if (k === 'boss') Object.assign(base, { enemy: D.enemies[0].id, name: 'Bos', flag: 'boss_' + e.x + e.y }); if (k === 'heal') Object.assign(base, { name: 'Penginapan', price: 20 }); m.events[evSel] = base; drawMap(m); renderEvBox(m); };
    if ($('evimg')) { $('evimg').onchange = async () => { const f = $('evimg').files[0]; if (!f) return; try { e.img = await IMG.fromFile(f, 192, 256); drawMap(m); renderEvBox(m); } catch (x) { toast('Gambar gagal dibaca'); } }; $('evclr').onclick = () => { e.img = ''; drawMap(m); renderEvBox(m); }; }
    box.querySelectorAll('[data-e]').forEach((el) => el.addEventListener('change', () => { const f = el.dataset.e; if (f === 'text') e.text = el.value.split('\n').filter(Boolean); else if (f === 'stock') e.stock = [...el.selectedOptions].map((o) => o.value); else if (el.type === 'number') e[f] = +el.value; else e[f] = el.value; }));
  }

  function renderMeta() {
    const m = D.meta;
    $('main').innerHTML = `<div class="form"><label>Judul game</label><input data-m="title" value="${esc(m.title)}"><label>Map awal</label><select data-m="startMap">${ids(D.maps).map((x) => `<option ${x === m.startMap ? 'selected' : ''}>${x}</option>`).join('')}</select><div class="g2"><div><label>Start X</label><input type="number" data-m="startX" value="${m.startX}"></div><div><label>Start Y</label><input type="number" data-m="startY" value="${m.startY}"></div></div><label>Gil awal</label><input type="number" data-m="gold" value="${m.gold}">
    <label>Anggota party (urut, maks 4)</label><select id="party" multiple size="5">${ids(D.classes).map((x) => `<option ${D.party.includes(x) ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`;
    $('main').querySelectorAll('[data-m]').forEach((el) => el.addEventListener('change', () => { m[el.dataset.m] = el.type === 'number' ? +el.value : el.value; }));
    $('party').onchange = (e) => { D.party = [...e.target.selectedOptions].map((o) => o.value).slice(0, 4); };
    const us = Auth.users(), box = document.createElement('div'); box.className = 'form';
    box.innerHTML = `<b>Akun & keamanan</b><label>Kunci developer (untuk register developer baru)</label><div class="row"><input id="dkey" value="${esc(Auth.devKey())}"><button id="dkSave" type="button">Ubah</button></div><label>Daftar akun</label>` + Object.keys(us).map((n) => `<div class="ev">${esc(n)} — ${us[n].role} ${n === sess.name ? '(kamu)' : `<button class="dng" data-du="${esc(n)}" type="button" style="float:right;padding:3px 8px">Hapus</button>`}</div>`).join('');
    $('main').appendChild(box);
    $('dkSave').onclick = () => { if ($('dkey').value.length < 4) return toast('Min 4 karakter'); Auth.setDevKey($('dkey').value); toast('Kunci diubah'); };
    box.querySelectorAll('[data-du]').forEach((b) => (b.onclick = () => { if (confirm('Hapus akun ' + b.dataset.du + ' beserta save-nya?')) { Auth.deleteUser(b.dataset.du); render(); } }));
  }

  function render() {
    renderTabs();
    if (tab === 'tileset') renderTileset(); else if (tab === 'maps') renderMaps(); else if (tab === 'meta') renderMeta(); else renderCrud();
  }

  $('who').textContent = sess.name; $('bOut').onclick = () => Auth.logout();
  $('bSave').onclick = save;
  $('bPlay').onclick = () => { save(); location.href = '../game/index.html'; };
  $('bExport').onclick = () => {
    const json = JSON.stringify(D, null, 2);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = 'game.json'; a.click();
    toast('game.json diekspor');
  };
  $('bImport').onclick = () => $('fileIn').click();
  $('fileIn').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { D = JSON.parse(r.result); save(); render(); } catch (x) { toast('JSON tidak valid'); } }; r.readAsText(f); };
  $('bReset').onclick = () => { if (confirm('Reset ke data bawaan?')) { localStorage.removeItem(KEY); D = JSON.parse(JSON.stringify(window.GAME_DATA)); render(); toast('Direset'); } };
  render();
})();
