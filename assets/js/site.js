/* Yakında Kurye — site tarafı */
(function () {
  'use strict';
  const PAGE = document.body.dataset.page || 'home';
  // Eski tek sayfalık sitenin #bağlantıları (ör. index.html#kurye-basvuru) yeni sayfalara gider
  if (PAGE === 'home' && location.hash) {
    const eski = { isletmeler: 'isletmeler.html', hizmetler: 'isletmeler.html#hizmetler', 'isletme-avantaj': 'isletmeler.html#isletme-avantaj', cozumler: 'isletmeler.html#cozumler', 'nasil-calisir': 'isletmeler.html#nasil-calisir', bolgeler: 'isletmeler.html#bolgeler', sss: 'isletmeler.html#sss',
      kuryeler: 'kuryeler.html', 'kurye-ol': 'kuryeler.html#kurye-ol', 'kurye-sartlar': 'kuryeler.html#kurye-sartlar', kazanc: 'kuryeler.html#kazanc',
      'isletme-basvuru': 'basvuru.html#isletme-basvuru', 'kurye-basvuru': 'basvuru.html#kurye-basvuru', iletisim: 'basvuru.html#iletisim' }[location.hash.slice(1)];
    if (eski) { location.replace(eski.replace(/(#|$)/, location.search + '$1')); return; }
  }
  const C = YK.getContent();
  const FORMS = YK.getForms(C);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = YK.esc;
  const nl = s => esc(s).replace(/\n/g, '<br>');
  const paras = s => String(s || '').split(/\n{2,}/).map(p => '<p>' + nl(p.trim()) + '</p>').join('');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = C.settings, TX = C.texts;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const fill = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; return el; };
  // Blog yazıları alt klasörde: içerikteki görsel yolları site köküne göre düzeltilir
  const ROOT = document.body.dataset.root || '';
  const src = u => (ROOT && typeof u === 'string' && u && !/^(https?:|data:|media:|blob:|\/)/.test(u)) ? ROOT + u : u;
  const FORM_URL = k => (PAGE === 'basvuru' ? '' : ROOT + 'basvuru.html') + '#' + k + '-basvuru';

  /* ---------- Blog: yazılar panelden yönetilir, sayfalar içerikten çizilir ---------- */
  const BLOG = C.sections.blog === false ? [] : YK.blogList(C);
  let post = null;
  if (PAGE === 'yazi') {
    const slug = new URLSearchParams(location.search).get('s') || document.body.dataset.slug || decodeURIComponent(location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    // Önizlemede (panelden) taslak yazılar da açılabilir
    post = BLOG.find(p => p.slug === slug) || (YK.isPreview() && (C.blog || []).find(p => p && p.slug === slug && p.baslik)) || null;
    const kap = $('#yaziKap');
    if (post) {
      kap.innerHTML = YK.blogArticle(post, C, ROOT);
      document.title = post.seo_title || post.baslik + ' | Yakında Kurye';
      setMeta('name', 'description', post.seo_desc || post.ozet || '');
      setMeta('property', 'article:published_time', post.tarih);
      setMeta('property', 'article:modified_time', post.guncelleme || post.tarih);
      setMeta('property', 'article:section', YK.BLOG_KAT[post.kategori] || '');
      document.body.dataset.path = YK.blogUrl(post, '');
      if (post.gorsel && !/^(media|data):/.test(post.gorsel)) document.body.dataset.img = post.gorsel;
    } else {
      kap.innerHTML = '<div class="container narrow yazi-yok"><h1>Yazı bulunamadı</h1><p>Aradığınız yazı yayından kaldırılmış ya da adresi değişmiş olabilir.</p><a href="' + ROOT + 'blog.html" class="btn btn-k">Tüm yazılar</a></div>';
      document.title = 'Yazı bulunamadı | Yakında Kurye';
    }
  }
  $$('[data-blog]').forEach(box => {
    const t = box.dataset.blog, list = (t === 'tum' || t === 'son' ? BLOG : BLOG.filter(p => p.kategori === t)).slice(0, t === 'tum' ? BLOG.length : 3);
    if (list.length) box.innerHTML = list.map(p => YK.blogCard(p, ROOT, t === 'tum' ? 'h2' : 'h3')).join('');
    else if (t === 'tum') box.innerHTML = '<p class="blog-bos">Henüz yayınlanmış yazı yok.</p>';
    else { const sec = box.closest('section'); if (sec) sec.remove(); }
  });
  $$('[data-bimg]').forEach(im => YK.setImg(im, im.dataset.bimg));

  /* ---------- Metinler, görseller, ayarlar ---------- */
  $$('[data-t]').forEach(el => { const v = TX[el.dataset.t] || ''; el.innerHTML = el.dataset.t === 'about_text' ? paras(v) : nl(v); });
  $$('[data-s]').forEach(el => { el.textContent = S[el.dataset.s] || ''; });
  $$('[data-img]').forEach(el => { el.decoding = 'async'; YK.setImg(el, src(C.images[el.dataset.img])); });

  const tel = 'tel:' + (S.phone || '').replace(/[^\d+]/g, '');
  const waNum = YK.waNumber(S.whatsapp);
  const wa = 'https://wa.me/' + waNum;
  $$('[data-href]').forEach(a => {
    const t = a.dataset.href;
    a.href = t === 'tel' ? tel : t === 'mail' ? 'mailto:' + (S.email || '') : wa;
    if ((t === 'wa' && !waNum) || (t === 'tel' && !S.phone) || (t === 'mail' && !S.email)) a.hidden = true;
  });
  if (!TX.top_note) $('#topbar').hidden = true;
  if (YK.isPreview()) {
    const pv = document.createElement('div'); pv.className = 'preview-bar';
    pv.innerHTML = '<b>Önizleme</b> Panelde kaydedilen, henüz yayınlanmamış içerik gösteriliyor. <a href="' + location.pathname + '">Yayındaki siteyi gör</a>';
    document.body.appendChild(pv);
  }

  /* ---------- Listeler ---------- */
  const card = (x, cls) => '<div class="' + (cls || 'card svc') + '"><span class="ic-box">' + YK.icon(x.icon) + '</span><div><h3>' + esc(x.title) + '</h3><p>' + nl(x.desc) + '</p></div></div>';

  const mq = C.marquee.filter(Boolean);
  const mqItems = mq.map(m => '<span>' + esc(m) + '</span><i>' + YK.icon('motor') + '</i>').join('');
  fill('marquee', '<div class="mq-set">' + mqItems + '</div><div class="mq-set">' + mqItems + '</div>');

  fill('stats', C.stats.map(s => '<div class="stat"><b data-count="' + esc(s.value) + '">' + esc(s.value) + '</b><span>' + esc(s.label) + '</span></div>').join(''));
  fill('values', C.values.map(x => card(x, 'card value')).join(''));
  fill('services', C.services.map(x => card(x)).join(''));
  fill('businessBenefits', C.businessBenefits.map(x => card(x, 'benefit')).join(''));
  fill('bizModels', C.bizModels.map(m => '<div class="bizmodel' + (m.tag ? ' featured' : '') + '">' + (m.tag ? '<span class="tag">' + esc(m.tag) + '</span>' : '') + '<span class="ic-box">' + YK.icon(m.icon) + '</span><h3>' + esc(m.title) + '</h3><p>' + nl(m.desc) + '</p><a href="' + FORM_URL('isletme') + '" class="bm-link" data-sec="bizForm">Teklif iste ' + YK.icon('ok') + '</a></div>').join(''));
  fill('sectors', C.sectors.filter(s => s && s.title).map(s => '<div class="sector">' + YK.icon(s.icon) + '<span>' + esc(s.title) + '</span></div>').join(''));
  fill('bizSteps', C.bizSteps.map((s, i) => '<li><span class="num">' + (i + 1) + '</span><h4>' + esc(s.title) + '</h4><p>' + nl(s.desc) + '</p></li>').join(''));
  fill('courierBenefits', C.courierBenefits.map(x => card(x, 'benefit')).join(''));
  fill('requirements', C.requirements.filter(Boolean).map(r => '<li>' + YK.icon('check') + '<span>' + esc(r) + '</span></li>').join(''));
  fill('workModels', C.workModels.map(m =>
    '<div class="model' + (m.tag ? ' featured' : '') + '">' + (m.tag ? '<span class="tag">' + esc(m.tag) + '</span>' : '') +
    '<h4>' + esc(m.title) + '</h4><div class="hours">' + YK.icon('saat') + esc(m.hours) + '</div><p>' + nl(m.desc) + '</p></div>').join(''));
  fill('steps', C.steps.map((s, i) => '<li><span class="num">' + (i + 1) + '</span><h4>' + esc(s.title) + '</h4><p>' + nl(s.desc) + '</p></li>').join(''));

  const stars = n => { n = Math.max(0, Math.min(5, parseInt(n, 10) || 5)); let h = ''; for (let i = 0; i < 5; i++) h += '<i class="' + (i < n ? 'on' : '') + '">★</i>'; return h; };
  const testis = C.testimonials.filter(t => t && t.text);
  fill('testimonials', testis.map((t, i) => '<figure class="testi ' + (t.type === 'kurye' ? 't-cour' : 't-biz') + '"><span class="t-type">' + YK.icon(t.type === 'kurye' ? 'motor' : 'magaza') + (t.type === 'kurye' ? 'Kurye' : 'İşletme') + '</span><span class="q">' + YK.icon('tirnak') + '</span><div class="stars" aria-label="' + (parseInt(t.rating, 10) || 5) + ' yıldız">' + stars(t.rating) + '</div><blockquote>' + nl(t.text) + '</blockquote><figcaption><span class="t-av">' + (t.photo ? '<img data-tp="' + i + '" alt="">' : esc((t.name || '?').trim().charAt(0).toLocaleUpperCase('tr-TR'))) + '</span><span><b>' + esc(t.name) + '</b><small>' + esc(t.role || '') + '</small></span></figcaption></figure>').join(''));
  $$('[data-tp]').forEach(im => YK.setImg(im, src(testis[im.dataset.tp].photo)));

  const regions = C.regions.filter(Boolean);
  fill('regions', regions.map(r => '<span class="region">' + YK.icon('konum') + esc(r) + '</span>').join(''));

  C.gallery = C.gallery.filter(g => g && g.src);
  fill('gallery', C.gallery.map((g, i) => '<button class="g-item" data-i="' + i + '" aria-label="' + esc(g.title || 'Görsel') + ' – büyüt"><img alt="' + esc(g.title || 'Yakında Kurye') + '" loading="lazy" decoding="async"><span>' + esc(g.title) + '</span></button>').join(''));
  $$('#gallery .g-item').forEach(b => YK.setImg($('img', b), src(C.gallery[b.dataset.i].src)));

  // SSS: her sayfa kendi kitlesinin sorularını gösterir (kategorisiz sorular her yerde)
  const faqBox = $('#faq'), faqCat = faqBox ? faqBox.dataset.cat : '';
  const faqs = C.faq.filter(f => f && f.q && (!faqCat || !f.cat || f.cat === 'genel' || f.cat === faqCat));
  fill('faq', faqs.map(f => '<details class="faq-item"><summary>' + esc(f.q) + '<span class="pm"></span></summary><div class="faq-a">' + nl(f.a) + '</div></details>').join(''));
  $$('.faq-item').forEach(d => d.addEventListener('toggle', () => { if (d.open) $$('.faq-item').forEach(o => { if (o !== d && o.parentNode === d.parentNode) o.open = false; }); }));

  // Ana sayfa kartları: kitlenin öne çıkan avantajları
  const kk = list => list.slice(0, 3).map(x => '<li>' + YK.icon('check') + '<span>' + esc(x.title) + '</span></li>').join('');
  fill('kkBiz', kk(C.businessBenefits)); fill('kkCour', kk(C.courierBenefits));

  const soc = ['instagram', 'facebook', 'linkedin'].filter(k => /^https?:\/\//.test(S[k] || ''));
  fill('socials', soc.map(k => '<a href="' + esc(S[k]) + '" target="_blank" rel="noopener" aria-label="' + k + '">' + YK.icon(k) + '</a>').join(''));

  const mapBox = $('#mapBox');
  if (mapBox) {
    const mm = (S.map_embed || '').match(/src="([^"]+)"/);
    const mapSrc = mm ? mm[1] : (S.map_embed || '');
    if (/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(mapSrc)) mapBox.innerHTML = '<iframe src="' + esc(mapSrc) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Yakında Kurye konum haritası"></iframe>';
    else { mapBox.innerHTML = '<img alt="Yakında Kurye şubesi" loading="lazy">'; YK.setImg($('img', mapBox), src(C.images.contact)); }
  }
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
  $$('[data-icon]').forEach(el => { el.innerHTML = YK.icon(el.dataset.icon); });

  /* ---------- Bölüm görünürlüğü ---------- */
  const hidden = {};
  Object.keys(C.sections).forEach(k => { if (C.sections[k] === false) hidden[k] = true; });
  if (!mq.length) hidden.marquee = true;
  if (!testis.length) hidden.testimonials = true;
  if (!regions.length) hidden.regions = true;
  if (!C.stats.length) hidden.stats = true;
  if (!faqs.length) hidden.faq = true;
  if (!C.gallery.some(g => g && g.src)) hidden.refs = true;
  if (!(Number(C.calc.perPackage) > 0)) hidden.calc = true;
  if (!BLOG.length) hidden.blog = true;
  if (['services', 'business', 'bizSolutions', 'bizSteps', 'bizForm'].every(k => hidden[k])) hidden.zoneBiz = true;
  if (['courier', 'calc', 'courForm'].every(k => hidden[k])) hidden.zoneCour = true;
  $$('[data-section]').forEach(el => { if (hidden[el.dataset.section]) el.remove(); });
  $$('[data-sec]').forEach(a => { if (hidden[a.dataset.sec]) a.remove(); });
  if (hidden.stats && hidden.marquee) { const ch = $$('.checker')[0]; if (ch) ch.remove(); }
  const mCta0 = $('#mCta'); if (mCta0 && !mCta0.querySelector('a')) mCta0.remove();

  /* ---------- Sayfa etkileşimleri ---------- */
  // Başvuru sayfası: işletme talebi / kurye başvurusu sekmeleri
  const bvTabs = $$('#bvTabs button');
  if (bvTabs.length) {
    const ids = { isletme: 'isletme-basvuru', kurye: 'kurye-basvuru' };
    const mevcut = Object.keys(ids).filter(k => document.getElementById(ids[k]));
    const setBv = k => {
      document.body.dataset.bv = k;
      bvTabs.forEach(b => { const on = b.dataset.bv === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      store.set('yk_kitle', k === 'kurye' ? 'cour' : 'biz');
    };
    const fromHash = () => { const h = location.hash.slice(1); return Object.keys(ids).find(k => h === ids[k] || h === k) || null; };
    const toTabs = () => { const t = $('#bvTabs'); window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - $('.header').offsetHeight - 12, behavior: 'instant' }); };
    if (mevcut.length < 2) { $('#bvTabs').remove(); if (mevcut.length) document.body.dataset.bv = mevcut[0]; }
    else {
      setBv(fromHash() || (store.get('yk_kitle') === 'cour' ? 'kurye' : 'isletme'));
      bvTabs.forEach(b => b.addEventListener('click', () => { setBv(b.dataset.bv); history.replaceState(null, '', '#' + ids[b.dataset.bv]); }));
      window.addEventListener('hashchange', () => { const k = fromHash(); if (k) { setBv(k); toTabs(); } });
      if (fromHash()) window.addEventListener('load', toTabs);
    }
  }

  // Blog: kategori filtresi
  const bf = $('#blogFiltre');
  if (bf) bf.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', bf).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    $$('.blog-tum .post-card').forEach(c => { c.hidden = !!b.dataset.f && c.dataset.cat !== b.dataset.f; });
  });

  // Önizlemede sayfalar arası geçişte önizleme kalsın
  if (YK.isPreview()) $$('a[href]').forEach(a => { const h = a.getAttribute('href'); if (/^[^:?#]+\.html([?#]|$)/.test(h)) a.setAttribute('href', h.replace(/\.html(\?[^#]*)?/, (m, q) => '.html' + (q ? q + '&' : '?') + 'onizleme=1')); });

  // Yana kaydırılan kart listelerinin altındaki noktalar
  $$('.m-kay').forEach(row => {
    const items = Array.from(row.children); if (items.length < 2) return;
    const dots = document.createElement('div'); dots.className = 'm-dots'; dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = items.map(() => '<i></i>').join('');
    row.after(dots);
    const mark = () => {
      const step = items[1].offsetLeft - items[0].offsetLeft || 1;
      const n = row.scrollLeft >= row.scrollWidth - row.clientWidth - 4 ? items.length - 1 : Math.round(row.scrollLeft / step);
      Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i === n));
    };
    row.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
    mark();
  });

  // Hakkımızda telefonda kısaltılır; misyon, vizyon ve değerler "Devamını oku" ile açılır
  const abt = $('.about-text'), abSec = abt && abt.closest('section');
  if (abt) {
    const mb = document.createElement('button'); mb.type = 'button'; mb.className = 'more-btn'; mb.setAttribute('aria-expanded', 'false');
    const setMb = o => { abt.classList.toggle('open', o); abSec.classList.toggle('acik', o); mb.setAttribute('aria-expanded', o); mb.innerHTML = (o ? 'Daha az göster' : 'Devamını oku') + YK.icon(o ? 'yukari' : 'asagi'); };
    setMb(false); abt.after(mb);
    mb.addEventListener('click', () => setMb(!abt.classList.contains('open')));
  }

  /* ---------- SEO ---------- */
  seo();
  function setMeta(attr, key, val) {
    if (!val) return;
    let m = document.head.querySelector('meta[' + attr + '="' + key + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); }
    m.setAttribute('content', val);
  }
  function seo() {
    const base = (S.site_url || '').trim().replace(/\/+$/, '');
    const abs = u => !u ? '' : /^https?:/.test(u) ? u : u.indexOf('media:') === 0 ? '' : base ? base + '/' + u.replace(/^\.?\//, '') : '';
    const home = PAGE === 'home', isPost = PAGE === 'yazi' && !!post;
    const metaOf = (a, k) => { const m = document.head.querySelector('meta[' + a + '="' + k + '"]'); return m ? m.getAttribute('content') : ''; };
    // Ana sayfanın başlık/açıklaması panelden gelir; diğer sayfalarınki kendi HTML'inde yazılıdır
    const title = home ? (TX.seo_title || TX.site_title || document.title) : document.title;
    const desc = home ? (TX.seo_description || '') : metaOf('name', 'description');
    const ogImg = abs(document.body.dataset.img || C.images.og || C.images.hero);
    const root = (base ? base + '/' : new URL(ROOT || './', location.href).href).replace(/\/?$/, '/');
    const url = root + (document.body.dataset.path || '');
    document.title = title;
    setMeta('name', 'description', desc);
    setMeta('name', 'keywords', S.seo_keywords);
    setMeta('name', 'robots', S.noindex ? 'noindex, nofollow' : PAGE === 'yazi' && !post ? 'noindex, follow' : 'index, follow, max-image-preview:large');
    setMeta('name', 'google-site-verification', S.gsc_verify);
    setMeta('name', 'geo.region', 'TR' + (S.city ? '-' + S.city : ''));
    setMeta('name', 'geo.placename', [S.district, S.city].filter(Boolean).join(', '));
    if (S.geo_lat && S.geo_lng) { setMeta('name', 'geo.position', S.geo_lat + ';' + S.geo_lng); setMeta('name', 'ICBM', S.geo_lat + ', ' + S.geo_lng); }
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:site_name', 'Yakında Kurye');
    setMeta('property', 'og:locale', 'tr_TR');
    setMeta('property', 'og:url', base ? url : '');
    setMeta('property', 'og:image', ogImg);
    setMeta('property', 'og:image:alt', 'Yakında Kurye');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', ogImg);
    if (base) { let l = $('link[rel=canonical]'); if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); } l.href = url; }

    // Yapısal veri (schema.org)
    const id = root;
    const h1 = $('h1') ? $('h1').textContent.trim() : title;
    const address = { '@type': 'PostalAddress', streetAddress: S.address || undefined, addressLocality: S.district || S.city || undefined, addressRegion: S.city || undefined, postalCode: S.postal || undefined, addressCountry: 'TR' };
    const graph = [
      { '@type': 'Organization', '@id': id + '#org', name: 'Yakında Kurye', url: id, logo: abs(C.images.logo) || undefined, slogan: TX.slogan, email: S.email || undefined, telephone: S.phone || undefined, sameAs: soc.map(k => S[k]) },
      { '@type': 'WebSite', '@id': id + '#website', url: id, name: 'Yakında Kurye', inLanguage: 'tr-TR', publisher: { '@id': id + '#org' } },
      { '@type': 'WebPage', '@id': url + '#webpage', url: url, name: title, description: desc, inLanguage: 'tr-TR', isPartOf: { '@id': id + '#website' }, about: { '@id': id + '#business' } }
    ];
    if (home || PAGE === 'isletme' || PAGE === 'basvuru') graph.push({ '@type': 'LocalBusiness', '@id': id + '#business', name: 'Yakında Kurye', description: home ? desc : (TX.seo_description || desc), url: id, image: abs(C.images.og || C.images.hero) || undefined, telephone: S.phone || undefined, email: S.email || undefined, address: address, parentOrganization: { '@id': id + '#org' },
      geo: S.geo_lat && S.geo_lng ? { '@type': 'GeoCoordinates', latitude: Number(S.geo_lat), longitude: Number(S.geo_lng) } : undefined,
      areaServed: (regions.length ? regions : [S.city || 'Türkiye']).map(r => ({ '@type': 'Place', name: r })),
      openingHours: S.opening_hours || 'Mo-Su 00:00-23:59', priceRange: S.price_range || undefined,
      hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Kurye hizmetleri', itemListElement: C.services.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.desc, serviceType: 'Kurye hizmeti', provider: { '@id': id + '#business' }, areaServed: S.city || undefined } })) } });
    if (!home) {
      const crumbs = [{ name: 'Ana Sayfa', item: id }];
      if (PAGE === 'yazi') crumbs.push({ name: 'Blog', item: id + 'blog.html' });
      crumbs.push({ name: h1, item: url });
      graph.push({ '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })) });
    }
    const faqEl = $('#faq');
    if (faqEl && faqs.length) graph.push({ '@type': 'FAQPage', '@id': url + '#faq', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    if (isPost) {
      const qa = $$('.yazi-sss .faq-item').map(d => ({ '@type': 'Question', name: $('summary', d).textContent.trim(), acceptedAnswer: { '@type': 'Answer', text: $('.faq-a', d).textContent.trim() } }));
      graph.push({ '@type': 'BlogPosting', '@id': url + '#article', headline: h1, description: desc, image: ogImg || undefined, inLanguage: 'tr-TR', mainEntityOfPage: url,
        datePublished: metaOf('property', 'article:published_time'), dateModified: metaOf('property', 'article:modified_time') || metaOf('property', 'article:published_time'),
        articleSection: metaOf('property', 'article:section') || undefined, author: { '@id': id + '#org' }, publisher: { '@id': id + '#org' } });
      if (qa.length) graph.push({ '@type': 'FAQPage', '@id': url + '#sss', mainEntity: qa });
    }
    // Kurye alımı için iş ilanı (Google İş Arama) yalnızca Kuryeler sayfasında
    if (PAGE === 'kurye' && S.job_enabled !== false && !hidden.courForm) {
      const d = new Date(); const posted = S.job_posted || d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
      const until = new Date(posted + 'T00:00:00'); until.setDate(until.getDate() + 60);
      graph.push({ '@type': 'JobPosting', title: S.job_title || 'Moto Kurye', description: '<p>' + esc(TX.courier_text) + '</p><ul>' + C.requirements.filter(Boolean).map(r => '<li>' + esc(r) + '</li>').join('') + '</ul><ul>' + C.courierBenefits.map(b => '<li>' + esc(b.title) + ': ' + esc(b.desc) + '</li>').join('') + '</ul>',
        datePosted: posted, validThrough: until.toISOString().slice(0, 10), employmentType: ['FULL_TIME', 'PART_TIME'], directApply: true,
        hiringOrganization: { '@type': 'Organization', name: 'Yakında Kurye', sameAs: base || undefined, logo: abs(C.images.logo) || undefined },
        jobLocation: { '@type': 'Place', address: address },
        baseSalary: Number(S.job_salary) > 0 ? { '@type': 'MonetaryAmount', currency: 'TRY', value: { '@type': 'QuantitativeValue', value: Number(S.job_salary), unitText: 'MONTH' } } : undefined });
    }
    const s = document.createElement('script'); s.type = 'application/ld+json';
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.appendChild(s);
  }

  /* ---------- Çerez onayı + Google Analytics (yalnızca kimlik girildiyse) ---------- */
  if (/^G-[A-Z0-9]+$/i.test(S.ga_id || '')) {
    const consent = store.get('yk_cookie');
    const loadGA = () => {
      const g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(S.ga_id); document.head.appendChild(g);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', S.ga_id, { anonymize_ip: true });
    };
    if (consent === 'yes') loadGA();
    else if (consent !== 'no') {
      const bar = document.createElement('div'); bar.className = 'cookie';
      bar.innerHTML = '<p>Sitemizi geliştirmek için anonim ziyaret istatistikleri (çerez) kullanıyoruz. <button type="button" class="kvkk-link" data-kvkk2>Detaylar</button></p><div><button class="btn btn-ghost-k" data-c="no">Reddet</button><button class="btn btn-k" data-c="yes">Kabul et</button></div>';
      document.body.appendChild(bar);
      bar.addEventListener('click', e => {
        const b = e.target.closest('[data-c]'); if (e.target.closest('[data-kvkk2]')) { const k = $('[data-kvkk]'); if (k) k.click(); return; }
        if (!b) return; store.set('yk_cookie', b.dataset.c); bar.remove(); if (b.dataset.c === 'yes') loadGA();
      });
    }
  }
  const track = (ev, p) => { if (window.gtag) window.gtag('event', ev, p || {}); };

  /* ---------- Menü, kaydırma ---------- */
  const nav = $('#nav'), tog = $('#navToggle'), header = $('.header');
  const setNav = o => { nav.classList.toggle('open', o); tog.setAttribute('aria-expanded', o); tog.innerHTML = YK.icon(o ? 'kapat' : 'menu'); };
  tog.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  $$('#nav a').forEach(a => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('click', e => { if (nav.classList.contains('open') && !e.target.closest('.header')) setNav(false); });

  const prog = $('#progress'), toTop = $('#toTop'), mCta = $('#mCta');
  let formVisible = false, ticking = false;
  function onScroll() {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    header.classList.toggle('scrolled', y > 10);
    toTop.classList.toggle('show', y > 700);
    if (mCta && mCta.isConnected) { const on = y > 520 && !formVisible; mCta.classList.toggle('show', on); document.body.classList.toggle('cta-on', on && innerWidth <= 960); }
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  onScroll();

  if ('IntersectionObserver' in window) {
    const fio = new IntersectionObserver(es => { formVisible = es.some(x => x.isIntersecting) || $$('.apply-sec').some(s => { const r = s.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }); onScroll(); });
    $$('.apply-sec').forEach(s => fio.observe(s));

    const io = new IntersectionObserver(es => es.forEach(x => {
      if (!x.isIntersecting) return;
      x.target.classList.add('in'); io.unobserve(x.target);
      if (x.target.matches('.stat')) countUp($('b', x.target));
    }), { threshold: .12 });
    $$('.sec-head, .card, .benefit, .model, .steps li, .g-item, .split-img, .faq-item, .stat, .testi, .region, .calc-card, .apply-card, .bizmodel, .sector, .mv-card, .zone-in, .kk, .post-card').forEach(el => {
      el.classList.add('reveal');
      const sib = Array.from(el.parentNode.children).indexOf(el);
      el.style.transitionDelay = Math.min(sib, 6) * 70 + 'ms';
      io.observe(el);
    });
  }
  function countUp(el) {
    const raw = el.dataset.count || '', m = raw.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!m || reduced || /^\d+\/\d+/.test(raw)) return;
    const target = parseFloat(m[2].replace(',', '.')), dec = (m[2].split(/[.,]/)[1] || '').length, sep = m[2].indexOf(',') >= 0 ? ',' : '.';
    const t0 = performance.now(), dur = 1300;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur), v = target * (1 - Math.pow(1 - p, 3));
      el.textContent = m[1] + v.toFixed(dec).replace('.', sep) + m[3];
      if (p < 1) requestAnimationFrame(step); else el.textContent = raw;
    })(t0);
  }

  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = 'perspective(900px) rotateY(' + x * 6 + 'deg) rotateX(' + -y * 6 + 'deg)'; });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Kazanç hesaplayıcı ---------- */
  if ($('#kazanc')) {
    const k = C.calc, rate = Number(k.perPackage) || 0;
    const pkg = $('#cPkg'), daysBox = $('#cDays');
    const lo = Math.max(1, Number(k.minPackages) || 1), hi = Math.max(lo + 1, Number(k.maxPackages) || 60);
    pkg.min = lo; pkg.max = hi; pkg.value = Math.min(hi, Math.max(lo, Number(k.defPackages) || 25));
    let days = Math.min(7, Math.max(1, Math.round(Number(k.defDays) || 6)));
    daysBox.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(d => '<button type="button" role="radio" data-d="' + d + '">' + d + '</button>').join('');
    const tl = n => Math.round(n).toLocaleString('tr-TR') + ' ₺';
    function calc() {
      const p = Number(pkg.value), d = p * rate, w = d * days;
      $('#cPkgV').textContent = p; $('#cDayV').textContent = days;
      $('#cDay').textContent = tl(d); $('#cWeek').textContent = tl(w); $('#cMonth').textContent = tl(w * 52 / 12);
      $$('button', daysBox).forEach(b => { const on = +b.dataset.d === days; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      pkg.style.setProperty('--p', ((p - pkg.min) / (pkg.max - pkg.min) * 100) + '%');
    }
    pkg.addEventListener('input', calc);
    daysBox.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { days = +b.dataset.d; calc(); } });
    calc();
  }

  /* ---------- Lightbox (yalnızca galerili sayfada) ---------- */
  const lb = $('#lightbox'); let lbi = 0;
  const lbOn = () => lb && !lb.hidden;
  function lbShow(i) { lbi = (i + C.gallery.length) % C.gallery.length; const g = C.gallery[lbi]; const im = $('img', lb); im.removeAttribute('src'); YK.setImg(im, src(g.src)); im.alt = g.title || ''; $('p', lb).textContent = g.title || ''; }
  function lbOpen(i) { lbShow(i); lb.hidden = false; document.body.classList.add('lock'); $('.lb-close', lb).focus(); }
  function lbClose() { lb.hidden = true; document.body.classList.remove('lock'); }
  if (lb) {
    const gal = $('#gallery'); if (gal) gal.addEventListener('click', e => { const b = e.target.closest('.g-item'); if (b) lbOpen(+b.dataset.i); });
    lb.addEventListener('click', e => {
      if (e.target.closest('.lb-prev')) return lbShow(lbi - 1);
      if (e.target.closest('.lb-next')) return lbShow(lbi + 1);
      if (e.target === lb || e.target.closest('.lb-close')) lbClose();
    });
    let tx0 = null;
    lb.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => { if (tx0 == null) return; const dx = e.changedTouches[0].clientX - tx0; if (Math.abs(dx) > 50) lbShow(lbi + (dx < 0 ? 1 : -1)); tx0 = null; });
  }

  /* ---------- KVKK penceresi ---------- */
  const dlg = $('#kvkkDlg'); let kvkkTarget = null;
  const dlgOpen = target => { kvkkTarget = target || null; dlg.hidden = false; document.body.classList.add('lock'); $('#kvkkOk').focus(); };
  const dlgClose = () => { dlg.hidden = true; document.body.classList.remove('lock'); };
  document.addEventListener('click', e => { const b = e.target.closest('[data-kvkk]'); if (b) { e.preventDefault(); const f = b.closest('form'); dlgOpen(f && f.elements.kvkk); } });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.dlg-x')) dlgClose(); });
  $('#kvkkOk').addEventListener('click', () => { if (kvkkTarget) { kvkkTarget.checked = true; kvkkTarget.dispatchEvent(new Event('change', { bubbles: true })); } dlgClose(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (lbOn()) lbClose(); if (!dlg.hidden) dlgClose(); setNav(false); }
    if (lbOn() && e.key === 'ArrowRight') lbShow(lbi + 1);
    if (lbOn() && e.key === 'ArrowLeft') lbShow(lbi - 1);
  });

  /* ---------- Başvuru / talep formları ---------- */
  const FORM_UI = {
    kurye: { icon: 'motor', head: 'Kurye Başvuru Formu', sub: 'Kurye olarak ekibimize katılmak için', btn: TX.courform_btn || 'Başvuruyu Gönder', okTitle: 'courform_success_title', okText: 'courform_success_text', refLabel: 'Başvuru No' },
    isletme: { icon: 'magaza', head: 'İşletme Talep Formu', sub: 'İşletmeniz için kurye hizmeti almak için', btn: TX.bizform_btn || 'Teklif İste', okTitle: 'bizform_success_title', okText: 'bizform_success_text', refLabel: 'Talep No' }
  };
  $$('[data-form]').forEach(box => mountForm(box, box.dataset.form));

  function mountForm(box, type) {
    const def = FORMS[type], ui = FORM_UI[type], DRAFT = 'yk_draft_' + type;
    const opts = def.fields.filter(f => !f.required);
    // Telefonda isteğe bağlı alanlar "Ek bilgiler" düğmesinin altında katlanır
    const moreBtn = opts.length ? '<button type="button" class="form-more" aria-expanded="false">' + YK.icon('arti') + '<span><b>Ek bilgiler</b> <small>(isteğe bağlı)</small><em>' + opts.map(f => esc(f.label)).join(', ') + '</em></span></button>' : '';
    box.innerHTML =
      '<div class="form-head"><span class="fh-ic">' + YK.icon(ui.icon) + '</span><div><b>' + ui.head + '</b><small>' + ui.sub + '</small></div></div>' +
      '<div class="form-progress" aria-hidden="true"><span></span></div>' +
      '<form novalidate><div class="form-grid">' + def.fields.map(f => fieldHTML(f, type)).join('') + moreBtn + '</div>' +
      '<input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="kvkk"><input type="checkbox" name="kvkk" required> <span>' + nl(TX.kvkk_text) + ' <button type="button" class="kvkk-link" data-kvkk>Aydınlatma metnini oku</button></span></label>' +
      '<p class="form-error" role="alert" hidden></p>' +
      '<button type="submit" class="btn ' + (type === 'isletme' ? 'btn-y' : 'btn-k') + ' btn-lg btn-block"><span class="btn-txt">' + esc(ui.btn) + '</span> ' + YK.icon('gonder') + '</button>' +
      '<p class="draft-note" hidden>Formdaki bilgileriniz bu cihazda geçici olarak saklanıyor.</p></form>' +
      '<div class="success" hidden><div class="success-ic">' + YK.icon('check') + '</div><h3>' + nl(TX[ui.okTitle]) + '</h3><p>' + nl(TX[ui.okText]) + '</p><div class="ref">' + ui.refLabel + ': <strong></strong></div>' +
      '<div class="success-btns"><a class="btn btn-wa" target="_blank" rel="noopener">' + YK.icon('whatsapp') + 'WhatsApp ile ilet</a><button type="button" class="btn btn-ghost-k sb-new">Yeni form doldur</button></div></div>';
    const form = $('form', box), err = $('.form-error', box), bar = $('.form-progress span', box), succ = $('.success', box), btn = $('button[type=submit]', form), draftNote = $('.draft-note', box);

    const d0 = store.get(DRAFT);
    if (d0) Object.keys(d0).forEach(k => { if (form.elements[k] && d0[k]) form.elements[k].value = d0[k]; });
    draftNote.hidden = !d0 || !Object.values(d0).some(v => v && String(v).trim());

    const more = $('.form-more', form);
    const setMore = o => { if (!more) return; form.classList.toggle('more-open', o); more.setAttribute('aria-expanded', o); more.hidden = o; };
    if (more) more.addEventListener('click', () => { setMore(true); const f0 = $('.field.opt input, .field.opt select, .field.opt textarea', form); if (f0) f0.focus(); });
    if (d0 && opts.some(f => d0[f.name])) setMore(true);

    function progress() {
      const req = def.fields.filter(f => f.required);
      const done = req.filter(f => (form.elements[f.name].value || '').trim()).length + (form.elements.kvkk.checked ? 1 : 0);
      bar.style.width = (done / (req.length + 1) * 100) + '%';
    }
    function saveDraft() {
      const d = {}; def.fields.forEach(f => { d[f.name] = form.elements[f.name].value; });
      store.set(DRAFT, d); draftNote.hidden = !Object.values(d).some(v => v && String(v).trim());
    }
    const setMsg = (field, msg) => { field.classList.toggle('invalid', !!msg); $('.f-msg', field).textContent = msg || ''; };
    progress();

    form.addEventListener('input', e => {
      const t = e.target;
      if (t.type === 'tel') {
        let d = t.value.replace(/\D/g, '');
        if (d.indexOf('90') === 0 && d.length > 11) d = d.slice(2);
        if (d && d[0] !== '0') d = '0' + d;
        d = d.slice(0, 11);
        t.value = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(' ');
      }
      const fld = t.closest('.field'); if (fld && fld.classList.contains('invalid')) { const f = def.fields.find(x => x.name === t.name); if (f) setMsg(fld, validate(f, t.value.trim())); }
      if (t.name !== 'website') saveDraft();
      progress();
    });
    form.addEventListener('change', e => { progress(); if (e.target.name === 'kvkk' && e.target.checked) err.hidden = true; });
    form.addEventListener('focusout', e => {
      const t = e.target, fld = t.closest && t.closest('.field'); if (!fld) return;
      const f = def.fields.find(x => x.name === t.name); if (f && t.value.trim()) setMsg(fld, validate(f, t.value.trim()));
    });
    $('.sb-new', box).addEventListener('click', () => { form.reset(); err.hidden = true; progress(); form.hidden = false; succ.hidden = true; });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = {}; let firstBad = null;
      def.fields.forEach(f => {
        const el = form.elements[f.name]; const v = (el.value || '').trim(); data[f.name] = v;
        const msg = validate(f, v); setMsg(el.closest('.field'), msg);
        if (msg && !firstBad) firstBad = el;
      });
      err.hidden = true;
      if (firstBad) { if (firstBad.closest('.opt')) setMore(true); err.textContent = 'Lütfen işaretli alanları kontrol edin.'; err.hidden = false; firstBad.focus(); return; }
      if (!form.elements.kvkk.checked) { err.textContent = 'Devam etmek için KVKK onayını işaretleyin.'; err.hidden = false; return; }

      btn.disabled = true; btn.classList.add('loading');
      const bot = form.elements.website.value;
      const stop = html => { btn.disabled = false; btn.classList.remove('loading'); err.innerHTML = html; err.hidden = false; err.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); };
      const finish = (ref, localId) => {
        btn.disabled = false; btn.classList.remove('loading');
        store.del(DRAFT); draftNote.hidden = true;
        $('.ref strong', succ).textContent = ref;
        const waBtn = $('.btn-wa', succ);
        if (waNum && S.wa_forward !== false) {
          const lines = ['Merhaba, web sitesi üzerinden ' + def.label.toLocaleLowerCase('tr-TR') + ' gönderdim.', ui.refLabel + ': ' + ref].concat(def.fields.filter(f => data[f.name] && f.type !== 'textarea').map(f => f.label + ': ' + data[f.name]));
          waBtn.href = wa + '?text=' + encodeURIComponent(lines.join('\n')); waBtn.hidden = false;
        } else waBtn.hidden = true;
        form.hidden = true; succ.hidden = false;
        box.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        confetti(succ);
        track('generate_lead', { form_type: type });
        // İsteğe bağlı e-posta bildirimi (Web3Forms)
        if (S.notify_key && !bot) {
          const payload = Object.assign({ access_key: S.notify_key, subject: 'Yeni ' + def.label + ' – ' + ref, from_name: 'Yakında Kurye Web Sitesi', [ui.refLabel]: ref }, ...def.fields.map(f => ({ [f.label]: data[f.name] || '-' })));
          fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
            .then(r => r.json()).then(j => { if (localId) YK.update('applications', localId, { notified: !!j.success }); })
            .catch(() => { if (localId) YK.update('applications', localId, { notified: false }); });
        }
      };
      const contactHint = waNum ? ' Dilerseniz <a href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' + (S.phone ? ' veya <a href="' + tel + '">telefon</a>' : '') + ' ile de ulaşabilirsiniz.' : (S.phone ? ' Dilerseniz <a href="' + tel + '">bizi arayın</a>.' : '');
      const dupMsg = ref => 'Bu telefon numarasıyla son 24 saat içinde zaten ' + (type === 'kurye' ? 'başvuru' : 'talep') + ' yapılmış' + (ref ? ' (No: <b>' + esc(ref) + '</b>)' : '') + '. Ekibimiz sizinle iletişime geçecek.';

      // 1) Sunucu varsa başvuru doğrudan yönetim paneline kaydedilir
      YK.submitForm(type, data, bot).then(j => finish(j.ref), e2 => {
        if (!e2.absent) {
          if (e2.code === 'dup') return stop(dupMsg(e2.data && e2.data.ref));
          if (e2.network) return stop('Bağlantı kurulamadı, başvurunuz gönderilmedi. İnternet bağlantınızı kontrol edip tekrar deneyin.' + contactHint);
          return stop((e2.offline || e2.status >= 500 ? 'Teknik bir sorun nedeniyle başvurunuz şu an alınamadı. Lütfen biraz sonra tekrar deneyin.' : esc(e2.message)) + contactHint);
        }
        // 2) Sunucu yoksa (statik hosting) bu tarayıcıya kaydedilir; e-posta / WhatsApp ile iletilir
        if (bot) return setTimeout(() => finish(YK.refNo()), 500);
        const phone = data.telefon.replace(/\D/g, '');
        const dup = YK.list('applications').find(a => a.type === type && (a.data.telefon || '').replace(/\D/g, '') === phone && Date.now() - new Date(a.createdAt) < 864e5);
        if (dup) return stop(dupMsg(dup.ref));
        const ref = YK.refNo();
        const saved = YK.add('applications', { type: type, status: 'yeni', ref: ref, data: data, kvkk: true, notes: [], source: location.hostname || 'yerel' });
        if (!saved) return stop('Başvurunuz kaydedilemedi.' + contactHint);
        setTimeout(() => finish(ref, saved.id), 400);
      });
    });
  }

  function fieldHTML(f, type) {
    const req = f.required ? ' required aria-required="true"' : '';
    const id = 'f_' + type + '_' + f.name;
    let input;
    if (f.type === 'select') {
      input = '<select id="' + id + '" name="' + f.name + '"' + req + '>' + (f.def && f.options.indexOf(f.def) >= 0 ? '' : '<option value="">Seçiniz</option>') +
        f.options.map(o => '<option' + (o === f.def ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
    } else if (f.type === 'textarea') {
      input = '<textarea id="' + id + '" name="' + f.name + '" rows="3" maxlength="1000"' + req + '></textarea>';
    } else {
      input = '<input id="' + id + '" name="' + f.name + '" type="' + f.type + '"' + req + ' maxlength="' + (f.type === 'tel' ? 14 : 120) + '"' +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.auto ? ' autocomplete="' + f.auto + '"' : '') +
        (f.type === 'number' ? ' min="0" max="999" inputmode="numeric"' : '') + (f.type === 'tel' ? ' inputmode="tel" autocomplete="tel"' : '') +
        (f.type === 'email' ? ' autocomplete="email"' : '') + (f.type === 'date' ? ' max="' + maxDate(f) + '"' : '') + '>';
    }
    return '<div class="field' + (f.full ? ' full' : '') + (f.required ? '' : ' opt') + '" data-n="' + f.name + '"><label for="' + id + '">' + esc(f.label) + (f.required ? ' <i>*</i>' : '') + '</label>' + input + '<small class="f-msg"></small></div>';
  }
  function maxDate(f) {
    const d = new Date(); if (f.name === 'dogumTarihi') d.setFullYear(d.getFullYear() - 18);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function validate(f, v) {
    if (f.required && !v) return 'Bu alan zorunludur.';
    if (!v) return '';
    if (f.type === 'tel' && v.replace(/\D/g, '').length !== 11) return 'Telefonu 05xx xxx xx xx biçiminde girin.';
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Geçerli bir e-posta girin.';
    if ((f.name === 'adSoyad' || f.name === 'yetkili') && v.split(/\s+/).filter(Boolean).length < 2) return 'Ad ve soyadı birlikte yazın.';
    if (f.name === 'dogumTarihi') { const age = (Date.now() - new Date(v)) / 31557600000; if (!(age >= 18)) return 'Başvuru için 18 yaşını doldurmuş olmalısınız.'; if (age > 75) return 'Doğum tarihini kontrol edin.'; }
    if (f.type === 'number' && (Number(v) < 0 || Number(v) > 999)) return 'Geçerli bir sayı girin.';
    return '';
  }

  function confetti(host) {
    if (reduced) return;
    const box = document.createElement('div'); box.className = 'confetti';
    for (let i = 0; i < 40; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.animationDelay = Math.random() * .4 + 's'; s.style.background = i % 3 ? '#FFD500' : '#0E0E0E'; s.style.transform = 'rotate(' + Math.random() * 360 + 'deg)'; box.appendChild(s); }
    host.appendChild(box); setTimeout(() => box.remove(), 2600);
  }

  // Telefon / WhatsApp tıklamalarını ölç (Analytics açıksa)
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="tel:"], a[href*="wa.me"]'); if (a) track(a.href.indexOf('tel:') === 0 ? 'click_phone' : 'click_whatsapp'); });

  // Panelde içerik kaydedilirse açık sitede otomatik yenile (aynı tarayıcı)
  window.addEventListener('storage', e => { if ((e.key === 'yk_content' && !YK.isPreview()) || (e.key === 'yk_preview' && YK.isPreview())) location.reload(); });
})();
