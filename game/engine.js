/* Final World engine v1.5.2 — data driven. Data: localStorage 'fw_data' (dari editor) atau window.GAME_DATA. */
(function () {
  'use strict';
  const { Auth, IMG } = FW;
  const sess = Auth.require('any'); if (!sess) return;
  const $ = (id) => document.getElementById(id);
  const TS = 16, MOVE_MS = 130;
  const cv = $('cv'), ctx = cv.getContext('2d');
  const DATA_KEY = 'fw_data';
  const saveKey = (slot) => Auth.saveKey(sess.name) + '_' + slot;

  // ---------- data ----------
  let baseD;
  try { baseD = JSON.parse(localStorage.getItem(DATA_KEY)) || window.GAME_DATA; } catch (e) { baseD = window.GAME_DATA; }
  let D = baseD;
  const by = (arr, id) => arr.find((o) => o.id === id);
  const itemOf = (id) => by(D.items, id) || by(D.equipment, id);
  const icon = (it, sz) => it && it.img ? `<img src="${IMG.resolve(it.img)}" style="width:${sz || 20}px;height:${sz || 20}px;image-rendering:pixelated;vertical-align:-4px"> ` : '';
  $('gtitle').textContent = D.meta.title || 'Final World';
  document.title = D.meta.title || 'Final World';
  $('who').textContent = 'Halo, ' + sess.name;
  $('verTag').textContent = 'v' + (D.meta.version || '1.5.2');
  $('accName').textContent = 'Login sebagai: ' + sess.name;
  // suara: aktifkan konteks audio saat interaksi pertama; tombol mute ada di Pengaturan
  addEventListener('pointerdown', () => SFX.unlock(), { once: true });
  addEventListener('keydown', () => SFX.unlock(), { once: true });
  const btnSound = $('btnSound2');
  const syncSoundBtn = () => { if (btnSound) btnSound.textContent = 'Suara: ' + (SFX.muted ? 'Mati' : 'Nyala'); };
  syncSoundBtn();
  if (btnSound) btnSound.onclick = () => { SFX.toggle(); syncSoundBtn(); if (!SFX.muted) SFX.click(); };
  // navigasi judul gaya Minecraft: Beranda (Main / Pengaturan) -> sub-layar -> Kembali
  const showTitle = (which) => {
    $('menuHome').classList.toggle('hidden', which !== 'home');
    $('menuWorlds').classList.toggle('hidden', which !== 'worlds');
    $('menuSettings').classList.toggle('hidden', which !== 'settings');
  };
  $('btnPlay').onclick = () => { SFX.select(); renderTitle(); showTitle('worlds'); };
  $('btnSettings').onclick = () => { SFX.select(); syncSoundBtn(); showTitle('settings'); };
  $('btnBackWorlds').onclick = () => { SFX.back(); showTitle('home'); };
  $('btnBackSettings').onclick = () => { SFX.back(); showTitle('home'); };
  $('btnLogout2').onclick = () => Auth.logout();
  $('btnNewAcc').onclick = () => { location.href = '../index.html#register'; };

  // ---------- dunia v1.5: 3 slot, mode Survival/Creative, kesulitan, siang/malam ----------
  const WKEY = 'fw_worlds_' + sess.name;
  const DIFF = { easy: { mult: 0.8, label: 'Easy' }, medium: { mult: 1, label: 'Medium' }, hard: { mult: 1.3, label: 'Hard' } };
  function loadWorlds() { try { return JSON.parse(localStorage.getItem(WKEY)) || {}; } catch (e) { return {}; } }
  function saveWorlds(w) { localStorage.setItem(WKEY, JSON.stringify(w)); }
  function phaseNow() { return new Date().getHours() % 2 === 0 ? 'day' : 'night'; }
  function phaseMinsLeft() { return 60 - new Date().getMinutes(); }
  function diffMult() { return (DIFF[(S && S.world && S.world.difficulty) || 'medium'] || DIFF.medium).mult; }
  function isCreative() { return !!(S && S.world && S.world.mode === 'creative'); }
  // runtime D: salinan base + isi dunia (map hasil generate / snapshot Maker)
  function applyWorld(world) {
    D = JSON.parse(JSON.stringify(baseD));
    if (world.kind === 'basic') {
      const gen = FWGen.generate(world.seed || 1);
      D.maps = [gen.map]; D.quests = gen.quests;
      D.meta.startMap = gen.map.id; D.meta.startX = gen.startX; D.meta.startY = gen.startY;
    } else if (world.kind === 'custom' && world.maps) {
      D.maps = JSON.parse(JSON.stringify(world.maps));
      D.quests = JSON.parse(JSON.stringify(world.quests || []));
      D.meta.startMap = world.startMap; D.meta.startX = world.startX; D.meta.startY = world.startY;
    }
  }

  // ---------- state ----------
  let S = null, mode = 'title', dlgQueue = [], dlgDone = null;
  const keys = {};
  const DIR = { down: 0, up: 1, left: 2, right: 3 };

  const statAt = (b, lv) => Math.round(b * (1 + 0.2 * (lv - 1)));
  function mkMember(cid) {
    const c = by(D.classes, cid);
    const m = { cid, name: c.name, lv: 1, exp: 0, equip: { weapon: '', armor: '', head: '', accessory: '' } };
    m.hp = statAt(c.hp, 1); m.mp = statAt(c.mp, 1); return m;
  }
  function base(m) {
    const c = by(D.classes, m.cid);
    const s = { maxhp: statAt(c.hp, m.lv), maxmp: statAt(c.mp, m.lv), atk: statAt(c.atk, m.lv), def: statAt(c.def, m.lv), mag: statAt(c.mag, m.lv), spd: statAt(c.spd, m.lv) };
    for (const slot in m.equip) { const e = by(D.equipment, m.equip[slot]); if (e) { s.atk += e.atk || 0; s.def += e.def || 0; s.mag += e.mag || 0; s.spd += e.spd || 0; } }
    return s;
  }
  function newGame(world) {
    applyWorld(world);
    S = { world: { slot: world.slot, kind: world.kind, mode: world.mode, difficulty: world.difficulty, seed: world.seed || 0 }, map: D.meta.startMap, x: D.meta.startX, y: D.meta.startY, gold: D.meta.gold || 0, steps: 0, face: 'down', party: D.party.map(mkMember), inv: { potion: 3 }, flags: {}, quests: {}, qdone: {}, kills: {}, gather: {}, phase: phaseNow() };
    S.party.forEach((m) => { const b = base(m); m.hp = b.maxhp; m.mp = b.maxmp; });
    if (D.quests.length) startQuest(D.quests[0].id);
    save();
    mode = 'explore'; $('title').classList.add('hidden'); hud();
  }
  const save = () => { if (S && S.world) localStorage.setItem(saveKey(S.world.slot), JSON.stringify(S)); };
  function load(slot) {
    const raw = localStorage.getItem(saveKey(slot)); if (!raw) return false;
    const w = loadWorlds()[slot]; if (!w) return false;
    applyWorld(w);
    S = JSON.parse(raw);
    if (!S.world) S.world = { slot, kind: w.kind, mode: w.mode, difficulty: w.difficulty, seed: w.seed || 0 };
    if (!S.gather) S.gather = {};
    S.phase = phaseNow();
    // pengaman v1.5.2: kalau save menunjuk map/posisi yang sudah tidak ada
    // (dunia buatan di-snapshot ulang dengan map berbeda), kembalikan ke start dunia
    const m = by(D.maps, S.map);
    if (!m || S.x < 0 || S.y < 0 || S.x >= m.w || S.y >= m.h || !['G', 'P', 'D', 'F'].includes((m.tiles[S.y] || '')[S.x])) {
      S.map = D.meta.startMap; S.x = D.meta.startX; S.y = D.meta.startY;
    }
    mode = 'explore'; $('title').classList.add('hidden'); hud(); return true;
  }

  // ---------- map ----------
  const curMap = () => by(D.maps, S.map) || D.maps[0];
  const tileAt = (map, x, y) => { const r = map.tiles[y]; return r ? r[x] : undefined; };
  const eventAt = (map, x, y) => (map.events || []).find((e) => e.x === x && e.y === y && !(e.flag && S.flags[e.flag]));
  function solid(map, x, y) {
    const t = tileAt(map, x, y); if (t === undefined) return true;
    const d = D.tileset[t]; if (d && d.solid) return true;
    const ev = eventAt(map, x, y); return !!(ev && ['npc', 'shop', 'boss', 'chest', 'heal', 'gather'].includes(ev.kind));
  }

  // ---------- drawing ----------
  function drawSheet(src, dir, frame, px, py, size) {
    const im = IMG.ready(src); if (!im) return false;
    const r = IMG.rect(im, dir, frame); ctx.drawImage(im, r[0], r[1], r[2], r[3], px, py, size, size); return true;
  }
  const EV_IMG = { npc: 'assets/chars/npc.webp', shop: 'assets/chars/merchant.webp', chest: 'assets/events/chest.png', heal: 'assets/events/heal.png' };
  const EV_COL = { npc: '#ffcc80', shop: '#ffd54f', chest: '#a1662f', boss: '#ff9800', heal: '#e0e0e0', warp: 'rgba(255,255,255,.35)', gather: '#8bc34a' };
  function draw() {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!S || mode === 'title') return;
    const map = curMap(), W = cv.width, H = cv.height;
    const now = performance.now(), mp = S.mvStart ? Math.min(1, (now - S.mvStart) / MOVE_MS) : 1, moving = mp < 1;
    const vx = S.fx === undefined ? S.x : S.fx + (S.x - S.fx) * mp, vy = S.fy === undefined ? S.y : S.fy + (S.y - S.fy) * mp;
    let cx = Math.max(0, Math.min(vx * TS + TS / 2 - W / 2, map.w * TS - W)), cy = Math.max(0, Math.min(vy * TS + TS / 2 - H / 2, map.h * TS - H));
    if (map.w * TS < W) cx = -(W - map.w * TS) / 2; if (map.h * TS < H) cy = -(H - map.h * TS) / 2;
    ctx.save(); ctx.translate(-Math.round(cx), -Math.round(cy));
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const px = x * TS, py = y * TS; if (px - cx > W || py - cy > H || px - cx < -TS || py - cy < -TS) continue;
      const t = D.tileset[tileAt(map, x, y)] || { color: '#000' }, im = IMG.ready(t.img);
      if (im) ctx.drawImage(im, px, py, TS, TS); else { ctx.fillStyle = t.color; ctx.fillRect(px, py, TS, TS); }
    }
    for (const e of map.events || []) {
      if (e.flag && S.flags[e.flag]) continue;
      const px = e.x * TS, py = e.y * TS;
      if (e.kind === 'boss') { const en = by(D.enemies, e.enemy); const im = en && IMG.ready(en.img); if (im) { ctx.drawImage(im, px - 4, py - 10, 24, 24); continue; } }
      else if (drawSheet(e.img || EV_IMG[e.kind], 0, (e.kind === 'npc' || e.kind === 'shop') ? Math.floor(now / 550 + e.x) % 2 : 0, px, py, TS)) continue;
      ctx.fillStyle = EV_COL[e.kind] || '#fff';
      if (e.kind === 'warp') ctx.strokeRect(px + 1.5, py + 1.5, TS - 3, TS - 3); else ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
    }
    const lead = by(D.classes, S.party[0].cid), fr = moving ? (mp < 0.5 ? (S.steps % 2 ? 1 : 2) : 0) : 0;
    if (!drawSheet(lead.sprite, DIR[S.face || 'down'], fr, Math.round(vx * TS), Math.round(vy * TS), TS)) { ctx.fillStyle = lead.color; ctx.fillRect(vx * TS + 3, vy * TS + 1, 10, 14); }
    ctx.restore();
    if (phaseNow() === 'night') { ctx.fillStyle = 'rgba(8,10,48,0.35)'; ctx.fillRect(0, 0, cv.width, cv.height); }
  }
  function hud() { if (!S) return; const ph = phaseNow(); $('hud').textContent = `${curMap().name}  Gil:${S.gold} · ${ph === 'day' ? 'Siang' : 'Malam'} ${phaseMinsLeft()}mnt`; }

  // ---------- loading screen: preload semua gambar, lalu fade out ----------
  function allImages() {
    const s = new Set();
    const add = (p) => { if (p && typeof p === 'string' && !/^(data:|https?:|blob:)/.test(p)) s.add(p); };
    D.classes.forEach((c) => add(c.sprite));
    D.enemies.forEach((e) => add(e.img));
    Object.values(D.tileset).forEach((t) => add(t.img));
    D.items.forEach((i) => add(i.img));
    D.equipment.forEach((e) => add(e.img));
    D.maps.forEach((m) => (m.events || []).forEach((e) => { add(e.img); add(EV_IMG[e.kind]); }));
    return [...s];
  }
  function finishLoad() {
    const el = $('loading');
    if (!el || el.classList.contains('done')) return;
    el.classList.add('done');
    setTimeout(() => el.classList.add('hidden'), 500);
  }
  function preloadAll() {
    const list = allImages(), fill = $('ldFill'), pct = $('ldPct'), msg = $('ldMsg');
    let done = 0; const total = list.length || 1;
    if (msg) msg.textContent = 'Memuat ' + total + ' gambar...';
    const tick = () => {
      done++;
      const p = Math.round(done / total * 100);
      if (fill) fill.style.width = p + '%';
      if (pct) pct.textContent = p + '%';
      if (msg) msg.textContent = done >= total ? 'Siap!' : 'Memuat gambar ' + done + '/' + total + '...';
      if (done >= total) setTimeout(finishLoad, 150);
    };
    if (!list.length) return finishLoad();
    list.forEach((src) => {
      const im = IMG.get(src);
      if (im.complete) tick();
      else { im.onload = tick; im.onerror = tick; }
    });
  }
  preloadAll();

  // ---------- dialog ----------
  function say(lines, name, done) { dlgQueue = (Array.isArray(lines) ? lines : [lines]).map((t) => ({ t, name })); dlgDone = done || null; mode = 'dialog'; nextLine(); }
  function nextLine() {
    const el = $('dialog');
    if (!dlgQueue.length) { el.classList.add('hidden'); mode = 'explore'; const d = dlgDone; dlgDone = null; if (d) d(); return; }
    const l = dlgQueue.shift();
    el.className = 'box'; el.innerHTML = (l.name ? `<div class="nm">${l.name}</div>` : '') + l.t.replace(/%n|%c/g, '<br>') + '<div class="small" style="text-align:right">▼</div>';
  }
  $('dialog').addEventListener('click', () => { if (mode === 'dialog') { SFX.dialog(); nextLine(); } });

  // ---------- panels ----------
  function openPanel(html) { const p = $('panel'); p.className = 'box'; p.innerHTML = html; mode = 'panel'; }
  function closePanel() { $('panel').className = 'hidden'; mode = 'explore'; hud(); }
  const bindPanel = (fn) => { $('panel').onclick = (ev) => { const t = ev.target.closest('[data-a]'); if (t && !t.disabled) fn(t.dataset.a, t.dataset.b); }; };

  // ---------- quests ----------
  function startQuest(id) { if (!S.quests[id] && !S.qdone[id]) S.quests[id] = { n: 0 }; }
  function progress(type, target) {
    for (const id in S.quests) { const q = by(D.quests, id); if (q && q.type === type && q.target === target) { S.quests[id].n++; if (S.quests[id].n >= q.count) completeQuest(q); } }
  }
  let pendingMsgs = [];
  function completeQuest(q) {
    delete S.quests[q.id]; S.qdone[q.id] = 1; S.gold += q.rewardGold || 0; (q.rewardItems || []).forEach((i) => addItem(i, 1));
    SFX.quest();
    pendingMsgs.push(`Misi selesai: ${q.name}`, `+${q.rewardGold || 0} Gil, +${q.rewardExp || 0} EXP`);
    if (q.doneText) pendingMsgs.push(q.doneText);
    S.party.forEach((m) => gainExp(m, q.rewardExp || 0)); if (q.next) startQuest(q.next);
  }
  function flushMsgs(cb) { if (pendingMsgs.length) { const m = pendingMsgs; pendingMsgs = []; say(m, 'Sistem', cb); } else if (cb) cb(); }
  const addItem = (id, n) => { S.inv[id] = (S.inv[id] || 0) + n; };
  function gainExp(m, e) {
    m.exp += e; let up = false; while (m.exp >= m.lv * 30) { m.exp -= m.lv * 30; m.lv++; up = true; }
    if (up) { const b = base(m); m.hp = b.maxhp; m.mp = b.maxmp; SFX.levelup(); pendingMsgs.push(`${m.name} naik ke Lv ${m.lv}!`); }
  }

  // ---------- events ----------
  function interact() {
    const map = curMap(), dx = { up: 0, down: 0, left: -1, right: 1 }, dy = { up: -1, down: 1, left: 0, right: 0 }, f = S.face || 'down';
    const ev = eventAt(map, S.x + dx[f], S.y + dy[f]) || eventAt(map, S.x, S.y); if (ev) runEvent(ev);
  }
  function runEvent(ev) {
    if (ev.kind === 'npc') { progress('talk', ev.id); say(ev.text || ['...'], ev.name, () => flushMsgs()); }
    else if (ev.kind === 'shop') openShop(ev);
    else if (ev.kind === 'chest') { S.flags[ev.flag || (S.map + ev.x + ev.y)] = 1; addItem(ev.item, 1); SFX.chest(); say(`Kamu mendapat ${itemOf(ev.item).name}!`, '', () => flushMsgs()); }
    else if (ev.kind === 'gather') {
      const uses = S.gather[ev.id] || 0;
      if (uses >= 3) { say('Node ini sudah habis. Akan pulih saat siang/malam berganti.'); return; }
      S.gather[ev.id] = uses + 1;
      addItem(ev.res, 1); SFX.coin();
      const nm = { wood: 'Kayu', stone: 'Batu', herb: 'Herbal' }[ev.res] || ev.res;
      say(`Mendapat ${nm}! (${uses + 1}/3)`);
    }
    else if (ev.kind === 'heal') {
      const p = ev.price || 0;
      openPanel(`<b>${ev.name || 'Penginapan'}</b><p>Menginap ${p} Gil?</p><div class="row"><button class="opt" data-a="yes">Ya</button><button class="opt" data-a="no">Tidak</button></div>`);
      bindPanel((a) => { if (a === 'yes') { if (S.gold < p) { SFX.error(); closePanel(); say('Gil tidak cukup.'); return; } S.gold -= p; S.party.forEach((m) => { const b = base(m); m.hp = b.maxhp; m.mp = b.maxmp; }); save(); SFX.heal(); closePanel(); say('HP & MP pulih. Game tersimpan.'); } else { SFX.back(); closePanel(); } });
    } else if (ev.kind === 'warp') warp(ev.map, ev.tx, ev.ty);
    else if (ev.kind === 'boss') startBattle([ev.enemy], () => { S.flags[ev.flag || ev.enemy] = 1; });
  }
  function warp(map, x, y) { SFX.warp(); S.map = map; S.x = x; S.y = y; S.fx = x; S.fy = y; S.mvStart = 0; hud(); }

  // ---------- shop ----------
  function openShop(ev) {
    const hdr = (on, msg) => `<b>${ev.name || 'Toko'}</b> <span class="small">Gil: ${S.gold}</span><div class="small">${msg || ''}</div><div class="tabs"><button data-a="buy" class="${on === 'buy' ? 'on' : ''}">Beli</button><button data-a="sell" class="${on === 'sell' ? 'on' : ''}">Jual</button><button data-a="x">Tutup</button></div>`;
    const render = (msg) => {
      let h = hdr('buy', msg);
      for (const id of ev.stock || []) { const it = itemOf(id); if (it) h += `<button class="opt" data-a="b" data-b="${id}">${icon(it)}${it.name} — ${it.price} Gil</button>`; }
      openPanel(h);
      bindPanel((a, b) => {
        if (a === 'x') return closePanel(); if (a === 'sell') return renderSell();
        if (a === 'b') { const it = itemOf(b); if (S.gold < it.price) { SFX.error(); return render('Gil tidak cukup!'); } S.gold -= it.price; addItem(b, 1); SFX.coin(); render(`Membeli ${it.name}.`); }
      });
    };
    const renderSell = (msg) => {
      let h = hdr('sell', msg);
      for (const id in S.inv) { if (!S.inv[id]) continue; const it = itemOf(id); if (!it || it.type === 'key') continue; h += `<button class="opt" data-a="s" data-b="${id}">${icon(it)}${it.name} x${S.inv[id]} — ${Math.floor(it.price / 2)} Gil</button>`; }
      openPanel(h);
      bindPanel((a, b) => {
        if (a === 'x') return closePanel(); if (a === 'buy') return render();
        if (a === 's') { const it = itemOf(b); S.inv[b]--; S.gold += Math.floor(it.price / 2); SFX.coin(); renderSell(`Menjual ${it.name}.`); }
      });
    };
    say(ev.text || ['Selamat datang!'], ev.name, () => render());
  }

  // ---------- menu ----------
  function openMenu(tab) {
    tab = tab || 'party';
    const tabs = ['party', 'items', 'equip', 'craft', 'quest', 'save'], label = { party: 'Status', items: 'Item', equip: 'Equip', craft: 'Craft', quest: 'Misi', save: 'Simpan' };
    let h = `<div class="tabs">${tabs.map((t) => `<button data-a="tab" data-b="${t}" class="${t === tab ? 'on' : ''}">${label[t]}</button>`).join('')}<button data-a="close">X</button></div><div class="small">Gil: ${S.gold}</div>`;
    if (tab === 'party') h += S.party.map((m) => { const b = base(m), c = by(D.classes, m.cid); return `<div class="box" style="margin:4px 0"><canvas class="face" data-s="${c.sprite || ''}" data-c="${c.color || '#888'}" width="16" height="16"></canvas> <b>${m.name}</b> Lv${m.lv} <span class="small">EXP ${m.exp}/${m.lv * 30}</span><br>HP ${m.hp}/${b.maxhp} MP ${m.mp}/${b.maxmp}<br><span class="small">ATK ${b.atk} DEF ${b.def} MAG ${b.mag} SPD ${b.spd}</span></div>`; }).join('');
    else if (tab === 'items') { const ids = Object.keys(S.inv).filter((i) => S.inv[i] > 0); h += ids.length ? ids.map((i) => { const it = itemOf(i); return `<button class="opt" data-a="use" data-b="${i}">${icon(it)}${it.name} x${S.inv[i]}<br><span class="small">${it.desc || ''}</span></button>`; }).join('') : '<p>Kosong.</p>'; }
    else if (tab === 'equip') h += S.party.map((m, i) => `<div class="box" style="margin:4px 0"><b>${m.name}</b>` + ['weapon', 'armor', 'head', 'accessory'].map((s) => { const e = by(D.equipment, m.equip[s]); return `<button class="opt" data-a="slot" data-b="${i}:${s}">${s}: ${e ? e.name : '-'}</button>`; }).join('') + '</div>').join('');
    else if (tab === 'craft') {
      const free = isCreative();
      h += '<div class="small">Bahan: ' + ['wood', 'stone', 'herb', 'hide'].map((id) => `${itemOf(id).name} ${S.inv[id] || 0}`).join(' · ') + (free ? ' (Creative: gratis)' : '') + '</div>';
      h += (D.recipes || []).map((r) => {
        const it = itemOf(r.result); if (!it) return '';
        const needs = Object.keys(r.needs).map((id) => `${itemOf(id).name} ${S.inv[id] || 0}/${r.needs[id]}`).join(', ');
        const ok = free || Object.keys(r.needs).every((id) => (S.inv[id] || 0) >= r.needs[id]);
        return `<button class="opt" data-a="craft" data-b="${r.id}" ${ok ? '' : 'disabled'}>${icon(it)}${it.name}<br><span class="small">${needs}</span></button>`;
      }).join('') || '<p>Belum ada resep.</p>';
    }
    else if (tab === 'quest') {
      const act = Object.keys(S.quests).map((id) => { const q = by(D.quests, id); return q ? `<div class="box" style="margin:4px 0"><b>${q.name}</b> (${S.quests[id].n}/${q.count})<br><span class="small">${q.desc}</span></div>` : ''; }).join('');
      const done = Object.keys(S.qdone).map((id) => { const q = by(D.quests, id); return q ? `<div class="small">✔ ${q.name}</div>` : ''; }).join('');
      h += (act || '<p>Tidak ada misi aktif.</p>') + done;
    } else if (tab === 'save') h += '<button class="opt" data-a="save">Simpan Game</button><button class="opt" data-a="sound">Suara: ' + (SFX.muted ? 'Mati' : 'Nyala') + '</button><button class="opt" data-a="maker">Buka Maker (Creative)</button><button class="opt" data-a="title">Kembali ke Judul</button><button class="opt" data-a="logout">Logout</button>';
    openPanel(h);
    // gambar wajah party: gambar saat sudah siap, kalau masih dimuat tunggu onload (bug v1.3: hanya warrior yang muncul karena sheet lain belum selesai dimuat saat menu dibuka)
    const drawFace = (c) => {
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      const paint = () => {
        const im = IMG.ready(c.dataset.s);
        if (!im) return false;
        const r = IMG.rect(im, 0, 0); g.clearRect(0, 0, 16, 16); g.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, 16, 16); return true;
      };
      if (paint()) return;
      g.fillStyle = c.dataset.c || '#888'; g.fillRect(2, 2, 12, 12);
      const im = IMG.get(c.dataset.s);
      if (im) im.onload = () => paint();
    };
    $('panel').querySelectorAll('canvas.face').forEach(drawFace);
    bindPanel((a, b) => {
      if (a === 'close') { SFX.back(); return closePanel(); } if (a === 'tab') { SFX.click(); return openMenu(b); }
      if (a === 'save') { save(); SFX.save(); closePanel(); return say('Game tersimpan.'); }
      if (a === 'sound') { SFX.toggle(); syncSoundBtn(); if (!SFX.muted) SFX.click(); return openMenu('save'); }
      if (a === 'maker') { save(); location.href = '../editor/index.html'; }
      if (a === 'craft') {
        const r = (D.recipes || []).find((x) => x.id === b); if (!r) return openMenu('craft');
        const free = isCreative();
        if (!free && !Object.keys(r.needs).every((id) => (S.inv[id] || 0) >= r.needs[id])) { SFX.error(); return openMenu('craft'); }
        if (!free) for (const id in r.needs) S.inv[id] -= r.needs[id];
        addItem(r.result, 1); SFX.coin(); return openMenu('craft');
      }
      if (a === 'title') location.reload(); if (a === 'logout') { save(); Auth.logout(); }
      if (a === 'use') { SFX.click(); return useItemMenu(b); } if (a === 'slot') { SFX.click(); return equipMenu(b); }
    });
  }
  function useItemMenu(id) {
    const it = by(D.items, id); if (!it || it.effect === 'none') return openMenu('items');
    let h = `<b>${icon(it, 24)}${it.name}</b> — pakai ke:`;
    S.party.forEach((m, i) => { const b = base(m); h += `<button class="opt" data-a="to" data-b="${i}">${m.name} HP ${m.hp}/${b.maxhp} MP ${m.mp}/${b.maxmp}</button>`; });
    openPanel(h + '<button class="opt" data-a="back">Batal</button>');
    bindPanel((a, b) => { if (a === 'back') return openMenu('items'); const m = S.party[+b]; if (applyItem(it, m, base(m))) S.inv[id]--; openMenu('items'); });
  }
  function applyItem(it, m, bs) {
    if (it.effect === 'heal' && m.hp > 0 && m.hp < bs.maxhp) { m.hp = Math.min(bs.maxhp, m.hp + it.value); return true; }
    if (it.effect === 'mp' && m.hp > 0 && m.mp < bs.maxmp) { m.mp = Math.min(bs.maxmp, m.mp + it.value); return true; }
    if (it.effect === 'revive' && m.hp <= 0) { m.hp = Math.max(1, Math.floor(bs.maxhp * 0.25)); return true; }
    return false;
  }
  function equipMenu(spec) {
    const [i, slot] = spec.split(':'), m = S.party[+i];
    let h = `<b>${m.name}</b> — ${slot}<button class="opt" data-a="eq" data-b="">(lepas)</button>`;
    for (const id in S.inv) {
      if (!S.inv[id]) continue; const e = by(D.equipment, id);
      if (!e || e.slot !== slot || (e.classes && e.classes.length && !e.classes.includes(m.cid))) continue;
      h += `<button class="opt" data-a="eq" data-b="${id}">${icon(e)}${e.name} (ATK+${e.atk} DEF+${e.def} MAG+${e.mag} SPD+${e.spd}) x${S.inv[id]}</button>`;
    }
    openPanel(h + '<button class="opt" data-a="back">Batal</button>');
    bindPanel((a, b) => {
      if (a === 'back') return openMenu('equip');
      const old = m.equip[slot]; if (old) addItem(old, 1); if (b) S.inv[b]--; m.equip[slot] = b || '';
      const bs = base(m); m.hp = Math.min(m.hp, bs.maxhp); m.mp = Math.min(m.mp, bs.maxmp); openMenu('equip');
    });
  }

  // ---------- efek skill (canvas partikel) ----------
  const fxc = $('fx'), fg = fxc.getContext('2d');
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), rf = (a, b) => a + Math.random() * (b - a);
  function targetEl(t) { return $((t[0] === 'e' ? 'en-' : 'pm-') + t.slice(1)); }
  function popText(x, y, text, color) {
    const s = document.createElement('div'); s.className = 'dmg'; s.textContent = text; s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.color = color || '#fff';
    $('screen').appendChild(s); setTimeout(() => s.remove(), 900);
  }
  /** fxo: {kind: slash|fire|ice|thunder|heal|hit, target:'e0'|'p1', text, color} */
  function playFx(fxo, done) {
    const el = targetEl(fxo.target), sc = $('screen').getBoundingClientRect();
    fxc.width = sc.width; fxc.height = sc.height;
    if (!el) return done();
    const r = el.getBoundingClientRect(), cx = r.left - sc.left + r.width / 2, cy = r.top - sc.top + r.height / 2;
    const kind = fxo.kind || 'slash', P = [], DUR = kind === 'thunder' ? 850 : kind === 'fire' ? 800 : 700, t0 = performance.now();
    const shake = () => { const s = $('screen'); s.classList.remove('shake2'); void s.offsetWidth; s.classList.add('shake2'); setTimeout(() => s.classList.remove('shake2'), 450); };
    if (kind !== 'heal') { el.classList.add('shake'); }
    if (kind === 'thunder' || kind === 'hit') shake();
    const mk = (n, f) => { for (let i = 0; i < n; i++) P.push(f(i)); };
    if (kind === 'fire') mk(70, () => ({ x: cx + rf(-16, 16), y: cy + rf(6, 26), vx: rf(-0.7, 0.7), vy: rf(-2.8, -0.9), s: rf(3, 9), life: rf(350, 700), c: ['#ff3d00', '#ff9100', '#ffd740', '#fff59d'][rnd(0, 3)], d: rf(0, 150) }));
    if (kind === 'ice') mk(34, () => ({ x: cx + rf(-24, 24), y: cy - rf(60, 110), vx: rf(-0.2, 0.2), vy: rf(3.5, 6), s: rf(4, 9), life: 450, c: ['#b3e5fc', '#e1f5fe', '#4fc3f7'][rnd(0, 2)], d: rf(0, 250), shard: true, ty: cy + rf(-14, 14) }));
    if (kind === 'heal') mk(36, () => ({ x: cx + rf(-20, 20), y: cy + rf(0, 22), vx: rf(-0.25, 0.25), vy: rf(-1.6, -0.5), s: rf(2, 5), life: rf(450, 700), c: ['#69f0ae', '#b9f6ca', '#ffffff'][rnd(0, 2)], d: rf(0, 250), plus: true }));
    if (kind === 'slash' || kind === 'hit') mk(10, () => ({ x: cx, y: cy, vx: rf(-2.2, 2.2), vy: rf(-2.2, 2.2), s: rf(2, 4), life: rf(180, 380), c: kind === 'hit' ? '#ff5252' : '#fff', d: 120 }));
    let bolt = null; if (kind === 'thunder') { bolt = [[cx, cy - 140]]; let y = cy - 140; while (y < cy) { y += rnd(14, 26); bolt.push([cx + rnd(-14, 14), Math.min(y, cy)]); } bolt[bolt.length - 1][0] = cx; }
    let popped = false;
    (function frame(now) {
      const t = now - t0; fg.clearRect(0, 0, fxc.width, fxc.height);
      if (kind === 'fire' || kind === 'heal') { const g = fg.createRadialGradient(cx, cy, 2, cx, cy, kind === 'fire' ? 62 : 56); const a = Math.sin(Math.min(1, t / DUR) * Math.PI) * 0.55; g.addColorStop(0, (kind === 'fire' ? 'rgba(255,140,0,' : 'rgba(105,240,174,') + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); fg.fillStyle = g; fg.fillRect(cx - 70, cy - 70, 140, 140); }
      if (kind === 'fire') { fg.fillStyle = 'rgba(255,110,0,' + (Math.sin(Math.min(1, t / DUR) * Math.PI) * 0.08) + ')'; fg.fillRect(0, 0, fxc.width, fxc.height); }
      if (kind === 'ice') { fg.fillStyle = 'rgba(120,200,255,' + (Math.sin(Math.min(1, t / DUR) * Math.PI) * 0.10) + ')'; fg.fillRect(0, 0, fxc.width, fxc.height); }
      if (kind === 'slash') { const k = Math.min(1, t / 220); fg.strokeStyle = '#fff'; fg.lineWidth = 7 * (1 - Math.abs(0.5 - k)) + 1; fg.lineCap = 'round'; fg.beginPath(); fg.moveTo(cx - 26, cy - 26); fg.lineTo(cx - 26 + 52 * k, cy - 26 + 52 * k); fg.stroke(); fg.strokeStyle = 'rgba(255,255,255,.7)'; fg.beginPath(); fg.moveTo(cx - 26, cy + 26); fg.lineTo(cx - 26 + 52 * k, cy + 26 - 52 * k); fg.stroke(); }
      if (kind === 'hit') { fg.fillStyle = 'rgba(255,60,60,' + Math.max(0, 0.5 - t / 500) + ')'; fg.fillRect(cx - r.width / 2, cy - r.height / 2, r.width, r.height); }
      if (kind === 'thunder' && t < 520) {
        if (Math.floor(t / 70) % 2 === 0) { fg.strokeStyle = '#fff9c4'; fg.lineWidth = 4; fg.shadowColor = '#ffee58'; fg.shadowBlur = 18; fg.beginPath(); bolt.forEach((p, i) => (i ? fg.lineTo(p[0], p[1]) : fg.moveTo(p[0], p[1]))); fg.stroke(); fg.shadowBlur = 0; }
        fg.fillStyle = 'rgba(255,255,200,' + (Math.floor(t / 70) % 2 === 0 ? 0.28 : 0) + ')'; fg.fillRect(0, 0, fxc.width, fxc.height);
      }
      for (const p of P) {
        const pt = t - p.d; if (pt < 0 || pt > p.life) continue; const k = pt / p.life; fg.globalAlpha = 1 - k * k;
        const x = p.x + p.vx * pt / 16, y = p.shard ? Math.min(p.ty, p.y + p.vy * pt / 16 * 2) : p.y + p.vy * pt / 16;
        fg.fillStyle = p.c;
        if (p.plus) { fg.fillRect(x - p.s, y - 1, p.s * 2, 2); fg.fillRect(x - 1, y - p.s, 2, p.s * 2); }
        else if (p.shard) { fg.beginPath(); fg.moveTo(x, y - p.s * 1.5); fg.lineTo(x + p.s * 0.5, y); fg.lineTo(x, y + p.s * 1.5); fg.lineTo(x - p.s * 0.5, y); fg.fill(); }
        else { fg.beginPath(); fg.arc(x, y, p.s * (1 - k * 0.6), 0, 7); fg.fill(); }
      }
      fg.globalAlpha = 1;
      if (!popped && t > DUR * 0.35 && fxo.text !== undefined && fxo.text !== '') { popped = true; popText(cx, cy - 10, fxo.text, fxo.color); }
      if (t < DUR) requestAnimationFrame(frame); else { fg.clearRect(0, 0, fxc.width, fxc.height); done(); }
    })(t0);
  }

  // ---------- battle ----------
  let B = null;
  function startBattle(enemyIds, onWin) {
    mode = 'battle'; SFX.battle();
    const mult = diffMult();
    B = { foes: enemyIds.map((id, i) => { const b = by(D.enemies, id); return Object.assign({}, b, { hp: Math.max(1, Math.round(b.hp * mult)), atk: Math.max(1, Math.round(b.atk * mult)), def: Math.max(0, Math.round(b.def * mult)), cur: Math.max(1, Math.round(b.hp * mult)), i }); }), onWin, actor: undefined, phase: null };
    $('battle').classList.remove('hidden'); renderBattle('Musuh muncul!'); setTimeout(nextActor, 500);
  }
  const alive = (arr) => arr.filter((x) => (x.cur !== undefined ? x.cur > 0 : x.hp > 0));
  function renderBattle(msg) {
    let f = '<div id="bfield">';
    B.foes.forEach((e, i) => {
      const left = 12 + i * (76 / Math.max(1, B.foes.length)) + (B.foes.length === 1 ? 24 : 0), sz = e.boss ? 96 : 64;
      const spr = e.img ? `<img class="spr" style="width:${sz}px;height:${sz}px" src="${IMG.resolve(e.img)}">` : `<div class="spr" style="background:${e.color}"></div>`;
      f += `<div class="enemy" id="en-${i}" style="left:${left}%;top:${12 + (i % 2) * 22}%;opacity:${e.cur > 0 ? 1 : 0.15}">${spr}${e.name}<div class="hpbar"><i style="width:${Math.max(0, e.cur / e.hp * 100)}%"></i></div></div>`;
    });
    f += '</div>';
    let p = '<div id="bparty">';
    S.party.forEach((m, i) => { const b = base(m); p += `<div class="box ${B.actor === i ? 'act' : ''}" id="pm-${i}" style="${m.hp <= 0 ? 'opacity:.5' : ''}"><b>${m.name}</b> L${m.lv}<br>HP ${m.hp}/${b.maxhp} MP ${m.mp}/${b.maxmp}</div>`; });
    $('battle').innerHTML = f + `<div id="blog" class="box">${msg || ''}</div>` + p + '</div><div id="bcmd"></div>';
  }
  function nextActor() {
    if (!alive(B.foes).length) return endBattle(true); if (!alive(S.party).length) return endBattle(false);
    if (B.phase === 'foes') return foeTurn();
    let i = (B.actor === undefined ? -1 : B.actor) + 1; while (i < S.party.length && S.party[i].hp <= 0) i++;
    if (i >= S.party.length) { B.actor = undefined; B.phase = 'foes'; return foeTurn(); }
    B.actor = i; cmdMenu();
  }
  function cmdMenu() {
    renderBattle(`${S.party[B.actor].name}, perintah?`);
    $('bcmd').innerHTML = '<div class="row"><button class="opt" data-c="atk">Serang</button><button class="opt" data-c="skill">Skill</button><button class="opt" data-c="item">Item</button><button class="opt" data-c="run">Lari</button></div>';
    $('bcmd').onclick = (ev) => { const c = ev.target.dataset.c; if (c) ({ atk: () => pickTarget(), skill: skillMenu, item: itemMenu, run: tryRun })[c](); };
  }
  function pickTarget(cb) {
    $('bcmd').innerHTML = '<div class="row">' + alive(B.foes).map((e) => `<button class="opt" data-t="${e.i}">${e.name}</button>`).join('') + '<button class="opt" data-t="x">Batal</button></div>';
    $('bcmd').onclick = (ev) => { const t = ev.target.dataset.t; if (t === undefined) return; if (t === 'x') return cmdMenu(); cb ? cb(B.foes[+t]) : doAttack(B.foes[+t]); };
  }
  function pickAlly(cb) {
    $('bcmd').innerHTML = '<div class="row">' + S.party.map((m, i) => `<button class="opt" data-t="${i}">${m.name}</button>`).join('') + '<button class="opt" data-t="x">Batal</button></div>';
    $('bcmd').onclick = (ev) => { const t = ev.target.dataset.t; if (t === undefined) return; if (t === 'x') return cmdMenu(); cb(S.party[+t]); };
  }
  function doAttack(e) {
    const m = S.party[B.actor], b = base(m), d = Math.max(1, Math.floor(b.atk * 1.5 - e.def * 0.7) + rnd(0, 3));
    e.cur -= d; SFX.slash(); step(`${m.name} menyerang ${e.name}: ${d} damage!${e.cur <= 0 ? ' ' + e.name + ' kalah!' : ''}`, false, { kind: 'slash', target: 'e' + e.i, text: d });
  }
  function skillMenu() {
    const m = S.party[B.actor], b = base(m), sk = D.skills.filter((s) => !(s.classes || []).length || s.classes.includes(m.cid));
    $('bcmd').innerHTML = '<div class="row">' + (sk.map((s) => `<button class="opt" data-s="${s.id}" ${m.mp < s.mp ? 'disabled' : ''}>${s.name} (${s.mp}MP)</button>`).join('') || '<span class="small">Tidak ada skill</span>') + '<button class="opt" data-s="x">Batal</button></div>';
    $('bcmd').onclick = (ev) => {
      const id = ev.target.dataset.s; if (!id) return; if (id === 'x') return cmdMenu(); const s = by(D.skills, id);
      if (s.type === 'damage') pickTarget((e) => { m.mp -= s.mp; SFX[s.fx] ? SFX[s.fx]() : SFX.fire(); const d = Math.max(1, s.power + Math.floor(b.mag * 1.5) - Math.floor(e.def / 2)); e.cur -= d; step(`${m.name} memakai ${s.name}: ${d} damage ke ${e.name}!${e.cur <= 0 ? ' ' + e.name + ' kalah!' : ''}`, false, { kind: s.fx || 'fire', target: 'e' + e.i, text: d }); });
      else pickAlly((a) => { m.mp -= s.mp; SFX.heal(); const h = s.power + b.mag * 2; a.hp = Math.min(base(a).maxhp, Math.max(a.hp, 0) + h); step(`${m.name} memakai ${s.name} pada ${a.name}: +${h} HP`, false, { kind: s.fx || 'heal', target: 'p' + S.party.indexOf(a), text: '+' + h, color: '#7f7' }); });
    };
  }
  function itemMenu() {
    const ids = Object.keys(S.inv).filter((i) => S.inv[i] > 0 && by(D.items, i) && by(D.items, i).effect !== 'none');
    $('bcmd').innerHTML = '<div class="row">' + ids.map((i) => `<button class="opt" data-i="${i}">${icon(by(D.items, i))}${by(D.items, i).name} x${S.inv[i]}</button>`).join('') + '<button class="opt" data-i="x">Batal</button></div>';
    $('bcmd').onclick = (ev) => {
      const id = ev.target.dataset.i; if (!id) return; if (id === 'x') return cmdMenu(); const it = by(D.items, id);
      pickAlly((a) => { if (applyItem(it, a, base(a))) { S.inv[id]--; if (it.effect === 'revive') SFX.revive(); else SFX.heal(); step(`${S.party[B.actor].name} memakai ${it.name} pada ${a.name}.`, false, { kind: 'heal', target: 'p' + S.party.indexOf(a), text: it.effect === 'revive' ? 'Hidup!' : '+' + it.value, color: '#7f7' }); } else cmdMenu(); });
    };
  }
  function tryRun() {
    if (B.foes.some((f) => f.boss)) { SFX.error(); return step('Tidak bisa lari dari bos!', true); }
    if (Math.random() < 0.6) { SFX.select(); renderBattle('Berhasil kabur!'); $('bcmd').innerHTML = ''; setTimeout(() => endBattle(null), 600); } else { SFX.error(); step('Gagal kabur!'); }
  }
  function step(msg, stay, fxo) {
    $('bcmd').innerHTML = ''; $('bcmd').onclick = null;
    const lg = $('blog'); if (lg) lg.textContent = msg;
    const finish = () => { renderBattle(msg); setTimeout(() => { if (stay) return cmdMenu(); if (!alive(B.foes).length) return endBattle(true); nextActor(); }, 450); };
    fxo ? playFx(fxo, finish) : (renderBattle(msg), setTimeout(finish, 500));
  }
  function foeTurn() {
    const foes = alive(B.foes); let k = 0; $('bcmd').innerHTML = '';
    const act = () => {
      if (k >= foes.length) { B.phase = null; B.actor = undefined; return nextActor(); }
      const e = foes[k++]; if (e.cur <= 0) return act();
      const tg = alive(S.party); if (!tg.length) return endBattle(false);
      const m = tg[rnd(0, tg.length - 1)], b = base(m), d = Math.max(1, Math.floor(e.atk * 1.4 - b.def * 0.7) + rnd(0, 3));
      m.hp = Math.max(0, m.hp - d); const msg = `${e.name} menyerang ${m.name}: ${d} damage!${m.hp <= 0 ? ' ' + m.name + ' tumbang!' : ''}`;
      const lg = $('blog'); if (lg) lg.textContent = msg; SFX.hit();
      playFx({ kind: 'hit', target: 'p' + S.party.indexOf(m), text: d, color: '#ff8a80' }, () => { renderBattle(msg); setTimeout(act, 400); });
    };
    act();
  }
  function endBattle(win) {
    const foes = B.foes; $('battle').classList.add('hidden'); mode = 'explore';
    if (win === true) {
      SFX.victory();
      let g = 0, x = 0, hides = 0; foes.forEach((e) => { g += e.gold || 0; x += e.exp || 0; if (e.id === 'wolf') hides++; else if (e.id === 'goblin' && Math.random() < 0.5) hides++; progress('kill', e.id); });
      if (hides) addItem('hide', hides);
      S.gold += g; const live = S.party.filter((m) => m.hp > 0); live.forEach((m) => gainExp(m, Math.ceil(x / live.length)));
      pendingMsgs.unshift(`Menang! +${g} Gil, +${x} EXP` + (hides ? `, +${hides} Kulit` : '')); if (B.onWin) B.onWin(); flushMsgs(); hud();
    } else if (win === false) {
      SFX.defeat();
      if (isCreative()) {
        S.party.forEach((m) => { const b = base(m); m.hp = b.maxhp; m.mp = b.maxmp; });
        say('Mode Creative: party pulih, tanpa penalti.');
      } else {
        S.gold = Math.floor(S.gold / 2); S.party.forEach((m) => { const b = base(m); m.hp = b.maxhp; m.mp = b.maxmp; });
        warp(D.meta.startMap, D.meta.startX, D.meta.startY); say('Party kalah... Kamu terbangun di desa dengan setengah Gil.');
      }
    }
    B = null;
  }

  // ---------- gerak ----------
  function tryMove(dir) {
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir]; S.face = dir;
    const nx = S.x + d[0], ny = S.y + d[1], map = curMap(); if (solid(map, nx, ny)) return;
    S.fx = S.x; S.fy = S.y; S.mvStart = performance.now(); S.x = nx; S.y = ny; S.steps++;
    const ev = eventAt(map, nx, ny); if (ev && ev.kind === 'warp') return runEvent(ev);
    if (!isCreative() && map.encounter > 0 && map.enemies && map.enemies.length && Math.random() < (phaseNow() === 'night' ? 0.70 : 0.45)) {
      const ids = []; for (let i = 0, n = rnd(1, 3); i < n; i++) ids.push(map.enemies[rnd(0, map.enemies.length - 1)]); startBattle(ids);
    }
  }

  // ---------- input ----------
  function press(k) {
    if (mode === 'explore') { if (k === 'menu' || k === 'b') { SFX.select(); return openMenu(); } if (k === 'a') { SFX.click(); return interact(); } }
    else if (mode === 'dialog') { if (k === 'a' || k === 'b') { SFX.dialog(); nextLine(); } }
    else if (mode === 'panel') { if (k === 'b' || k === 'menu') { SFX.back(); closePanel(); } }
  }
  const kmap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', Enter: 'a', z: 'a', ' ': 'a', x: 'b', Escape: 'menu', m: 'menu' };
  addEventListener('keydown', (e) => { const k = kmap[e.key]; if (!k) return; e.preventDefault(); if (k in DIR) keys[k] = 1; else press(k); });
  addEventListener('keyup', (e) => { const k = kmap[e.key]; if (k) keys[k] = 0; });
  document.querySelectorAll('#pad button').forEach((b) => {
    const k = b.dataset.k, dir = k in DIR;
    const on = (e) => { e.preventDefault(); if (dir) keys[k] = 1; else press(k); }, off = (e) => { e.preventDefault(); if (dir) keys[k] = 0; };
    b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off, { passive: false }); b.addEventListener('touchcancel', off);
    b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
  });
  // ---------- layar judul: pilih dunia + setup ----------
  let selSlot = 1, setup = { mode: 'survival', difficulty: 'medium', seed: 0 };
  function worldLabel(w) {
    const d = DIFF[w.difficulty] || DIFF.medium;
    return (w.mode === 'creative' ? 'Creative' : 'Survival') + ' · ' + d.label + (w.kind === 'basic' ? ' · Seed ' + w.seed : ' · ' + (w.maps || []).length + ' map');
  }
  function saveInfo(slot) {
    try { const s = JSON.parse(localStorage.getItem(saveKey(slot))); return s ? `Gil ${s.gold} · Lv ${s.party[0].lv}` : ''; } catch (e) { return ''; }
  }
  function setupHtml(withSeed) {
    const seg = (key, opts, cur) => `<div class="seg">${opts.map((o) => `<button data-set="${key}:${o[0]}" class="${cur === o[0] ? 'on' : ''}">${o[1]}</button>`).join('')}</div>`;
    return `<div class="lbl">Mode dunia</div>${seg('mode', [['survival', 'Survival'], ['creative', 'Creative']], setup.mode)}
      <div class="lbl">Kesulitan (statistik musuh)</div>${seg('difficulty', [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']], setup.difficulty)}
      ${withSeed ? `<div class="lbl">Seed map acak (1-10)</div><div class="seg">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button data-set="seed:${n}" class="${setup.seed === n ? 'on' : ''}">${n}</button>`).join('')}<button data-set="seed:0" class="${setup.seed === 0 ? 'on' : ''}">Acak</button></div>` : ''}`;
  }
  function renderTitle() {
    const worlds = loadWorlds();
    $('worldList').innerHTML = [1, 2, 3].map((n) => {
      const w = worlds[n], name = n === 1 ? 'Dunia Basic' : 'Dunia Buatan ' + n;
      return `<button class="wslot ${selSlot === n ? 'on' : ''}" data-slot="${n}"><b>${n}. ${w ? w.name : name}</b><span class="small">${w ? worldLabel(w) : (n === 1 ? 'Map acak, 1 misi: kalahkan Ogre' : 'Buat di Maker')}</span></button>`;
    }).join('');
    const w = worlds[selSlot], det = $('worldDetail');
    const hasSave = !!localStorage.getItem(saveKey(selSlot));
    if (w && hasSave) {
      det.innerHTML = `<b>${w.name}</b><br><span class="small">${worldLabel(w)}</span><br><span class="small">${saveInfo(selSlot)}</span><button class="go2" data-w="load">Lanjutkan</button><button class="go2" data-w="new">Mulai Baru</button>`;
    } else if (w) {
      det.innerHTML = `<b>${w.name}</b><br><span class="small">${worldLabel(w)}</span>${setupHtml(false)}<button class="go2" data-w="new">Mulai Baru</button>`;
    } else if (selSlot === 1) {
      det.innerHTML = `<b>Dunia Basic — Baru</b>${setupHtml(true)}<button class="go2" data-w="create">Buat Dunia & Mulai</button>`;
    } else {
      det.innerHTML = `<b>Dunia Buatan ${selSlot}</b><br><span class="small">Slot kosong. Buat map & misi di Maker, lalu simpan ke Dunia ${selSlot} dari menu Pengaturan.</span><button class="go2" data-w="maker">Buka Maker</button>`;
    }
  }
  function selectSlot(n) {
    selSlot = n;
    const w = loadWorlds()[n];
    setup = w ? { mode: w.mode, difficulty: w.difficulty, seed: w.seed || 0 } : { mode: 'survival', difficulty: 'medium', seed: 0 };
    renderTitle();
  }
  $('worldList').onclick = (ev) => { const b = ev.target.closest('[data-slot]'); if (b) { SFX.click(); selectSlot(+b.dataset.slot); } };
  $('worldDetail').onclick = (ev) => {
    const b = ev.target.closest('[data-w], [data-set]'); if (!b) return;
    if (b.dataset.set) {
      const parts = b.dataset.set.split(':'), k = parts[0], v = parts[1];
      if (k === 'seed') setup.seed = +v; else setup[k] = v;
      SFX.click(); renderTitle(); return;
    }
    const a = b.dataset.w;
    if (a === 'maker') { SFX.select(); location.href = '../editor/index.html'; return; }
    if (a === 'load') { SFX.select(); if (!load(selSlot)) { SFX.error(); alert('Save tidak ditemukan.'); } return; }
    if (a === 'new') {
      SFX.select();
      if (localStorage.getItem(saveKey(selSlot)) && !confirm('Save dunia ini akan tertimpa saat kamu menyimpan. Lanjut mulai baru?')) return;
      const worlds = loadWorlds(), w = worlds[selSlot];
      if (w && !localStorage.getItem(saveKey(selSlot))) { w.mode = setup.mode; w.difficulty = setup.difficulty; saveWorlds(worlds); }
      newGame(worlds[selSlot]);
      return;
    }
    if (a === 'create') {
      SFX.select();
      const worlds = loadWorlds();
      const seed = setup.seed || (1 + Math.floor(Math.random() * 10));
      const world = { slot: selSlot, kind: 'basic', name: 'Dunia Basic', mode: setup.mode, difficulty: setup.difficulty, seed };
      worlds[selSlot] = world; saveWorlds(worlds);
      newGame(world);
    }
  };
  selectSlot(1);

  let last = 0;
  (function loop(t) {
    if (S) { const ph = phaseNow(); if (S.phase !== ph) { S.phase = ph; S.gather = {}; hud(); } }
    if (mode === 'explore' && S && t - last > MOVE_MS) for (const d of ['up', 'down', 'left', 'right']) if (keys[d]) { tryMove(d); last = t; break; }
    draw(); requestAnimationFrame(loop);
  })(0);
})();
