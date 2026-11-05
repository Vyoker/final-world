// Jalankan: node build-data.js  -> mengubah data/game.json menjadi data/game.js (agar jalan di WebView / file://)
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(__dirname + '/data/game.json', 'utf8'));
fs.writeFileSync(__dirname + '/data/game.js', 'window.GAME_DATA = ' + JSON.stringify(j, null, 2) + ';\n');
console.log('data/game.js dibuat');
