// The launch checks' rules (launch-lib.mjs) on made-up requests, plus
// wf:redirects map and test end to end against two local servers standing
// in for an old site and its Webflow replacement. No browser and no
// outside network. Run by `pnpm test` with node --test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  classify, analyzeTracking, detectServices, clickIdTries, keptQuery, bannerOf,
  registrable, rdapSummary, dnsHostName, renewalWarnings, robotsBlocksAll,
  normPath, matchPages, parseCsv, webflowCsv, parseUrlList, followHops, judgeHops,
} from '../.claude/skills/webflow-build/scripts/launch-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = path.join(root, '.claude/skills/webflow-build/scripts');

// ---- tracking

const ga4 = (en, extra = '') => classify(`https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST123&en=${en}${extra}`);

test('classify: GA4 hits with batched events and consent mode', () => {
  const hit = classify('https://www.google-analytics.com/g/collect?v=2&tid=G-TEST123&en=page_view&gcs=G100', 'en=scroll\nen=click');
  assert.equal(hit.tag, 'ga4');
  assert.equal(hit.kind, 'hit');
  assert.equal(hit.id, 'G-TEST123');
  assert.deepEqual(hit.events, ['page_view', 'scroll', 'click']);
  assert.equal(hit.consentMode, true);
  assert.equal(hit.denied, true); // analytics storage denied: a cookieless ping
  assert.deepEqual(classify('https://www.googletagmanager.com/gtm.js?id=GTM-ABC1'), { tag: 'gtm', kind: 'lib', id: 'GTM-ABC1' });
  assert.equal(classify('https://www.googleadservices.com/pagead/conversion/123456/?label=x').id, 'AW-123456');
  assert.equal(classify('https://www.facebook.com/tr/?id=999&ev=PageView').events[0], 'PageView');
  assert.equal(classify('https://cdn.example.com/app.js'), null);
});

test('analyzeTracking: a tag missing on a page, page views counted twice', () => {
  const pages = [
    { path: '/', tags: [ga4('page_view'), ga4('page_view')] },
    { path: '/about', tags: [ga4('page_view')] },
    { path: '/contact', tags: [] },
  ];
  const { issues, info } = analyzeTracking({ pages, staging: false });
  const text = issues.map((i) => i.text);
  assert.ok(text.some((t) => /Google Analytics 4 doesn't load on 1 of 3 pages/.test(t)));
  const twice = issues.find((i) => /counts each page view twice/.test(i.text));
  assert.deepEqual(twice.pages, ['/']);
  assert.equal(twice.soft, false);
  assert.deepEqual(info.tags, [{ tag: 'ga4', name: 'Google Analytics 4', ids: ['G-TEST123'], pages: 2, of: 3 }]);
  assert.equal(info.blocked, 3);
});

test('analyzeTracking: tracking before the cookie choice and after Reject fails; consent mode is noted', () => {
  const pages = [{ path: '/', tags: [ga4('page_view')] }];
  const consent = { first: [ga4('page_view')], afterReject: [ga4('page_view')], afterAccept: [ga4('page_view')], acceptedPages: [], buttons: { accept: 'Accept', reject: null }, banner: 'Cookiebot' };
  const { issues } = analyzeTracking({ pages, consent });
  const hard = issues.filter((i) => !i.soft).map((i) => i.text);
  assert.ok(hard.includes('Google Analytics 4 tracks visitors before they make a cookie choice'));
  assert.ok(hard.includes('Google Analytics 4 still tracks visitors after they reject cookies'));
  const soft = issues.filter((i) => i.soft).map((i) => i.text);
  assert.ok(soft.includes('The cookie banner has no Reject button on its first screen'));
  assert.ok(soft.includes('Google tags don\'t use consent mode'));
});

test('analyzeTracking: a denied consent-mode ping is not tracking', () => {
  const denied = ga4('page_view', '&gcs=G100');
  const { issues } = analyzeTracking({ pages: [{ path: '/', tags: [denied] }], consent: { first: [denied], afterReject: [denied], afterAccept: [ga4('page_view', '&gcs=G111')], acceptedPages: [], buttons: { accept: 'Accept', reject: 'Reject' }, banner: 'Cookiebot' } });
  assert.deepEqual(issues.filter((i) => !i.soft), []);
});

test('analyzeTracking: staging sending visits, and gclid dropped by a redirect', () => {
  const ads = classify('https://www.googleadservices.com/pagead/conversion/123/?x=1');
  const { issues } = analyzeTracking({ pages: [{ path: '/', tags: [ga4('page_view'), ads] }], staging: true, redirects: [{ from: 'http://example.com/', to: 'https://example.com/', kept: false }] });
  assert.ok(issues.some((i) => i.soft && /^Staging sends visits to Google Analytics 4, Google Ads/.test(i.text)));
  // With Google Ads on the site, a lost gclid loses conversions: a finding.
  assert.equal(issues.find((i) => /drop gclid/.test(i.text)).soft, false);
});

test('clickIdTries, keptQuery, bannerOf, detectServices', () => {
  const tries = clickIdTries('https://www.example.com', '/about');
  assert.equal(tries.length, 3);
  assert.ok(tries[0].startsWith('http://www.example.com/?gclid='));
  assert.ok(tries[1].startsWith('https://example.com/?'));
  assert.ok(tries[2].startsWith('https://www.example.com/about/?'));
  assert.ok(keptQuery(tries[0].replace('http:', 'https:')));
  assert.ok(!keptQuery('https://www.example.com/'));
  assert.equal(bannerOf(['https://consent.cookiebot.com/uc.js']), 'Cookiebot');
  assert.deepEqual(detectServices([{ path: '/', urls: ['https://fonts.googleapis.com/css2?family=X', 'https://assets.calendly.com/assets/external/widget.js'] }, { path: '/a', urls: ['https://fonts.gstatic.com/s/x.woff2'] }]),
    [{ name: 'Calendly', kind: 'Booking', pages: 1 }, { name: 'Google Fonts', kind: 'Fonts', pages: 2 }]);
});

// ---- domain

test('registrable, rdapSummary, dnsHostName', () => {
  assert.equal(registrable('www.example.com'), 'example.com');
  assert.equal(registrable('shop.example.co.uk'), 'example.co.uk');
  assert.deepEqual(rdapSummary({
    events: [{ eventAction: 'registration', eventDate: '2010-01-01T00:00:00Z' }, { eventAction: 'expiration', eventDate: '2027-03-04T12:00:00Z' }],
    entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'Example Registrar']]] }],
  }), { expires: '2027-03-04', registrar: 'Example Registrar' });
  assert.deepEqual(rdapSummary({}), { expires: null, registrar: null });
  assert.equal(dnsHostName(['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com']), 'Cloudflare');
  assert.equal(dnsHostName(['ns1.unknown.example']), null);
});

test('renewalWarnings: self-renewing certificates warn late, others a month ahead', () => {
  const today = '2026-10-30';
  assert.deepEqual(renewalWarnings({ ssl: { expires: '2026-11-20', issuer: 'Let\'s Encrypt' } }, today), []);
  assert.deepEqual(renewalWarnings({ ssl: { expires: '2026-11-03', issuer: 'Let\'s Encrypt' } }, today), [{ what: 'ssl', expires: '2026-11-03', days: 4, auto: true }]);
  assert.equal(renewalWarnings({ ssl: { expires: '2026-11-20', issuer: 'Some CA' } }, today)[0].days, 21);
  assert.deepEqual(renewalWarnings({ domain: { expires: '2026-10-01' } }, today), [{ what: 'domain', expires: '2026-10-01', days: -29 }]);
  assert.deepEqual(renewalWarnings({ domain: { expires: '2027-10-01' } }, today), []);
});

test('robotsBlocksAll', () => {
  assert.equal(robotsBlocksAll('User-agent: *\nDisallow: /'), true);
  assert.equal(robotsBlocksAll('User-agent: *\nDisallow: /admin\n'), false);
  assert.equal(robotsBlocksAll('User-agent: BadBot\nDisallow: /\n\nUser-agent: *\nDisallow:'), false);
  assert.equal(robotsBlocksAll('User-agent: Googlebot\nUser-agent: *\nDisallow: / # all'), true);
});

// ---- redirects

test('normPath and matchPages', () => {
  assert.equal(normPath('https://old.example/About/index.html?x=1'), '/About');
  assert.equal(normPath('/blog/'), '/blog');
  const newPages = [{ path: '/', title: 'Home' }, { path: '/about-us', title: 'About us' }, { path: '/services/web-design', title: 'Web design' }, { path: '/services', title: 'Services' }, { path: '/work/case-studies', title: 'Case studies' }];
  const rows = matchPages([
    { path: '/services/web-design', title: '' },
    { path: '/about', title: 'About | Brand' },
    { path: '/old/case-studies', title: '' },
    { path: '/services/printing', title: 'Printing | Brand' },
    { path: '/our-team', title: 'Meet the team | Brand' },
    { path: '/promo', title: '' },
  ], newPages, { '/promo': '/services' });
  const by = Object.fromEntries(rows.map((r) => [r.from, r]));
  assert.deepEqual([by['/services/web-design'].how, by['/services/web-design'].to], ['same', '/services/web-design']);
  assert.deepEqual([by['/about'].how, by['/about'].to, by['/about'].sure], ['similar', '/about-us', true]);
  assert.deepEqual([by['/old/case-studies'].how, by['/old/case-studies'].to], ['slug', '/work/case-studies']);
  assert.deepEqual([by['/services/printing'].how, by['/services/printing'].to, by['/services/printing'].sure], ['parent', '/services', false]);
  assert.deepEqual([by['/our-team'].how, by['/our-team'].to, by['/our-team'].sure], ['home', '/', false]);
  assert.deepEqual([by['/promo'].how, by['/promo'].to], ['kept', '/services']);
});

test('webflowCsv merges Webflow\'s export and leaves out unchanged paths', () => {
  const existing = 'source,target\r\n/legacy,/\r\n/about,/old-about\r\n';
  const out = webflowCsv([{ from: '/about', to: '/about-us' }, { from: '/same', to: '/same' }, { from: '/a,b', to: '/c' }], existing);
  assert.equal(out, 'source,target\r\n/legacy,/\r\n/about,/about-us\r\n"/a,b",/c\r\n');
  assert.deepEqual(parseCsv(out).slice(1), [['/legacy', '/'], ['/about', '/about-us'], ['/a,b', '/c']]);
  assert.equal(webflowCsv([{ from: '/x', to: '/y' }]), '/x,/y\r\n');
});

test('parseUrlList takes URLs or paths, one per line or the first URL cell', () => {
  assert.deepEqual(parseUrlList('URL,Clicks\nhttps://old.example/a#x,12\n/b\n\tnot a url\n/b', 'https://new.example'),
    ['https://old.example/a', 'https://new.example/b']);
});

test('judgeHops names each problem', () => {
  const site = 'www.example.com';
  const u = (p) => 'https://www.example.com' + p;
  const j = (hops, to = null) => judgeHops(hops.map(([status, p]) => ({ status, url: p.startsWith('http') ? p : u(p) })), { site, to });
  assert.equal(j([[301, '/old'], [200, '/new']], '/new'), null);
  assert.equal(j([[301, 'http://example.com/old'], [301, '/old'], [200, '/old']], '/old'), null); // https and www only
  assert.equal(j([[0, '/old']], '/new'), 'error');
  assert.equal(j([[404, '/old']], '/new'), 'missing');
  assert.equal(j([[200, '/old']], '/new'), 'none');
  assert.equal(j([[301, '/old'], [404, '/new']], '/new'), 'dead-end');
  assert.equal(j([[301, '/old'], [200, 'https://elsewhere.example/']], '/new'), 'offsite');
  assert.equal(j([[301, '/old'], [200, '/other']], '/new'), 'wrong');
  assert.equal(j([[301, '/keep'], [200, '/other']], '/keep'), 'moved');
  assert.equal(j([[301, '/old'], [200, '/']]), 'home');
  assert.equal(j([[302, '/old'], [200, '/new']], '/new'), 'temporary');
  assert.equal(j([[301, '/old'], [301, '/a'], [200, '/new']], '/new'), 'chain');
  assert.equal(j([[301, '/a'], [301, '/b'], [301, '/a'], [301, '/b'], [301, '/a'], [301, '/b'], [301, '/a']], '/new'), 'loop');
});

// ---- wf:redirects end to end

const run = promisify(execFile);
const script = (dir, ...argv) => run(process.execPath, [path.join(scripts, 'redirects.mjs'), ...argv], { cwd: dir }).then(
  (r) => ({ code: 0, out: r.stdout }), (e) => ({ code: e.code, out: e.stdout + e.stderr }));
function serve(routes) {
  const server = http.createServer((req, res) => {
    const r = routes[req.url.split('?')[0]];
    if (!r) { res.writeHead(404); return res.end('not found'); }
    if (r.to) { res.writeHead(r.status ?? 301, { location: r.to }); return res.end(); }
    res.writeHead(200, { 'content-type': r.xml ? 'application/xml' : 'text/html' });
    res.end(r.xml ?? `<html><head><title>${r.title} | Brand</title></head><body>${(r.links ?? []).map((l) => `<a href="${l}">x</a>`).join('')}</body></html>`);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
const origin = (s) => `http://127.0.0.1:${s.address().port}`;
const sitemap = (paths) => ({ xml: `<urlset>${paths.map((p) => `<url><loc>https://www.example.com${p}</loc></url>`).join('')}</urlset>` });

test('wf:redirects map writes the Webflow import file and keeps edits; test reports each problem', async () => {
  const oldSite = await serve({
    '/sitemap.xml': sitemap(['/', '/about', '/services/web-design', '/our-team']),
    '/': { title: 'Home' }, '/about': { title: 'About' }, '/services/web-design': { title: 'Web design' }, '/our-team': { title: 'Meet the team' },
  });
  const newSite = await serve({
    '/': { title: 'Home', links: ['/about-us', '/services/web-design', '/contact'] },
    '/about-us': { title: 'About us' }, '/services/web-design': { title: 'Web design' }, '/contact': { title: 'Contact' },
    // The redirects as Webflow would serve them after the import.
    '/about': { to: '/about-us' },
    '/our-team': { to: '/', status: 302 },
    '/old-a': { to: '/gone' },
    '/old-b': { to: '/x' }, '/x': { to: '/y' }, '/y': { to: '/contact' },
    '/old-c': { to: '/contact' },
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-redirects-'));
  try {
    fs.writeFileSync(path.join(dir, 'webflow-build.config.json'), JSON.stringify({ stagingUrl: origin(newSite), repoDir: root, redirects: { oldUrl: origin(oldSite) } }));
    fs.mkdirSync(path.join(dir, 'docs/seo'), { recursive: true });
    // A row a person added by hand stays through a re-run.
    fs.writeFileSync(path.join(dir, 'docs/seo/redirects.csv'), '/old-a,/contact\r\n');

    const map = await script(dir, 'map');
    assert.equal(map.code, 0, map.out);
    assert.match(map.out, /needs a look \(1\)/);
    assert.match(map.out, /\/our-team → \/ {2}\(home/);
    assert.equal(fs.readFileSync(path.join(dir, 'docs/seo/redirects.csv'), 'utf8'), '/about,/about-us\r\n/our-team,/\r\n/old-a,/contact\r\n');
    assert.ok(fs.existsSync(path.join(dir, '.webflow-build/redirects/review.csv')));

    fs.appendFileSync(path.join(dir, 'docs/seo/redirects.csv'), '/old-b,/contact\r\n/old-c,/about-us\r\n/blog/(.*),/news/%1\r\n');
    const t = await script(dir, 'test');
    assert.equal(t.code, 1, t.out);
    assert.match(t.out, /redirects: 5 URLs/); // the pattern row is not tested
    assert.match(t.out, /dead-end +\/old-a/);
    assert.match(t.out, /chain +\/old-b/);
    assert.match(t.out, /wrong +\/old-c/);
    assert.match(t.out, /temporary +\/our-team/);
    assert.doesNotMatch(t.out, /^ +\w+ +\/about /m);
    assert.match(t.out, /4 problems/);

    fs.writeFileSync(path.join(dir, 'urls.txt'), `${origin(newSite)}/about\n/never-existed\n/our-team\n`);
    const list = await script(dir, 'test', '--file', 'urls.txt');
    assert.match(list.out, /missing +\/never-existed/);
    assert.match(list.out, /2 problems/);
  } finally {
    oldSite.close(); newSite.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('followHops stops at the first answer that isn\'t a redirect', async () => {
  const answers = { 'https://a.example/1': [301, '/2'], 'https://a.example/2': [308, 'https://b.example/3'], 'https://b.example/3': [200, null] };
  const fake = async (url) => ({ status: answers[url][0], headers: new Headers(answers[url][1] ? { location: answers[url][1] } : {}) });
  assert.deepEqual(await followHops('https://a.example/1', fake), [{ status: 301, url: 'https://a.example/1' }, { status: 308, url: 'https://a.example/2' }, { status: 200, url: 'https://b.example/3' }]);
});
