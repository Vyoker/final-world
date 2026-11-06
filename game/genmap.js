/* Final World — generator map acak v1.5 (Dunia Basic).
   Deterministik dari seed 1-10: seed sama = map sama. Ukuran 20x15.
   Isi: desa (toko + penginapan), jalan, danau, hutan, gua Ogre, node gathering, peti.
   Konektivitas start -> gua diperiksa (BFS); kalau buntu, layout diulang. */
(function () {
  'use strict';
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const W = 20, H = 15;
  const WALK = { G: 1, P: 1, D: 1, F: 1 };

  function build(seed) {
    const rnd = mulberry32((seed * 2654435761) >>> 0 || seed);
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const g = [];
    for (let y = 0; y < H; y++) g.push(new Array(W).fill('G'));
    for (let x = 0; x < W; x++) { g[0][x] = 'T'; g[H - 1][x] = 'T'; }
    for (let y = 0; y < H; y++) { g[y][0] = 'T'; g[y][W - 1] = 'T'; }

    // desa di barat (pusat 3,7): 2 rumah + pintu
    g[6][2] = 'H'; g[6][4] = 'H'; g[7][2] = 'D'; g[7][4] = 'D';
    // jalan desa -> gua (y=7, x=4..14)
    for (let x = 4; x <= 14; x++) g[7][x] = 'P';
    // gua di timur: ring batu x15..18 y5..9, lantai gua di dalam, pintu masuk (15,7)
    for (let x = 15; x <= 18; x++) for (let y = 5; y <= 9; y++) g[y][x] = (x === 15 || x === 18 || y === 5 || y === 9) ? 'R' : 'F';
    g[7][15] = 'F';
    const forbidden = (x, y) => (x >= 1 && x <= 5 && y >= 5 && y <= 9) || (x >= 14 && x <= 19 && y >= 4 && y <= 10) || y === 7 || x <= 1 || x >= W - 2 || y <= 1 || y >= H - 2;
    // danau (blob air) di selatan, jauh dari jalan
    let lx = ri(8, 12), ly = ri(10, 12), lake = [[lx, ly]];
    for (let i = 0; i < 11; i++) {
      const c = lake[ri(0, lake.length - 1)];
      const nx = c[0] + ri(-1, 1), ny = c[1] + ri(-1, 1);
      if (!forbidden(nx, ny) && g[ny][nx] === 'G') { g[ny][nx] = 'W'; lake.push([nx, ny]); }
    }
    // 3 rumpun hutan
    for (let c = 0; c < 3; c++) {
      const cx = ri(3, 16), cy = ri(2, 12);
      for (let i = 0; i < 6; i++) {
        const nx = cx + ri(-1, 1), ny = cy + ri(-1, 1);
        if (!forbidden(nx, ny) && g[ny][nx] === 'G') g[ny][nx] = 'T';
      }
    }
    // batu tersebar
    for (let i = 0; i < 6; i++) {
      const x = ri(2, 17), y = ri(2, 12);
      if (!forbidden(x, y) && g[y][x] === 'G') g[y][x] = 'R';
    }
    // cari tile rumput kosong untuk event
    const freeSpots = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (g[y][x] === 'G' && !forbidden(x, y)) freeSpots.push([x, y]);
    const pickSpot = () => freeSpots.length ? freeSpots.splice(ri(0, freeSpots.length - 1), 1)[0] : null;
    const events = [
      { id: 'shop1', kind: 'shop', name: 'Toko Desa', x: 2, y: 7, text: ['Selamat datang!'], stock: ['potion', 'ether', 'sword1', 'dagger1', 'staff1', 'armor1', 'helm1', 'ring1', 'wood', 'stone', 'herb', 'hide'] },
      { id: 'heal1', kind: 'heal', name: 'Penginapan', x: 4, y: 7, price: 20 },
      { id: 'ogre1', kind: 'boss', enemy: 'ogre', x: 17, y: 7, flag: 'ogre_dead' }
    ];
    const nodes = [['wood', 'assets/tiles/tree.webp'], ['wood', 'assets/tiles/tree.webp'], ['wood', 'assets/tiles/tree.webp'], ['stone', 'assets/tiles/rock.webp'], ['stone', 'assets/tiles/rock.webp'], ['stone', 'assets/tiles/rock.webp'], ['herb', 'assets/items/potion.webp'], ['herb', 'assets/items/potion.webp']];
    nodes.forEach((n, i) => {
      const s = pickSpot(); if (!s) return;
      events.push({ id: 'g' + i, kind: 'gather', res: n[0], x: s[0], y: s[1], img: n[1] });
    });
    ['potion', 'ether', 'phoenix'].forEach((it, i) => {
      const s = pickSpot(); if (!s) return;
      events.push({ id: 'chest' + i, kind: 'chest', item: it, x: s[0], y: s[1], flag: 'gen_chest' + i });
    });
    const tiles = g.map((r) => r.join(''));
    return {
      map: { id: 'gen1', name: 'Dunia Basic', w: W, h: H, encounter: 1, enemies: ['goblin', 'wolf'], tiles, events },
      startX: 3, startY: 8,
      quests: [{ id: 'q_ogre', name: 'Kalahkan Ogre', desc: 'Kalahkan Ogre di dalam gua timur untuk menyelesaikan Dunia Basic.', type: 'kill', target: 'ogre', count: 1, rewardGold: 300, rewardExp: 120, rewardItems: [], doneText: 'Dunia Basic selesai! Kamu bisa terus menjelajah atau membuat dunia baru di Maker.' }]
    };
  }
  function reachable(map, sx, sy, tx, ty) {
    const seen = {}, q = [[sx, sy]]; seen[sx + ',' + sy] = 1;
    while (q.length) {
      const c = q.shift();
      if (c[0] === tx && c[1] === ty) return true;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => {
        const x = c[0] + d[0], y = c[1] + d[1], k = x + ',' + y;
        if (seen[k] || x < 0 || y < 0 || x >= W || y >= H) return;
        const t = map.tiles[y][x];
        if (!WALK[t]) return;
        seen[k] = 1; q.push([x, y]);
      });
    }
    return false;
  }
  function generate(seed) {
    seed = Math.max(1, Math.min(10, seed | 0 || 1));
    for (let attempt = 0; attempt < 30; attempt++) {
      const out = build(seed * 31 + attempt);
      if (reachable(out.map, out.startX, out.startY, 16, 7)) return out;
    }
    // fallback terakhir: bersihkan penghalang di koridor desa-gua
    const out = build(seed);
    const rows = out.map.tiles.map((r) => r.split(''));
    for (let x = 3; x <= 16; x++) { if (rows[7][x] === 'T' || rows[7][x] === 'W' || rows[7][x] === 'R') rows[7][x] = 'P'; if (rows[8][x] === 'T' || rows[8][x] === 'W') rows[8][x] = 'G'; }
    out.map.tiles = rows.map((r) => r.join(''));
    return out;
  }
  window.FWGen = { generate, SIZE: { w: W, h: H } };
})();
