# Final World (v1.3)

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
- `assets/` tile 16px, sprite 4 arah (webp 48×64), musuh 32px, ikon item/equipment 32px, ikon event
- `data/game.json` sumber data → `node build-data.js` → `data/game.js`

## Fitur v1.3
- Semua aset gambar baru bergaya pixel art 16-bit (webp): 6 sprite sheet karakter (Warrior, Thief, White Mage, Black Mage, NPC Tetua, Pedagang), 3 musuh (Goblin, Wolf, Ogre), 9 tile world (rumput/air/jalan seamless), dan 10 ikon item/equipment baru (Potion, Ether, Phoenix Down, Kunci Kuno, Iron Sword, Dagger, Wooden Staff, Leather Armor, Iron Helm, Power Ring).
- Ikon item/equipment tampil di toko, inventaris, menu equip, dan menu item saat battle. Ikon bisa diganti di Editor → Item / Equipment.
- Format sheet karakter tetap **3 kolom × 4 baris** (kolom = diam, langkah A, langkah B; baris = bawah, atas, kiri, kanan), frame 16 px. Pergerakan antar-tile dihaluskan (tween 130 ms), frame berganti saat berjalan, diam saat berhenti. NPC/pedagang punya animasi idle.
- Sheet lama (1 baris × 4 arah) dan gambar tunggal tetap didukung. Upload gambar sendiri di Editor (diperkecil otomatis).
- Efek skill (slash, fire, ice, thunder, heal + angka damage, bisa dibatasi per class) dan kamera mengikuti pemain tetap seperti sebelumnya.

## Deploy GitHub Pages
Push ke `main` → Settings → Pages → Source: **GitHub Actions** (workflow sudah ada).
