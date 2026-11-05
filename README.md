# Final World (v1.2)

RPG HTML5 turn-based + editor ala RPG Maker, dengan login Player / Developer.
Terinspirasi struktur game J2ME "Final Fantasy" (FF - 1.jar). Data, nama, dan grafis di sini orisinal; aset/teks/musik asli tidak disalin.

## Alur akun (localStorage)
- Buka `index.html` → **Login / Register**.
- **Player** → langsung ke game. **Developer** → langsung ke editor (tombol *Main* untuk uji coba).
- Register developer butuh **kunci developer** (bawaan `FW-DEV`, ganti di Editor → Pengaturan).
- Save game per akun. Logout ada di title game, menu Simpan, dan header editor.
- Catatan: auth localStorage hanya memisahkan peran di sisi klien, bukan keamanan sungguhan. Untuk produksi pindahkan ke backend.

## Struktur
- `index.html` login/register, `common.js` auth + cache gambar
- `game/` engine · `editor/` Final World Maker
- `assets/` tile 16px, sprite 4 arah, musuh 32px, ikon event (dibuat `python3 tools/make_assets.py`)
- `data/game.json` sumber data → `node build-data.js` → `data/game.js`

## Fitur v1.1
- Gambar tile, sprite karakter (sheet 4 arah), musuh, NPC; upload PNG langsung di editor (diperkecil otomatis).
- Efek skill: slash, fire, ice, thunder, heal + angka damage; skill bisa dibatasi per class.
- Kamera mengikuti pemain (map bisa lebih besar dari layar).

## Animasi sprite jalan (v1.2)
- Format sheet karakter: **3 kolom × 4 baris** (kolom = diam, langkah A, langkah B; baris = bawah, atas, kiri, kanan). Contoh: 48×64 px untuk frame 16 px.
- Pergerakan antar-tile dihaluskan (tween 130 ms), frame berganti saat berjalan, diam saat berhenti. NPC/pedagang punya animasi idle, musuh di battle bergoyang naik-turun.
- Sheet lama (1 baris × 4 arah) dan gambar tunggal tetap didukung. Upload sheet sendiri di Editor → Karakter → "Sprite jalan".
- Buat ulang aset bawaan: `python3 tools/make_assets.py`

## Deploy GitHub Pages
Push ke `main` → Settings → Pages → Source: **GitHub Actions** (workflow sudah ada).
