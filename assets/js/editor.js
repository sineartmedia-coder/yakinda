/* Yakında Kurye — sitede düzenleme modu (sayfa?onizleme=1&duzenle=1)
   Panele giriş yapmış yönetici sitedeki yazılara tıklayıp yerinde değiştirir, görsellere tıklayıp yenisini seçer.
   Değişiklikler panel taslağına kaydedilir; sunucu modunda buradan doğrudan yayınlanabilir. */
(function () {
  'use strict';
  const P = window.YK_PAGE || {}, ROOT = P.ROOT || '';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = YK.esc, I = YK.icon;
  const ADMIN = ROOT + 'admin.html';
  const imgSrc = u => (ROOT && typeof u === 'string' && u && !/^(https?:|data:|media:|blob:|\/)/.test(u)) ? ROOT + u : u;
  const images = {};
  let dirty = 0, bar, busy = false;

  const css = document.createElement('style');
  css.textContent = `
  .yk-ed { outline: none; outline-offset: 3px; border-radius: 4px; cursor: text; transition: background .15s; }
  .yk-ed:hover { outline: 2px dashed rgba(255, 213, 0, .9); }
  .yk-ed:focus { outline: 2px solid #FFD500; background: rgba(255, 213, 0, .12); }
  .yk-ed.yk-ch { outline: 2px dashed #16a34a; }
  img.yk-img { cursor: pointer; transition: filter .15s; outline-offset: -3px; }
  img.yk-img:hover { filter: brightness(.85); outline: 3px dashed #FFD500; }
  .preview-bar { display: none !important; }
  .yk-bar { position: fixed; z-index: 9999; left: 0; right: 0; margin: 0 auto; width: max-content; bottom: 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center;
    background: #0E0E0E; color: #fff; padding: 10px 12px; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,.35); font: 600 14px/1.3 'Poppins', system-ui, sans-serif; max-width: calc(100vw - 24px); }
  .yk-bar .ic { width: 18px; height: 18px; }
  .yk-bar b { color: #FFD500; display: inline-flex; align-items: center; gap: 6px; }
  .yk-bar .yk-n { color: #bbb; font-weight: 500; padding: 0 6px; }
  .yk-bar button, .yk-bar a { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 10px; padding: 9px 13px; font: 700 13px 'Poppins', system-ui, sans-serif; cursor: pointer; background: #262626; color: #fff; text-decoration: none; }
  .yk-bar .yk-save { background: #FFD500; color: #0E0E0E; }
  .yk-bar .yk-pub { background: #16a34a; }
  .yk-bar button:disabled { opacity: .45; cursor: default; }
  .yk-msg { position: fixed; z-index: 9999; left: 0; right: 0; margin: 0 auto; width: max-content; bottom: 84px; background: #fff; color: #111; padding: 10px 16px; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.2); font: 600 14px 'Poppins', system-ui, sans-serif; max-width: calc(100vw - 24px); text-align: center; }
  .yk-msg.err { background: #dc2626; color: #fff; }
  .yk-pick { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .yk-pick-box { background: #fff; color: #111; border-radius: 18px; width: min(860px, 100%); max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; font-family: 'Poppins', system-ui, sans-serif; }
  .yk-pick-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #eee; }
  .yk-pick-head h3 { margin: 0; font-size: 1.05rem; flex: 1; }
  .yk-pick-head label, .yk-pick-head button { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 10px; padding: 9px 13px; font: 700 13px 'Poppins', system-ui, sans-serif; cursor: pointer; background: #FFD500; color: #111; }
  .yk-pick-head button { background: #f1f1f1; }
  .yk-pick-grid { padding: 14px; overflow: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
  .yk-pick-grid button { border: 2px solid transparent; border-radius: 12px; padding: 0; background: #f4f4f4; cursor: pointer; overflow: hidden; text-align: left; font: 600 11px 'Poppins', system-ui, sans-serif; color: #444; }
  .yk-pick-grid button:hover { border-color: #FFD500; }
  .yk-pick-grid img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; }
  .yk-pick-grid span { display: block; padding: 6px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 600px) { .yk-bar { bottom: 8px; padding: 8px; gap: 6px; } .yk-bar .yk-hide { display: none; } }
  `;
  document.head.appendChild(css);

  function msg(t, err) {
    const old = $('.yk-msg'); if (old) old.remove();
    const m = document.createElement('div'); m.className = 'yk-msg' + (err ? ' err' : ''); m.innerHTML = t; document.body.appendChild(m);
    setTimeout(() => m.remove(), err ? 6000 : 3500);
  }

  // Yetki: sunucu modunda oturum açık olmalı; yerel modda panel bu tarayıcıda açılmış olmalı
  async function allowed() {
    if (P.PAGE === 'yazi') return 'yazi';
    const st = await YK.server.connect();
    if (st) {
      if (!st.logged) return false;
      await YK.server.pull();
      // Panel taslağı bu sayfa açıldıktan sonra değiştiyse en güncel hali göster
      const fresh = JSON.stringify(YK.getContent()), shown = JSON.stringify(P.C);
      if (fresh !== shown && !sessionStorage.getItem('yk_ed_reload')) { sessionStorage.setItem('yk_ed_reload', '1'); location.reload(); return null; }
      sessionStorage.removeItem('yk_ed_reload');
      return true;
    }
    let ok = false; try { ok = Date.now() - Number(localStorage.getItem('yk_edit_ok') || 0) < 12 * 36e5; } catch (e) {}
    return ok || YK.auth.isLogged();
  }

  const text = el => (el.innerText || '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const keyOf = el => el.dataset.t ? 't:' + el.dataset.t : el.dataset.s ? 's:' + el.dataset.s : 'l:' + el.dataset.l;
  const multi = el => /^(P|DIV|BLOCKQUOTE)$/.test(el.tagName);

  function count() {
    dirty = $$('.yk-ed').filter(el => text(el) !== el.dataset.ykOrig).length + Object.keys(images).length;
    $$('.yk-ed').forEach(el => el.classList.toggle('yk-ch', text(el) !== el.dataset.ykOrig));
    $('.yk-n', bar).textContent = dirty ? dirty + ' değişiklik' : 'Değişiklik yok';
    $$('.yk-save, .yk-undo', bar).forEach(b => { b.disabled = !dirty || busy; });
  }

  function enable() {
    $$('[data-t], [data-s], [data-l]').forEach(el => {
      if (el.closest('.yk-bar, .cookie, .dlg, .lightbox, .pop, script, head') || el.tagName === 'TITLE') return;
      el.dataset.ykOrig = text(el);
      el.classList.add('yk-ed');
      el.contentEditable = 'plaintext-only';
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      el.spellcheck = false;
    });
    $$('img[data-img]').forEach(im => { im.classList.add('yk-img'); im.title = 'Görseli değiştirmek için tıklayın'; });
    document.addEventListener('input', e => {
      const el = e.target.closest && e.target.closest('.yk-ed'); if (!el) return;
      // Aynı yazı sayfada birden çok yerde geçiyorsa hepsini birlikte güncelle
      const k = keyOf(el), v = text(el);
      $$('.yk-ed').forEach(o => { if (o !== el && keyOf(o) === k) o.innerText = v; });
      count();
    });
    document.addEventListener('keydown', e => {
      const el = e.target.closest && e.target.closest('.yk-ed'); if (!el) return;
      if (e.key === 'Enter' && !(multi(el) && e.shiftKey) && !multi(el)) { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.innerText = el.dataset.ykOrig; el.blur(); count(); }
      if (e.key === ' ' && el.closest('summary')) { e.preventDefault(); document.execCommand('insertText', false, ' '); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); }
    });
    document.addEventListener('paste', e => {
      const el = e.target.closest && e.target.closest('.yk-ed'); if (!el || !e.clipboardData) return;
      e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    // Düzenleme sırasında bağlantılar, formlar ve açılır kapanır bölümler çalışmaz
    document.addEventListener('click', e => {
      if (e.target.closest('.yk-bar, .yk-pick, .yk-msg')) return;
      const im = e.target.closest('img.yk-img');
      if (im) { e.preventDefault(); e.stopPropagation(); return pick(im); }
      const a = e.target.closest('a');
      if (a && !e.ctrlKey && !e.metaKey) { e.preventDefault(); if (!e.target.closest('.yk-ed')) msg('Düzenleme modunda bağlantılar açılmaz. Sayfalar arasında geçmek için alttaki menüyü kullanın.'); }
      if (e.target.closest('summary .yk-ed')) e.preventDefault();
      if (e.target.closest('.g-item')) e.stopPropagation();
    }, true);
    document.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); msg('Düzenleme modunda form gönderilmez.'); }, true);
    window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  }

  function pageLinks() {
    const pages = [['index.html', 'Ana Sayfa'], ['isletmeler.html', 'İşletmeler'], ['kuryeler.html', 'Kuryeler'], ['basvuru.html', 'Başvuru'], ['blog.html', 'Blog']];
    const cur = location.pathname.split('/').pop() || 'index.html';
    return '<select class="yk-go yk-hide" aria-label="Sayfa" style="background:#262626;color:#fff;border:0;border-radius:10px;padding:9px;font:700 13px Poppins,system-ui">' + pages.map(p => '<option value="' + p[0] + '"' + (p[0] === cur ? ' selected' : '') + '>' + p[1] + '</option>').join('') + '</select>';
  }

  function mountBar(mode) {
    bar = document.createElement('div'); bar.className = 'yk-bar';
    bar.innerHTML = '<b>' + I('kalem') + '<span class="yk-hide">Düzenleme modu</span></b>' + pageLinks() + '<span class="yk-n">Değişiklik yok</span>' +
      '<button class="yk-undo" disabled>Geri al</button><button class="yk-save" disabled>' + I('check') + 'Kaydet</button>' +
      (mode === 'server' ? '<button class="yk-pub">' + I('gonder') + '<span>Yayınla</span></button>' : '') +
      '<a href="' + ADMIN + '#icerik" class="yk-hide">' + I('panel') + 'Panel</a><button class="yk-exit" title="Düzenlemeden çık">' + I('kapat') + '</button>';
    document.body.appendChild(bar);
    $('.yk-undo', bar).onclick = () => { $$('.yk-ed').forEach(el => { el.innerText = el.dataset.ykOrig; }); Object.keys(images).forEach(k => { delete images[k]; }); $$('img[data-img]').forEach(im => YK.setImg(im, imgSrc(P.C.images[im.dataset.img]))); count(); };
    $('.yk-save', bar).onclick = () => save(false);
    const pub = $('.yk-pub', bar); if (pub) pub.onclick = () => save(true);
    $('.yk-exit', bar).onclick = () => { if (dirty && !confirm('Kaydedilmemiş değişiklikler var. Yine de çıkılsın mı?')) return; dirty = 0; location.href = location.pathname + (mode === 'server' ? '?onizleme=1' : ''); };
    $('.yk-go', bar).onchange = e => { if (dirty && !confirm('Kaydedilmemiş değişiklikler var. Yine de sayfa değiştirilsin mi?')) { e.target.value = location.pathname.split('/').pop() || 'index.html'; return; } dirty = 0; location.href = ROOT + e.target.value + '?onizleme=1&duzenle=1'; };
  }

  // Değişiklikleri en güncel taslağın üzerine uygular
  function apply(c) {
    $$('.yk-ed').forEach(el => {
      const v = text(el); if (v === el.dataset.ykOrig) return;
      if (el.dataset.t) c.texts[el.dataset.t] = v;
      else if (el.dataset.s) c.settings[el.dataset.s] = v;
      else if (el.dataset.l) {
        const [k, i, f] = el.dataset.l.split('.');
        if (!Array.isArray(c[k]) || c[k][i] == null) return;
        if (f) { if (typeof c[k][i] === 'object') c[k][i][f] = v; } else c[k][i] = v;
      }
    });
    Object.keys(images).forEach(k => { c.images[k] = images[k]; });
    return c;
  }

  function waitSync() {
    return new Promise((res, rej) => {
      const t0 = Date.now();
      (function tick() {
        const s = YK.server.state();
        if (!s.pending) return res();
        if (s.error && Date.now() - t0 > 4000) return rej(new Error(s.error));
        if (Date.now() - t0 > 20000) return rej(new Error('Sunucu yanıt vermedi.'));
        setTimeout(tick, 300);
      })();
    });
  }

  async function save(publish) {
    if (busy) return;
    if (!dirty && !publish) return;
    busy = true; count();
    try {
      const c = apply(YK.getContent());
      if (dirty) {
        if (!YK.saveContent(c)) throw new Error('Kaydedilemedi.');
        if (YK.remote.on) await waitSync();
        YK.log('Site içeriği sitede düzenlendi (' + (document.title || '').split('|')[0].trim() + ')');
      }
      $$('.yk-ed').forEach(el => { el.dataset.ykOrig = text(el); });
      Object.keys(images).forEach(k => { P.C.images[k] = images[k]; delete images[k]; });
      if (publish) {
        await YK.server.publish(YK.getContent());
        YK.log('Site içeriği yayınlandı (sitede düzenleme)');
        msg('Yayınlandı. Ziyaretçiler sayfayı yenilediğinde yeni hali görür.');
      } else {
        msg(YK.remote.on ? 'Kaydedildi. Ziyaretçilerin görmesi için <b>Yayınla</b>’ya basın.' : 'Kaydedildi. Ziyaretçilerin görmesi için panelde <a href="' + ADMIN + '#icerik/yayin">Yayınla</a> adımını tamamlayın.');
      }
    } catch (e) { msg(esc(e.message || 'İşlem tamamlanamadı.'), true); }
    busy = false; count();
  }

  // Görsel seçici: hazır görseller + bilgisayardan yükleme
  function pick(im) {
    const key = im.dataset.img;
    const box = document.createElement('div'); box.className = 'yk-pick';
    box.innerHTML = '<div class="yk-pick-box"><div class="yk-pick-head"><h3>Görsel seç</h3><label>' + I('yukle') + 'Bilgisayardan yükle<input type="file" accept="image/*" hidden></label><button class="yk-x">' + I('kapat') + '</button></div><div class="yk-pick-grid"></div></div>';
    const grid = $('.yk-pick-grid', box);
    const choose = s => { images[key] = s; $$('img[data-img="' + key + '"]').forEach(x => YK.setImg(x, imgSrc(s))); box.remove(); count(); };
    const list = YK.BUNDLED_IMAGES.map(x => ({ src: x.src, url: imgSrc(x.src), name: x.title }));
    const draw = items => { grid.innerHTML = items.map((x, i) => '<button data-i="' + i + '"><img src="' + esc(x.url) + '" alt="" loading="lazy"><span>' + esc(x.name || '') + '</span></button>').join(''); $$('button', grid).forEach(b => { b.onclick = () => choose(items[b.dataset.i].src); }); };
    draw(list);
    YK.media.all().then(up => { if (up && up.length) draw(up.map(x => ({ src: x.src, url: x.url && !/^(https?:|data:|blob:)/.test(x.url) ? imgSrc(x.url) : x.url, name: x.name || 'Yüklenen görsel' })).concat(list)); }).catch(() => {});
    $('input', box).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { msg('Görsel yükleniyor…'); choose(await YK.media.put(await YK.fileToDataUrl(f, 1600), f.name)); msg('Görsel değişti. Kaydetmeyi unutmayın.'); }
      catch (er) { msg(esc(er && er.message ? er.message : 'Görsel yüklenemedi.'), true); }
    };
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('.yk-x')) box.remove(); });
    document.body.appendChild(box);
  }

  allowed().then(ok => {
    if (ok === null) return;
    if (ok === 'yazi') return msg('Blog yazıları panelde <a href="' + ADMIN + '#icerik/blog">Blog Yazıları</a> bölümünden düzenlenir.');
    if (!ok) return msg('Sitede düzenlemek için önce <a href="' + ADMIN + '">yönetim paneline</a> giriş yapın.', true);
    mountBar(YK.remote.on ? 'server' : 'local');
    enable();
    msg('Yazılara tıklayıp değiştirin, görsellere tıklayıp yenisini seçin. Bitince <b>Kaydet</b>.');
  }).catch(e => msg(esc(e.message || 'Düzenleme modu açılamadı.'), true));
})();
