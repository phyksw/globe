/* ===== Global Tech News — Tactical Globe ===== */
(function () {
'use strict';

const { countries: COUNTRIES, items: ITEMS } = window.NEWS_DATA;
const GEO = window.WORLD_GEOJSON;
const PI = Math.PI;
const LINE_ALT = 0.025, ARROW_ALT = 0.028;   // deal lines + arrows share a constant altitude (see buildArcs)

/* ---- constants ---- */
const SECTOR_COLORS = {
  'AI':'#34d399','반도체':'#e879f9','데이터센터':'#a3e635','우주':'#a78bfa',
  '방산':'#fb923c','양자':'#38bdf8','자율주행':'#fb7185','기타':'#94a3b8'
};

/* ---- globe color palettes (switchable; ocean/land/coast/card/HUD per theme) ---- */
const GLOBE_THEMES = [
  { name:'Deep Teal Jewel', label:'딥 틸 주얼', darkGlobe:true, ocean:'#0b6b65',
    landCap:'rgba(255,243,222,0.97)', landSide:'rgba(193,147,107,0.92)', landStroke:'rgba(255,107,94,0.95)',
    cardBg:'radial-gradient(130% 130% at 30% 18%, #11857d 0%, #0b6b65 42%, #07504a 74%, #06403b 100%)',
    halo:'rgba(64,233,211,0.42)', hudAccent:'#2cf0d8', selectedPin:'#fff1d6', swatch:'#0b6b65' },
  { name:'Royal Indigo', label:'로열 인디고', darkGlobe:true, ocean:'#241a63',
    landCap:'rgba(201,190,246,0.97)', landSide:'rgba(122,102,194,0.95)', landStroke:'rgba(251,191,60,0.95)',
    cardBg:'radial-gradient(120% 120% at 50% 26%, #2e2280 0%, #211a5e 42%, #15103f 78%, #0e0a2c 100%)',
    halo:'rgba(167,139,250,0.30)', hudAccent:'#fbbf24', selectedPin:'#ffe27a', swatch:'#241a63' },
  { name:'Aqua Mint Pop', label:'아쿠아 민트', darkGlobe:false, ocean:'#1bc6d6',
    landCap:'rgba(255,255,255,0.97)', landSide:'rgba(198,238,240,0.95)', landStroke:'rgba(9,104,106,0.92)',
    cardBg:'radial-gradient(circle at 50% 36%, #f2fffd 0%, #ddf8f7 45%, #c2eff0 100%)',
    halo:'rgba(27,198,214,0.32)', hudAccent:'#0e8a86', selectedPin:'#ff5240', swatch:'#1bc6d6' },
  { name:'Graphite Jewel', label:'그래파이트', darkGlobe:true, ocean:'#1e242e',
    landCap:'rgba(244,248,252,0.98)', landSide:'rgba(148,163,184,0.85)', landStroke:'rgba(34,41,52,0.95)',
    cardBg:'radial-gradient(120% 120% at 30% 18%, #2b3340 0%, #232a35 42%, #171c25 100%)',
    halo:'rgba(120,150,190,0.30)', hudAccent:'#e6edf6', selectedPin:'#ffffff', swatch:'#1e242e' },
  { name:'Sunset Coral', label:'선셋 코랄', darkGlobe:true, ocean:'#dc5436',
    landCap:'rgba(11,50,52,0.97)', landSide:'rgba(6,31,34,1)', landStroke:'rgba(94,234,212,0.6)',
    cardBg:'radial-gradient(120% 120% at 30% 18%, #ff8c5e 0%, #ec5836 38%, #bf3527 72%, #7a211f 100%)',
    halo:'rgba(255,173,120,0.45)', hudAccent:'#fff1e6', selectedPin:'#38e0d6', swatch:'#dc5436' },
  { name:'Tactical Navy', label:'택티컬', darkGlobe:true, stars:true, ocean:'#0a1626',
    landCap:'rgba(66,90,126,0.42)', landSide:'rgba(38,54,80,0.5)', landStroke:'rgba(156,184,218,0.6)',
    cardBg:'radial-gradient(120% 100% at 50% 38%, #0d1730 0%, #070c18 64%, #04060e 100%)',
    halo:'rgba(53,220,255,0.16)', hudAccent:'#84e9ff', selectedPin:'#ffffff', swatch:'#16294a' },
];
let _themeIdx = 0;
let GT = GLOBE_THEMES[_themeIdx];
const SECTOR_ORDER = ['AI','자율주행','우주','양자','반도체','데이터센터','방산','기타'];
const TYPE_ORDER = ['계약','출시','매출','화제'];
const FLAG = {US:'🇺🇸',KR:'🇰🇷',CN:'🇨🇳',TW:'🇹🇼',JP:'🇯🇵',NL:'🇳🇱',GB:'🇬🇧',DE:'🇩🇪',FR:'🇫🇷',
  ES:'🇪🇸',IT:'🇮🇹',SE:'🇸🇪',CH:'🇨🇭',CA:'🇨🇦',IL:'🇮🇱',IN:'🇮🇳',AU:'🇦🇺',SA:'🇸🇦',AE:'🇦🇪',
  EG:'🇪🇬',KW:'🇰🇼',RO:'🇷🇴'};
const KO = {US:'미국',KR:'한국',CN:'중국',TW:'대만',JP:'일본',NL:'네덜란드',GB:'영국',DE:'독일',
  FR:'프랑스',ES:'스페인',IT:'이탈리아',SE:'스웨덴',CH:'스위스',CA:'캐나다',IL:'이스라엘',IN:'인도',
  AU:'호주',SA:'사우디',AE:'UAE',EG:'이집트',KW:'쿠웨이트',RO:'루마니아'};
const ADMIN_BY_ISO = {US:'United States of America',KR:'South Korea',CN:'China',TW:'Taiwan',JP:'Japan',
  NL:'Netherlands',GB:'United Kingdom',DE:'Germany',FR:'France',ES:'Spain',IT:'Italy',SE:'Sweden',
  CH:'Switzerland',CA:'Canada',IL:'Israel',IN:'India',AU:'Australia',SA:'Saudi Arabia',
  AE:'United Arab Emirates',EG:'Egypt',KW:'Kuwait',RO:'Romania'};
const ISO_BY_ADMIN = Object.fromEntries(Object.entries(ADMIN_BY_ISO).map(([k,v]) => [v,k]));
const isoOf = f => ISO_BY_ADMIN[f.properties.ADMIN] || null;

/* ---- inject Jeju + Dokdo as part of South Korea (110m geojson omits them) ----
   NOTE: ring must wind clockwise here or globe.gl fills the *complement* (whole globe). */
function ellipse(clat,clng,rlat,rlng,n){ const r=[]; for(let i=n;i>=0;i--){ const a=i/n*2*PI; r.push([clng+Math.cos(a)*rlng, clat+Math.sin(a)*rlat]); } return r; }
GEO.features.push({type:'Feature',properties:{ADMIN:'South Korea',ISO_A2:'KR',_x:'jeju'},
  geometry:{type:'Polygon',coordinates:[ellipse(33.38,126.55,0.22,0.40,18)]}});
GEO.features.push({type:'Feature',properties:{ADMIN:'South Korea',ISO_A2:'KR',_x:'dokdo'},
  geometry:{type:'Polygon',coordinates:[ellipse(37.243,131.866,0.07,0.09,12)]}});
// no floating text labels (Jeju/Dokdo are still shown as highlighted KR territory)
const LANDMARK_ELS = [];

/* ---- infographic icons ---- */
const ic = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const dot = (x,y,r=1.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;
const SEC_ICON = {
  'AI': ic(`<circle cx="6.5" cy="7" r="2"/><circle cx="17.5" cy="6.5" r="2"/><circle cx="16" cy="17" r="2"/><circle cx="7" cy="16.5" r="2"/><path d="M8.4 7.4l7-0.6M8.6 15l5.7 1.2M7 9v5.5M16.7 8.3l-1 7"/>`),
  '반도체': ic(`<rect x="7.5" y="7.5" width="9" height="9" rx="1.4"/><rect x="10.3" y="10.3" width="3.4" height="3.4" rx="0.8"/><path d="M10 7.5V4.5M14 7.5V4.5M10 19.5v-3M14 19.5v-3M7.5 10H4.5M7.5 14H4.5M19.5 10h-3M19.5 14h-3"/>`),
  '데이터센터': ic(`<rect x="4.5" y="5" width="15" height="5" rx="1.4"/><rect x="4.5" y="14" width="15" height="5" rx="1.4"/>${dot(7.6,7.5,0.9)}${dot(7.6,16.5,0.9)}<path d="M11 7.5h5M11 16.5h5"/>`),
  '우주': ic(`<path d="M12 3.2c2.8 1.8 4.3 4.8 4.3 8.6L14.3 14H9.7l-2-2.2C7.7 8 9.2 5 12 3.2z"/><circle cx="12" cy="9" r="1.4"/><path d="M9.7 15c-1.4.5-2.3 1.9-2.4 3.8 1.9 0 3.2-.9 3.7-2.3M14.3 15c1.4.5 2.3 1.9 2.4 3.8-1.9 0-3.2-.9-3.7-2.3"/>`),
  '방산': ic(`<path d="M12 3.2l6.5 2.4v4.9c0 4.3-2.8 7.6-6.5 9-3.7-1.4-6.5-4.7-6.5-9V5.6L12 3.2z"/><path d="M9.2 12l2 2 3.6-4.2"/>`),
  '양자': ic(`${dot(12,12,1.6)}<ellipse cx="12" cy="12" rx="8.5" ry="3.4"/><ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(120 12 12)"/>`),
  '자율주행': ic(`<path d="M5 16.5l1.3-4.7c.3-1 1.2-1.8 2.3-1.8h6.8c1.1 0 2 .8 2.3 1.8L19 16.5M4.5 16.5h15M6.5 16.5v1.8M17.5 16.5v1.8"/>${dot(8.7,16.4,1.3)}${dot(15.3,16.4,1.3)}<path d="M9 10l-.6-2.2M15 10l.6-2.2"/>`),
  '기타': ic(`${dot(6,12,1.7)}${dot(12,12,1.7)}${dot(18,12,1.7)}`)
};
const ALL_ICON = ic(`<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>`);
const TYPE_ICON = {
  '계약': ic(`<path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13.5 3.5V9H19M8.5 14l2 2 4-4.2"/>`),
  '출시': ic(`<path d="M12 3.5l3.2 6.3-3.2-1.5-3.2 1.5L12 3.5z"/><path d="M12 8.3V20M9 16l3 4 3-4"/>`),
  '매출': ic(`<path d="M4.5 19.5h15"/><path d="M7.5 19.5v-5M12 19.5V8M16.5 19.5v-8"/>`),
  '화제': ic(`<path d="M12 3.5c.6 2.7-1.3 3.8-1.3 5.8a3 3 0 0 0 6 0c0-.9-.3-1.7-.9-2.4 2 1 3.4 3.3 3.4 6A6.7 6.7 0 1 1 7 9.4c1.8-1.4 4.6-2.5 5-5.9z"/>`)
};

/* ---- prep items ---- */
ITEMS.forEach(it => {
  const [m,d] = it.date.split('/').map(Number); it._d = m*100 + d;
  const a = it.id * 2.39996323, r = 0.3 + (it.id % 9) * 0.13;
  it._jlat = it.lat + Math.sin(a) * r;
  it._jlng = it.lng + Math.cos(a) * r / Math.max(0.4, Math.cos(it.lat*PI/180));
});
const SORTED = ITEMS.slice().sort((a,b) => b._d - a._d || a.id - b.id);

/* ---- state ---- */
const state = { sector:'all', type:'all', country:null, selected:null, showArcs:false, rotate:true };
const matchSF = it => state.sector==='all' || it.sector===state.sector;
const matchTF = it => state.type==='all'   || it.type===state.type;
const matchCF = it => !state.country       || it.country===state.country;
const visible = () => ITEMS.filter(it => matchSF(it)&&matchTF(it)&&matchCF(it));
const selItem = () => state.selected==null ? null : ITEMS[state.selected];
const hiCountry = () => state.country || (selItem() ? selItem().country : null);
const countBy = (items,key) => { const m={}; items.forEach(it=>m[it[key]]=(m[it[key]]||0)+1); return m; };
const hexA = (hex,a) => { const n=parseInt(hex.slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };
// deal-line color: bright on dark globes, DEEPENED (cap lightness, keep hue) on light globes so lines read.
function _hexRgb(hex){ const n=parseInt(hex.slice(1),16); return [n>>16&255,n>>8&255,n&255]; }
function _rgbHsl(r,g,b){ r/=255;g/=255;b/=255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h,s,l=(mx+mn)/2;
  if(mx===mn){h=s=0;} else { const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn);
    h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4; h/=6; } return [h,s,l]; }
function _hslRgb(h,s,l){ let r,g,b; if(s===0){r=g=b=l;} else { const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
  const f=t=>{ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
  r=f(h+1/3);g=f(h);b=f(h-1/3); } return [Math.round(r*255),Math.round(g*255),Math.round(b*255)]; }
function deepen(hex){ const [h,s,l]=_rgbHsl(..._hexRgb(hex)); const [r,g,b]=_hslRgb(h,Math.min(1,Math.max(s,.72)),Math.min(l,.40)); return `rgb(${r},${g},${b})`; }
function lineColor(hex){ return GT.darkGlobe ? hex : deepen(hex); }   // dark globe: full-opacity bright; light: deepened
const hexRGB = hex => { const n=parseInt(hex.slice(1),16); return `${n>>16&255},${n>>8&255},${n&255}`; };
let _active = new Set(), _domSector = {};

/* ---- sphere math (arc arrows + moon) ---- */
const llToVec = (lat,lng) => { const a=lat*PI/180,b=lng*PI/180,c=Math.cos(a); return [c*Math.cos(b),c*Math.sin(b),Math.sin(a)]; };
const vecToLL = v => { const m=Math.hypot(v[0],v[1],v[2]); return [Math.asin(v[2]/m)*180/PI, Math.atan2(v[1],v[0])*180/PI]; };
function slerp(a,b,t){ let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; d=Math.max(-1,Math.min(1,d));
  const o=Math.acos(d); if(o<1e-5) return a.slice(); const s=Math.sin(o);
  const w1=Math.sin((1-t)*o)/s, w2=Math.sin(t*o)/s; return [a[0]*w1+b[0]*w2,a[1]*w1+b[1]*w2,a[2]*w1+b[2]*w2]; }
function orbitPoint(inc,node,ang){ const I=inc*PI/180,N=node*PI/180,T=ang*PI/180;
  const x=Math.cos(T), y=Math.sin(T)*Math.cos(I), z=Math.sin(T)*Math.sin(I);
  return [Math.asin(z)*180/PI, Math.atan2(x*Math.sin(N)+y*Math.cos(N), x*Math.cos(N)-y*Math.sin(N))*180/PI]; }

/* =========================================================
   GLOBE
========================================================= */
const elGlobe = document.getElementById('globe');
function solidTex(hex){ const c=document.createElement('canvas'); c.width=c.height=4; const x=c.getContext('2d'); x.fillStyle=hex; x.fillRect(0,0,4,4); return c.toDataURL(); }
const globe = Globe()(elGlobe)
  .globeImageUrl(solidTex(GT.ocean))           // ocean color from the current palette
  .backgroundColor('rgba(0,0,0,0)')
  .showAtmosphere(false)                        // CSS halo instead (scattering shader washes orange)
  .showGraticules(true)
  .polygonsData(GEO.features.filter(f => f.properties.ADMIN !== 'Antarctica'))
  .polygonCapColor(capColor).polygonSideColor(sideColor).polygonStrokeColor(strokeColor)
  .polygonAltitude(polyAlt).polygonLabel(polyLabel).polygonsTransitionDuration(420)
  .onPolygonClick(f => { const iso = isoOf(f); if (iso) toggleCountry(iso); })
  // news pins (raised above highlighted territory)
  .pointsData([]).pointLat(d=>d._jlat).pointLng(d=>d._jlng)
  .pointColor(pointColor).pointAltitude(pointAlt).pointRadius(pointRadius)
  .pointResolution(12).pointsMerge(false).pointLabel(pointLabel)
  .onPointClick(d => selectNews(d.id))
  // selection pulse
  .ringsData([]).ringLat(d=>d.lat).ringLng(d=>d.lng)
  .ringColor(d => t => `rgba(${d.rgb},${1-t})`).ringMaxRadius(5)
  .ringPropagationSpeed(2.4).ringRepeatPeriod(780)
  // deal lines as PATHS — we control per-point altitude so arrows ride the EXACT same curve
  .pathsData([]).pathPoints(d=>d._pts).pathPointLat(p=>p[0]).pathPointLng(p=>p[1]).pathPointAlt(p=>p[2])
  .pathColor(d=>lineColor(d.color)).pathStroke(d=>d.stroke)
  .pathDashLength(0.9).pathDashGap(0.06).pathDashInitialGap(d=>d.gap0).pathDashAnimateTime(3000)  // mostly-solid, gentle flow
  .pathLabel(d=>d.label).pathTransitionDuration(0)
  // moon + landmark labels
  .htmlElementsData([]).htmlElement(htmlEl).htmlLat(d=>d.lat).htmlLng(d=>d.lng).htmlAltitude(d=>d.alt)
  .htmlTransitionDuration(0)   // CRITICAL: default 1000ms eased tween made per-frame arrows lag far off the line ("confetti")
  .onGlobeClick(() => { if(state.selected!=null){ state.selected=null; render(); } });

globe.pointOfView({ lat: 24, lng: -42, altitude: 2.6 }, 0);

// Lighting + fix globe diffuse color per palette. globe.gl nulls material.color on texture-load
// (shader then renders garbage), so re-apply the ocean color a few times past that load.
function reapplyOcean(){ const gm=globe.globeMaterial();
  function setColor(){ let src=null;
    globe.scene().traverse(o=>{ if(o.isLight){ if(o.color&&!src) src=o.color;
      if(o.type.indexOf('Directional')>=0) o.intensity = GT.darkGlobe?0.55:0.42;   // directional gives the sphere 3D depth (not flat/bland)
      if(o.type.indexOf('Ambient')>=0)     o.intensity = GT.darkGlobe?1.15:2.35; } });
    if(src){ if(gm.color==null) gm.color=src.clone(); gm.color.set(GT.ocean); gm.needsUpdate=true; } }
  [0,120,300,600,1100,1800,3000].forEach(d => setTimeout(setColor, d));
}
reapplyOcean();

const ctrl = globe.controls();
ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.32; ctrl.enableDamping = true; ctrl.dampingFactor = 0.12;
ctrl.minDistance = 175; ctrl.maxDistance = 700;
['mousedown','touchstart','wheel'].forEach(ev => elGlobe.addEventListener(ev, pauseRotate, {passive:true}));
function pauseRotate(){ if(state.rotate){ state.rotate=false; ctrl.autoRotate=false; syncBtns(); } }

/* ---- polygon styling ---- */
function recomputeGeo(){
  const vis = visible();
  // territory highlight only when something is activated (sector/type/country/news) — overview stays clean
  const anyFilter = state.sector!=='all' || state.type!=='all' || !!state.country || state.selected!=null;
  _active = new Set(anyFilter ? vis.map(it=>it.country) : []);
  _domSector = {};
  const byC = {};
  vis.forEach(it => { (byC[it.country]=byC[it.country]||{})[it.sector]=(byC[it.country][it.sector]||0)+1; });
  for (const iso in byC) _domSector[iso] = Object.entries(byC[iso]).sort((a,b)=>b[1]-a[1])[0][0];
}
let LAND_CAP=GT.landCap, LAND_SIDE=GT.landSide, LAND_STROKE=GT.landStroke;   // set per palette by applyGlobeTheme
// Jeju/Dokdo (_x) are tagged South Korea, so they highlight together with the mainland.
function capColor(f){ const iso=isoOf(f);
  if(iso && _active.has(iso)){ const c=SECTOR_COLORS[_domSector[iso]]||'#ffb454'; return iso===hiCountry()? hexA(c,0.85):hexA(c,0.6); }
  return LAND_CAP; }                                             // near-white land on light ocean
function sideColor(f){ const iso=isoOf(f);
  if(iso && _active.has(iso)) return hexA(SECTOR_COLORS[_domSector[iso]]||'#ffb454', 0.3);
  return LAND_SIDE; }
function strokeColor(f){ const iso=isoOf(f);
  if(iso && _active.has(iso)){ const c=SECTOR_COLORS[_domSector[iso]]||'#ffb454'; return iso===hiCountry()? c:hexA(c,0.85); }
  return LAND_STROKE; }                                          // bold, always-visible coastlines
// keep highlighted territory BELOW the deal lines (LINE_ALT 0.025 / ARROW_ALT 0.028) so arcs ride over it, not under.
function polyAlt(f){ const iso=isoOf(f); if(iso && _active.has(iso)) return iso===hiCountry()? 0.018:0.012; return 0.006; }
function polyLabel(f){ const iso=isoOf(f); if(!iso) return '';
  const vis=visible().filter(it=>it.country===iso); if(!vis.length) return '';
  const top=Object.entries(countBy(vis,'sector')).sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([s,n])=>`<span style="color:${SECTOR_COLORS[s]}">●</span> ${s} ${n}`).join('  ');
  return `<div class="gl-tip country"><div class="t-c">${FLAG[iso]||''} ${KO[iso]||iso} · ${vis.length} SIGNALS</div><div class="t-s">${top}</div></div>`; }

/* ---- points (above territory) ---- */
function pointColor(d){ return state.selected===d.id ? GT.selectedPin : SECTOR_COLORS[d.sector]; }
function pointAlt(d){ return state.selected===d.id ? 0.12 : 0.05; }
function pointRadius(d){ return state.selected===d.id ? 0.65 : 0.26; }
function pointLabel(d){
  return `<div class="gl-tip"><span class="t-tag" style="color:${SECTOR_COLORS[d.sector]}">${d.sector} · ${d.type}</span>`
    + `<span class="t-date">${d.date}</span><div class="t-title">${d.title}</div>`
    + `<div class="t-co">${FLAG[d.country]||''} ${KO[d.country]||d.country}</div></div>`; }

/* ---- arcs: auto-show by filter/selection ---- */
function buildArcs(){
  const sel=selItem(); let src;
  if(state.sector!=='all' || state.country) src = visible();       // filter active -> ONLY its connections
  else if(sel) src = [sel];                                        // single news -> its connections
  else if(state.showArcs) src = ITEMS;                             // overview-all only when nothing filtered
  else src = [];                                                   // clean default
  const out=[];
  src.forEach(it => it.arcs.forEach(a => {
    const dLat=(a.lat-it.lat)*PI/180, dLng=(a.lng-it.lng)*PI/180;          // angular distance -> arc height
    const hav=Math.sin(dLat/2)**2 + Math.cos(it.lat*PI/180)*Math.cos(a.lat*PI/180)*Math.sin(dLng/2)**2;
    const focus=(sel&&sel.id===it.id);
    // CONSTANT altitude great-circle line. globe.gl smooths/resamples paths and distorts a varying
    // altitude curve (so markers drift off it); a constant altitude has nothing to distort -> the
    // arrow at the same constant altitude rides the rendered line exactly.
    const va=llToVec(it.lat,it.lng), vb=llToVec(a.lat,a.lng);
    const pts=[]; for(let k=0;k<=48;k++){ const tt=k/48, [pla,pln]=vecToLL(slerp(va,vb,tt)); pts.push([pla,pln, LINE_ALT]); }
    out.push({ color:SECTOR_COLORS[it.sector], stroke:(focus?2.8:2.2)*(GT.darkGlobe?1:1.12), gap0:(out.length*0.37)%1,
      va, vb, _pts:pts,
      label:`<div class="gl-tip"><div class="t-title">${it.title}</div><div class="t-co">${FLAG[it.country]} → ${FLAG[a.to]} ${KO[a.to]||a.to}</div></div>` }); }));
  return out;
}

/* ---- moon + flying orbs (htmlElements) ---- */
const MOON = { kind:'moon', inc:18, node:35, alt:2.0, lat:0, lng:0, _el:null };
let ARCS = [], ARROWS = [];
function rebuildArrows(){   // arrows only in focused views (sector/country/news) — the all-overview stays line-only
  const allOverview = state.showArcs && state.sector==='all' && !state.country && state.selected==null;
  ARROWS = allOverview ? [] : ARCS.slice(0,40).map((arc,i) => ({ kind:'arrow', arc, color:arc.color, base:(i*0.146)%1,
    lat:0, lng:0, alt:0, _t2:null, _fade:0, _inner:null, _el:null }));
}
function htmlEl(d){
  const el=document.createElement('div'); el.style.pointerEvents='none';
  if(d.kind==='label'){   // plain subtle text, no glowing dot
    el.style.cssText='pointer-events:none;width:0;height:0;transition:opacity .25s';
    el.innerHTML=`<div style="position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;`
      +`font:600 10.5px 'Pretendard Variable',Pretendard,sans-serif;color:rgba(206,219,238,.82);text-shadow:0 1px 3px #000,0 0 2px #000">${d.text}</div>`;
    d._el=el; return el;
  }
  if(d.kind==='arrow'){   // small direction chevron (rotated to flow direction in loop)
    el.style.cssText='pointer-events:none;width:0;height:0;transition:opacity .12s';
    const inner=document.createElement('div'); inner.style.cssText='position:absolute;left:0;top:0;transform:translate(-50%,-50%)';
    const aFill=GT.darkGlobe?d.color:deepen(d.color), aStroke=GT.darkGlobe?'#0a1322':'rgba(255,255,255,.92)';
    inner.innerHTML=`<svg width="15" height="15" viewBox="0 0 14 14" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))">`
      +`<path d="M3 1.8 L12.2 7 L3 12.2 L5.6 7 Z" fill="${aFill}" stroke="${aStroke}" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
    el.appendChild(inner); d._inner=inner; d._el=el; return el;
  }
  if(d.kind==='moon'){
    el.style.cssText='pointer-events:none;width:38px;height:38px;transition:opacity .35s';
    el.innerHTML='<div style="width:34px;height:34px;border-radius:50%;position:relative;'
      +'background:radial-gradient(circle at 36% 32%, #fff8ec 0%, #ece0c8 42%, #cdbb97 74%, #b09a72 100%);'
      +'box-shadow:0 7px 18px rgba(40,55,80,.28), inset -6px -5px 9px rgba(120,100,70,.4)">'
      +'<span style="position:absolute;width:7px;height:7px;border-radius:50%;background:rgba(110,106,98,.55);left:9px;top:8px"></span>'
      +'<span style="position:absolute;width:5px;height:5px;border-radius:50%;background:rgba(110,106,98,.5);left:21px;top:18px"></span>'
      +'<span style="position:absolute;width:3.5px;height:3.5px;border-radius:50%;background:rgba(110,106,98,.45);left:13px;top:23px"></span></div>';
    d._el=el; return el;
  }
  return el;   // (no other element kinds)
}
function behindEarth(d){
  try{ const p=globe.getCoords(d.lat,d.lng,d.alt), c=globe.camera().position;
    const dx=p.x-c.x,dy=p.y-c.y,dz=p.z-c.z, L=Math.hypot(dx,dy,dz);
    const ux=dx/L,uy=dy/L,uz=dz/L, tca=-(c.x*ux+c.y*uy+c.z*uz);
    if(tca<=0) return false;
    const px=c.x+ux*tca,py=c.y+uy*tca,pz=c.z+uz*tca;
    return Math.hypot(px,py,pz) < 99 && tca < L; }catch(e){ return false; }
}

/* =========================================================
   PANELS
========================================================= */
const $ = id => document.getElementById(id);
function renderSectorBars(){
  const base = ITEMS.filter(it => matchTF(it) && matchCF(it));
  const counts = countBy(base,'sector');
  const max = Math.max(1, ...SECTOR_ORDER.map(s => counts[s]||0));
  const wrap = $('sectorBars'); wrap.innerHTML='';
  // full-width "전체 섹터" (reset / select-all)
  const all=document.createElement('div');
  all.className='sec-all'+(state.sector==='all'?' active':'');
  all.innerHTML=`<div class="ai">${ALL_ICON}</div><span class="an">전체 섹터</span><span class="ac">${base.length}</span>`;
  all.onclick=()=>setSector('all'); wrap.appendChild(all);
  // 2-col grid of sector tiles
  SECTOR_ORDER.forEach(s => { const n=counts[s]||0, c=SECTOR_COLORS[s];
    const t=document.createElement('div');
    t.className='sec-tile'+(state.sector===s?' active':'')+(n===0?' dim':''); t.style.setProperty('--c',c);
    t.innerHTML=`<div class="sec-top"><div class="sec-ic">${SEC_ICON[s]}</div><span class="ct">${n}</span></div>`
      +`<div class="sec-name">${s}</div>`
      +`<div class="sec-bar"><i style="width:${n/max*100}%"></i></div>`;
    t.onclick=()=>setSector(state.sector===s?'all':s); wrap.appendChild(t); });
}
function renderTypeChips(){
  const base = ITEMS.filter(it => matchSF(it) && matchCF(it));
  const counts = countBy(base,'type'); const wrap=$('typeChips'); wrap.innerHTML='';
  const all=document.createElement('div'); all.className='chip'+(state.type==='all'?' active':'');
  all.innerHTML=`전체 <span class="ct">${base.length}</span>`; all.onclick=()=>setType('all'); wrap.appendChild(all);
  TYPE_ORDER.forEach(t => { const ch=document.createElement('div'); ch.className='chip'+(state.type===t?' active':'');
    ch.innerHTML=`${TYPE_ICON[t]} ${t} <span class="ct">${counts[t]||0}</span>`;
    ch.onclick=()=>setType(state.type===t?'all':t); wrap.appendChild(ch); });
}
function renderFocus(){
  const wrap=$('focus'), title=$('focusTitle'), iso=hiCountry();
  if(iso){
    title.textContent='국가 포커스 · TARGET ZONE';
    const vis=ITEMS.filter(it=>it.country===iso && matchTF(it));
    const secs=Object.entries(countBy(vis,'sector')).sort((a,b)=>b[1]-a[1]);
    const types=Object.entries(countBy(vis,'type')).sort((a,b)=>b[1]-a[1]);
    // most-recent news per sector for this country
    const feed=secs.map(([s])=>vis.filter(it=>it.sector===s).sort((a,b)=>b._d-a._d||a.id-b.id)[0]).filter(Boolean);
    wrap.innerHTML=`<div class="focus"><div class="fhead"><span class="flag">${FLAG[iso]||'🏳️'}</span>`
      +`<span class="fname">${KO[iso]||iso}<span class="en">${(COUNTRIES[iso]&&COUNTRIES[iso].name)||''}</span></span>`
      +`<span class="fcount">${vis.length}</span></div>`
      +`<div class="frow">섹터 강세</div><div class="mini">`
      +secs.map(([s,n])=>`<span class="m" data-s="${s}" style="--c:${SECTOR_COLORS[s]}"><span class="mi">${SEC_ICON[s]}</span>${s}<span class="ct">${n}</span></span>`).join('')
      +`</div><div class="frow">섹터별 최신 뉴스</div><div class="ffeed">`
      +feed.map(it=>`<div class="ff${state.selected===it.id?' active':''}" data-id="${it.id}" style="--c:${SECTOR_COLORS[it.sector]}">`
        +`<span class="ff-ic">${SEC_ICON[it.sector]}</span><span class="ff-tt">${it.title}</span><span class="ff-dt">${it.date}</span></div>`).join('')
      +`</div><div class="frow">종류</div><div class="mini">`
      +types.map(([t,n])=>`<span class="m" data-t="${t}" style="--c:var(--cyan)"><span class="mi">${TYPE_ICON[t]}</span>${t}<span class="ct">${n}</span></span>`).join('')
      +`</div><div class="clearc">✕ ${KO[iso]||iso} 포커스 해제</div></div>`;
    wrap.querySelectorAll('.m[data-s]').forEach(m=>m.onclick=()=>setSector(m.dataset.s));
    wrap.querySelectorAll('.m[data-t]').forEach(m=>m.onclick=()=>setType(m.dataset.t));
    wrap.querySelectorAll('.ff[data-id]').forEach(f=>f.onclick=()=>selectNews(+f.dataset.id));
    wrap.querySelector('.clearc').onclick=()=>{ state.country=null; state.selected=null; render(); };
  } else {
    title.textContent='국가 순위 · ZONE RANKING';
    const counts=Object.entries(countBy(visible(),'country')).sort((a,b)=>b[1]-a[1]);
    const max=counts.length?counts[0][1]:1;
    wrap.innerHTML=`<div class="focus"><div class="rank">`+counts.map(([iso,n])=>
      `<div class="r" data-iso="${iso}" style="--c:${SECTOR_COLORS[_domSector[iso]]||'#ffb454'}">`
      +`<span class="fl">${FLAG[iso]||''}</span><span class="nm">${KO[iso]||iso}`
      +`<span class="track"><i style="width:${n/max*100}%"></i></span></span><span class="ct">${n}</span></div>`).join('')+`</div></div>`;
    wrap.querySelectorAll('[data-iso]').forEach(r=>r.onclick=()=>toggleCountry(r.dataset.iso));
  }
}
const cardRefs = new Map();
function renderTimeline(){
  const list = SORTED.filter(it => matchSF(it)&&matchTF(it)&&matchCF(it));
  $('tlCount').textContent = list.length;
  const tl=$('timeline'); tl.innerHTML=''; cardRefs.clear();
  if(!list.length){ tl.innerHTML='<div class="empty">NO SIGNALS — 조건에 맞는 뉴스가 없습니다</div>'; return; }
  list.forEach(it => { const c=SECTOR_COLORS[it.sector];
    const card=document.createElement('div'); card.className='card'+(state.selected===it.id?' active':''); card.style.setProperty('--c',c);
    const arcTxt=it.arcs.length?` <span class="a">→ ${it.arcs.map(a=>FLAG[a.to]||a.to).join('')}</span>`:'';
    card.innerHTML=`<div class="card-top"><span class="card-flag">${FLAG[it.country]||''}</span><span class="ci">${SEC_ICON[it.sector]}</span>`
      +`<span class="card-tag">${it.sector} · ${it.type}</span><span class="card-date">${it.date}</span></div>`
      +`<h3>${it.title}</h3><div class="co">${KO[it.country]||it.country}${arcTxt}</div>`
      +`<div class="card-extra"><ul>${it.summary.map(s=>`<li>${s}</li>`).join('')}</ul><div class="card-src">${it.src||''}</div></div>`;
    card.onclick=()=>selectNews(it.id); cardRefs.set(it.id,card); tl.appendChild(card); });
}
function renderActivePills(){
  const wrap=$('tlActive'), pills=[];
  if(state.sector!=='all') pills.push(`<span class="pill" style="border-color:${SECTOR_COLORS[state.sector]}66">SECTOR <b>${state.sector}</b></span>`);
  if(state.type!=='all')   pills.push(`<span class="pill">TYPE <b>${state.type}</b></span>`);
  if(state.country)        pills.push(`<span class="pill">ZONE <b>${FLAG[state.country]||''} ${KO[state.country]||state.country}</b></span>`);
  wrap.innerHTML=pills.join('');
}

/* =========================================================
   ACTIONS
========================================================= */
function setSector(s){ state.sector=s; if(state.selected!=null&&!matchSF(ITEMS[state.selected])) state.selected=null; render(); }
function setType(t){ state.type=t; if(state.selected!=null&&!matchTF(ITEMS[state.selected])) state.selected=null; render(); }
function toggleCountry(iso){ state.country=(state.country===iso)?null:iso;
  if(state.selected!=null&&!matchCF(ITEMS[state.selected])) state.selected=null; render();
  if(state.country){ const c=COUNTRIES[iso]; if(c) flyTo(c.lat,c.lng,1.9); } }
function selectNews(id){ state.selected=(state.selected===id)?null:id; render();
  const it=selItem(); if(it){ flyTo(it.lat,it.lng,1.6); const card=cardRefs.get(id); if(card) card.scrollIntoView({behavior:'smooth',block:'center'}); } }
function flyTo(lat,lng,alt){ state.rotate=false; ctrl.autoRotate=false; syncBtns(); globe.pointOfView({lat,lng,altitude:alt},950); }
function resetAll(){ state.sector='all'; state.type='all'; state.country=null; state.selected=null; state.showArcs=false; render(); flyTo(24,-42,2.6); }

/* =========================================================
   RENDER
========================================================= */
function render(){
  recomputeGeo();
  globe.polygonCapColor(capColor).polygonSideColor(sideColor).polygonStrokeColor(strokeColor).polygonAltitude(polyAlt);
  globe.pointsData(visible());
  const s=selItem();
  globe.ringsData(s ? [{lat:s.lat,lng:s.lng,rgb:hexRGB(SECTOR_COLORS[s.sector])}] : []);
  ARCS = buildArcs(); globe.pathsData(ARCS); rebuildArrows();
  globe.htmlElementsData([MOON, ...LANDMARK_ELS, ...ARROWS]);
  renderSectorBars(); renderTypeChips(); renderFocus(); renderTimeline(); renderActivePills();
  const vis=visible();
  $('hStat').textContent=vis.length; $('hCo').textContent=new Set(vis.map(i=>i.country)).size;
  updateHUD();
}
function fdeg(v,w){ return (v<0?'-':'+')+Math.abs(v).toFixed(1).padStart(w,'0')+'°'; }
function updateHUD(){
  let pov; try{ pov=globe.pointOfView(); }catch(e){ return; }
  $('hudLat').textContent=fdeg(pov.lat,4); $('hudLon').textContent=fdeg(pov.lng,5);
  $('hudTgt').textContent=visible().length;
  $('hudMode').textContent = state.selected!=null ? 'TARGET LOCK' : (state.country ? 'ZONE FOCUS' : (state.sector!=='all'?'SECTOR LINK':'ORBIT VIEW'));
}

/* ---- buttons ---- */
function syncBtns(){ $('btnRotate').classList.toggle('on',state.rotate); $('btnArc').classList.toggle('on',state.showArcs); }
$('btnRotate').onclick=()=>{ state.rotate=!state.rotate; ctrl.autoRotate=state.rotate; syncBtns(); };
$('btnArc').onclick   =()=>{ state.showArcs=!state.showArcs; syncBtns(); render(); };
$('btnReset').onclick =resetAll;
$('tlClear').onclick  =()=>{ state.sector='all'; state.type='all'; state.country=null; render(); };

/* ---- globe color palette switcher ---- */
function applyGlobeTheme(t){
  GT=t;
  LAND_CAP=t.landCap; LAND_SIDE=t.landSide; LAND_STROKE=t.landStroke;
  globe.globeImageUrl(solidTex(t.ocean)); reapplyOcean();
  const c=document.querySelector('.center');
  if(c){ c.style.background=t.cardBg; c.style.setProperty('--halo', t.halo); }
  document.documentElement.style.setProperty('--hud-accent', t.hudAccent);
  document.body.classList.toggle('glb-dark', !!t.darkGlobe);
  const st=$('globeStars'); if(st) st.style.opacity = t.stars?'1':'0';   // starfield only for Tactical Navy
  render();
}
function buildPaletteBar(){ const bar=$('paletteBar'); if(!bar) return; bar.innerHTML='';
  GLOBE_THEMES.forEach((t,i)=>{ const s=document.createElement('button'); s.type='button';
    s.className='sw'+(i===_themeIdx?' active':''); s.style.background=t.swatch; s.title=t.label||t.name;
    s.setAttribute('aria-label', t.label||t.name);
    s.onclick=()=>{ _themeIdx=i; try{localStorage.setItem('globeTheme',i);}catch(e){} applyGlobeTheme(t); buildPaletteBar(); };
    bar.appendChild(s); });
}

/* ---- resize ---- */
function resize(){ const r=elGlobe.getBoundingClientRect(); if(r.width>0&&r.height>0) globe.width(r.width).height(r.height); }
window.addEventListener('resize',resize);
if(window.ResizeObserver) new ResizeObserver(resize).observe(elGlobe);
window.__globe=globe;

/* ---- animation loop: moon + flying orbs + HUD ---- */
let lastA=0,lastHud=0,t0=performance.now();
function loop(now){
  const t=(now-t0)/1000;
  if(now-lastA>40){
    const [mla,mln]=orbitPoint(MOON.inc,MOON.node,t*8); MOON.lat=mla; MOON.lng=mln; MOON.alt=2.0;
    ARROWS.forEach(ar=>{ const tt=(ar.base + t*0.25)%1, tt2=Math.min(1,tt+0.03);   // ~4s/pass
      const [la,ln]=vecToLL(slerp(ar.arc.va,ar.arc.vb,tt)); ar.lat=la; ar.lng=ln; ar.alt=ARROW_ALT;
      const [la2,ln2]=vecToLL(slerp(ar.arc.va,ar.arc.vb,tt2)); ar._t2=[la2,ln2,ARROW_ALT];
      ar._fade=Math.max(0,Math.min(1, tt/0.08, (1-tt)/0.08)); });
    globe.htmlElementsData([MOON, ...LANDMARK_ELS, ...ARROWS]);
    if(MOON._el) MOON._el.style.opacity=behindEarth(MOON)?'0':'1';
    LANDMARK_ELS.forEach(d=>{ if(d._el) d._el.style.opacity=behindEarth(d)?'0':'1'; });
    ARROWS.forEach(ar=>{ if(!ar._el) return; const back=behindEarth(ar);
      ar._el.style.opacity = back ? '0' : String(ar._fade);
      if(!back && ar._inner){ const s1=globe.getScreenCoords(ar.lat,ar.lng,ar.alt), s2=globe.getScreenCoords(ar._t2[0],ar._t2[1],ar._t2[2]);
        if(s1&&s2) ar._inner.style.transform='translate(-50%,-50%) rotate('+(Math.atan2(s2.y-s1.y,s2.x-s1.x)*180/PI)+'deg)'; } });
    lastA=now;
  }
  if(now-lastHud>200){ updateHUD(); lastHud=now; }
  requestAnimationFrame(loop);
}

/* ---- go ---- */
try{const _ti=+localStorage.getItem('globeTheme'); if(_ti>=0&&_ti<GLOBE_THEMES.length) _themeIdx=_ti;}catch(e){}
syncBtns(); buildPaletteBar(); applyGlobeTheme(GLOBE_THEMES[_themeIdx]); resize();
requestAnimationFrame(resize); setTimeout(resize,150); setTimeout(resize,500);
requestAnimationFrame(loop);
})();
