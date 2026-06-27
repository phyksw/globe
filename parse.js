// Parse news_raw.html -> news_parsed.json
const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('news_raw.html', 'utf8');
const $ = cheerio.load(html);

const items = [];
$('.news-grid .news-item').each((i, el) => {
  const $el = $(el);
  const sector = $el.attr('data-sector') || '';
  const type = $el.attr('data-type') || '';
  const style = $el.attr('style') || '';
  const colorMatch = style.match(/--nc:var\(--([a-z-]+)\)/);
  const color = colorMatch ? colorMatch[1] : 'mango';

  const tagText = $el.find('.news-tag').first().text().trim(); // "⚖️ 자율주행 · 화제"
  const icon = tagText.split(' ')[0] || '';
  const date = $el.find('.news-date').first().text().trim();
  const title = $el.find('.news-head').first().text().trim();

  // first ul.news-bullets = summary; .news-deep ul = deep
  const summary = [];
  $el.find('.news-extra > .news-bullets > li').each((j, li) => summary.push($(li).text().trim()));
  // fallback: some may nest differently
  if (summary.length === 0) {
    $el.find('.news-bullets').first().find('li').each((j, li) => summary.push($(li).text().trim()));
  }
  const deep = [];
  $el.find('.news-deep .news-bullets li').each((j, li) => deep.push($(li).text().trim()));

  const src = $el.find('.news-src').first().text().trim();

  items.push({ id: i, sector, type, color, icon, date, title, summary, deep, src });
});

fs.writeFileSync('news_parsed.json', JSON.stringify(items, null, 2), 'utf8');
console.log('parsed items:', items.length);
console.log('sample:', JSON.stringify(items[0], null, 2));
console.log('empty summaries:', items.filter(x => x.summary.length === 0).length);
console.log('empty titles:', items.filter(x => !x.title).length);
