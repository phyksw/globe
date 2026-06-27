// build-data.js — one-command data pipeline.
//   node build-data.js          # rebuild data/*.js from the cached news_raw.html
//   node build-data.js --fetch  # re-download the live news page first, then rebuild
//
// Steps: (1) parse news_raw.html -> news_parsed.json   [parse.js, needs cheerio]
//        (2) assign country/coords/arcs -> news_enriched.json   [enrich.js]
//        (3) wrap as <script>-loadable globals -> data/news.js, data/world.js
const { execSync } = require('child_process');
const fs = require('fs');

if (process.argv.includes('--fetch')) {
  console.log('↓ fetching live news page…');
  execSync('curl -s -L -m 60 "https://brswinvesting.phyksw.workers.dev/news" -o news_raw.html');
}

execSync('node parse.js',  { stdio: 'inherit' });
execSync('node enrich.js', { stdio: 'inherit' });

const enriched = JSON.parse(fs.readFileSync('news_enriched.json', 'utf8'));
const geo = JSON.parse(fs.readFileSync('data/countries.geojson', 'utf8'));
geo.features.forEach(f => {           // keep only the props the app needs
  const p = f.properties;
  f.properties = { ADMIN: p.ADMIN, ISO_A2: p.ISO_A2, ISO_A3: p.ISO_A3, NAME: p.NAME };
});
fs.writeFileSync('data/news.js',  'window.NEWS_DATA='   + JSON.stringify(enriched) + ';');
fs.writeFileSync('data/world.js', 'window.WORLD_GEOJSON=' + JSON.stringify(geo) + ';');

console.log(`\n✓ data/news.js (${enriched.items.length} items) + data/world.js (${geo.features.length} features) regenerated`);
