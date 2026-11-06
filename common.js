/* Final World — modul bersama: Auth (localStorage) + cache gambar.
   CATATAN: auth berbasis localStorage hanya memisahkan peran di sisi klien (bukan keamanan sungguhan).
   Untuk produksi, pindahkan ke backend (mis. Firebase/Supabase/API sendiri). */
(function () {
  'use strict';
  const ROOT = /\/(game|editor)\//.test(location.pathname) ? '../' : '';
  const USERS = 'fw_users', SESSION = 'fw_session';
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };

  // hash sinkron sederhana (cyrb53) + salt; cukup untuk demo localStorage
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const Auth = {
    ROOT,
    users() { return read(USERS, {}); },
    register(name, pass) {
      name = (name || '').trim().toLowerCase();
      if (!/^[a-z0-9_]{3,16}$/.test(name)) return { ok: false, msg: 'Username 3-16 karakter (huruf kecil, angka, _).' };
      if ((pass || '').length < 4) return { ok: false, msg: 'Password minimal 4 karakter.' };
      const u = Auth.users(); if (u[name]) return { ok: false, msg: 'Username sudah dipakai.' };
      u[name] = { h: hash(name + ':' + pass), role: 'player', created: Date.now() };
      localStorage.setItem(USERS, JSON.stringify(u));
      localStorage.setItem(SESSION, JSON.stringify({ name, role: 'player' }));
      return { ok: true, role: 'player' };
    },
    login(name, pass) {
      name = (name || '').trim().toLowerCase(); const u = Auth.users()[name];
      if (!u || u.h !== hash(name + ':' + pass)) return { ok: false, msg: 'Username atau password salah.' };
      localStorage.setItem(SESSION, JSON.stringify({ name, role: u.role }));
      return { ok: true, role: u.role };
    },
    logout() { localStorage.removeItem(SESSION); location.href = ROOT + 'index.html'; },
    session() { const s = read(SESSION, null); if (!s) return null; const u = Auth.users()[s.name]; return u ? { name: s.name, role: u.role } : null; },
    home() { return ROOT + 'game/index.html'; },
    /** Panggil di halaman terlindungi. Semua pemain bebas masuk game maupun editor (tanpa kunci). */
    require() {
      const s = Auth.session();
      if (!s) { location.replace(ROOT + 'index.html'); return null; }
      return s;
    },
    deleteUser(name) { const u = Auth.users(); delete u[name]; localStorage.setItem(USERS, JSON.stringify(u)); localStorage.removeItem('fw_save_' + name); for (let i = 1; i <= 3; i++) localStorage.removeItem('fw_save_' + name + '_' + i); localStorage.removeItem('fw_worlds_' + name); },
    saveKey(name) { return 'fw_save_' + name; }
  };

  // ---------- cache gambar ----------
  const cache = {};
  const IMG = {
    resolve(src) { return !src ? '' : /^(data:|https?:|blob:)/.test(src) ? src : ROOT + src; },
    get(src) {
      if (!src) return null;
      if (!cache[src]) { const im = new Image(); im.onerror = () => { im.failed = true; }; im.src = IMG.resolve(src); cache[src] = im; }
      return cache[src];
    },
    /** Potongan frame sprite sheet. Format: 3 kolom x 4 baris (0.75 rasio) = baru [kolom=frame, baris=arah];
        1 baris x 4 kolom = lama [arah]; lainnya = satu gambar. Mengembalikan [sx, sy, sw, sh]. */
    rect(im, dir, frame) {
      const W = im.naturalWidth, H = im.naturalHeight;
      if (Math.abs(W / H - 0.75) < 0.02) { const fw = W / 3, fh = H / 4; return [Math.min(2, frame) * fw, dir * fh, fw, fh]; }
      if (W >= H * 3.5) return [dir * H, 0, H, H];
      return [0, 0, W, H];
    },
    ready(src) { const im = IMG.get(src); return im && im.complete && im.naturalWidth > 0 ? im : null; },
    /** Baca file gambar -> dataURL PNG, diperkecil agar muat di localStorage */
    fromFile(file, maxW, maxH) {
      return new Promise((res, rej) => {
        const r = new FileReader();
        r.onerror = rej;
        r.onload = () => {
          const im = new Image(); im.onerror = rej;
          im.onload = () => {
            const k = Math.min(1, maxW / im.width, maxH / im.height), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
            const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, w, h);
            res(c.toDataURL('image/png'));
          };
          im.src = r.result;
        };
        r.readAsDataURL(file);
      });
    }
  };
  window.FW = { Auth, IMG };
})();
