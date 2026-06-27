// enrich.js — assign country (HQ of lead entity) + pin coords + arcs to each news item.
const fs = require('fs');
const items = JSON.parse(fs.readFileSync('news_parsed.json', 'utf8'));

// Country meta: centroid-ish coords for camera focus + label
const COUNTRIES = {
  US: { name: 'United States', iso3: 'USA', lat: 39.5, lng: -98.35 },
  KR: { name: 'South Korea',   iso3: 'KOR', lat: 36.5, lng: 127.8 },
  CN: { name: 'China',         iso3: 'CHN', lat: 35.0, lng: 104.0 },
  TW: { name: 'Taiwan',        iso3: 'TWN', lat: 23.7, lng: 121.0 },
  JP: { name: 'Japan',         iso3: 'JPN', lat: 36.2, lng: 138.3 },
  NL: { name: 'Netherlands',   iso3: 'NLD', lat: 52.1, lng: 5.3 },
  GB: { name: 'United Kingdom',iso3: 'GBR', lat: 54.0, lng: -2.0 },
  DE: { name: 'Germany',       iso3: 'DEU', lat: 51.1, lng: 10.4 },
  FR: { name: 'France',        iso3: 'FRA', lat: 46.6, lng: 2.4 },
  ES: { name: 'Spain',         iso3: 'ESP', lat: 40.0, lng: -3.7 },
  IT: { name: 'Italy',         iso3: 'ITA', lat: 42.8, lng: 12.8 },
  SE: { name: 'Sweden',        iso3: 'SWE', lat: 62.0, lng: 15.0 },
  CH: { name: 'Switzerland',   iso3: 'CHE', lat: 46.8, lng: 8.2 },
  CA: { name: 'Canada',        iso3: 'CAN', lat: 56.1, lng: -106.3 },
  IL: { name: 'Israel',        iso3: 'ISR', lat: 31.5, lng: 34.9 },
  IN: { name: 'India',         iso3: 'IND', lat: 22.0, lng: 79.0 },
  AU: { name: 'Australia',     iso3: 'AUS', lat: -25.3, lng: 133.8 },
  SA: { name: 'Saudi Arabia',  iso3: 'SAU', lat: 23.9, lng: 45.1 },
  AE: { name: 'United Arab Emirates', iso3: 'ARE', lat: 23.4, lng: 53.8 },
  EG: { name: 'Egypt',         iso3: 'EGY', lat: 26.8, lng: 30.8 },
  KW: { name: 'Kuwait',        iso3: 'KWT', lat: 29.3, lng: 47.5 },
  RO: { name: 'Romania',       iso3: 'ROU', lat: 45.9, lng: 25.0 },
};

// Entities: keys -> pin city coords + iso2. type 'company' preferred over 'country'.
const E = (keys, iso2, lat, lng, type = 'company') => ({ keys, iso2, lat, lng, type });
const ENTITIES = [
  // ── US companies ──
  E(['삼성SDS'], 'KR', 37.55, 127.0),              // before 삼성
  E(['삼성', 'Samsung'], 'KR', 37.26, 127.03),
  E(['SK하이닉스', 'SK Hynix', '하이닉스'], 'KR', 37.27, 127.45),
  E(['한화', 'Hanwha'], 'KR', 37.57, 126.98),
  E(['KAI'], 'KR', 35.09, 128.07),
  E(['LIG넥스원', 'LIG'], 'KR', 37.42, 127.13),
  E(['네이버', 'Naver'], 'KR', 37.40, 127.10),
  E(['현대', 'Hyundai'], 'KR', 37.52, 127.0),
  E(['K2 전차', 'K-방산', 'K방산'], 'KR', 37.57, 126.98),
  E(['LG'], 'KR', 37.52, 126.92),

  E(['테슬라', 'Tesla', 'FSD', '사이버캡', '사이버트럭', '옵티머스', '기가텍사스', '기가 텍사스', 'Grok'], 'US', 30.27, -97.74),
  E(['OpenAI', 'ChatGPT', '소라', 'Sora', '스타게이트', 'Stargate', '코덱스', 'Codex'], 'US', 37.77, -122.42),
  E(['SpaceX', '스페이스X', '스타링크', 'Starlink', '스타베이스', '스타십', 'Starship', '스타폴', '팰컨', 'Falcon', '기가베이'], 'US', 33.92, -118.33),
  E(['앤트로픽', 'Anthropic', 'Claude', '클로드'], 'US', 37.78, -122.41),
  E(['IonQ'], 'US', 38.99, -76.93),
  E(['IBM', 'Nighthawk'], 'US', 41.11, -73.72),
  E(['Microsoft', 'MS', 'Copilot', '서피스', 'Surface'], 'US', 47.64, -122.13),
  E(['엔비디아', 'NVIDIA', 'Nvidia', '베라 루빈', '베라루빈', 'RTX'], 'US', 37.37, -121.97),
  E(['구글', 'Google', 'Gemini', '제미나이', '크롬', 'Chrome', 'DeepMind', '딥마인드'], 'US', 37.42, -122.08),
  E(['메타', 'Meta'], 'US', 37.48, -122.15),
  E(['아마존', 'Amazon'], 'US', 47.61, -122.33),
  E(['인텔', 'Intel'], 'US', 37.39, -121.96),
  E(['퀄컴', 'Qualcomm'], 'US', 32.90, -117.20),
  E(['브로드컴', 'Broadcom'], 'US', 37.34, -121.89),
  E(['웨이모', 'Waymo'], 'US', 37.42, -122.08),
  E(['우버', 'Uber'], 'US', 37.77, -122.41),
  E(['누로', 'Nuro'], 'US', 37.40, -122.06),
  E(['AST스페이스모바일', 'AST', 'BlueBird'], 'US', 32.0, -102.08),
  E(['앤듀릴', 'Anduril'], 'US', 33.67, -117.91),
  E(['블루오리진', '뉴글렌', '뉴 글렌'], 'US', 47.38, -122.23),
  E(['샌드박스AQ'], 'US', 37.44, -122.14),
  E(['아톰컴퓨팅', 'Atom Computing', '아톰 컴퓨팅', '토릭 코드'], 'US', 40.01, -105.27),
  E(['크루소', 'Crusoe'], 'US', 37.77, -122.41),
  E(['HPE'], 'US', 29.76, -95.36),
  E(['Amkor', '앰코'], 'US', 33.42, -111.94),
  E(['애플', 'Apple', 'Siri'], 'US', 37.33, -122.03),
  E(['하니웰', '퀀티넘', 'Quantinuum', '헬리오스'], 'US', 39.92, -105.09),
  E(['샌디아', 'Sandia'], 'US', 35.08, -106.65),
  E(['피겨', 'Figure', 'BotQ'], 'US', 37.37, -122.04),
  E(['텐서웨이브', 'TensorWave'], 'US', 36.17, -115.14),
  E(['보이저', 'Voyager'], 'US', 39.74, -104.99),
  E(['애스트로보틱', 'Astrobotic'], 'US', 40.44, -79.99),
  E(['GlobalFoundries', '글로벌파운드리'], 'US', 43.0, -73.8),
  E(['Shield AI', '실드AI', 'Shield'], 'US', 32.9, -117.2),
  E(['EchoStar'], 'US', 39.65, -104.99),
  E(['루시드', 'Lucid'], 'US', 37.52, -122.0),
  E(['Reflection AI', 'Reflection'], 'US', 40.71, -74.0),
  E(['Devin', 'Cognition'], 'US', 37.77, -122.42),
  E(['GTA6', 'GTA'], 'US', 40.73, -73.99),
  E(['아폴로', 'Apollo'], 'US', 40.71, -74.0),
  E(['블랙스톤', 'Blackstone'], 'US', 40.71, -74.0),
  E(['Cursor'], 'US', 37.77, -122.42),
  E(['엘리먼트', 'Element'], 'US', 37.77, -122.42),
  E(['비자', 'Visa'], 'US', 37.78, -122.41),
  E(['디지파워', 'DigiPower'], 'US', 40.71, -74.0),
  E(['텐스토렌트', 'Tenstorrent'], 'CA', 43.65, -79.38),
  E(['D-Wave', 'D웨이브'], 'CA', 49.25, -123.0),
  E(['모빌아이', 'Mobileye'], 'IL', 31.78, 35.21),
  E(['Nebius', '네비우스'], 'NL', 52.37, 4.90),
  E(['스텔란티스', 'Stellantis'], 'NL', 52.37, 4.90),
  E(['웨이브', 'Wayve'], 'GB', 51.51, -0.13),
  E(['라인메탈', 'Rheinmetall'], 'DE', 51.23, 6.78),
  E(['페라리', 'Ferrari'], 'IT', 44.53, 10.86),
  E(['Sivers', '시버스'], 'SE', 59.40, 17.95),
  E(['ID Quantique', 'IDQ'], 'CH', 46.20, 6.14),
  E(['뉴퀀텀', 'NuQuantum'], 'GB', 52.20, 0.12),
  E(['OQC'], 'GB', 51.45, -0.97),
  E(['PsiQuantum', '사이퀀텀'], 'US', 37.44, -122.14),
  E(['샤론AI', 'Sharon AI'], 'AU', -33.87, 151.21),
  E(['TSMC'], 'TW', 24.78, 120.99),
  E(['UMC'], 'TW', 24.78, 120.99),
  E(['알리바바', 'Alibaba', 'Qwen'], 'CN', 30.27, 120.15),
  E(['Zhipu', 'Z.ai', 'GLM'], 'CN', 39.90, 116.40),
  E(['Moonshot', 'Kimi'], 'CN', 39.90, 116.40),
  E(['MiniMax'], 'CN', 31.23, 121.47),
  E(['Spacesail'], 'CN', 31.23, 121.47),
  E(['보스턴다이내믹스', 'Boston Dynamics', 'Atlas'], 'US', 42.39, -71.24),
  E(['TCS'], 'IN', 19.08, 72.88),
  E(['드론실드', 'DroneShield'], 'AU', -33.87, 151.21),

  // ── country / agency words (fallback only) ──
  E(['美', '미 정부', '미국', '펜타곤', '백악관', '트럼프', 'NHTSA', 'FCC', 'EPA', 'DOE', '에너지부', '상무부', '국방부', '공군', '우주군', 'CHIPS', 'JIATF', 'CNBC'], 'US', 38.90, -77.04, 'country'),
  E(['중국', '中'], 'CN', 39.90, 116.40, 'country'),
  E(['한국', '韓', '서울'], 'KR', 37.57, 126.98, 'country'),
  E(['일본', '日'], 'JP', 35.68, 139.69, 'country'),
  E(['호주'], 'AU', -33.87, 151.21, 'country'),
  E(['사우디'], 'SA', 24.71, 46.68, 'country'),
  E(['이집트'], 'EG', 30.04, 31.24, 'country'),
  E(['UAE', '아랍에미리트'], 'AE', 24.45, 54.38, 'country'),
  E(['쿠웨이트'], 'KW', 29.38, 47.99, 'country'),
  E(['독일'], 'DE', 52.52, 13.40, 'country'),
  E(['루마니아'], 'RO', 44.43, 26.10, 'country'),
  E(['바르셀로나', '스페인'], 'ES', 41.39, 2.17, 'country'),
  E(['유로사토리'], 'FR', 48.86, 2.35, 'country'),
];

function findMatches(text, types) {
  const out = [];
  for (const ent of ENTITIES) {
    if (!types.includes(ent.type)) continue;
    for (const k of ent.keys) {
      const idx = text.indexOf(k);
      if (idx >= 0) { out.push({ ent, idx, klen: k.length }); break; }
    }
  }
  return out;
}
// earliest index wins; tie -> longer key
function pickPrimary(text) {
  let m = findMatches(text, ['company']);
  if (!m.length) m = findMatches(text, ['country']);
  if (!m.length) return null;
  m.sort((a, b) => a.idx - b.idx || b.klen - a.klen);
  return m[0].ent;
}

const fixups = { 77: 'US', 107: 'US', 126: 'US' }; // id -> iso2 override (post-review)

let unmatched = [];
for (const it of items) {
  const titleText = it.title;
  const allText = it.title + ' ' + it.summary.join(' ') + ' ' + it.deep.join(' ');

  let primary = pickPrimary(titleText) || pickPrimary(allText);
  if (!primary) { unmatched.push(it.id); primary = { iso2: 'US', lat: 39.5, lng: -98.35 }; }

  let iso2 = fixups[it.id] || primary.iso2;
  it.country = iso2;
  if (fixups[it.id]) {           // overridden: snap pin to that country's centroid
    it.lat = COUNTRIES[iso2].lat;
    it.lng = COUNTRIES[iso2].lng;
  } else {
    it.lat = primary.lat;
    it.lng = primary.lng;
  }

  // secondary countries named in TITLE -> arcs (different country only)
  const titleMatches = findMatches(titleText, ['company', 'country']);
  const secset = [];
  for (const m of titleMatches) {
    if (m.ent.iso2 !== iso2 && !secset.includes(m.ent.iso2)) secset.push(m.ent.iso2);
  }
  it.arcs = secset.map(c => ({ to: c, lat: COUNTRIES[c].lat, lng: COUNTRIES[c].lng }));
}

fs.writeFileSync('news_enriched.json', JSON.stringify({ countries: COUNTRIES, items }, null, 2), 'utf8');

// review table
console.log('unmatched:', unmatched.length, unmatched);
const byC = {};
for (const it of items) byC[it.country] = (byC[it.country] || 0) + 1;
console.log('\n=== country counts ===');
console.log(Object.entries(byC).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('\n=== id | country | arcs | title ===');
for (const it of items) {
  const arcs = it.arcs.map(a => a.to).join(',');
  console.log(`${String(it.id).padStart(3)} | ${it.country} | ${arcs.padEnd(8)} | ${it.title}`);
}
