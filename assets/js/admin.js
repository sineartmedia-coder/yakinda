/* Yakında Kurye — Yönetim paneli */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = YK.esc, I = YK.icon;
  const view = $('#view');
  const state = {};
  const isoDay = d => { d = new Date(d); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const today = () => isoDay(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDay(d); };
  const thisMonth = () => today().slice(0, 7);
  const monthLabel = m => m ? new Date(m + '-01T00:00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : 'Tüm zamanlar';
  const daysUntil = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5);
  const statusOf = k => YK.APP_STATUSES.find(s => s.key === k) || YK.APP_STATUSES[0];
  const appName = a => a.data.adSoyad || a.data.isletmeAdi || '—';
  const initials = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toLocaleUpperCase('tr-TR');
  const num = v => Number(String(v || '').replace(',', '.')) || 0;
  const telHref = t => 'tel:' + String(t || '').replace(/[^\d+]/g, '');
  const waHref = t => 'https://wa.me/' + YK.waNumber(t);
  const lower = s => String(s || '').toLocaleLowerCase('tr-TR');
  const typeLabel = t => t === 'kurye' ? 'Kurye' : 'İşletme';

  $$('[data-i]').forEach(el => { el.innerHTML = I(el.dataset.i); });

  /* =================== Bileşenler =================== */
  function toast(msg, type) {
    const t = document.createElement('div'); t.className = 'toast ' + (type || '');
    t.innerHTML = I(type === 'err' ? 'kapat' : type === 'info' ? 'gelen' : 'check') + '<span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), type === 'info' ? 5000 : 2600); setTimeout(() => t.remove(), type === 'info' ? 5400 : 3000);
  }

  function modal(o) {
    const w = document.createElement('div'); w.className = 'm-wrap';
    w.innerHTML = '<div class="m' + (o.wide ? ' m-wide' : '') + '" role="dialog" aria-modal="true"><div class="m-head"><h3>' + esc(o.title) + '</h3><button class="icon-btn m-x" aria-label="Kapat">' + I('kapat') + '</button></div><div class="m-body"></div><div class="m-foot"></div></div>';
    const body = $('.m-body', w), foot = $('.m-foot', w);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const api = { el: w, body: body, close: close };
    (o.actions || []).forEach(a => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (a.cls || 'btn-light'); b.innerHTML = a.label;
      if (a.left) b.classList.add('left');
      b.onclick = () => a.onClick ? a.onClick(api) : close(); foot.appendChild(b);
    });
    if (!o.actions || !o.actions.length) foot.remove();
    function onKey(e) { if (e.key === 'Escape' && !o.sticky && w === $$('.m-wrap').pop()) close(); }
    function close() { w.remove(); document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); }
    document.addEventListener('keydown', onKey);
    if (!o.sticky) w.addEventListener('mousedown', e => { if (e.target === w) close(); });
    $('.m-x', w).onclick = close;
    document.body.appendChild(w);
    const first = $('input:not([type=hidden]):not([type=file]):not([type=checkbox]),select,textarea', body); if (first && !o.noFocus) setTimeout(() => first.focus(), 30);
    return api;
  }
  function confirmBox(msg, ok, danger) {
    return new Promise(res => {
      modal({
        title: 'Onay', body: '<p class="confirm-msg">' + esc(msg) + '</p>', noFocus: true, onClose: () => res(false),
        actions: [{ label: 'Vazgeç' }, { label: ok || 'Sil', cls: danger === false ? 'btn-dark' : 'btn-danger', onClick: m => { res(true); m.close(); } }]
      });
    });
  }
  // Yazdırılabilir sayfa açar
  function printDoc(title, html) {
    const w = window.open('', '_blank');
    if (!w) { toast('Açılır pencere engellendi. Tarayıcı izin vermeli.', 'err'); return; }
    w.document.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{font:14px/1.5 Poppins,system-ui,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0 0 4px}.sub{color:#666;margin:0 0 20px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:7px 9px;text-align:left;vertical-align:top}th{background:#FFD500;font-size:12px;text-transform:uppercase}td.n,th.n{text-align:right}.logo{height:46px;margin-bottom:14px}.foot{margin-top:28px;color:#888;font-size:12px}.sign{display:flex;justify-content:space-between;margin-top:60px}.sign div{border-top:1px solid #333;padding-top:6px;width:40%;text-align:center}</style></head><body><img class="logo" src="' + location.href.replace(/admin\.html.*$/, '') + 'assets/img/logo.png" alt="">' + html + '<p class="foot">Yakında Kurye · ' + YK.fmtDate(new Date().toISOString(), true) + '</p><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>');
    w.document.close();
  }

  function inputHTML(f, v) {
    v = v == null || v === '' ? (f.def || '') : v;
    const n = ' name="' + f.name + '"' + (f.required ? ' required' : '');
    if (f.type === 'select') {
      const opts = f.options.slice(); if (v && opts.indexOf(v) < 0) opts.push(v);
      return '<select' + n + '>' + (f.def ? '' : '<option value="">Seçiniz</option>') + opts.map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
    }
    if (f.type === 'customer') {
      const cs = YK.list('customers').filter(c => c.durum !== 'Ayrıldı' || c.id === v).sort((a, b) => (a.isletmeAdi || '').localeCompare(b.isletmeAdi || '', 'tr'));
      return '<select' + n + '><option value="">— Atanmadı —</option>' + cs.map(c => '<option value="' + c.id + '"' + (c.id === v ? ' selected' : '') + '>' + esc(c.isletmeAdi) + '</option>').join('') + '</select>';
    }
    if (f.type === 'textarea') return '<textarea' + n + ' rows="' + (f.rows || 3) + '">' + esc(v) + '</textarea>';
    return '<input' + n + ' type="' + (f.type || 'text') + '" value="' + esc(v) + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + (f.type === 'number' ? ' step="any" min="0"' : '') + '>';
  }
  function formHTML(fields, data) {
    data = data || {};
    return '<div class="f-grid">' + fields.map(f => '<label class="fld' + (f.full ? ' full' : '') + '"><span>' + esc(f.label) + (f.required ? ' <i>*</i>' : '') + '</span>' + inputHTML(f, data[f.name]) + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</label>').join('') + '</div>';
  }
  function readForm(root, fields) {
    const d = {}; let ok = true;
    fields.forEach(f => {
      const el = root.querySelector('[name="' + f.name + '"]'); if (!el) return;
      d[f.name] = (el.value || '').trim();
      const bad = f.required && !d[f.name]; el.classList.toggle('bad', bad); if (bad) ok = false;
    });
    if (!ok) { toast('Zorunlu alanları doldurun', 'err'); const b = root.querySelector('.bad'); if (b) b.focus(); }
    return ok ? d : null;
  }
  // Telefon alanlarını 05xx xxx xx xx biçiminde tutar
  function bindTel(root) {
    $$('input[type=tel]', root).forEach(t => {
      t.inputMode = 'tel';
      t.addEventListener('input', () => {
        let d = t.value.replace(/\D/g, ''); if (d.indexOf('90') === 0 && d.length > 11) d = d.slice(2); if (d && d[0] !== '0') d = '0' + d; d = d.slice(0, 11);
        t.value = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(' ');
      });
    });
  }
  function hydrate(root) { $$('img[data-src]', root || document).forEach(im => YK.setImg(im, im.dataset.src)); }
  function avatar(e, size) {
    return '<span class="av' + (size ? ' av-' + size : '') + '">' + (e.foto ? '<img data-src="' + esc(e.foto) + '" alt="">' : esc(initials(e.adSoyad))) + '</span>';
  }
  function badge(k) { const s = statusOf(k); return '<span class="st" style="--c:' + s.color + '">' + esc(s.label) + '</span>'; }
  const EMP_COLORS = { 'Aktif': '#16a34a', 'İzinli': '#d97706', 'Pasif': '#6b7280', 'Ayrıldı': '#dc2626' };
  function empBadge(d) { return '<span class="st" style="--c:' + (EMP_COLORS[d] || '#6b7280') + '">' + esc(d || '—') + '</span>'; }
  function empty(icon, title, text, btn) { return '<div class="empty">' + I(icon) + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (btn || '') + '</div>'; }
  function setTop(title, actions, sub) { $('#pageTitle').textContent = title; $('#pageSub').textContent = sub || ''; $('#topActions').innerHTML = actions || ''; }
  function newCount() { return YK.list('applications').filter(a => a.status === 'yeni').length; }
  function updateBadges() {
    const apps = YK.list('applications').filter(a => a.status === 'yeni');
    [['nbCour', 'kurye'], ['nbBiz', 'isletme']].forEach(([id, t]) => { const n = apps.filter(a => a.type === t).length, b = $('#' + id); b.textContent = n; b.hidden = !n; });
    $('#nbPub').hidden = !YK.hasUnpublished();
    document.title = (apps.length ? '(' + apps.length + ') ' : '') + 'Yönetim Paneli — Yakında Kurye';
  }
  const custName = id => { const c = id && YK.get('customers', id); return c ? c.isletmeAdi : ''; };

  // Çalışanın yaklaşan / geçmiş evrak tarihleri
  function expiries(e) {
    return YK.EXPIRY_FIELDS.filter(([k]) => e[k]).map(([k, l]) => ({ key: k, label: l, date: e[k], days: daysUntil(e[k]) })).filter(x => x.days <= 30);
  }
  const docCount = e => (e.evrak || []).filter(d => YK.EMP_DOCS.indexOf(d) >= 0).length;

  /* =================== Giriş & oturum =================== */
  const R = YK.remote;
  const IDLE_MIN = 60;
  // Geçici inceleme ayarı: yerel modda (PHP'siz hosting, ör. GitHub Pages) panel şifresiz açılır.
  // Yerel modda panel yalnızca o tarayıcının verisini gösterir. Sunucu modunda giriş her zaman zorunludur.
  // Şifreyi geri açmak için false yapın.
  const YEREL_SIFRESIZ = true;
  const sifresiz = () => YEREL_SIFRESIZ && !R.on;
  let lastAct = Date.now();
  ['click', 'keydown', 'mousemove', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  setInterval(() => { if (!sifresiz() && YK.auth.isLogged() && !$('#app').hidden && Date.now() - lastAct > IDLE_MIN * 60000 && !dirty) doLogout('Güvenlik için oturum kapatıldı (60 dk işlem yapılmadı).'); }, 60000);

  let fails = 0, lockUntil = 0;
  try { lockUntil = Number(sessionStorage.getItem('yk_lock')) || 0; } catch (e) {}
  function showLogin(msg) {
    $('#login').hidden = false; $('#app').hidden = true; $$('.m-wrap').forEach(m => m.remove());
    const f = $('#loginForm'), setup = R.on && R.setup, errEl = $('#loginErr'), btn = $('#loginBtn');
    $('#loginTitle').textContent = setup ? 'İlk kurulum' : 'Yönetim Paneli';
    $('#loginSub').textContent = setup ? 'Sunucu bağlantısı hazır. Panel için yönetici hesabınızı oluşturun.' : 'Devam etmek için giriş yapın.';
    $('#pass2Row').hidden = !setup; f.pass2.required = setup;
    $('#codeRow').hidden = !setup; f.code.required = setup;
    f.pass.autocomplete = setup ? 'new-password' : 'current-password';
    btn.textContent = setup ? 'Hesabı oluştur ve giriş yap' : 'Giriş Yap';
    $('#loginMode').innerHTML = R.on ? I('kalkan') + '<span><b>Sunucu modu</b> · başvurular ve tüm veriler sunucuda saklanır</span>'
      : R.problem ? I('uyari') + '<span><b>Sunucu bulundu ama çalışmıyor:</b> ' + esc(R.problem) + ' Bu sorun giderilene kadar panel yerel modda açılır.</span>'
      : I('uyari') + '<span><b>Yerel mod</b> · veriler yalnızca bu tarayıcıda saklanır (sunucu/PHP bulunamadı)</span>';
    $('#loginMode').className = 'login-mode ' + (R.on ? 'on' : 'off');
    const showErr = m => { errEl.textContent = m; errEl.hidden = !m; };
    showErr(msg || '');
    f.onsubmit = async e => {
      e.preventDefault();
      const user = f.user.value.trim(), pass = f.pass.value;
      if (R.on) {
        if (setup) {
          if (pass !== f.pass2.value) return showErr('Şifreler eşleşmiyor.');
          if (pass.length < 8 || !/\d/.test(pass) || !/\D/.test(pass)) return showErr('Şifre en az 8 karakter olmalı ve harf ile rakam içermeli.');
        }
        btn.disabled = true; btn.classList.add('loading');
        try {
          await (setup ? YK.server.setupAdmin(user, pass, f.code.value) : YK.server.login(user, pass));
          await YK.server.pull();
          f.reset(); showErr(''); showApp();
        } catch (er) { showErr(er.message); f.pass.value = ''; f.pass.focus(); }
        finally { btn.disabled = false; btn.classList.remove('loading'); }
        return;
      }
      if (Date.now() < lockUntil) return showErr('Çok fazla hatalı deneme. ' + Math.ceil((lockUntil - Date.now()) / 1000) + ' sn sonra tekrar deneyin.');
      if (YK.auth.check(user, pass)) { fails = 0; YK.auth.login(); YK.log('Panele giriş yapıldı'); f.reset(); showErr(''); showApp(); }
      else {
        fails++; if (fails >= 5) { lockUntil = Date.now() + 60000; fails = 0; try { sessionStorage.setItem('yk_lock', lockUntil); } catch (er) {} }
        showErr('Kullanıcı adı veya şifre hatalı.'); f.pass.value = ''; f.pass.focus();
      }
    };
    setTimeout(() => (setup || !f.user.value ? f.user : f.pass).focus(), 50);
  }
  function showApp() {
    $('#login').hidden = true; $('#app').hidden = false; lastAct = Date.now();
    const u = YK.auth.creds().user; $('#suName').textContent = u; $('.su-av').textContent = (u[0] || 'A').toLocaleUpperCase('tr-TR');
    knownNew = newCount(); renderSync(); route();
  }
  async function doLogout(msg) {
    if (sifresiz()) { YK.auth.logout(); location.href = 'index.html'; return; }
    if (R.on) await YK.server.logout(); else YK.auth.logout();
    history.replaceState(null, '', location.pathname); lastHash = ''; dirty = false;
    showLogin(msg);
    if (msg) toast(msg, 'err');
  }
  $('#pwEye').onclick = () => { const p = $('#loginForm').pass; p.type = p.type === 'password' ? 'text' : 'password'; $('#pwEye').innerHTML = I(p.type === 'password' ? 'goz' : 'kapat'); };
  $('#logout').onclick = () => {
    if (!leaveOk()) return;
    if (R.on && YK.server.pending() && !confirm('Sunucuya henüz kaydedilmemiş değişiklikler var. Yine de çıkış yapılsın mı?')) return;
    doLogout();
  };

  // Sunucu kayıt durumu (kenar menüde)
  function renderSync() {
    const el = $('#syncState'); if (!el) return;
    if (!R.on) { el.className = 'sync local'; el.innerHTML = I('uyari') + '<span><b>Yerel mod</b><small>Veriler bu tarayıcıda</small></span>'; el.title = 'Sunucu (PHP) bulunamadı. Başvurular ve veriler yalnızca bu tarayıcıda saklanır.'; return; }
    const st = YK.server.state();
    el.className = 'sync ' + (st.error ? 'err' : st.pending ? 'busy' : 'ok');
    el.innerHTML = I(st.error ? 'uyari' : st.pending ? 'gecmis' : 'check') + '<span><b>' + (st.error ? 'Kaydedilemedi' : st.pending ? 'Kaydediliyor…' : 'Sunucuya kaydedildi') + '</b><small>' + esc(st.error || 'Sunucu modu · veriler güvende') + '</small></span>' + (st.error ? '<button class="link-btn" id="syncRetry">Tekrar dene</button>' : '');
    el.title = '';
    const rb = $('#syncRetry'); if (rb) rb.onclick = () => YK.server.retry();
  }
  window.addEventListener('yk:sync', renderSync);
  window.addEventListener('yk:auth', () => { if (!$('#app').hidden) showLogin('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın; kaydedilmeyi bekleyen değişiklikler giriş yapınca gönderilir.'); });

  /* =================== Canlı bildirim =================== */
  // Yeni başvuru gelince bildirir (sunucu modunda 30 sn'de bir kontrol edilir; yerel modda aynı tarayıcıdaki site sekmesinden)
  let knownNew = 0;
  function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); [0, .18].forEach(t => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.12, c.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + t + .15); o.connect(g); g.connect(c.destination); o.start(c.currentTime + t); o.stop(c.currentTime + t + .16); }); } catch (e) {} }
  function onAppsChanged() {
    if (!YK.auth.isLogged() || $('#app').hidden) return;
    const n = newCount();
    if (n > knownNew) { const a = YK.list('applications').filter(x => x.status === 'yeni')[0]; if (a) { toast('Yeni ' + (a.type === 'kurye' ? 'kurye başvurusu' : 'işletme talebi') + ': ' + appName(a), 'info'); beep(); } }
    knownNew = n; updateBadges();
    if (/^#?(panel|basvurular(\/.*)?)?$/.test(location.hash.replace('#', '')) && !$('.m-wrap') && !dirty) rerender();
  }
  window.addEventListener('storage', e => { if (!R.on && e.key === 'yk_applications') onAppsChanged(); });
  window.addEventListener('yk:remote', e => { if (e.detail.key === 'yk_applications') onAppsChanged(); });

  /* =================== Yönlendirme =================== */
  const ROUTES = { panel: viewPanel, basvurular: viewApps, musteriler: viewCustomers, musteri: viewCustomer, calisanlar: viewEmps, calisan: viewEmp, kayitlar: viewRecords, icerik: viewContent, gorseller: viewMedia, ayarlar: viewSettings };
  let dirty = false, lastHash = location.hash, skip = false;
  function leaveOk() { return !dirty || confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?'); }
  window.addEventListener('beforeunload', e => { if (dirty || (R.on && YK.server.pending())) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('hashchange', () => {
    if (skip) { skip = false; return; }
    if (!leaveOk()) { skip = true; location.hash = lastHash; return; }
    dirty = false; route();
  });
  function route() {
    if (!YK.auth.isLogged() && sifresiz()) YK.auth.login();
    if (!YK.auth.isLogged()) return showLogin();
    lastHash = location.hash;
    const parts = (location.hash.slice(1) || 'panel').split('/');
    const fn = ROUTES[parts[0]] || viewPanel;
    const full = parts.slice(0, 2).join('/');
    const navKey = parts[0] === 'calisan' ? 'calisanlar' : parts[0] === 'musteri' ? 'musteriler' : parts[0] === 'icerik' ? (parts[1] === 'seo' ? 'icerik/seo' : 'icerik') : parts[0] === 'basvurular' ? full : parts[0];
    $$('#sideNav a').forEach(a => a.classList.toggle('active', a.dataset.r === navKey));
    $('#gres').hidden = true; $('#gq').value = '';
    document.body.classList.remove('side-open');
    updateBadges(); knownNew = newCount();
    if (R.on && (parts[0] === 'panel' || parts[0] === 'basvurular')) YK.server.refresh();
    view.innerHTML = '';
    fn(decodeURIComponent(parts[1] || ''));
    hydrate(view);
    window.scrollTo(0, 0);
  }
  function rerender() { const y = window.scrollY; route(); window.scrollTo(0, y); }
  $('#menuBtn').onclick = () => document.body.classList.toggle('side-open');
  $('#sideOverlay').onclick = () => document.body.classList.remove('side-open');

  /* =================== Genel Bakış =================== */
  function setupChecks() {
    const c = YK.getContent(), D = YK.DEFAULT_CONTENT, s = c.settings;
    let lastBackup = null; try { lastBackup = localStorage.getItem('yk_last_backup'); } catch (e) {}
    return [
      { ok: R.on, t: 'Siteyi PHP destekli bir hostinge yükleyin (başvuruların panele düşmesi için sunucu modu)', href: '#ayarlar' },
      { ok: !YK.auth.isDefault(), t: 'Panel şifresini değiştirin', href: '#ayarlar' },
      { ok: s.phone && s.phone !== D.settings.phone, t: 'Gerçek telefon numaranızı girin', href: '#icerik/genel' },
      { ok: s.whatsapp && s.whatsapp !== D.settings.whatsapp, t: 'WhatsApp numaranızı girin', href: '#icerik/genel' },
      { ok: s.address && s.address !== D.settings.address, t: 'Şube adresinizi girin', href: '#icerik/genel' },
      { ok: s.email && s.email !== D.settings.email || !!(c.reviewed || {}).email, t: 'E-posta adresini kontrol edin', href: '#icerik/genel', confirm: 'email' },
      { ok: !!c.calc.configured || c.sections.calc === false, t: 'Kazanç hesaplayıcıdaki paket ücretini ayarlayın', href: '#icerik/kazanc' },
      { ok: !!(c.reviewed || {}).stats, t: 'İstatistik bandındaki değerleri doğrulayın', href: '#icerik/hero', confirm: 'stats' },
      { ok: !!s.notify_key || (R.on && !!YK.serverSettings().notify_email), t: 'Yeni başvurular için e-posta bildirimini kurun (önerilir)', href: R.on ? '#ayarlar' : '#icerik/genel' },
      { ok: !!s.site_url, t: 'SEO: sitenizin alan adını girin (ör. https://yakindakurye.com)', href: '#icerik/seo' },
      { ok: !YK.hasUnpublished(), t: 'Site değişikliklerini yayınlayın', href: '#icerik/yayin' },
      { ok: lastBackup && Date.now() - new Date(lastBackup) < 7 * 864e5, t: 'Son 7 gün içinde yedek alın', href: '#ayarlar' }
    ];
  }

  function migrateCard() {
    const ld = R.on && YK.server.localData();
    if (!ld) return '';
    const parts = [['applications', 'başvuru'], ['customers', 'müşteri'], ['employees', 'çalışan'], ['records', 'kayıt']].filter(([k]) => ld[k]).map(([k, l]) => ld[k] + ' ' + l);
    if (ld.content) parts.push('site içeriği taslağı');
    return '<div class="alert migr">' + I('yukle') + '<div><b>Bu tarayıcıda yerel modda kaydedilmiş veriler bulundu:</b> ' + esc(parts.join(', ')) + '. Sunucuya aktarırsanız tüm cihazlardan erişebilirsiniz; aynı kayıtlar güncellenir, hiçbir şey kopyalanmaz.<div class="btn-row mt"><button class="btn btn-dark sm" id="migrGo">' + I('yukle') + 'Sunucuya aktar</button><button class="link-btn" id="migrNo">Aktarmadan bu tarayıcıdan sil</button></div></div></div>';
  }
  function bindMigrate(root) {
    const go = $('#migrGo', root), no = $('#migrNo', root);
    if (go) go.onclick = async () => {
      const ld = YK.server.localData() || {};
      // Sunucuda da site içeriği taslağı varsa hangisinin kullanılacağını sor
      const useLocal = !!ld.content && YK.server.hasDraft() &&
        confirm('Bu tarayıcıdaki site içeriği taslağı, sunucudaki taslağın yerine geçsin mi?\n\nTamam: bu tarayıcıdaki taslak kullanılır.\nİptal: sunucudaki içerik korunur (başvuru, müşteri, çalışan ve kayıtlar yine aktarılır).');
      go.disabled = true; go.classList.add('loading');
      try { await YK.server.migrateLocal(useLocal); toast('Yerel veriler sunucuya aktarıldı'); } catch (e) { toast(e.message, 'err'); }
      rerender();
    };
    if (no) no.onclick = async () => { if (await confirmBox('Bu tarayıcıdaki yerel kopyalar silinsin mi? Sunucudaki veriler etkilenmez.', 'Sil')) { await YK.server.clearLocal(); toast('Yerel kopyalar silindi'); rerender(); } };
  }
  const previewHref = () => R.on ? 'index.html?onizleme=1' : 'index.html';
  // Sitede düzenleme modu: site sayfası açılır, yazılara/görsellere tıklayarak yerinde düzenlenir
  const editBtn = cls => '<a href="index.html?onizleme=1&duzenle=1" target="_blank" class="btn ' + (cls || 'btn-light') + '" data-edit title="Siteyi açıp yazılara ve görsellere tıklayarak düzenleyin">' + I('kalem') + '<span class="hide-sm">Sitede düzenle</span></a>';
  document.addEventListener('click', e => { if (e.target.closest('[data-edit]')) { try { localStorage.setItem('yk_edit_ok', String(Date.now())); } catch (er) {} } });

  function viewPanel() {
    setTop('Genel Bakış', '<a href="index.html" target="_blank" rel="noopener" class="btn btn-light">' + I('dis') + '<span class="hide-sm">Siteyi aç</span></a>');
    const apps = YK.list('applications'), emps = YK.list('employees'), recs = YK.list('records');
    const m = thisMonth();
    const newApps = apps.filter(a => a.status === 'yeni').length;
    const monthApps = apps.filter(a => (a.createdAt || '').slice(0, 7) === m).length;
    const active = emps.filter(e => e.durum === 'Aktif').length;
    const monthRecs = recs.filter(r => (r.tarih || '').slice(0, 7) === m);
    const sum = summary(monthRecs);

    const days = []; for (let i = 13; i >= 0; i--) days.push(addDays(today(), -i));
    const per = days.map(d => recs.filter(r => r.tarih === d).reduce((s, r) => s + num(r.paket), 0));
    const max = Math.max.apply(null, per.concat([1]));
    const appPer = days.map(d => apps.filter(a => isoDay(a.createdAt) === d).length);
    const appMax = Math.max.apply(null, appPer.concat([1]));

    const checks = setupChecks(), done = checks.filter(c => c.ok).length;
    const checkCard = done < checks.length ? '<section class="card setup"><div class="card-head"><h2>' + I('check') + ' Yayına hazırlık kontrol listesi</h2><span class="pill">' + done + ' / ' + checks.length + '</span></div><div class="setup-bar"><i style="width:' + (done / checks.length * 100) + '%"></i></div><ul class="setup-list">' +
      checks.map(c => '<li class="' + (c.ok ? 'ok' : '') + '"><span class="sc">' + I(c.ok ? 'check' : 'uyari') + '</span><span>' + esc(c.t) + '</span>' + (c.ok ? '' : (c.confirm ? '<button class="link-btn" data-conf="' + c.confirm + '">Doğruladım</button>' : '') + '<a class="link" href="' + c.href + '">Düzenle →</a>') + '</li>').join('') + '</ul></section>' : '';

    const alerts = [];
    emps.filter(e => e.durum !== 'Ayrıldı').forEach(e => expiries(e).forEach(x => alerts.push({ e: e, x: x })));
    alerts.sort((a, b) => a.x.days - b.x.days);
    const alertCard = alerts.length ? '<section class="card"><div class="card-head"><h2>' + I('uyari') + ' Evrak & tarih uyarıları</h2><span class="pill red">' + alerts.length + '</span></div><ul class="mini-list">' +
      alerts.slice(0, 8).map(a => '<li data-emp="' + a.e.id + '">' + avatar(a.e, 'sm') + '<div><b>' + esc(a.e.adSoyad) + '</b><small>' + esc(a.x.label) + ' · ' + YK.fmtDate(a.x.date) + '</small></div><span class="st" style="--c:' + (a.x.days < 0 ? '#dc2626' : '#d97706') + '">' + (a.x.days < 0 ? (-a.x.days) + ' gün geçti' : a.x.days === 0 ? 'Bugün' : a.x.days + ' gün kaldı') + '</span></li>').join('') + '</ul></section>' : '';

    const byEmp = {}; monthRecs.forEach(r => { byEmp[r.empId] = (byEmp[r.empId] || 0) + num(r.paket); });
    const top = Object.keys(byEmp).map(id => ({ e: emps.find(x => x.id === id), p: byEmp[id] })).filter(x => x.e && x.p).sort((a, b) => b.p - a.p).slice(0, 5);
    const topMax = top.length ? top[0].p : 1;
    const logs = YK.getLog().slice(0, 7);

    const hr = new Date().getHours(), greet = hr < 6 ? 'İyi geceler' : hr < 12 ? 'Günaydın' : hr < 18 ? 'İyi günler' : 'İyi akşamlar';
    const custs = YK.list('customers'), activeCust = custs.filter(c => c.durum === 'Aktif' || c.durum === 'Deneme').length;
    const nBiz = apps.filter(a => a.status === 'yeni' && a.type === 'isletme').length, nCour = apps.filter(a => a.status === 'yeni' && a.type === 'kurye').length;
    const miniApps = (t, title) => { const l = apps.filter(a => a.type === t).slice(0, 5); return '<section class="card"><div class="card-head"><h2>' + I(t === 'kurye' ? 'motor' : 'magaza') + title + '</h2><a href="#basvurular/' + t + '" class="link">Tümü →</a></div>' +
      (l.length ? '<ul class="mini-list">' + l.map(a => '<li data-app="' + a.id + '"><span class="type-dot ' + a.type + '">' + esc(initials(appName(a))) + '</span><div><b>' + esc(appName(a)) + '</b><small>' + esc(t === 'kurye' ? [a.data.ilce, a.data.calismaModeli].filter(Boolean).join(' · ') : [a.data.sektor, a.data.ilce].filter(Boolean).join(' · ')) + ' · ' + YK.fmtDate(a.createdAt, true) + '</small></div>' + badge(a.status) + '</li>').join('') + '</ul>'
        : empty(t === 'kurye' ? 'motor' : 'magaza', t === 'kurye' ? 'Henüz kurye başvurusu yok' : 'Henüz işletme talebi yok', 'Sitedeki ' + (t === 'kurye' ? 'kurye başvuru' : 'işletme talep') + ' formundan gelenler burada listelenir.')) + '</section>'; };
    view.innerHTML = '<section class="welcome"><div><small>' + new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</small><h2>' + greet + ', ' + esc(YK.auth.creds().user) + '</h2><p>' + (nBiz + nCour ? '<b>' + nBiz + '</b> yeni işletme talebi ve <b>' + nCour + '</b> yeni kurye başvurusu sizi bekliyor.' : 'Bekleyen yeni başvuru yok. Her şey yolunda!') + '</p></div><div class="welcome-btns"><a href="#basvurular/isletme" class="btn btn-yellow">' + I('magaza') + 'İşletme talepleri</a><a href="#basvurular/kurye" class="btn btn-ghost-w">' + I('motor') + 'Kurye başvuruları</a>' + editBtn('btn-ghost-w') + '</div></section>' + (YK.auth.isDefault() ? '<div class="alert">' + I('kalkan') + '<div><b>Varsayılan şifre kullanılıyor.</b> Güvenliğiniz için <a href="#ayarlar">Ayarlar</a> bölümünden şifrenizi değiştirin.</div></div>' : '') +
      migrateCard() + checkCard +
      '<div class="kpis">' +
      kpi('magaza', 'Yeni işletme talebi', nBiz, '#basvurular/isletme', nBiz ? 'hot' : '', 'biz') +
      kpi('motor', 'Yeni kurye başvurusu', nCour, '#basvurular/kurye', nCour ? 'hot' : '', 'cour') +
      kpi('bina', 'Aktif müşteri işletme', activeCust + ' / ' + custs.length, '#musteriler', '', 'cust') +
      kpi('ekip', 'Aktif kurye / çalışan', active + ' / ' + emps.length, '#calisanlar', '', 'emp') +
      '</div>' + alertCard +
      '<div class="grid-2">' +
      miniApps('isletme', 'Son işletme talepleri') + miniApps('kurye', 'Son kurye başvuruları') + '</div><div class="grid-2">' +
      '<section class="card"><div class="card-head"><h2>' + I('grafik') + 'Son 14 gün</h2><div class="seg sm" id="chartSeg"><button class="on" data-c="p">Paket</button><button data-c="a">Başvuru</button></div></div>' +
      '<div class="bars" id="barsP">' + per.map((v, i) => bar(v, max, days[i], 'paket')).join('') + '</div>' +
      '<div class="bars" id="barsA" hidden>' + appPer.map((v, i) => bar(v, appMax, days[i], 'başvuru')).join('') + '</div>' +
      '<div class="mini-stats"><div><small>Bu ay çalışma saati</small><b>' + sum.saat.toLocaleString('tr-TR') + ' sa</b></div><div><small>Bu ay hakediş</small><b>' + YK.fmtMoney(sum.kazanc) + '</b></div><div><small>Bu ay ödenen</small><b>' + YK.fmtMoney(sum.odenen) + '</b></div></div>' +
      '</section>' +
      '<section class="card"><div class="card-head"><h2>' + I('yildiz') + 'Bu ayın en çok teslimat yapanları</h2></div>' +
      (top.length ? '<ol class="leader">' + top.map((x, i) => '<li data-emp="' + x.e.id + '"><span class="rank r' + (i + 1) + '">' + (i + 1) + '</span>' + avatar(x.e, 'sm') + '<div><b>' + esc(x.e.adSoyad) + '</b><span class="lbar"><i style="width:' + (x.p / topMax * 100) + '%"></i></span></div><b class="lnum">' + x.p.toLocaleString('tr-TR') + '</b></li>').join('') + '</ol>'
        : empty('grafik', 'Henüz veri yok', 'Vardiya kayıtlarına paket sayısı girildikçe sıralama oluşur.')) + '</section>' +
      '</div><div class="grid-2"><section class="card"><div class="card-head"><h2>' + I('gelen') + 'Başvuru durumları</h2></div><div class="status-row">' +
      YK.APP_STATUSES.map(s => { const n = apps.filter(a => a.status === s.key).length; return '<a href="#basvurular" data-st="' + s.key + '" class="status-box" style="--c:' + s.color + '"><b>' + n + '</b><span>' + s.label + '</span></a>'; }).join('') +
      '</div></section><section class="card"><div class="card-head"><h2>' + I('gecmis') + 'Son işlemler</h2><a href="#ayarlar" class="link">Geçmiş →</a></div>' +
      (logs.length ? '<ul class="log">' + logs.map(l => '<li><span>' + esc(l.text) + '</span><small>' + YK.fmtDate(l.t, true) + '</small></li>').join('') + '</ul>' : '<p class="muted small">Henüz işlem yok.</p>') +
      '</section></div>' +
      '<section class="quick"><a href="#musteriler" data-q="cust" class="q-btn">' + I('bina') + 'Yeni müşteri ekle</a><a href="#calisanlar" data-q="emp" class="q-btn">' + I('kullanici') + 'Yeni çalışan ekle</a><a href="#kayitlar" data-q="puantaj" class="q-btn">' + I('takvim') + 'Günlük puantaj gir</a><a href="#kayitlar" data-q="rapor" class="q-btn">' + I('hesap') + 'Hakediş raporu</a><a href="#icerik" class="q-btn">' + I('yazi') + 'Site içeriğini düzenle</a><a href="index.html?onizleme=1&duzenle=1" target="_blank" data-edit class="q-btn">' + I('kalem') + 'Sitede tıklayarak düzenle</a><a href="#gorseller" class="q-btn">' + I('gorsel') + 'Görsel kütüphanesi</a></section>';

    $$('[data-app]', view).forEach(li => li.onclick = () => openApp(li.dataset.app));
    $$('[data-emp]', view).forEach(li => li.onclick = () => { location.hash = '#calisan/' + li.dataset.emp; });
    $$('[data-st]', view).forEach(a => a.onclick = () => { state.apps = Object.assign(state.apps || {}, { status: a.dataset.st }); });
    $$('[data-q]', view).forEach(a => a.onclick = e => { e.preventDefault(); const q = a.dataset.q; if (q === 'cust') custForm(null, null, c => { location.hash = '#musteri/' + c.id; }); else if (q === 'emp') empForm(null, null, () => { location.hash = '#calisanlar'; }); else if (q === 'puantaj') puantajModal(); else payrollModal(); });
    $$('[data-conf]', view).forEach(b => b.onclick = e => { e.preventDefault(); const c = YK.getContent(); c.reviewed = Object.assign({}, c.reviewed, { [b.dataset.conf]: true }); YK.saveContent(c); rerender(); });
    $$('#chartSeg button').forEach(b => b.onclick = () => { $$('#chartSeg button').forEach(x => x.classList.toggle('on', x === b)); $('#barsP').hidden = b.dataset.c !== 'p'; $('#barsA').hidden = b.dataset.c !== 'a'; });
    bindMigrate(view);
  }
  function bar(v, max, d, unit) { return '<div class="bar" title="' + YK.fmtDate(d) + ': ' + v + ' ' + unit + '"><em>' + (v || '') + '</em><i style="height:' + Math.max(2, v / max * 100) + '%"></i><span>' + d.slice(8) + '</span></div>'; }
  function kpi(ic, label, val, href, cls, tone) { return '<a class="kpi ' + (cls || '') + ' tone-' + (tone || 'k') + '" href="' + href + '"><span class="kpi-ic">' + I(ic) + '</span><div><small>' + esc(label) + '</small><b>' + esc(val) + '</b></div></a>'; }

  /* =================== Başvurular =================== */
  function viewApps(type) {
    const st = state.apps = Object.assign({ status: '', q: '', sort: 'new', sel: {} }, state.apps);
    st.sel = {}; st.type = type === 'kurye' || type === 'isletme' ? type : '';
    setTop(st.type === 'kurye' ? 'Kurye Başvuruları' : st.type === 'isletme' ? 'İşletme Talepleri' : 'Tüm Başvurular', '<button class="btn btn-light" id="csvApps">' + I('indir') + '<span class="hide-sm">Excel (CSV)</span></button><button class="btn btn-yellow" id="addApp">' + I('arti') + (st.type === 'kurye' ? 'Yeni başvuru' : st.type === 'isletme' ? 'Yeni talep' : 'Yeni kayıt') + '</button>',
      st.type === 'kurye' ? 'Kurye olmak için siteden başvuranlar' : st.type === 'isletme' ? 'Kurye hizmeti almak isteyen restoran ve işletmeler' : 'İşletme talepleri ve kurye başvuruları birlikte');
    view.innerHTML =
      '<div class="toolbar">' +
      '<div class="seg" id="segType">' + [['isletme', 'İşletme talepleri'], ['kurye', 'Kurye başvuruları'], ['', 'Tümü']].map(([k, l]) => '<a href="#basvurular' + (k ? '/' + k : '') + '" class="' + (st.type === k ? 'on' : '') + '">' + l + '</a>').join('') + '</div>' +
      '<select id="fStatus" class="sel"><option value="">Tüm durumlar</option>' + YK.APP_STATUSES.map(s => '<option value="' + s.key + '"' + (st.status === s.key ? ' selected' : '') + '>' + s.label + '</option>').join('') + '</select>' +
      '<select id="fSort" class="sel"><option value="new">En yeni</option><option value="old"' + (st.sort === 'old' ? ' selected' : '') + '>En eski</option><option value="name"' + (st.sort === 'name' ? ' selected' : '') + '>Ada göre</option></select>' +
      '<label class="search">' + I('ara') + '<input id="fQ" placeholder="Ad, telefon, başvuru no, ilçe…" value="' + esc(st.q) + '"></label>' +
      '</div><div class="bulk" id="bulk" hidden><b id="bulkN"></b><select id="bulkSt" class="sel"><option value="">Durum değiştir…</option>' + YK.APP_STATUSES.map(s => '<option value="' + s.key + '">' + s.label + '</option>').join('') + '</select><button class="btn btn-light sm" id="bulkCsv">' + I('indir') + 'CSV</button><button class="btn btn-danger-ghost sm" id="bulkDel">' + I('cop') + 'Sil</button><button class="link-btn" id="bulkClr">Seçimi temizle</button></div>' +
      '<section class="card flush"><div id="appTable"></div></section>';

    const filtered = () => {
      const q = lower(st.q);
      const rows = YK.list('applications').filter(a => (!st.type || a.type === st.type) && (!st.status || a.status === st.status) &&
        (!q || lower([a.ref, appName(a), a.data.telefon, a.data.ilce, a.data.il, a.data.yetkili, a.data.eposta].join(' ')).indexOf(q) >= 0));
      if (st.sort === 'old') rows.reverse();
      if (st.sort === 'name') rows.sort((x, y) => appName(x).localeCompare(appName(y), 'tr'));
      return rows;
    };
    const selIds = () => Object.keys(st.sel).filter(k => st.sel[k]);
    function syncBulk() { const n = selIds().length; $('#bulk').hidden = !n; $('#bulkN').textContent = n + ' seçili'; const all = $('#selAll'); if (all) { const vis = $$('#appTable [data-sel]'); all.checked = vis.length && vis.every(c => c.checked); } }
    function draw() {
      const rows = filtered();
      $('#appTable').innerHTML = rows.length ?
        '<div class="table-wrap"><table class="tbl tbl-apps"><thead><tr><th class="cb"><input type="checkbox" id="selAll" aria-label="Tümünü seç"></th><th>Tarih</th><th>Tür</th><th>' + (st.type === 'kurye' ? 'Ad Soyad' : st.type === 'isletme' ? 'İşletme / Yetkili' : 'Ad / İşletme') + '</th><th>Telefon</th><th class="hide-md">Konum</th><th class="hide-md">Detay</th><th>Durum</th></tr></thead><tbody>' +
        rows.map(a => '<tr data-id="' + a.id + '" class="' + (a.seen ? '' : 'unseen') + '"><td class="cb"><input type="checkbox" data-sel="' + a.id + '"' + (st.sel[a.id] ? ' checked' : '') + ' aria-label="Seç"></td><td><b>' + YK.fmtDate(a.createdAt) + '</b><small>' + esc(a.ref || '') + (a.notified ? ' · ' + I('mail', 'tiny') : '') + '</small></td>' +
          '<td><span class="type-tag ' + a.type + '">' + typeLabel(a.type) + '</span></td>' +
          '<td><b>' + esc(appName(a)) + '</b>' + (a.type === 'isletme' ? '<small>' + esc(a.data.yetkili || '') + '</small>' : '') + ((a.notes || []).length ? '<small>' + I('belge', 'tiny') + ' ' + a.notes.length + ' not</small>' : '') + '</td>' +
          '<td class="nowrap">' + esc(a.data.telefon || '') + '</td><td class="hide-md">' + esc([a.data.ilce, a.data.il].filter(Boolean).join(' / ')) + '</td>' +
          '<td class="hide-md"><small>' + esc(a.type === 'kurye' ? [a.data.calismaModeli, a.data.motor && a.data.motor.indexOf('Kendi') === 0 ? 'Kendi motoru' : 'Motor yok'].filter(Boolean).join(' · ') : [a.data.sektor, a.data.gunlukPaket && a.data.gunlukPaket + ' paket/gün'].filter(Boolean).join(' · ')) + '</small></td>' +
          '<td>' + badge(a.status) + '</td></tr>').join('') + '</tbody></table></div><div class="tbl-foot">' + rows.length + (st.type === 'isletme' ? ' talep' : ' kayıt') + '</div>'
        : empty(st.type === 'kurye' ? 'motor' : st.type === 'isletme' ? 'magaza' : 'gelen', 'Kayıt bulunamadı', st.q || st.status ? 'Filtreleri değiştirerek tekrar deneyin.' : st.type === 'isletme' ? 'Sitedeki işletme talep formundan gelen talepler burada görünür.' : st.type === 'kurye' ? 'Sitedeki kurye başvuru formundan gelen başvurular burada görünür.' : 'Sitedeki formlardan gelen kayıtlar burada görünür.');
      $$('#appTable tr[data-id]').forEach(tr => tr.onclick = e => { if (e.target.closest('.cb')) return; openApp(tr.dataset.id, draw); });
      $$('#appTable [data-sel]').forEach(c => c.onchange = () => { st.sel[c.dataset.sel] = c.checked; syncBulk(); });
      const all = $('#selAll'); if (all) all.onchange = () => { $$('#appTable [data-sel]').forEach(c => { c.checked = all.checked; st.sel[c.dataset.sel] = all.checked; }); syncBulk(); };
      syncBulk();
    }
    $('#fStatus').onchange = e => { st.status = e.target.value; draw(); };
    $('#fSort').onchange = e => { st.sort = e.target.value; draw(); };
    $('#fQ').oninput = e => { st.q = e.target.value; draw(); };
    const exportRows = rows => {
      const keys = []; ['kurye', 'isletme'].forEach(t => YK.FORMS[t].fields.forEach(f => { if (!keys.find(k => k.key === f.name)) keys.push({ key: f.name, label: f.label }); }));
      const cols = [{ label: 'Başvuru No', get: r => r.ref }, { label: 'Tarih', get: r => YK.fmtDate(r.createdAt, true) }, { label: 'Tür', get: r => typeLabel(r.type) }, { label: 'Durum', get: r => statusOf(r.status).label }]
        .concat(keys.map(k => ({ label: k.label, get: r => r.data[k.key] }))).concat([{ label: 'Notlar', get: r => (r.notes || []).map(n => n.text).join(' | ') }]);
      YK.download('basvurular-' + today() + '.csv', YK.toCSV(rows, cols), 'text/csv;charset=utf-8');
    };
    $('#csvApps').onclick = () => exportRows(filtered());
    $('#addApp').onclick = () => {
      const after = a => { updateBadges(); draw(); openApp(a.id, draw); };
      if (st.type) return appForm(st.type, null, after);
      const body = document.createElement('div');
      body.innerHTML = '<p class="muted">Telefonla, WhatsApp’tan veya yüz yüze gelen kayıtları panele ekleyebilirsiniz. Kayıt türünü seçin:</p><div class="choice"><button class="q-btn" data-t="isletme">' + I('magaza') + 'İşletme talebi</button><button class="q-btn" data-t="kurye">' + I('motor') + 'Kurye başvurusu</button></div>';
      const m = modal({ title: 'Yeni kayıt', body: body, noFocus: true });
      $$('[data-t]', body).forEach(b => b.onclick = () => { m.close(); appForm(b.dataset.t, null, after); });
    };
    $('#bulkCsv').onclick = () => { const ids = selIds(); exportRows(YK.list('applications').filter(a => ids.includes(a.id))); };
    $('#bulkSt').onchange = e => {
      const s = e.target.value; if (!s) return; const ids = selIds();
      YK.saveList('applications', YK.list('applications').map(a => ids.includes(a.id) ? Object.assign({}, a, { status: s, seen: true, updatedAt: new Date().toISOString() }) : a));
      YK.log(ids.length + ' başvurunun durumu "' + statusOf(s).label + '" yapıldı'); toast(ids.length + ' başvuru güncellendi'); st.sel = {}; e.target.value = ''; updateBadges(); draw();
    };
    $('#bulkDel').onclick = async () => {
      const ids = selIds(); if (!(await confirmBox(ids.length + ' başvuru kalıcı olarak silinsin mi?'))) return;
      YK.saveList('applications', YK.list('applications').filter(a => !ids.includes(a.id)));
      YK.log(ids.length + ' başvuru silindi'); toast(ids.length + ' başvuru silindi'); st.sel = {}; updateBadges(); draw();
    };
    $('#bulkClr').onclick = () => { st.sel = {}; draw(); };
    draw();
  }

  // Panelden başvuru ekleme / düzenleme
  function appForm(type, app, onSaved) {
    const def = YK.getForms()[type];
    const body = document.createElement('div');
    body.innerHTML = (app ? '' : '<p class="muted small">Kayıt “Yeni” durumunda eklenir; kaynak olarak “Panel” görünür.</p>') + formHTML(def.fields, app ? app.data : {});
    bindTel(body);
    modal({
      title: app ? appName(app) + ' – bilgileri düzenle' : (type === 'kurye' ? 'Yeni kurye başvurusu' : 'Yeni işletme talebi'), body: body, wide: true,
      actions: [{ label: 'Vazgeç' }, {
        label: I('check') + 'Kaydet', cls: 'btn-dark', onClick: m => {
          const d = readForm(body, def.fields); if (!d) return;
          const bad = (name, msg) => { toast(msg, 'err'); const el = body.querySelector('[name="' + name + '"]'); el.classList.add('bad'); el.focus(); };
          if (d.telefon.replace(/\D/g, '').length !== 11) return bad('telefon', 'Telefonu 05xx xxx xx xx biçiminde girin');
          if (d.eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.eposta)) return bad('eposta', 'Geçerli bir e-posta girin');
          const saved = app ? YK.update('applications', app.id, { data: Object.assign({}, app.data, d) })
            : YK.add('applications', { type: type, status: 'yeni', ref: YK.refNo(), data: d, kvkk: false, notes: [], source: 'panel', seen: true });
          if (!saved) return;
          YK.log(appName(saved) + (app ? ' kaydının bilgileri düzenlendi' : (type === 'kurye' ? ' kurye başvurusu' : ' işletme talebi') + ' panelden eklendi'));
          m.close(); toast(app ? 'Bilgiler güncellendi' : 'Kayıt eklendi'); if (onSaved) onSaved(saved);
        }
      }]
    });
  }

  function printApp(a) {
    const def = YK.FORMS[a.type];
    printDoc(def.label + ' ' + (a.ref || ''), '<h1>' + esc(def.label) + ' — ' + esc(appName(a)) + '</h1><p class="sub">Başvuru No: ' + esc(a.ref || '') + ' · ' + YK.fmtDate(a.createdAt, true) + ' · Durum: ' + esc(statusOf(a.status).label) + '</p><table>' +
      def.fields.map(f => '<tr><th style="width:34%">' + esc(f.label) + '</th><td>' + esc(f.type === 'date' ? YK.fmtDate(a.data[f.name]) : a.data[f.name] || '—').replace(/\n/g, '<br>') + '</td></tr>').join('') +
      '<tr><th>KVKK onayı</th><td>' + (a.kvkk ? 'Verildi (web formu)' : a.source === 'panel' ? 'Panelden eklendi' : '—') + '</td></tr></table>' +
      ((a.notes || []).length ? '<h1 style="margin-top:24px;font-size:16px">Notlar</h1><table>' + a.notes.map(n => '<tr><td style="width:24%">' + YK.fmtDate(n.t, true) + '</td><td>' + esc(n.text) + '</td></tr>').join('') + '</table>' : '') +
      '<div class="sign"><div>Başvuru sahibi</div><div>Yetkili</div></div>');
  }

  function openApp(id, onChange) {
    let a = YK.get('applications', id); if (!a) return;
    if (!a.seen) { a = YK.update('applications', id, { seen: true }); updateBadges(); }
    const def = YK.FORMS[a.type];
    const refresh = () => { updateBadges(); if (onChange) onChange(); else if (/^#?(panel)?$/.test(location.hash.replace('#', ''))) rerender(); };
    const body = document.createElement('div');
    let m;
    function render() {
      a = YK.get('applications', id);
      const age = a.data.dogumTarihi ? Math.floor((Date.now() - new Date(a.data.dogumTarihi)) / 31557600000) : null;
      body.innerHTML =
        '<div class="app-head"><span class="type-tag ' + a.type + '">' + def.label + '</span><span class="muted">' + esc(a.ref || '') + ' · ' + YK.fmtDate(a.createdAt, true) + '</span>' + (a.source === 'panel' ? '<span class="pill">Panelden eklendi</span>' : '') + (age ? '<span class="pill">' + age + ' yaş</span>' : '') + (a.notified ? '<span class="pill">' + I('mail', 'tiny') + ' e-posta gönderildi</span>' : '') + '</div>' +
        '<div class="status-pick">' + YK.APP_STATUSES.map(s => '<button data-s="' + s.key + '" style="--c:' + s.color + '" class="' + (a.status === s.key ? 'on' : '') + '">' + s.label + '</button>').join('') + '</div>' +
        '<dl class="dl">' + def.fields.map(f => '<div' + (f.full ? ' class="full"' : '') + '><dt>' + esc(f.label) + '</dt><dd>' + (a.data[f.name] ? esc(f.type === 'date' ? YK.fmtDate(a.data[f.name]) : a.data[f.name]).replace(/\n/g, '<br>') : '<span class="muted">—</span>') + '</dd></div>').join('') + '</dl>' +
        (a.empId ? '<div class="alert ok">' + I('check') + '<div>Bu başvuru çalışan olarak eklendi. <a href="#calisan/' + a.empId + '" class="m-go">Çalışan kartını aç →</a></div></div>' : '') +
        (a.custId ? '<div class="alert ok">' + I('check') + '<div>Bu işletme müşteri olarak kaydedildi. <a href="#musteri/' + a.custId + '" class="m-go">Müşteri kartını aç →</a></div></div>' : '') +
        '<h4 class="sub">Notlar</h4><ul class="notes">' + ((a.notes || []).map((n, i) => '<li><p>' + esc(n.text) + '</p><small>' + YK.fmtDate(n.t, true) + ' <button data-dn="' + i + '" class="link-btn">sil</button></small></li>').join('') || '<li class="muted">Henüz not yok.</li>') + '</ul>' +
        '<div class="note-add"><textarea id="noteTxt" rows="2" placeholder="Görüşme notu ekleyin… (Ctrl+Enter ile kaydet)"></textarea><button class="btn btn-dark" id="noteBtn">Ekle</button></div>';
      $$('[data-s]', body).forEach(b => b.onclick = () => { YK.update('applications', id, { status: b.dataset.s }); YK.log(appName(a) + ' başvurusu: ' + statusOf(b.dataset.s).label); toast('Durum: ' + statusOf(b.dataset.s).label); render(); refresh(); });
      const addNote = () => { const t = $('#noteTxt', body).value.trim(); if (!t) return; YK.update('applications', id, { notes: (a.notes || []).concat([{ t: new Date().toISOString(), text: t }]) }); render(); refresh(); };
      $('#noteBtn', body).onclick = addNote;
      $('#noteTxt', body).onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); };
      $$('[data-dn]', body).forEach(b => b.onclick = () => { const n = (a.notes || []).slice(); n.splice(+b.dataset.dn, 1); YK.update('applications', id, { notes: n }); render(); refresh(); });
      const go = $('.m-go', body); if (go) go.onclick = () => m.close();
    }
    render();
    const actions = [
      { label: I('cop') + '<span class="hide-sm">Sil</span>', cls: 'btn-danger-ghost', left: true, onClick: async mm => { if (await confirmBox('Bu başvuru kalıcı olarak silinsin mi?')) { YK.remove('applications', id); YK.log(appName(a) + ' başvurusu silindi'); mm.close(); toast('Başvuru silindi'); refresh(); } } },
      { label: I('yazdir') + '<span class="hide-sm">Yazdır</span>', onClick: () => printApp(YK.get('applications', id)) },
      { label: I('kalem') + '<span class="hide-sm">Düzenle</span>', onClick: () => appForm(a.type, YK.get('applications', id), () => { render(); refresh(); }) },
      { label: I('telefon') + 'Ara', onClick: () => { location.href = telHref(YK.get('applications', id).data.telefon); } },
      { label: I('whatsapp') + 'WhatsApp', onClick: () => window.open(waHref(YK.get('applications', id).data.telefon), '_blank', 'noopener') }
    ];
    if (a.type === 'kurye' && !a.empId) actions.push({ label: I('kullanici') + 'Çalışan olarak ekle', cls: 'btn-yellow', onClick: mm => convertToEmp(id, mm) });
    if (a.type === 'isletme' && !a.custId) actions.push({ label: I('bina') + 'Müşteri olarak kaydet', cls: 'btn-yellow', onClick: mm => convertToCust(id, mm) });
    m = modal({ title: appName(a), body: body, wide: true, actions: actions, noFocus: true });
  }

  function convertToEmp(appId, parentModal) {
    const a = YK.get('applications', appId); const d = a.data;
    const pre = {
      adSoyad: d.adSoyad, telefon: d.telefon, eposta: d.eposta, dogumTarihi: d.dogumTarihi, il: d.il, ilce: d.ilce,
      ehliyet: d.ehliyet === 'Ehliyetim yok' ? 'Yok' : d.ehliyet, motor: (d.motor || '').indexOf('Kendi') === 0 ? 'Kendi motoru' : 'Şirket motoru',
      calismaModeli: d.calismaModeli, durum: 'Aktif', baslangic: today(), gorev: 'Moto Kurye', notlar: 'Başvuru No: ' + (a.ref || '')
    };
    empForm(null, pre, emp => {
      YK.update('applications', appId, { empId: emp.id, status: 'onaylandi' });
      parentModal.close(); updateBadges(); location.hash = '#calisan/' + emp.id;
    });
  }

  /* =================== Çalışanlar =================== */
  function viewEmps() {
    const st = state.emps = Object.assign({ durum: '', q: '' }, state.emps);
    setTop('Çalışanlar', '<button class="btn btn-light" id="csvEmps">' + I('indir') + '<span class="hide-sm">CSV</span></button><button class="btn btn-yellow" id="addEmp">' + I('arti') + 'Yeni çalışan</button>');
    const all = YK.list('employees');
    const cnt = k => all.filter(e => e.durum === k).length;
    view.innerHTML =
      '<div class="kpis sm">' + kpiBtn('', 'Toplam', all.length) + ['Aktif', 'İzinli', 'Pasif', 'Ayrıldı'].map(k => kpiBtn(k, k, cnt(k))).join('') + '</div>' +
      '<div class="toolbar"><label class="search">' + I('ara') + '<input id="fQ" placeholder="Ad, telefon, plaka, bölge…" value="' + esc(st.q) + '"></label></div>' +
      '<section class="card flush"><div id="empTable"></div></section>';
    function kpiBtn(k, l, n) { return '<button class="kpi-btn' + (st.durum === k ? ' on' : '') + '" data-d="' + k + '"><b>' + n + '</b><span>' + l + '</span></button>'; }
    const filtered = () => {
      const q = lower(st.q);
      return YK.list('employees').filter(e => (!st.durum || e.durum === st.durum) && (!q || lower([e.adSoyad, e.telefon, e.plaka, e.bolge, custName(e.musteriId), e.ilce, e.tc].join(' ')).indexOf(q) >= 0))
        .sort((x, y) => (x.adSoyad || '').localeCompare(y.adSoyad || '', 'tr'));
    };
    function draw() {
      const rows = filtered();
      $('#empTable').innerHTML = rows.length ?
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>Çalışan</th><th>Telefon</th><th class="hide-md">Görev / Model</th><th class="hide-md">İşletme / Bölge</th><th class="hide-md">Motor / Plaka</th><th class="hide-md">Evrak</th><th>Durum</th></tr></thead><tbody>' +
        rows.map(e => { const ex = e.durum !== 'Ayrıldı' ? expiries(e) : []; const dc = docCount(e);
          return '<tr data-id="' + e.id + '"><td><div class="who">' + avatar(e) + '<div><b>' + esc(e.adSoyad) + (ex.length ? ' <span class="warn-ic" title="' + esc(ex.map(x => x.label + ': ' + YK.fmtDate(x.date)).join(', ')) + '">' + I('uyari', 'tiny') + '</span>' : '') + '</b><small>' + esc(e.ilce || e.il || '') + '</small></div></div></td><td class="nowrap">' + esc(e.telefon || '') + '</td>' +
          '<td class="hide-md">' + esc(e.gorev || '') + '<small>' + esc(e.calismaModeli || '') + '</small></td><td class="hide-md">' + (e.musteriId ? '<b>' + esc(custName(e.musteriId)) + '</b>' : '<span class="muted">Atanmadı</span>') + '<small>' + esc(e.bolge || '') + '</small></td>' +
          '<td class="hide-md">' + esc(e.motor || '—') + '<small>' + esc(e.plaka || '') + '</small></td><td class="hide-md"><span class="doc-mini' + (dc === YK.EMP_DOCS.length ? ' full' : '') + '">' + dc + '/' + YK.EMP_DOCS.length + '</span></td><td>' + empBadge(e.durum) + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="tbl-foot">' + rows.length + ' çalışan</div>'
        : empty('ekip', 'Çalışan bulunamadı', all.length ? 'Filtreleri değiştirerek tekrar deneyin.' : 'İlk çalışanınızı ekleyin veya bir kurye başvurusunu çalışana dönüştürün.', all.length ? '' : '<button class="btn btn-yellow" id="addEmp2">' + I('arti') + 'Yeni çalışan</button>');
      $$('#empTable tr[data-id]').forEach(tr => tr.onclick = () => { location.hash = '#calisan/' + tr.dataset.id; });
      const b2 = $('#addEmp2'); if (b2) b2.onclick = () => empForm(null, null, rerender);
      hydrate($('#empTable'));
    }
    $$('.kpi-btn', view).forEach(b => b.onclick = () => { st.durum = b.dataset.d; $$('.kpi-btn', view).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $('#fQ').oninput = e => { st.q = e.target.value; draw(); };
    $('#addEmp').onclick = () => empForm(null, null, rerender);
    $('#csvEmps').onclick = () => YK.download('calisanlar-' + today() + '.csv', YK.toCSV(filtered(), YK.EMP_FIELDS.map(f => ({ label: f.label, get: e => f.type === 'customer' ? custName(e[f.name]) : e[f.name] })).concat([{ label: 'Teslim edilen evraklar', get: e => (e.evrak || []).join(', ') }])), 'text/csv;charset=utf-8');
    draw();
  }

  function empForm(emp, prefill, onSaved) {
    const data = Object.assign({}, prefill || {}, emp || {});
    let foto = data.foto || '';
    const evrak = (data.evrak || []).slice();
    const body = document.createElement('div');
    body.innerHTML = '<div class="photo-row"><span class="av av-lg" id="pv">' + (foto ? '<img data-src="' + esc(foto) + '" alt="">' : I('kullanici')) + '</span><div><button type="button" class="btn btn-light" id="pBtn">' + I('yukle') + 'Fotoğraf yükle</button> <button type="button" class="link-btn" id="pDel"' + (foto ? '' : ' hidden') + '>Kaldır</button><small class="muted block">JPG veya PNG · otomatik küçültülür</small></div><input type="file" accept="image/*" id="pFile" hidden></div>' +
      formHTML(YK.EMP_FIELDS, data) +
      '<h4 class="sub">Teslim alınan evraklar</h4><div class="docs">' + YK.EMP_DOCS.map(d => '<label class="doc"><input type="checkbox" value="' + esc(d) + '"' + (evrak.includes(d) ? ' checked' : '') + '><span>' + esc(d) + '</span></label>').join('') + '</div>';
    hydrate(body);
    $('#pBtn', body).onclick = () => $('#pFile', body).click();
    $('#pFile', body).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const url = await YK.fileToDataUrl(f, 500); foto = await YK.media.put(url, 'foto-' + (data.adSoyad || '')); $('#pv', body).innerHTML = '<img src="' + url + '" alt="">'; $('#pDel', body).hidden = false; }
      catch (er) { toast('Görsel yüklenemedi', 'err'); }
    };
    $('#pDel', body).onclick = () => { foto = ''; $('#pv', body).innerHTML = I('kullanici'); $('#pDel', body).hidden = true; };
    bindTel(body);
    const tcIn = body.querySelector('[name=tc]'); tcIn.inputMode = 'numeric'; tcIn.oninput = () => { tcIn.value = tcIn.value.replace(/\D/g, '').slice(0, 11); };
    const ibIn = body.querySelector('[name=iban]'); ibIn.oninput = () => { const v = ibIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 26); ibIn.value = v.replace(/(.{4})/g, '$1 ').trim(); };
    modal({
      title: emp ? 'Çalışanı düzenle' : 'Yeni çalışan', body: body, wide: true,
      actions: [{ label: 'Vazgeç' }, {
        label: I('check') + 'Kaydet', cls: 'btn-dark', onClick: m => {
          const d = readForm(body, YK.EMP_FIELDS); if (!d) return;
          if (d.tc && !/^[1-9]\d{10}$/.test(d.tc)) { toast('T.C. Kimlik No 11 haneli olmalı', 'err'); tcIn.classList.add('bad'); tcIn.focus(); return; }
          if (d.iban && !/^TR\d{24}$/.test(d.iban.replace(/\s/g, ''))) { toast('IBAN TR ile başlayan 26 karakter olmalı', 'err'); ibIn.classList.add('bad'); ibIn.focus(); return; }
          const dup = YK.list('employees').find(x => x.id !== (emp && emp.id) && d.telefon && (x.telefon || '').replace(/\D/g, '') === d.telefon.replace(/\D/g, ''));
          if (dup && !confirm(dup.adSoyad + ' aynı telefon numarasıyla kayıtlı. Yine de kaydedilsin mi?')) return;
          d.foto = foto; d.evrak = $$('.doc input:checked', body).map(c => c.value);
          const saved = emp ? YK.update('employees', emp.id, d) : YK.add('employees', d);
          if (!saved) return;
          YK.log(d.adSoyad + (emp ? ' kartı güncellendi' : ' çalışan olarak eklendi'));
          m.close(); toast(emp ? 'Çalışan güncellendi' : 'Çalışan eklendi'); if (onSaved) onSaved(saved);
        }
      }]
    });
  }

  function viewEmp(id) {
    const e = YK.get('employees', id);
    if (!e) { setTop('Çalışan'); view.innerHTML = empty('kullanici', 'Çalışan bulunamadı', 'Bu kayıt silinmiş olabilir.', '<a href="#calisanlar" class="btn btn-light">Çalışanlara dön</a>'); return; }
    const st = state['emp_' + id] = Object.assign({ month: thisMonth() }, state['emp_' + id]);
    setTop(e.adSoyad, '<a href="#calisanlar" class="btn btn-light">← <span class="hide-sm">Çalışanlar</span></a><button class="btn btn-light" id="printEmp">' + I('yazdir') + '<span class="hide-sm">Yazdır</span></button><button class="btn btn-light" id="editEmp">' + I('kalem') + '<span class="hide-sm">Düzenle</span></button><button class="btn btn-yellow" id="addRec">' + I('arti') + 'Kayıt ekle</button>');
    const info = YK.EMP_FIELDS.filter(f => !['adSoyad', 'notlar', 'durum'].includes(f.name));
    const ex = expiries(e), dc = docCount(e), allRecs = YK.list('records').filter(r => r.empId === id), bal = summary(allRecs).bakiye;
    view.innerHTML =
      '<div class="emp-layout"><section class="card profile">' +
      '<div class="profile-top">' + avatar(e, 'xl') + '<h2>' + esc(e.adSoyad) + '</h2><p class="muted">' + esc([e.gorev, e.calismaModeli].filter(Boolean).join(' · ')) + '</p>' + empBadge(e.durum) +
      '<div class="profile-btns"><a class="btn btn-light" href="' + telHref(e.telefon) + '">' + I('telefon') + 'Ara</a><a class="btn btn-light" target="_blank" rel="noopener" href="' + waHref(e.telefon) + '">' + I('whatsapp') + 'WhatsApp</a></div></div>' +
      (ex.length ? '<div class="alert warn">' + I('uyari') + '<div>' + ex.map(x => '<b>' + esc(x.label) + '</b> ' + (x.days < 0 ? 'süresi ' + (-x.days) + ' gün önce doldu' : x.days + ' gün içinde doluyor') + ' (' + YK.fmtDate(x.date) + ')').join('<br>') + '</div></div>' : '') +
      '<div class="bal ' + (bal > 0 ? 'pos' : '') + '"><small>Toplam kalan bakiye</small><b>' + YK.fmtMoney(bal) + '</b></div>' +
      '<div class="doc-prog"><div class="card-head"><h2>Evraklar</h2><span class="pill">' + dc + ' / ' + YK.EMP_DOCS.length + '</span></div><div class="setup-bar"><i style="width:' + (dc / YK.EMP_DOCS.length * 100) + '%"></i></div><ul class="doc-list">' + YK.EMP_DOCS.map(d => '<li class="' + ((e.evrak || []).includes(d) ? 'ok' : '') + '">' + I((e.evrak || []).includes(d) ? 'check' : 'kapat', 'tiny') + esc(d) + '</li>').join('') + '</ul></div>' +
      '<dl class="dl one">' + info.map(f => '<div><dt>' + esc(f.label) + '</dt><dd>' + (e[f.name] ? (f.type === 'customer' ? '<a class="link" href="#musteri/' + esc(e[f.name]) + '">' + esc(custName(e[f.name]) || '—') + '</a>' : esc(f.type === 'date' ? YK.fmtDate(e[f.name]) : e[f.name])) : '<span class="muted">—</span>') + '</dd></div>').join('') +
      (e.notlar ? '<div><dt>Notlar</dt><dd>' + esc(e.notlar).replace(/\n/g, '<br>') + '</dd></div>' : '') + '</dl>' +
      '<button class="btn btn-danger-ghost btn-block" id="delEmp">' + I('cop') + 'Çalışanı sil</button></section>' +
      '<div class="emp-main"><div class="toolbar"><label class="month">Dönem <input type="month" id="fMonth" value="' + esc(st.month) + '"></label><button class="link-btn" id="allTime">Tüm zamanlar</button><span class="grow"></span>' + (bal > 0 ? '<button class="btn btn-dark sm" id="payBal">' + I('para') + 'Bakiyeyi öde (' + YK.fmtMoney(bal) + ')</button>' : '') + '</div><div id="empSum"></div><section class="card flush"><div id="empRecs"></div></section></div></div>';

    function draw() {
      const recs = allRecs.length ? YK.list('records').filter(r => r.empId === id && (!st.month || (r.tarih || '').slice(0, 7) === st.month)).sort((x, y) => (y.tarih || '').localeCompare(x.tarih || '')) : [];
      $('#empSum').innerHTML = sumCards(summary(recs), monthLabel(st.month));
      $('#empRecs').innerHTML = recTable(recs, false);
      bindRecTable($('#empRecs'), rerender);
    }
    $('#fMonth').onchange = ev => { st.month = ev.target.value; draw(); };
    $('#allTime').onclick = () => { st.month = ''; $('#fMonth').value = ''; draw(); };
    $('#editEmp').onclick = () => empForm(e, null, rerender);
    $('#addRec').onclick = () => recordForm(null, id, rerender);
    const pb = $('#payBal'); if (pb) pb.onclick = () => payModal(e, bal, rerender);
    $('#printEmp').onclick = () => {
      const recs = YK.list('records').filter(r => r.empId === id && (!st.month || (r.tarih || '').slice(0, 7) === st.month)).sort((x, y) => (x.tarih || '').localeCompare(y.tarih || ''));
      const s = summary(recs);
      printDoc(e.adSoyad, '<h1>' + esc(e.adSoyad) + '</h1><p class="sub">' + esc([e.gorev, e.telefon, e.plaka].filter(Boolean).join(' · ')) + ' · Dönem: ' + esc(monthLabel(st.month)) + '</p>' +
        '<table><tr><th>Tarih</th><th>Tür</th><th class="n">Paket</th><th class="n">Saat</th><th class="n">Tutar</th><th>Açıklama</th></tr>' + recs.map(r => '<tr><td>' + YK.fmtDate(r.tarih) + '</td><td>' + esc(r.tur) + '</td><td class="n">' + esc(r.paket || '') + '</td><td class="n">' + esc(r.saat || '') + '</td><td class="n">' + (r.tutar ? YK.fmtMoney(r.tutar) : '') + '</td><td>' + esc(r.aciklama || '') + '</td></tr>').join('') + '</table>' +
        '<table style="margin-top:16px"><tr><th>Paket</th><th>Saat</th><th>Hakediş + prim</th><th>Ödenen + avans</th><th>Kesinti</th><th>Bakiye</th></tr><tr><td>' + s.paket + '</td><td>' + s.saat + '</td><td>' + YK.fmtMoney(s.kazanc) + '</td><td>' + YK.fmtMoney(s.odenen) + '</td><td>' + YK.fmtMoney(s.kesinti) + '</td><td><b>' + YK.fmtMoney(s.bakiye) + '</b></td></tr></table><div class="sign"><div>Çalışan</div><div>Yetkili</div></div>');
    };
    $('#delEmp').onclick = async () => {
      const n = allRecs.length;
      if (!(await confirmBox(e.adSoyad + ' silinsin mi?' + (n ? ' Çalışana ait ' + n + ' kayıt da silinecek.' : '')))) return;
      YK.saveList('records', YK.list('records').filter(r => r.empId !== id));
      if (e.foto) YK.media.del(e.foto);
      YK.remove('employees', id); YK.log(e.adSoyad + ' çalışan kaydı silindi'); toast('Çalışan silindi'); location.hash = '#calisanlar';
    };
    draw();
  }

  /* =================== Müşteriler (işletmeler) =================== */
  const CUST_COLORS = { 'Aktif': '#16a34a', 'Deneme': '#2563eb', 'Pasif': '#6b7280', 'Ayrıldı': '#dc2626' };
  const custBadge = d => '<span class="st" style="--c:' + (CUST_COLORS[d] || '#6b7280') + '">' + esc(d || '—') + '</span>';
  const custCouriers = id => YK.list('employees').filter(e => e.musteriId === id && e.durum !== 'Ayrıldı');

  function viewCustomers() {
    const st = state.custs = Object.assign({ durum: '', q: '' }, state.custs);
    setTop('Müşteriler', '<button class="btn btn-light" id="csvCust">' + I('indir') + '<span class="hide-sm">CSV</span></button><button class="btn btn-yellow" id="addCust">' + I('arti') + 'Yeni müşteri</button>', 'Kurye hizmeti verdiğiniz restoran ve işletmeler');
    const all = YK.list('customers');
    const cnt = k => all.filter(c => c.durum === k).length;
    view.innerHTML =
      '<div class="kpis sm">' + ['', ...YK.CUST_STATUSES].map(k => '<button class="kpi-btn' + (st.durum === k ? ' on' : '') + '" data-d="' + k + '"><b>' + (k ? cnt(k) : all.length) + '</b><span>' + (k || 'Toplam') + '</span></button>').join('') + '</div>' +
      '<div class="toolbar"><label class="search">' + I('ara') + '<input id="fQ" placeholder="İşletme, yetkili, telefon, ilçe…" value="' + esc(st.q) + '"></label></div>' +
      '<section class="card flush"><div id="custTable"></div></section>';
    const filtered = () => {
      const q = lower(st.q);
      return YK.list('customers').filter(c => (!st.durum || c.durum === st.durum) && (!q || lower([c.isletmeAdi, c.yetkili, c.telefon, c.ilce, c.sektor].join(' ')).indexOf(q) >= 0))
        .sort((x, y) => (x.isletmeAdi || '').localeCompare(y.isletmeAdi || '', 'tr'));
    };
    function draw() {
      const rows = filtered();
      $('#custTable').innerHTML = rows.length ?
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>İşletme</th><th>Yetkili</th><th class="hide-md">Sektör</th><th class="hide-md">Hizmet modeli</th><th class="hide-md">Kurye</th><th>Durum</th></tr></thead><tbody>' +
        rows.map(c => '<tr data-id="' + c.id + '"><td><div class="who"><span class="av cust">' + esc(initials(c.isletmeAdi)) + '</span><div><b>' + esc(c.isletmeAdi) + '</b><small>' + esc([c.ilce, c.il].filter(Boolean).join(' / ')) + '</small></div></div></td><td>' + esc(c.yetkili || '') + '<small>' + esc(c.telefon || '') + '</small></td>' +
          '<td class="hide-md">' + esc(c.sektor || '—') + '</td><td class="hide-md">' + esc(c.hizmetModeli || '—') + '<small>' + esc(c.ucret || '') + '</small></td><td class="hide-md"><span class="pill">' + I('motor', 'tiny') + ' ' + custCouriers(c.id).length + (c.kuryeSayisi ? ' / ' + esc(c.kuryeSayisi) : '') + '</span></td><td>' + custBadge(c.durum) + '</td></tr>').join('') +
        '</tbody></table></div><div class="tbl-foot">' + rows.length + ' müşteri</div>'
        : empty('bina', 'Müşteri bulunamadı', all.length ? 'Filtreleri değiştirerek tekrar deneyin.' : 'Anlaştığınız restoran ve işletmeleri buraya ekleyin ya da bir işletme talebini tek tıkla müşteriye dönüştürün.', all.length ? '' : '<button class="btn btn-yellow" id="addCust2">' + I('arti') + 'Yeni müşteri</button>');
      $$('#custTable tr[data-id]').forEach(tr => tr.onclick = () => { location.hash = '#musteri/' + tr.dataset.id; });
      const b2 = $('#addCust2'); if (b2) b2.onclick = () => custForm(null, null, c => { location.hash = '#musteri/' + c.id; });
    }
    $$('.kpi-btn', view).forEach(b => b.onclick = () => { st.durum = b.dataset.d; $$('.kpi-btn', view).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $('#fQ').oninput = e => { st.q = e.target.value; draw(); };
    $('#addCust').onclick = () => custForm(null, null, c => { location.hash = '#musteri/' + c.id; });
    $('#csvCust').onclick = () => YK.download('musteriler-' + today() + '.csv', YK.toCSV(filtered(), YK.CUST_FIELDS.map(f => ({ label: f.label, key: f.name })).concat([{ label: 'Atanan kurye', get: c => custCouriers(c.id).map(e => e.adSoyad).join(', ') }])), 'text/csv;charset=utf-8');
    draw();
  }

  function custForm(cust, prefill, onSaved) {
    const data = Object.assign({}, prefill || {}, cust || {});
    const body = document.createElement('div');
    body.innerHTML = formHTML(YK.CUST_FIELDS, data);
    bindTel(body);
    modal({
      title: cust ? 'Müşteriyi düzenle' : 'Yeni müşteri işletme', body: body, wide: true,
      actions: [{ label: 'Vazgeç' }, {
        label: I('check') + 'Kaydet', cls: 'btn-dark', onClick: m => {
          const d = readForm(body, YK.CUST_FIELDS); if (!d) return;
          const saved = cust ? YK.update('customers', cust.id, d) : YK.add('customers', d);
          if (!saved) return;
          YK.log(d.isletmeAdi + (cust ? ' müşteri kartı güncellendi' : ' müşteri olarak eklendi'));
          m.close(); toast(cust ? 'Müşteri güncellendi' : 'Müşteri eklendi'); if (onSaved) onSaved(saved);
        }
      }]
    });
  }

  function convertToCust(appId, parentModal) {
    const a = YK.get('applications', appId), d = a.data;
    const sekt = { 'Restoran / Kafe': 'Restoran / Kafe' };
    const model = { 'Paket başı': 'Paket başı', 'Vardiyalı / saatlik': 'Vardiyalı / saatlik', 'İşletmeye özel kurye': 'İşletmeye özel kurye' };
    custForm(null, {
      isletmeAdi: d.isletmeAdi, sektor: sekt[d.sektor] || d.sektor, yetkili: d.yetkili, telefon: d.telefon, eposta: d.eposta, il: d.il, ilce: d.ilce, adres: d.adres,
      kuryeSayisi: d.kuryeSayisi, calismaSaatleri: d.calismaSaatleri, hizmetModeli: model[d.hizmetModeli] || 'Belirlenmedi', durum: 'Aktif', baslangic: today(),
      notlar: 'Talep No: ' + (a.ref || '') + (d.gunlukPaket ? '\nGünlük tahmini paket: ' + d.gunlukPaket : '') + (d.mesaj ? '\nNot: ' + d.mesaj : '')
    }, c => { YK.update('applications', appId, { custId: c.id, status: 'onaylandi' }); parentModal.close(); updateBadges(); location.hash = '#musteri/' + c.id; });
  }

  function viewCustomer(id) {
    const c = YK.get('customers', id);
    if (!c) { setTop('Müşteri'); view.innerHTML = empty('bina', 'Müşteri bulunamadı', 'Bu kayıt silinmiş olabilir.', '<a href="#musteriler" class="btn btn-light">Müşterilere dön</a>'); return; }
    setTop(c.isletmeAdi, '<a href="#musteriler" class="btn btn-light">← <span class="hide-sm">Müşteriler</span></a><button class="btn btn-light" id="editCust">' + I('kalem') + '<span class="hide-sm">Düzenle</span></button><button class="btn btn-yellow" id="assign">' + I('motor') + 'Kurye ata</button>', [c.sektor, c.hizmetModeli].filter(Boolean).join(' · '));
    const couriers = custCouriers(id), ids = couriers.map(e => e.id);
    const m = thisMonth(), recs = YK.list('records').filter(r => ids.includes(r.empId) && (r.tarih || '').slice(0, 7) === m), s = summary(recs);
    const info = YK.CUST_FIELDS.filter(f => !['isletmeAdi', 'notlar', 'durum'].includes(f.name));
    const app = YK.list('applications').find(a => a.custId === id);
    view.innerHTML = '<div class="emp-layout"><section class="card profile"><div class="profile-top"><span class="av av-xl cust">' + esc(initials(c.isletmeAdi)) + '</span><h2>' + esc(c.isletmeAdi) + '</h2><p class="muted">' + esc(c.yetkili || '') + '</p>' + custBadge(c.durum) +
      '<div class="profile-btns"><a class="btn btn-light" href="' + telHref(c.telefon) + '">' + I('telefon') + 'Ara</a><a class="btn btn-light" target="_blank" rel="noopener" href="' + waHref(c.telefon) + '">' + I('whatsapp') + 'WhatsApp</a></div></div>' +
      '<dl class="dl one">' + info.map(f => '<div><dt>' + esc(f.label) + '</dt><dd>' + (c[f.name] ? esc(f.type === 'date' ? YK.fmtDate(c[f.name]) : c[f.name]) : '<span class="muted">—</span>') + '</dd></div>').join('') +
      (c.notlar ? '<div><dt>Notlar</dt><dd>' + esc(c.notlar).replace(/\n/g, '<br>') + '</dd></div>' : '') + '</dl>' +
      (app ? '<p class="small"><a class="link" href="#basvurular/isletme" data-app="' + app.id + '">Kaynak talep: ' + esc(app.ref || '') + '</a></p>' : '') +
      '<button class="btn btn-danger-ghost btn-block" id="delCust">' + I('cop') + 'Müşteriyi sil</button></section>' +
      '<div class="emp-main"><div class="sum-cards cols-4"><div><small>Atanan kurye</small><b>' + couriers.length + (c.kuryeSayisi ? ' / ' + esc(c.kuryeSayisi) : '') + '</b></div><div><small>Bu ay paket (atanan kuryeler)</small><b>' + s.paket.toLocaleString('tr-TR') + '</b></div><div><small>Bu ay çalışma saati</small><b>' + s.saat.toLocaleString('tr-TR') + '</b></div><div class="hl"><small>Hizmet başlangıcı</small><b>' + YK.fmtDate(c.baslangic) + '</b></div></div>' +
      '<section class="card flush"><div class="card-head pad"><h2>' + I('motor') + 'Bu işletmede çalışan kuryeler</h2></div>' +
      (couriers.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Kurye</th><th>Telefon</th><th class="hide-md">Model</th><th>Durum</th><th></th></tr></thead><tbody>' + couriers.map(e => '<tr data-emp="' + e.id + '"><td><div class="who">' + avatar(e) + '<b>' + esc(e.adSoyad) + '</b></div></td><td class="nowrap">' + esc(e.telefon || '') + '</td><td class="hide-md">' + esc(e.calismaModeli || '') + '</td><td>' + empBadge(e.durum) + '</td><td class="acts"><button class="btn btn-light sm" data-unassign="' + e.id + '">Kaldır</button></td></tr>').join('') + '</tbody></table></div>'
        : empty('motor', 'Henüz kurye atanmadı', '“Kurye ata” ile bu işletmede çalışacak kuryeleri seçin.')) + '</section></div></div>';
    hydrate(view);
    $('#editCust').onclick = () => custForm(c, null, rerender);
    $$('tr[data-emp]', view).forEach(tr => tr.onclick = e => { if (e.target.closest('[data-unassign]')) return; location.hash = '#calisan/' + tr.dataset.emp; });
    $$('[data-unassign]', view).forEach(b => b.onclick = () => { const e = YK.update('employees', b.dataset.unassign, { musteriId: '' }); YK.log(e.adSoyad + ' – ' + c.isletmeAdi + ' atamasından çıkarıldı'); toast('Kurye atamadan çıkarıldı'); rerender(); });
    const la = $('[data-app]', view); if (la) la.onclick = e => { e.preventDefault(); openApp(la.dataset.app); };
    $('#assign').onclick = () => {
      const emps = YK.list('employees').filter(e => e.durum !== 'Ayrıldı').sort((a, b) => (a.adSoyad || '').localeCompare(b.adSoyad || '', 'tr'));
      if (!emps.length) { toast('Önce çalışan ekleyin', 'err'); return; }
      const body = document.createElement('div');
      body.innerHTML = '<p class="muted small">Seçilen kuryeler bu işletmeye atanır (başka işletmeye atanmışsa buraya taşınır).</p><div class="docs">' + emps.map(e => '<label class="doc"><input type="checkbox" value="' + e.id + '"' + (e.musteriId === id ? ' checked' : '') + '><span>' + esc(e.adSoyad) + (e.musteriId && e.musteriId !== id ? ' <small class="muted">(' + esc(custName(e.musteriId)) + ')</small>' : '') + '</span></label>').join('') + '</div>';
      modal({ title: c.isletmeAdi + ' – kurye ata', body: body, wide: true, actions: [{ label: 'Vazgeç' }, { label: I('check') + 'Kaydet', cls: 'btn-dark', onClick: mm => {
        const sel = $$('input:checked', body).map(i => i.value);
        YK.saveList('employees', YK.list('employees').map(e => sel.includes(e.id) ? Object.assign({}, e, { musteriId: id }) : (e.musteriId === id ? Object.assign({}, e, { musteriId: '' }) : e)));
        YK.log(c.isletmeAdi + ' için kurye ataması güncellendi (' + sel.length + ' kurye)'); mm.close(); toast('Atama güncellendi'); rerender();
      } }] });
    };
    $('#delCust').onclick = async () => {
      if (!(await confirmBox(c.isletmeAdi + ' müşteri kaydı silinsin mi? Atanmış kuryelerin ataması kaldırılır.'))) return;
      YK.saveList('employees', YK.list('employees').map(e => e.musteriId === id ? Object.assign({}, e, { musteriId: '' }) : e));
      YK.remove('customers', id); YK.log(c.isletmeAdi + ' müşteri kaydı silindi'); toast('Müşteri silindi'); location.hash = '#musteriler';
    };
  }

  /* =================== Genel arama =================== */
  (function () {
    const q = $('#gq'), res = $('#gres');
    let items = [], idx = 0;
    function run() {
      const v = lower(q.value.trim()); if (v.length < 2) { res.hidden = true; return; }
      const has = arr => lower(arr.join(' ')).indexOf(v) >= 0;
      items = [];
      YK.list('applications').forEach(a => { if (has([a.ref, appName(a), a.data.telefon, a.data.yetkili])) items.push({ ic: a.type === 'kurye' ? 'motor' : 'magaza', t: appName(a), s: (a.type === 'kurye' ? 'Kurye başvurusu' : 'İşletme talebi') + ' · ' + (a.ref || ''), go: () => { location.hash = '#basvurular/' + a.type; setTimeout(() => openApp(a.id), 80); } }); });
      YK.list('customers').forEach(c => { if (has([c.isletmeAdi, c.yetkili, c.telefon])) items.push({ ic: 'bina', t: c.isletmeAdi, s: 'Müşteri · ' + (c.yetkili || ''), go: () => { location.hash = '#musteri/' + c.id; } }); });
      YK.list('employees').forEach(e => { if (has([e.adSoyad, e.telefon, e.plaka, e.tc])) items.push({ ic: 'kullanici', t: e.adSoyad, s: 'Çalışan · ' + (e.telefon || ''), go: () => { location.hash = '#calisan/' + e.id; } }); });
      items = items.slice(0, 10); idx = 0;
      res.innerHTML = items.length ? items.map((x, i) => '<button data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '">' + I(x.ic) + '<span><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></span></button>').join('') : '<p class="muted small">Sonuç bulunamadı.</p>';
      res.hidden = false;
      $$('button', res).forEach(b => b.onmousedown = e => { e.preventDefault(); pick(+b.dataset.i); });
    }
    function pick(i) { const x = items[i]; if (!x) return; res.hidden = true; q.value = ''; q.blur(); x.go(); }
    q.addEventListener('input', run);
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(items.length, 1); $$('button', res).forEach((b, i) => b.classList.toggle('on', i === idx)); }
      if (e.key === 'Enter') { e.preventDefault(); pick(idx); }
      if (e.key === 'Escape') { res.hidden = true; q.blur(); }
    });
    q.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 150));
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !$('#app').hidden) { e.preventDefault(); q.focus(); q.select(); } });
  })();

  /* =================== Kayıtlar =================== */
  const KAZANC = ['Vardiya', 'Hakediş', 'Prim'], ODENEN = ['Ödeme', 'Avans'];
  function summary(recs) {
    const s = { paket: 0, saat: 0, kazanc: 0, odenen: 0, kesinti: 0, adet: recs.length };
    recs.forEach(r => {
      s.paket += num(r.paket); s.saat += num(r.saat); const t = num(r.tutar);
      if (KAZANC.includes(r.tur)) s.kazanc += t; else if (ODENEN.includes(r.tur)) s.odenen += t; else if (r.tur === 'Kesinti') s.kesinti += t;
    });
    s.bakiye = s.kazanc - s.odenen - s.kesinti; return s;
  }
  function sumCards(s, label) {
    return '<div class="sum-cards"><div><small>Paket</small><b>' + s.paket.toLocaleString('tr-TR') + '</b></div><div><small>Çalışma saati</small><b>' + s.saat.toLocaleString('tr-TR') + '</b></div>' +
      '<div><small>Hakediş + prim</small><b>' + YK.fmtMoney(s.kazanc) + '</b></div><div><small>Ödenen + avans</small><b>' + YK.fmtMoney(s.odenen) + '</b></div>' +
      '<div><small>Kesinti</small><b>' + YK.fmtMoney(s.kesinti) + '</b></div><div class="hl"><small>Bakiye · ' + esc(label) + '</small><b>' + YK.fmtMoney(s.bakiye) + '</b></div></div>';
  }
  const TYPE_COLORS = { 'Vardiya': '#2563eb', 'Hakediş': '#16a34a', 'Prim': '#16a34a', 'Ödeme': '#7c3aed', 'Avans': '#d97706', 'Kesinti': '#dc2626', 'İzin': '#0891b2', 'Kaza / Hasar': '#dc2626', 'Uyarı': '#dc2626', 'Not': '#6b7280' };
  function recTable(recs, withEmp) {
    if (!recs.length) return empty('liste', 'Kayıt yok', 'Bu dönem için kayıt bulunmuyor. Vardiya, hakediş, ödeme, avans, izin gibi kayıtları buradan tutabilirsiniz.');
    const emps = {}; YK.list('employees').forEach(e => emps[e.id] = e);
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Tarih</th>' + (withEmp ? '<th>Çalışan</th>' : '') + '<th>Tür</th><th class="num">Paket</th><th class="num hide-sm">Saat</th><th class="num">Tutar</th><th class="hide-md">Açıklama</th><th></th></tr></thead><tbody>' +
      recs.map(r => '<tr><td class="nowrap">' + YK.fmtDate(r.tarih) + '</td>' + (withEmp ? '<td><a href="#calisan/' + r.empId + '" class="link">' + esc(emps[r.empId] ? emps[r.empId].adSoyad : '(silinmiş)') + '</a></td>' : '') +
        '<td><span class="st" style="--c:' + (TYPE_COLORS[r.tur] || '#6b7280') + '">' + esc(r.tur) + '</span></td><td class="num">' + (r.paket ? esc(r.paket) : '—') + '</td><td class="num hide-sm">' + (r.saat ? esc(r.saat) : '—') + '</td>' +
        '<td class="num">' + (r.tutar ? (r.tur === 'Kesinti' || ODENEN.includes(r.tur) ? '−' : '') + YK.fmtMoney(r.tutar) : '—') + '</td><td class="hide-md"><small>' + esc(r.aciklama || '') + '</small></td>' +
        '<td class="acts"><button class="icon-btn sm" data-er="' + r.id + '" title="Düzenle" aria-label="Düzenle">' + I('kalem') + '</button><button class="icon-btn sm" data-dr="' + r.id + '" title="Sil" aria-label="Sil">' + I('cop') + '</button></td></tr>').join('') +
      '</tbody></table></div><div class="tbl-foot">' + recs.length + ' kayıt</div>';
  }
  function bindRecTable(root, redraw) {
    $$('[data-er]', root).forEach(b => b.onclick = () => recordForm(YK.get('records', b.dataset.er), null, redraw));
    $$('[data-dr]', root).forEach(b => b.onclick = async () => { if (await confirmBox('Bu kayıt silinsin mi?')) { const r = YK.get('records', b.dataset.dr); YK.remove('records', b.dataset.dr); YK.log('Kayıt silindi: ' + (r ? r.tur + ' ' + YK.fmtDate(r.tarih) : '')); toast('Kayıt silindi'); redraw(); } });
  }
  function recFields(empId) {
    const emps = YK.list('employees').filter(e => e.durum !== 'Ayrıldı' || e.id === empId).sort((a, b) => (a.adSoyad || '').localeCompare(b.adSoyad || '', 'tr'));
    return [
      { name: 'empId', label: 'Çalışan', type: 'emp', required: true, emps: emps },
      { name: 'tarih', label: 'Tarih', type: 'date', required: true, def: today() },
      { name: 'tur', label: 'Kayıt türü', type: 'select', options: YK.RECORD_TYPES.map(t => t.key), def: 'Vardiya', required: true },
      { name: 'paket', label: 'Teslim edilen paket', type: 'number', placeholder: '0' },
      { name: 'saat', label: 'Çalışma saati', type: 'number', placeholder: '0' },
      { name: 'tutar', label: 'Tutar (₺)', type: 'number', placeholder: '0', hint: 'Vardiya/Hakediş/Prim kazanç; Ödeme/Avans ödenen; Kesinti düşülen tutar olarak hesaplanır.' },
      { name: 'aciklama', label: 'Açıklama', type: 'textarea', full: true, rows: 2 }
    ];
  }
  function recordForm(rec, empId, onSaved, preset) {
    const fields = recFields(rec ? rec.empId : empId);
    const data = Object.assign({ empId: empId || '' }, preset || {}, rec || {});
    if (!fields[0].emps.length) { toast('Önce bir çalışan ekleyin', 'err'); return; }
    const body = document.createElement('div');
    body.innerHTML = formHTML(fields.slice(1), data);
    const g = $('.f-grid', body);
    const empSel = document.createElement('label'); empSel.className = 'fld full';
    empSel.innerHTML = '<span>Çalışan <i>*</i></span><select name="empId" required><option value="">Seçiniz</option>' + fields[0].emps.map(e => '<option value="' + e.id + '"' + (e.id === data.empId ? ' selected' : '') + '>' + esc(e.adSoyad) + (e.durum !== 'Aktif' ? ' (' + esc(e.durum) + ')' : '') + '</option>').join('') + '</select>';
    g.prepend(empSel);
    // Kayıt türüne göre ilgisiz alanları soluklaştır
    const tur = body.querySelector('[name=tur]');
    const sync = () => { const t = tur.value, money = !['İzin', 'Uyarı', 'Not'].includes(t), work = ['Vardiya', 'Hakediş', 'Prim'].includes(t); body.querySelector('[name=paket]').closest('.fld').classList.toggle('dim', !work); body.querySelector('[name=saat]').closest('.fld').classList.toggle('dim', !work); body.querySelector('[name=tutar]').closest('.fld').classList.toggle('dim', !money); };
    tur.onchange = sync; sync();
    modal({
      title: rec ? 'Kaydı düzenle' : 'Yeni kayıt', body: body,
      actions: [{ label: 'Vazgeç' }, {
        label: I('check') + 'Kaydet', cls: 'btn-dark', onClick: m => {
          const d = readForm(body, fields); if (!d) return;
          if (['paket', 'saat', 'tutar'].some(k => d[k] && num(d[k]) < 0)) { toast('Negatif değer girilemez', 'err'); return; }
          const ok = rec ? YK.update('records', rec.id, d) : YK.add('records', d);
          if (!ok) return;
          const en = (YK.get('employees', d.empId) || {}).adSoyad || '';
          YK.log((rec ? 'Kayıt güncellendi: ' : 'Kayıt eklendi: ') + d.tur + ' – ' + en + (d.tutar ? ' (' + YK.fmtMoney(d.tutar) + ')' : ''));
          m.close(); toast(rec ? 'Kayıt güncellendi' : 'Kayıt eklendi'); if (onSaved) onSaved();
        }
      }]
    });
  }

  function payModal(e, amount, onSaved) {
    recordForm(null, e.id, onSaved, { tur: 'Ödeme', tutar: String(Math.round(amount * 100) / 100), aciklama: 'Bakiye ödemesi' });
  }

  function puantajModal(onSaved) {
    const emps = YK.list('employees').filter(e => e.durum === 'Aktif').sort((a, b) => (a.adSoyad || '').localeCompare(b.adSoyad || '', 'tr'));
    if (!emps.length) { toast('Aktif çalışan yok. Önce çalışan ekleyin.', 'err'); return; }
    const body = document.createElement('div');
    body.innerHTML = '<div class="toolbar"><label class="month">Tarih <input type="date" id="pDate" value="' + today() + '"></label><label class="month">Paket başı ücret (₺) <input type="number" min="0" step="any" id="pRate" placeholder="Opsiyonel" style="width:110px"></label><span class="muted small">Ücret girilirse tutar otomatik hesaplanır. Boş satırlar kaydedilmez.</span></div>' +
      '<div class="table-wrap"><table class="tbl puantaj"><thead><tr><th>Çalışan</th><th>Paket</th><th>Saat</th><th>Tutar (₺)</th><th class="hide-sm">Not</th></tr></thead><tbody>' +
      emps.map(e => '<tr data-e="' + e.id + '"><td><div class="who">' + avatar(e, 'sm') + '<b>' + esc(e.adSoyad) + '</b></div></td><td><input type="number" min="0" data-k="paket"></td><td><input type="number" min="0" step="any" data-k="saat"></td><td><input type="number" min="0" step="any" data-k="tutar"></td><td class="hide-sm"><input data-k="aciklama"></td></tr>').join('') +
      '</tbody><tfoot><tr><th>Toplam</th><th id="tP">0</th><th id="tS">0</th><th id="tT">0 ₺</th><th class="hide-sm"></th></tr></tfoot></table></div>';
    hydrate(body);
    const tot = () => { let p = 0, s = 0, t = 0; $$('tr[data-e]', body).forEach(tr => { p += num($('[data-k=paket]', tr).value); s += num($('[data-k=saat]', tr).value); t += num($('[data-k=tutar]', tr).value); }); $('#tP', body).textContent = p; $('#tS', body).textContent = s; $('#tT', body).textContent = YK.fmtMoney(t); };
    body.addEventListener('input', ev => {
      const rate = num($('#pRate', body).value);
      if (rate && (ev.target.dataset.k === 'paket' || ev.target.id === 'pRate')) $$('tr[data-e]', body).forEach(tr => { const p = num($('[data-k=paket]', tr).value); if (p) $('[data-k=tutar]', tr).value = Math.round(p * rate * 100) / 100; });
      tot();
    });
    modal({
      title: 'Günlük puantaj (vardiya girişi)', body: body, wide: true,
      actions: [{ label: 'Vazgeç' }, {
        label: I('check') + 'Kaydet', cls: 'btn-dark', onClick: m => {
          const tarih = $('#pDate', body).value; if (!tarih) { toast('Tarih seçin', 'err'); return; }
          const recs = YK.list('records');
          const exists = emps.filter(e => recs.some(r => r.empId === e.id && r.tarih === tarih && r.tur === 'Vardiya')).length;
          if (exists && !confirm(exists + ' çalışan için bu tarihte zaten vardiya kaydı var. Yine de eklensin mi?')) return;
          let n = 0;
          $$('tr[data-e]', body).forEach(tr => {
            const r = { empId: tr.dataset.e, tarih: tarih, tur: 'Vardiya' };
            $$('input', tr).forEach(i => { r[i.dataset.k] = i.value.trim(); });
            if (r.paket || r.saat || r.tutar || r.aciklama) { r.id = YK.uid(); r.createdAt = new Date().toISOString(); recs.unshift(r); n++; }
          });
          if (!n) { toast('Hiçbir satır doldurulmadı', 'err'); return; }
          if (YK.saveList('records', recs)) { YK.log(YK.fmtDate(tarih) + ' tarihli puantaj girildi (' + n + ' kişi)'); m.close(); toast(n + ' vardiya kaydı eklendi'); if (onSaved) onSaved(); else if (location.hash === '#kayitlar') rerender(); }
        }
      }]
    });
  }

  // Haftalık / dönemsel hakediş raporu
  function payrollModal() {
    const d = new Date(); const dow = (d.getDay() + 6) % 7; // Pazartesi = 0
    let from = addDays(today(), -dow - 7), to = addDays(from, 6);
    const body = document.createElement('div');
    const m = modal({ title: 'Hakediş raporu', body: body, wide: true, noFocus: true, actions: [{ label: I('indir') + 'CSV', onClick: () => csv() }, { label: I('yazdir') + 'Yazdır', cls: 'btn-dark', onClick: () => print() }] });
    let rows = [];
    function calc() {
      const recs = YK.list('records'), emps = YK.list('employees');
      rows = emps.map(e => {
        const mine = recs.filter(r => r.empId === e.id);
        const per = summary(mine.filter(r => r.tarih >= from && r.tarih <= to));
        return { e: e, s: per, total: summary(mine).bakiye };
      }).filter(x => x.s.adet || x.total).sort((a, b) => b.s.kazanc - a.s.kazanc);
    }
    function draw() {
      calc();
      const T = rows.reduce((a, x) => { ['paket', 'saat', 'kazanc', 'odenen', 'kesinti', 'bakiye'].forEach(k => a[k] += x.s[k]); a.total += x.total; return a; }, { paket: 0, saat: 0, kazanc: 0, odenen: 0, kesinti: 0, bakiye: 0, total: 0 });
      body.innerHTML = '<div class="toolbar"><label class="month">Başlangıç <input type="date" id="rFrom" value="' + from + '"></label><label class="month">Bitiş <input type="date" id="rTo" value="' + to + '"></label><div class="seg sm"><button data-p="lw">Geçen hafta</button><button data-p="tw">Bu hafta</button><button data-p="tm">Bu ay</button></div></div>' +
        (rows.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Çalışan</th><th class="num">Paket</th><th class="num hide-sm">Saat</th><th class="num">Hakediş</th><th class="num hide-sm">Ödenen</th><th class="num hide-sm">Kesinti</th><th class="num">Dönem bakiye</th><th class="num">Toplam bakiye</th><th></th></tr></thead><tbody>' +
          rows.map(x => '<tr><td><div class="who">' + avatar(x.e, 'sm') + '<b>' + esc(x.e.adSoyad) + '</b></div></td><td class="num">' + x.s.paket + '</td><td class="num hide-sm">' + x.s.saat + '</td><td class="num">' + YK.fmtMoney(x.s.kazanc) + '</td><td class="num hide-sm">' + YK.fmtMoney(x.s.odenen) + '</td><td class="num hide-sm">' + YK.fmtMoney(x.s.kesinti) + '</td><td class="num"><b>' + YK.fmtMoney(x.s.bakiye) + '</b></td><td class="num">' + YK.fmtMoney(x.total) + '</td><td class="acts">' + (x.total > 0 ? '<button class="btn btn-yellow sm" data-pay="' + x.e.id + '">Öde</button>' : '') + '</td></tr>').join('') +
          '</tbody><tfoot><tr><th>Toplam</th><th class="num">' + T.paket + '</th><th class="num hide-sm">' + T.saat + '</th><th class="num">' + YK.fmtMoney(T.kazanc) + '</th><th class="num hide-sm">' + YK.fmtMoney(T.odenen) + '</th><th class="num hide-sm">' + YK.fmtMoney(T.kesinti) + '</th><th class="num">' + YK.fmtMoney(T.bakiye) + '</th><th class="num">' + YK.fmtMoney(T.total) + '</th><th></th></tr></tfoot></table></div>'
          : empty('hesap', 'Bu dönemde kayıt yok', 'Seçilen tarih aralığında vardiya/hakediş kaydı bulunmuyor.')) +
        '<p class="muted small mt">“Öde” butonu, çalışanın toplam kalan bakiyesi kadar bir Ödeme kaydı oluşturur (kaydetmeden önce tutarı düzenleyebilirsiniz).</p>';
      $('#rFrom', body).onchange = e => { from = e.target.value; draw(); };
      $('#rTo', body).onchange = e => { to = e.target.value; draw(); };
      $$('[data-p]', body).forEach(b => b.onclick = () => {
        const dw = (new Date().getDay() + 6) % 7;
        if (b.dataset.p === 'lw') { from = addDays(today(), -dw - 7); to = addDays(from, 6); }
        if (b.dataset.p === 'tw') { from = addDays(today(), -dw); to = addDays(from, 6); }
        if (b.dataset.p === 'tm') { from = thisMonth() + '-01'; to = addDays(isoDay(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)), -1); }
        draw();
      });
      $$('[data-pay]', body).forEach(b => b.onclick = () => { const x = rows.find(r => r.e.id === b.dataset.pay); payModal(x.e, x.total, () => { draw(); if (location.hash === '#kayitlar') rerender(); }); });
      hydrate(body);
    }
    function csv() {
      YK.download('hakedis-' + from + '_' + to + '.csv', YK.toCSV(rows, [
        { label: 'Çalışan', get: x => x.e.adSoyad }, { label: 'IBAN', get: x => x.e.iban }, { label: 'Paket', get: x => x.s.paket }, { label: 'Saat', get: x => x.s.saat },
        { label: 'Hakediş', get: x => x.s.kazanc }, { label: 'Ödenen', get: x => x.s.odenen }, { label: 'Kesinti', get: x => x.s.kesinti }, { label: 'Dönem bakiye', get: x => x.s.bakiye }, { label: 'Toplam bakiye', get: x => x.total }]), 'text/csv;charset=utf-8');
    }
    function print() {
      printDoc('Hakediş raporu', '<h1>Hakediş raporu</h1><p class="sub">' + YK.fmtDate(from) + ' – ' + YK.fmtDate(to) + '</p><table><tr><th>Çalışan</th><th>IBAN</th><th class="n">Paket</th><th class="n">Saat</th><th class="n">Hakediş</th><th class="n">Ödenen</th><th class="n">Kesinti</th><th class="n">Dönem bakiye</th><th class="n">Toplam bakiye</th></tr>' +
        rows.map(x => '<tr><td>' + esc(x.e.adSoyad) + '</td><td>' + esc(x.e.iban || '') + '</td><td class="n">' + x.s.paket + '</td><td class="n">' + x.s.saat + '</td><td class="n">' + YK.fmtMoney(x.s.kazanc) + '</td><td class="n">' + YK.fmtMoney(x.s.odenen) + '</td><td class="n">' + YK.fmtMoney(x.s.kesinti) + '</td><td class="n">' + YK.fmtMoney(x.s.bakiye) + '</td><td class="n"><b>' + YK.fmtMoney(x.total) + '</b></td></tr>').join('') + '</table>');
    }
    draw();
    return m;
  }

  function viewRecords() {
    const st = state.recs = Object.assign({ emp: '', tur: '', month: thisMonth(), q: '' }, state.recs);
    setTop('Kayıtlar & Puantaj', '<button class="btn btn-light" id="csvRecs">' + I('indir') + '<span class="hide-sm">CSV</span></button><button class="btn btn-light" id="payroll">' + I('hesap') + '<span class="hide-sm">Hakediş raporu</span></button><button class="btn btn-light" id="puantaj">' + I('takvim') + '<span class="hide-sm">Günlük puantaj</span></button><button class="btn btn-yellow" id="addRec">' + I('arti') + 'Yeni kayıt</button>');
    const emps = YK.list('employees').sort((a, b) => (a.adSoyad || '').localeCompare(b.adSoyad || '', 'tr'));
    view.innerHTML = '<div class="toolbar">' +
      '<select id="fEmp" class="sel"><option value="">Tüm çalışanlar</option>' + emps.map(e => '<option value="' + e.id + '"' + (st.emp === e.id ? ' selected' : '') + '>' + esc(e.adSoyad) + '</option>').join('') + '</select>' +
      '<select id="fTur" class="sel"><option value="">Tüm türler</option>' + YK.RECORD_TYPES.map(t => '<option' + (st.tur === t.key ? ' selected' : '') + '>' + t.key + '</option>').join('') + '</select>' +
      '<label class="month">Dönem <input type="month" id="fMonth" value="' + esc(st.month) + '"></label><button class="link-btn" id="allTime">Tüm zamanlar</button>' +
      '<label class="search">' + I('ara') + '<input id="fQ" placeholder="Açıklamada ara…" value="' + esc(st.q) + '"></label></div>' +
      '<div id="recSum"></div><section class="card flush"><div id="recTable"></div></section>';
    const filtered = () => {
      const q = lower(st.q);
      return YK.list('records').filter(r => (!st.emp || r.empId === st.emp) && (!st.tur || r.tur === st.tur) && (!st.month || (r.tarih || '').slice(0, 7) === st.month) && (!q || lower(r.aciklama).indexOf(q) >= 0))
        .sort((x, y) => (y.tarih || '').localeCompare(x.tarih || '') || (y.createdAt || '').localeCompare(x.createdAt || ''));
    };
    function draw() { const rows = filtered(); $('#recSum').innerHTML = sumCards(summary(rows), monthLabel(st.month)); $('#recTable').innerHTML = recTable(rows, true); bindRecTable($('#recTable'), draw); }
    $('#fEmp').onchange = e => { st.emp = e.target.value; draw(); };
    $('#fTur').onchange = e => { st.tur = e.target.value; draw(); };
    $('#fMonth').onchange = e => { st.month = e.target.value; draw(); };
    $('#allTime').onclick = () => { st.month = ''; $('#fMonth').value = ''; draw(); };
    $('#fQ').oninput = e => { st.q = e.target.value; draw(); };
    $('#addRec').onclick = () => recordForm(null, st.emp, draw);
    $('#puantaj').onclick = () => puantajModal(draw);
    $('#payroll').onclick = () => payrollModal();
    $('#csvRecs').onclick = () => {
      const em = {}; YK.list('employees').forEach(e => em[e.id] = e.adSoyad);
      YK.download('kayitlar-' + (st.month || 'tum') + '.csv', YK.toCSV(filtered(), [
        { label: 'Tarih', get: r => YK.fmtDate(r.tarih) }, { label: 'Çalışan', get: r => em[r.empId] || '' }, { label: 'Tür', key: 'tur' },
        { label: 'Paket', key: 'paket' }, { label: 'Saat', key: 'saat' }, { label: 'Tutar', key: 'tutar' }, { label: 'Açıklama', key: 'aciklama' }]), 'text/csv;charset=utf-8');
    };
    draw();
  }

  /* =================== Site İçeriği =================== */
  const T = (k, l, ta) => ({ k: k, l: l, ta: !!ta });
  const SECTION_LABELS = [
    ['Genel', [['marquee', 'Kayan yazı bandı'], ['stats', 'Sarı istatistik bandı'], ['about', 'Hakkımızda']]],
    ['İşletmeler için', [['services', 'Hizmetlerimiz'], ['business', 'İşletme avantajları'], ['bizSolutions', 'Hizmet modelleri & sektörler'], ['bizSteps', 'Nasıl çalışır (4 adım)'], ['bizForm', 'İşletme talep formu']]],
    ['Kuryeler için', [['courier', 'Kurye ol (avantajlar, şartlar, süreç)'], ['calc', 'Kazanç hesaplayıcı'], ['courForm', 'Kurye başvuru formu']]],
    ['Ortak', [['testimonials', 'Yorumlar (boşsa gizlenir)'], ['refs', 'Referanslar / Galeri'], ['regions', 'Hizmet bölgeleri (boşsa gizlenir)'], ['faq', 'SSS'], ['contact', 'İletişim'], ['blog', 'Blog (yazılar ve “son yazılar” bölümleri)']]]
  ];
  const CONTENT_TABS = [
    { id: 'genel', group: 'Genel', label: 'Genel & İletişim', blocks: [
      { type: 'images', title: 'Logolar', items: [['logo', 'Logo (açık zemin / üst menü)'], ['logo_dark', 'Logo (koyu zemin / alt bilgi)']] },
      { type: 'settings', title: 'İletişim bilgileri', items: [T('phone', 'Telefon'), T('whatsapp', 'WhatsApp numarası (ör. 905321234567)'), T('email', 'E-posta'), T('address', 'Açık adres'), T('hours', 'Çalışma saatleri'), T('instagram', 'Instagram bağlantısı (https://…)'), T('facebook', 'Facebook bağlantısı (https://…)'), T('linkedin', 'LinkedIn bağlantısı (https://…)'), T('map_embed', 'Google Haritalar yerleştirme kodu (iframe) — boşsa iletişim görseli gösterilir', 1)] },
      { type: 'settings', title: 'Başvuru bildirimleri', note: 'Web3Forms (web3forms.com) üzerinden ücretsiz bir “Access Key” alıp girerseniz, sitede gönderilen her talep ve başvuru e-posta adresinize de gelir. Site internette yayınlandığında farklı cihazlardan gelenleri kaçırmamanızı sağlar.', items: [T('notify_key', 'Web3Forms erişim anahtarı (Access Key)'), { k: 'wa_forward', l: 'Form gönderiminden sonra “WhatsApp ile ilet” butonunu göster', bool: true }] },
      { type: 'texts', title: 'Genel metinler', items: [T('slogan', 'Slogan'), T('top_note', 'Üst duyuru bandı (boş bırakılırsa gizlenir)')] },
      { type: 'texts', title: 'Buton yazıları', items: [T('nav_cta_biz', 'İşletme butonu (menü, alt bilgi, bantlar)'), T('nav_cta_cour', 'Kurye butonu (menü, bantlar)'), T('wa_label', 'WhatsApp bağlantısı'), T('call_btn', '“Hemen Arayın” butonu'), T('all_posts_btn', '“Tüm yazılar” butonu')] }
    ] },
    { id: 'menu', group: 'Genel', label: 'Menü & Alt Bilgi', blocks: [
      { type: 'texts', title: 'Üst menü', note: 'Menü bağlantılarının yazıları. Bağlantıların gittiği sayfalar sabittir; bir bölümü kapatırsanız (Bölümler & Bant) menüden de kalkar.', items: [T('nav_home', 'Ana Sayfa'), T('nav_biz', 'İşletmeler İçin'), T('nav_cour', 'Kuryeler İçin'), T('nav_about', 'Hakkımızda'), T('nav_blog', 'Blog'), T('nav_contact', 'İletişim')] },
      { type: 'texts', title: 'Alt bilgi (footer)', items: [T('footer_text', 'Logo altındaki açıklama', 1), T('footer_col1', '1. sütun başlığı'), T('footer_col2', '2. sütun başlığı'), T('footer_col3', '3. sütun başlığı'), T('footer_col4', '4. sütun başlığı'), T('kvkk_link', 'KVKK bağlantısı'), T('footer_copy', 'Telif satırı (yıl otomatik eklenir)')] }
    ] },
    { id: 'sayfalar', group: 'Genel', label: 'Sayfa Başlıkları', blocks: [
      { type: 'texts', title: 'İşletmeler sayfası', note: 'Üst etiket ve açıklama ana sayfadaki “İşletmeler İçin” kartında da görünür.', items: [T('biz_zone_tag', 'Üst etiket'), T('biz_page_title', 'Sayfa başlığı (H1)'), T('biz_zone_text', 'Açıklama', 1), T('biz_zone_title', 'Ana sayfa kartının başlığı'), T('biz_blog_title', 'Sayfa altı blog bölümü başlığı'), T('biz_blog_text', 'Blog bölümü açıklaması')] },
      { type: 'texts', title: 'Kuryeler sayfası', note: 'Üst etiket ve açıklama ana sayfadaki “Kuryeler İçin” kartında da görünür.', items: [T('cour_zone_tag', 'Üst etiket'), T('cour_page_title', 'Sayfa başlığı (H1)'), T('cour_zone_text', 'Açıklama', 1), T('cour_zone_title', 'Ana sayfa kartının başlığı'), T('calc_link', '“Kazancını Hesapla” butonu'), T('cour_blog_title', 'Sayfa altı blog bölümü başlığı'), T('cour_blog_text', 'Blog bölümü açıklaması')] },
      { type: 'texts', title: 'Başvuru & İletişim sayfası', items: [T('bv_page_tag', 'Üst etiket'), T('bv_page_title', 'Sayfa başlığı (H1)'), T('bv_page_text', 'Açıklama', 1), T('bv_tab_biz_sub', 'İşletme sekmesi alt yazısı'), T('bv_tab_cour_sub', 'Kurye sekmesi alt yazısı')] },
      { type: 'texts', title: 'Blog sayfası', items: [T('blog_page_tag', 'Üst etiket'), T('blog_page_title', 'Sayfa başlığı (H1)'), T('blog_page_text', 'Açıklama', 1)] }
    ] },
    { id: 'tema', group: 'Genel', label: 'Tema & Renkler', blocks: [{ type: 'theme', title: 'Site renkleri ve yazı tipi' }] },
    { id: 'duyuru', group: 'Genel', label: 'Duyuru Penceresi', blocks: [{ type: 'popup', title: 'Duyuru / kampanya penceresi' }] },
    { id: 'bolumler', group: 'Genel', label: 'Bölümler & Bant', blocks: [
      { type: 'sections', title: 'Sitede gösterilecek bölümler' },
      { type: 'list', key: 'marquee', title: 'Kayan yazı bandı (işletmelere yönelik hizmetler önerilir)', item: 'ifade', plain: true },
      { type: 'texts', title: 'Mobil alt buton çubuğu', items: [T('mobile_cta1', '1. buton (işletme → talep formu)'), T('mobile_cta2', '2. buton (kurye → başvuru formu)')] }
    ] },
    { id: 'hero', group: 'Genel', label: 'Ana Bölüm', blocks: [
      { type: 'images', title: 'Görsel', items: [['hero', 'Ana bölüm görseli']] },
      { type: 'texts', title: 'Başlık ve açıklama', items: [T('hero_badge', 'Üst etiket'), T('hero_title', 'Başlık – 1. satır'), T('hero_title_highlight', 'Başlık – sarı 2. satır'), T('hero_text', 'Açıklama', 1), T('hero_chip1', 'Görsel etiketi 1'), T('hero_chip2', 'Görsel etiketi 2')] },
      { type: 'texts', title: 'İki yol kartı: İşletme / Kurye', items: [T('path_biz_label', 'İşletme kartı başlığı'), T('path_biz_btn', 'İşletme kartı buton yazısı'), T('path_biz_text', 'İşletme kartı açıklaması', 1), T('path_cour_label', 'Kurye kartı başlığı'), T('path_cour_btn', 'Kurye kartı buton yazısı'), T('path_cour_text', 'Kurye kartı açıklaması', 1)] },
      { type: 'list', key: 'stats', title: 'Sarı istatistik bandı (ortak – sayılar sayarak gösterilir)', item: 'istatistik', review: 'stats', fields: [['value', 'Değer'], ['label', 'Açıklama']] },
      { type: 'texts', title: 'Ana sayfa: “Size nasıl yardımcı olalım?” ve blog bölümü', items: [T('home_help_kicker', 'Küçük etiket'), T('home_help_title', 'Başlık'), T('biz_card_cta', 'İşletme kartı bağlantı yazısı'), T('cour_card_cta', 'Kurye kartı bağlantı yazısı'), T('home_blog_kicker', 'Blog bölümü küçük etiketi (tüm sayfalarda)'), T('home_blog_title', 'Blog bölümü başlığı'), T('home_blog_text', 'Blog bölümü açıklaması')] }
    ] },
    { id: 'hakkimizda', group: 'Genel', label: 'Hakkımızda', blocks: [
      { type: 'images', title: 'Görsel', items: [['about', 'Hakkımızda görseli']] },
      { type: 'texts', title: 'Metinler', items: [T('about_kicker', 'Küçük etiket'), T('about_title', 'Başlık'), T('about_text', 'Şirket hikâyesi (paragrafları boş satırla ayırın)', 1), T('about_mission_title', 'Misyon başlığı'), T('about_mission', 'Misyon', 1), T('about_vision_title', 'Vizyon başlığı'), T('about_vision', 'Vizyon', 1), T('about_values_title', 'Değerler başlığı')] },
      { type: 'list', key: 'values', title: 'Değerlerimiz', item: 'değer', fields: [['icon', 'İkon', 'icon'], ['title', 'Başlık'], ['desc', 'Açıklama', 'ta']] }
    ] },
    { id: 'isletme', group: 'İşletmeler', label: 'Hizmetler & Avantajlar', blocks: [
      { type: 'texts', title: 'Hizmetler başlığı', items: [T('services_kicker', 'Küçük etiket'), T('services_title', 'Başlık'), T('services_text', 'Açıklama', 1)] },
      { type: 'list', key: 'services', title: 'Hizmet kartları', item: 'hizmet', fields: [['icon', 'İkon', 'icon'], ['title', 'Başlık'], ['desc', 'Açıklama', 'ta']] },
      { type: 'images', title: 'Avantajlar görselleri', items: [['business', 'Avantajlar bölümü görseli'], ['business_sticker', 'Yuvarlak sticker']] },
      { type: 'texts', title: 'Avantajlar metinleri', items: [T('business_kicker', 'Küçük etiket'), T('business_title', 'Başlık'), T('business_text', 'Açıklama', 1), T('business_cta', 'Buton yazısı')] },
      { type: 'list', key: 'businessBenefits', title: 'İşletme avantajları', item: 'avantaj', fields: [['icon', 'İkon', 'icon'], ['title', 'Başlık'], ['desc', 'Açıklama', 'ta']] }
    ] },
    { id: 'cozumler', group: 'İşletmeler', label: 'Çözümler & Adımlar', blocks: [
      { type: 'texts', title: 'Hizmet modelleri başlığı', items: [T('bizmodels_kicker', 'Küçük etiket'), T('bizmodels_title', 'Başlık'), T('bizmodels_text', 'Açıklama', 1)] },
      { type: 'list', key: 'bizModels', title: 'Hizmet modelleri', item: 'model', fields: [['icon', 'İkon', 'icon'], ['title', 'Başlık'], ['desc', 'Açıklama', 'ta'], ['tag', 'Öne çıkan etiket (opsiyonel)']] },
      { type: 'texts', title: 'Sektörler', items: [T('sectors_title', 'Sektörler başlığı')] },
      { type: 'list', key: 'sectors', title: 'Hizmet verilen sektörler', item: 'sektör', grid: true, fields: [['icon', 'İkon', 'icon'], ['title', 'Sektör adı']] },
      { type: 'texts', title: 'Nasıl çalışır', items: [T('bizsteps_kicker', 'Küçük etiket'), T('bizsteps_title', 'Başlık')] },
      { type: 'list', key: 'bizSteps', title: 'İşletme süreç adımları', item: 'adım', fields: [['title', 'Başlık'], ['desc', 'Açıklama']] }
    ] },
    { id: 'isletmeform', group: 'İşletmeler', label: 'Talep Formu', blocks: [
      { type: 'images', title: 'Görsel', items: [['bizform', 'Talep formu yan görseli']] },
      { type: 'texts', title: 'Metinler', items: [T('bizform_head', 'Form kutusu başlığı'), T('bizform_sub', 'Form kutusu alt yazısı'), T('bizform_kicker', 'Küçük etiket'), T('bizform_title', 'Başlık'), T('bizform_text', 'Açıklama', 1), T('bizform_p1', 'Madde 1'), T('bizform_p2', 'Madde 2'), T('bizform_p3', 'Madde 3'), T('bizform_btn', 'Gönder butonu yazısı'), T('bizform_success_title', 'Gönderim sonrası başlık'), T('bizform_success_text', 'Gönderim sonrası mesaj', 1)] },
      { type: 'formopts', forms: ['isletme'], title: 'Talep formu açılır liste seçenekleri' }
    ] },
    { id: 'kurye', group: 'Kuryeler', label: 'Kurye Ol', blocks: [
      { type: 'images', title: 'Görsel', items: [['courier', 'Kurye Ol bölümü görseli']] },
      { type: 'texts', title: 'Metinler', items: [T('courier_kicker', 'Küçük etiket'), T('courier_title', 'Başlık'), T('courier_text', 'Açıklama', 1), T('courier_img_tag', 'Görsel üzerindeki etiket'), T('req_title', 'Şartlar başlığı'), T('req_btn', 'Şartlar altındaki buton'), T('models_title', 'Çalışma modelleri başlığı'), T('steps_title', 'Süreç başlığı')] },
      { type: 'list', key: 'courierBenefits', title: 'Kurye avantajları', item: 'avantaj', fields: [['icon', 'İkon', 'icon'], ['title', 'Başlık'], ['desc', 'Açıklama', 'ta']] },
      { type: 'list', key: 'requirements', title: 'Başvuru şartları', item: 'şart', plain: true },
      { type: 'list', key: 'workModels', title: 'Çalışma modelleri', item: 'model', fields: [['title', 'Başlık'], ['hours', 'Saatler'], ['desc', 'Açıklama', 'ta'], ['tag', 'Öne çıkan etiket (opsiyonel)']] },
      { type: 'list', key: 'steps', title: 'Kurye başvuru süreci adımları', item: 'adım', fields: [['title', 'Başlık'], ['desc', 'Açıklama']] }
    ] },
    { id: 'kazanc', group: 'Kuryeler', label: 'Kazanç Hesaplayıcı', blocks: [
      { type: 'calc', title: 'Hesaplama ayarları' },
      { type: 'texts', title: 'Metinler', items: [T('calc_kicker', 'Küçük etiket'), T('calc_title', 'Başlık'), T('calc_text', 'Açıklama', 1), T('calc_note', 'Uyarı notu (tahmini olduğunu belirtin)', 1), T('calc_btn', 'Buton yazısı')] },
      { type: 'texts', title: 'Hesaplayıcı etiketleri', items: [T('calc_l_pkg', 'Günlük paket etiketi'), T('calc_l_days', 'Gün seçimi etiketi'), T('calc_l_day', 'Günlük sonuç'), T('calc_l_week', 'Haftalık sonuç'), T('calc_l_month', 'Aylık sonuç')] },
      { type: 'images', title: 'Görsel', items: [['calc', 'Hesaplayıcı yan görseli']] }
    ] },
    { id: 'kuryeform', group: 'Kuryeler', label: 'Başvuru Formu', blocks: [
      { type: 'images', title: 'Görsel', items: [['courform', 'Başvuru formu yan görseli']] },
      { type: 'texts', title: 'Metinler', items: [T('courform_head', 'Form kutusu başlığı'), T('courform_sub', 'Form kutusu alt yazısı'), T('courform_kicker', 'Küçük etiket'), T('courform_title', 'Başlık'), T('courform_text', 'Açıklama', 1), T('courform_p1', 'Madde 1'), T('courform_p2', 'Madde 2'), T('courform_p3', 'Madde 3'), T('courform_btn', 'Gönder butonu yazısı'), T('courform_success_title', 'Gönderim sonrası başlık'), T('courform_success_text', 'Gönderim sonrası mesaj', 1)] },
      { type: 'formopts', forms: ['kurye'], title: 'Başvuru formu açılır liste seçenekleri' }
    ] },
    { id: 'yorum', group: 'Ortak', label: 'Yorumlar', blocks: [
      { type: 'texts', title: 'Bölüm başlığı', items: [T('testimonials_kicker', 'Küçük etiket'), T('testimonials_title', 'Başlık')] },
      { type: 'list', key: 'testimonials', title: 'Yorumlar — yalnızca izin aldığınız gerçek yorumları ekleyin', item: 'yorum', grid: true, fields: [['type', 'Yorum sahibi', 'select', [['isletme', 'İşletme / müşteri'], ['kurye', 'Kurye']]], ['name', 'Ad Soyad / İşletme'], ['role', 'Ünvan (ör. Restoran sahibi)'], ['rating', 'Puan (1–5)', 'rating'], ['text', 'Yorum', 'ta'], ['photo', 'Fotoğraf (opsiyonel)', 'img']] }
    ] },
    { id: 'ref', group: 'Ortak', label: 'Galeri', blocks: [
      { type: 'texts', title: 'Bölüm başlığı', items: [T('refs_kicker', 'Küçük etiket'), T('refs_title', 'Başlık'), T('refs_text', 'Açıklama', 1)] },
      { type: 'list', key: 'gallery', title: 'Galeri görselleri (başlıklar görsel açıklaması olarak SEO’ya da katkı sağlar)', item: 'görsel', grid: true, fields: [['src', 'Görsel', 'img'], ['title', 'Başlık']] }
    ] },
    { id: 'bolge', group: 'Ortak', label: 'Bölgeler', blocks: [
      { type: 'texts', title: 'Bölüm metinleri', items: [T('regions_kicker', 'Küçük etiket'), T('regions_title', 'Başlık'), T('regions_text', 'Açıklama', 1)] },
      { type: 'list', key: 'regions', title: 'Bölgeler (ilçe / semt) — yerel aramalarda görünürlüğü artırır', item: 'bölge', plain: true }
    ] },
    { id: 'sss', group: 'Ortak', label: 'SSS', blocks: [
      { type: 'texts', title: 'Bölüm başlığı', items: [T('faq_kicker', 'Küçük etiket'), T('faq_title', 'Başlık')] },
      { type: 'list', key: 'faq', title: 'Sorular (sitede İşletmeler / Kuryeler sekmelerinde gösterilir)', item: 'soru', fields: [['cat', 'Kime yönelik', 'select', [['isletme', 'İşletmeler'], ['kurye', 'Kuryeler'], ['genel', 'Her ikisi']]], ['q', 'Soru'], ['a', 'Cevap', 'ta']] }
    ] },
    { id: 'iletisim', group: 'Ortak', label: 'İletişim & KVKK', blocks: [
      { type: 'images', title: 'Görsel', items: [['contact', 'İletişim görseli (harita kodu girilmezse gösterilir)']] },
      { type: 'texts', title: 'İletişim metinleri', items: [T('contact_kicker', 'Küçük etiket'), T('contact_title', 'Başlık'), T('contact_text', 'Açıklama', 1)] },
      { type: 'texts', title: 'KVKK', items: [T('kvkk_text', 'Onay kutusu metni', 1), T('kvkk_title', 'Aydınlatma metni başlığı'), T('kvkk_full', 'Aydınlatma metni (hukukçunuza kontrol ettirmeniz önerilir)', 1)] }
    ] },
    { id: 'blog', group: 'Blog', label: 'Blog Yazıları', blocks: [{ type: 'blog', title: 'Blog yazıları' }] },
    { id: 'seo', group: 'Yayın', label: 'SEO', blocks: [
      { type: 'seo', title: 'SEO puanı ve Google önizlemesi' },
      { type: 'texts', title: 'Ana sayfa: arama sonucu başlığı ve açıklaması', items: [T('seo_title', 'Sayfa başlığı (title) — 50–60 karakter önerilir'), T('seo_description', 'Meta açıklama — 140–160 karakter önerilir', 1)] },
      { type: 'texts', title: 'Diğer sayfalar: arama sonucu başlıkları ve açıklamaları', note: 'Her sayfanın Google’da görünen başlığı ve açıklaması. Blog yazılarınınki yazı düzenleyicisindedir.', items: [T('seo_biz_title', 'İşletmeler sayfası – başlık'), T('seo_biz_desc', 'İşletmeler sayfası – açıklama', 1), T('seo_cour_title', 'Kuryeler sayfası – başlık'), T('seo_cour_desc', 'Kuryeler sayfası – açıklama', 1), T('seo_bv_title', 'Başvuru sayfası – başlık'), T('seo_bv_desc', 'Başvuru sayfası – açıklama', 1), T('seo_blog_title', 'Blog sayfası – başlık'), T('seo_blog_desc', 'Blog sayfası – açıklama', 1)] },
      { type: 'settings', title: 'Site adresi ve anahtar kelimeler', items: [T('site_url', 'Sitenin tam adresi (ör. https://yakindakurye.com)'), T('seo_keywords', 'Anahtar kelimeler (virgülle)', 1), { k: 'noindex', l: 'Siteyi arama motorlarından gizle (yalnızca test aşamasında açın)', bool: true, def: false }] },
      { type: 'images', title: 'Sosyal medya paylaşım görseli', items: [['og', 'Paylaşım görseli (boşsa ana görsel kullanılır, 1200×630 önerilir)']] },
      { type: 'settings', title: 'Yerel SEO (Google Haritalar & yerel aramalar)', note: 'Koordinatları Google Haritalar’da şubenize sağ tıklayarak kopyalayabilirsiniz.', items: [T('city', 'İl'), T('district', 'İlçe'), T('postal', 'Posta kodu'), T('geo_lat', 'Enlem (ör. 39.9208)'), T('geo_lng', 'Boylam (ör. 32.8541)'), T('opening_hours', 'Açılış saatleri (schema biçimi, ör. Mo-Su 00:00-23:59)'), T('price_range', 'Fiyat aralığı (opsiyonel, ör. ₺₺)')] },
      { type: 'settings', title: 'Google İş Arama — kurye iş ilanı', note: 'Açık olduğunda kurye alımınız Google’ın iş arama sonuçlarında çıkabilecek şekilde yapısal veri olarak eklenir.', items: [{ k: 'job_enabled', l: 'Kurye iş ilanı yapısal verisini ekle', bool: true }, T('job_title', 'İlan başlığı'), T('job_salary', 'Aylık tahmini ücret (₺, opsiyonel)'), T('job_posted', 'İlan tarihi (YYYY-AA-GG, boşsa ayın 1’i)')] },
      { type: 'settings', title: 'Google araçları', note: 'Search Console: “HTML etiketi” doğrulamasındaki content değerini girin. Analytics: G- ile başlayan ölçüm kimliği girilirse ziyaretçilere çerez onayı sorulur ve onay verenler ölçülür.', items: [T('gsc_verify', 'Google Search Console doğrulama kodu'), T('ga_id', 'Google Analytics 4 ölçüm kimliği (G-XXXXXXX)')] }
    ] },
    { id: 'yayin', group: 'Yayın', label: 'Yayınla', blocks: [{ type: 'publish', title: 'Değişiklikleri sitede yayınla' }] }
  ];

  function viewContent(tabId) {
    let draft = YK.getContent();
    const tab = CONTENT_TABS.find(t => t.id === tabId) || CONTENT_TABS[0];
    const isPub = tab.id === 'yayin';
    setTop(tab.id === 'seo' ? 'SEO' : 'Site İçeriği', editBtn() + '<a href="' + previewHref() + '" target="_blank" rel="noopener" class="btn btn-light" title="Kaydedilmiş (yayınlanmamış) hali gösterir">' + I('goz') + '<span class="hide-sm">Önizle</span></a>' + (isPub ? '' : '<button class="btn btn-light" id="cUndo" disabled>Geri al</button><button class="btn btn-yellow" id="cSave" disabled>' + I('check') + 'Kaydet</button>') + '<a href="#icerik/yayin" class="btn btn-dark' + (YK.hasUnpublished() ? ' attn' : '') + '">' + I('gonder') + 'Yayınla</a>',
      tab.id === 'seo' ? 'Arama motorları ve sosyal medya için ayarlar' : 'Metinler, görseller ve bölümler · ' + tab.label);
    const groups = []; CONTENT_TABS.forEach(t => { let g = groups.find(x => x.n === t.group); if (!g) groups.push(g = { n: t.group, t: [] }); g.t.push(t); });
    view.innerHTML = '<nav class="ctabs">' + groups.map(g => '<div class="ctg"><span>' + esc(g.n) + '</span><div>' + g.t.map(t => '<a href="#icerik/' + t.id + '" class="' + (t === tab ? 'on' : '') + '">' + t.label + (t.id === 'yayin' && YK.hasUnpublished() ? ' <i class="dotr"></i>' : '') + '</a>').join('') + '</div></div>').join('') + '</nav>' +
      (YK.hasUnpublished() && !isPub ? '<div class="alert">' + I('uyari') + '<div>' + (R.on ? 'Kaydettiğiniz değişiklikler henüz <b>sitede yayında değil</b>. <a href="' + previewHref() + '" target="_blank" rel="noopener">Önizleyin</a>, ardından <a href="#icerik/yayin">Yayınla</a> ile tek tıkla yayına alın.' : 'Kaydettiğiniz değişiklikler şu an <b>yalnızca bu tarayıcıda</b> görünüyor. Ziyaretçilerin görmesi için <a href="#icerik/yayin">Yayınla</a> adımını tamamlayın.') + '</div></div>' : '') +
      '<div id="cBody"></div>';
    const setDirty = v => { dirty = v; if (isPub) return; $('#cSave').disabled = !v; $('#cUndo').disabled = !v; $('#cSave').classList.toggle('pulse', v); };
    const save = () => { if (!dirty) return; if (YK.saveContent(draft)) { setDirty(false); YK.log('Site içeriği güncellendi (' + tab.label + ')'); toast('Kaydedildi — yayına almak için “Yayınla”'); updateBadges(); } };
    if (!isPub) { $('#cSave').onclick = save; $('#cUndo').onclick = () => { draft = YK.getContent(); setDirty(false); draw(); }; }
    view.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };

    function draw() {
      const box = $('#cBody'); box.innerHTML = '';
      tab.blocks.forEach(b => {
        const sec = document.createElement('section'); sec.className = 'card';
        sec.innerHTML = '<div class="card-head"><h2>' + esc(b.title) + '</h2></div>' + (b.note ? '<p class="muted small">' + esc(b.note) + '</p>' : '');
        if (b.type === 'texts' || b.type === 'settings') {
          const src = b.type === 'texts' ? draft.texts : draft.settings;
          const g = document.createElement('div'); g.className = 'f-grid';
          b.items.forEach(it => {
            const l = document.createElement('label');
            if (it.bool) {
              const on = it.def === false ? src[it.k] === true : src[it.k] !== false;
              l.className = 'switch full'; l.innerHTML = '<input type="checkbox"' + (on ? ' checked' : '') + '><span class="sw"></span><span>' + esc(it.l) + '</span>';
              $('input', l).onchange = e => { src[it.k] = e.target.checked; setDirty(true); if (b.title.indexOf('Site adresi') === 0) drawSeo(); };
            } else {
              l.className = 'fld' + (it.ta ? ' full' : '');
              l.innerHTML = '<span>' + esc(it.l) + '</span>' + (it.ta ? '<textarea rows="' + (it.k === 'kvkk_full' || it.k === 'about_text' ? 8 : 3) + '"></textarea>' : '<input>') + '<small class="cnt"></small>';
              const inp = $('input,textarea', l), cnt = $('.cnt', l); inp.value = src[it.k] || '';
              const lim = { seo_title: [30, 60], seo_description: [120, 160] }[it.k] || (/^seo_[a-z]+_title$/.test(it.k) ? [30, 60] : /^seo_[a-z]+_desc$/.test(it.k) ? [120, 160] : null);
              const showCnt = () => { if (lim) { const n = inp.value.length; cnt.textContent = n + ' karakter' + (n < lim[0] ? ' · kısa' : n > lim[1] ? ' · uzun, Google kısaltabilir' : ' · ideal'); cnt.className = 'cnt ' + (n >= lim[0] && n <= lim[1] ? 'good' : 'warn'); } };
              inp.oninput = () => { src[it.k] = inp.value; setDirty(true); showCnt(); if (tab.id === 'seo') drawSeo(); }; showCnt();
              if (b.type === 'texts' && YK.DEFAULT_CONTENT.texts[it.k] != null && src[it.k] !== YK.DEFAULT_CONTENT.texts[it.k]) {
                const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'link-btn fld-reset'; rb.textContent = 'Varsayılana dön';
                rb.onclick = e => { e.preventDefault(); src[it.k] = inp.value = YK.DEFAULT_CONTENT.texts[it.k]; setDirty(true); showCnt(); rb.remove(); if (tab.id === 'seo') drawSeo(); };
                l.appendChild(rb);
              }
            }
            g.appendChild(l);
          });
          sec.appendChild(g);
        } else if (b.type === 'images') {
          const g = document.createElement('div'); g.className = 'img-grid';
          b.items.forEach(([k, l]) => {
            const c = document.createElement('div'); c.className = 'img-card';
            c.innerHTML = '<div class="img-prev' + (k === 'logo_dark' ? ' dark' : '') + '">' + (draft.images[k] ? '<img data-src="' + esc(draft.images[k]) + '" alt="">' : '<span class="muted small">Seçilmedi</span>') + '</div><b>' + esc(l) + '</b><div class="img-btns"><button class="btn btn-light sm" data-c>' + I('gorsel') + 'Değiştir</button>' + (draft.images[k] !== YK.DEFAULT_CONTENT.images[k] ? '<button class="link-btn" data-r>Varsayılana dön</button>' : '') + '</div>';
            $('[data-c]', c).onclick = () => pickImage(src => { draft.images[k] = src; setDirty(true); draw(); });
            const r = $('[data-r]', c); if (r) r.onclick = () => { draft.images[k] = YK.DEFAULT_CONTENT.images[k]; setDirty(true); draw(); };
            g.appendChild(c);
          });
          sec.appendChild(g);
        } else if (b.type === 'list') {
          sec.appendChild(listEditor(b, draft, () => { if (b.review) draft.reviewed = Object.assign({}, draft.reviewed, { [b.review]: true }); setDirty(true); }, draw));
        } else if (b.type === 'sections') {
          const g = document.createElement('div'); g.className = 'sec-groups';
          SECTION_LABELS.forEach(([gn, items]) => {
            const col = document.createElement('div'); col.className = 'sec-group'; col.innerHTML = '<h4>' + esc(gn) + '</h4>';
            items.forEach(([k, l]) => {
              const s = document.createElement('label'); s.className = 'switch';
              s.innerHTML = '<input type="checkbox"' + (draft.sections[k] !== false ? ' checked' : '') + '><span class="sw"></span><span>' + esc(l) + '</span>';
              $('input', s).onchange = e => { draft.sections[k] = e.target.checked; setDirty(true); };
              col.appendChild(s);
            });
            g.appendChild(col);
          });
          sec.appendChild(g);
        } else if (b.type === 'calc') {
          const k = draft.calc;
          const g = document.createElement('div'); g.className = 'f-grid';
          [['perPackage', 'Paket başı kazanç (₺)'], ['defPackages', 'Varsayılan günlük paket'], ['minPackages', 'En az günlük paket'], ['maxPackages', 'En çok günlük paket'], ['defDays', 'Varsayılan haftalık gün (1–7)']].forEach(([key, l]) => {
            const f = document.createElement('label'); f.className = 'fld';
            f.innerHTML = '<span>' + esc(l) + '</span><input type="number" min="0" step="any" value="' + esc(k[key]) + '">';
            $('input', f).oninput = e => { k[key] = Number(e.target.value) || 0; k.configured = true; setDirty(true); prev(); };
            g.appendChild(f);
          });
          const p = document.createElement('div'); p.className = 'calc-prev';
          const prev = () => { const d = (k.defPackages || 0) * (k.perPackage || 0), w = d * (k.defDays || 0); p.innerHTML = 'Önizleme: günde <b>' + (k.defPackages || 0) + '</b> paket × <b>' + YK.fmtMoney(k.perPackage) + '</b> = <b>' + YK.fmtMoney(d) + '</b> / gün · <b>' + YK.fmtMoney(w) + '</b> / hafta · <b>' + YK.fmtMoney(w * 52 / 12) + '</b> / ay' + (k.configured ? '' : ' <span class="pill red">Örnek değer — gerçek ücretinizi girin</span>'); };
          prev(); sec.appendChild(g); sec.appendChild(p);
        } else if (b.type === 'formopts') {
          const wrap = document.createElement('div'); wrap.className = 'fo-grid';
          (b.forms || ['kurye', 'isletme']).forEach(t => YK.FORMS[t].fields.filter(f => f.type === 'select' && f.name !== 'il').forEach(f => {
            const key = t + '.' + f.name, cur = (draft.formOptions[key] && draft.formOptions[key].length ? draft.formOptions[key] : f.options);
            const bx = document.createElement('label'); bx.className = 'fld';
            bx.innerHTML = '<span>' + esc(f.label) + '</span><textarea rows="4">' + esc(cur.join('\n')) + '</textarea><small>Her satıra bir seçenek yazın.</small>';
            $('textarea', bx).oninput = e => { draft.formOptions[key] = e.target.value.split('\n').map(x => x.trim()).filter(Boolean); setDirty(true); };
            wrap.appendChild(bx);
          }));
          sec.appendChild(wrap);
        } else if (b.type === 'theme') {
          sec.appendChild(themeEditor(draft, () => setDirty(true)));
        } else if (b.type === 'popup') {
          sec.appendChild(popupEditor(draft, () => setDirty(true), draw));
        } else if (b.type === 'blog') {
          sec.appendChild(blogEditor(draft, () => setDirty(true), draw, save));
        } else if (b.type === 'seo') {
          sec.id = 'seoBox'; sec.classList.add('seo-card');
        } else if (b.type === 'publish') {
          sec.appendChild(publishPanel());
        }
        box.appendChild(sec);
      });
      hydrate(box);
      drawSeo();
    }
    function drawSeo() {
      const sec = $('#seoBox'); if (!sec) return;
      const t = draft.texts, s = draft.settings;
      const title = t.seo_title || t.site_title || '', desc = t.seo_description || '';
      const url = (s.site_url || 'https://alanadiniz.com').replace(/\/+$/, '');
      const checks = [
        [title.length >= 30 && title.length <= 60, 'Başlık uzunluğu ideal (30–60 karakter)', title.length + ' karakter'],
        [desc.length >= 120 && desc.length <= 160, 'Meta açıklama uzunluğu ideal (120–160)', desc.length + ' karakter'],
        [/kurye/i.test(title) && /kurye/i.test(desc), 'Başlık ve açıklamada ana anahtar kelime (“kurye”) geçiyor', ''],
        [!!s.city && (title + desc).toLocaleLowerCase('tr-TR').indexOf(s.city.toLocaleLowerCase('tr-TR')) >= 0, 'Başlık/açıklamada şehir adı geçiyor (yerel arama için)', s.city || 'il girilmedi'],
        [/^https:\/\//.test(s.site_url || ''), 'Site adresi (https) girildi — kanonik URL ve sitemap için', ''],
        [!!(s.geo_lat && s.geo_lng), 'Konum koordinatları girildi (Google Haritalar)', ''],
        [!!s.district || draft.regions.filter(Boolean).length > 0, 'İlçe veya hizmet bölgeleri girildi', ''],
        [!!s.gsc_verify, 'Google Search Console doğrulaması eklendi', ''],
        [draft.faq.length >= 4, 'SSS bölümünde en az 4 soru var (zengin sonuç)', draft.faq.length + ' soru'],
        [draft.gallery.every(g => g.title), 'Tüm galeri görsellerinin başlığı (alt metni) var', ''],
        [YK.blogList(draft).length >= 3, 'Blogda en az 3 yazı yayında (arama trafiği için)', YK.blogList(draft).length + ' yazı'],
        [!s.noindex, 'Site arama motorlarına açık', ''],
        [!YK.hasUnpublished(), 'Son değişiklikler yayınlandı', '']
      ];
      const score = Math.round(checks.filter(c => c[0]).length / checks.length * 100);
      sec.innerHTML = '<div class="card-head"><h2>' + I('ara') + 'SEO puanı ve Google önizlemesi</h2></div><div class="seo-grid"><div class="seo-score" style="--p:' + score + '"><b>' + score + '</b><span>/ 100</span></div>' +
        '<div class="serp"><small>Google arama sonucu önizlemesi</small><div class="serp-box"><span class="serp-url">' + esc(url.replace(/^https?:\/\//, '')) + '</span><span class="serp-title">' + esc(title.length > 62 ? title.slice(0, 60) + '…' : title) + '</span><span class="serp-desc">' + esc(desc.length > 162 ? desc.slice(0, 158) + '…' : desc) + '</span></div></div></div>' +
        '<ul class="seo-list">' + checks.map(c => '<li class="' + (c[0] ? 'ok' : '') + '"><span class="sc">' + I(c[0] ? 'check' : 'uyari') + '</span><span>' + esc(c[1]) + '</span><small>' + esc(c[2]) + '</small></li>').join('') + '</ul>' +
        '<div class="btn-row mt"><button class="btn btn-light sm" id="dlSitemap">' + I('indir') + 'sitemap.xml indir</button><button class="btn btn-light sm" id="dlRobots">' + I('indir') + 'robots.txt indir</button></div><p class="muted small">Bu iki dosyayı sitenin ana klasörüne yükleyin, ardından Google Search Console’da sitemap adresini gönderin.</p>';
      $('#dlSitemap', sec).onclick = () => { if (!s.site_url) return toast('Önce site adresini girin', 'err'); YK.download('sitemap.xml', YK.sitemapXML(s.site_url), 'application/xml'); };
      $('#dlRobots', sec).onclick = () => YK.download('robots.txt', YK.robotsTXT(s.site_url, s.noindex), 'text/plain');
    }
    draw();
  }

  function publishPanel() {
    const box = document.createElement('div');
    const pending = YK.hasUnpublished();
    const state = '<div class="pub-state ' + (pending ? 'warn' : 'ok') + '">' + I(pending ? 'uyari' : 'check') + '<div><b>' + (pending ? 'Yayınlanmamış değişiklikleriniz var' : 'Site güncel') + '</b><p>' +
      (pending ? (R.on ? 'Kaydettiğiniz içerik henüz ziyaretçilere görünmüyor.' : 'Panelde kaydettiğiniz içerik şu an yalnızca bu tarayıcıda görünüyor.') : 'Panel içeriği ile yayındaki içerik aynı.') + '</p></div></div>';
    if (R.on) {
      box.innerHTML = state +
        '<p class="muted">“Sitede yayınla” butonu; site içeriğini, arama motoru etiketlerini (başlık, açıklama, paylaşım görseli), blog yazılarının sayfalarını ve alan adı girildiyse <code>sitemap.xml</code> / <code>robots.txt</code> dosyalarını sunucuda anında günceller.</p>' +
        '<div class="btn-row"><a class="btn btn-light btn-lg" href="' + previewHref() + '" target="_blank" rel="noopener">' + I('goz') + 'Önce önizle</a><button class="btn btn-yellow btn-lg" id="pubGo"' + (pending ? '' : ' disabled') + '>' + I('gonder') + 'Sitede yayınla</button></div>' +
        '<div id="pubRes"></div>' +
        '<details class="pub-alt mt"><summary>Alternatif: content.js dosyasını indir</summary><p class="muted small">Sunucu dosyaya yazamıyorsa (izin hatası) indirilen <code>content.js</code> dosyasını FTP ile <code>assets/js/</code> klasörüne yükleyebilirsiniz.</p><button class="btn btn-light sm" id="pubDl">' + I('indir') + 'content.js indir</button></details>' +
        '<p class="muted small mt">Not: Başvurular, müşteriler, çalışanlar ve kayıtlar yayınlanmaz; yalnızca site içeriği yayınlanır.</p>';
      $('#pubGo', box).onclick = async () => {
        const b = $('#pubGo', box); b.disabled = true; b.classList.add('loading');
        try {
          const j = await YK.server.publish(YK.getContent());
          const r = j.result || {};
          YK.log('Site içeriği yayınlandı'); toast('Site yayınlandı');
          updateBadges(); rerender();
          setTimeout(() => { const pr = $('#pubRes'); if (pr) pr.innerHTML = '<div class="alert ok mt">' + I('check') + '<div><b>Yayınlandı.</b> İçerik ' + (r.index ? '+ SEO etiketleri ' : '') + (r.blog ? '+ ' + r.blog + ' blog sayfası ' : '') + (r.sitemap ? '+ sitemap.xml ' : '') + 'güncellendi. Ziyaretçiler sayfayı yenilediğinde yeni hali görür.' + (r.index ? '' : ' <br><small>index.html’deki SEO etiketleri güncellenemedi (dosya izni); site içeriği yine de yayında.</small>') + '</div></div>'; }, 50);
        } catch (e) {
          b.disabled = false; b.classList.remove('loading');
          $('#pubRes', box).innerHTML = '<div class="alert warn mt">' + I('uyari') + '<div><b>Yayınlanamadı.</b> ' + esc(e.message) + '</div></div>';
          const d = $('.pub-alt', box); if (d) d.open = true;
        }
      };
    } else {
      box.innerHTML = state +
        '<ol class="pub-steps"><li><b>Yayın dosyasını indirin</b><span>Aşağıdaki butonla <code>content.js</code> dosyası iner. Yüklediğiniz görseller dosyanın içine eklenir.</span></li>' +
        '<li><b>Dosyayı yerine koyun</b><span>İnen dosyayı sitenizin <code>assets/js/</code> klasöründeki <code>content.js</code> ile değiştirin (bilgisayarınızda ve hosting’e yüklerken).</span></li>' +
        '<li><b>Siteyi yükleyin</b><span>Hosting’e (FTP / dosya yöneticisi) yükleyin. SEO sekmesindeki <code>sitemap.xml</code> ve <code>robots.txt</code> dosyalarını da ana klasöre koyun.</span></li></ol>' +
        '<div class="btn-row"><button class="btn btn-yellow btn-lg" id="pubDl">' + I('indir') + 'content.js indir</button></div>' +
        '<div class="alert mt">' + I('kalkan') + '<div><b>İpucu:</b> Site PHP destekli bir hostingde çalıştığında panel otomatik olarak <b>sunucu modu</b>na geçer: “Yayınla” tek tıkla siteyi günceller ve başvurular her cihazdan panele düşer.</div></div>' +
        '<p class="muted small mt">Not: Başvurular, müşteriler, çalışanlar ve kayıtlar bu dosyaya <b>eklenmez</b>; yalnızca site içeriği yayınlanır.</p>';
    }
    $('#pubDl', box).onclick = async () => {
      try {
        const txt = await YK.buildPublishFile();
        YK.download('content.js', txt, 'text/javascript;charset=utf-8');
        try { localStorage.setItem('yk_last_publish', new Date().toISOString()); } catch (e) {}
        YK.log('Yayın dosyası (content.js) indirildi'); toast('content.js indirildi — assets/js klasörüne koyun');
      } catch (e) { toast('Yayın dosyası oluşturulamadı', 'err'); }
    };
    return box;
  }

  function listEditor(b, draft, changed, redraw) {
    const arr = draft[b.key];
    const wrap = document.createElement('div'); wrap.className = 'list-ed' + (b.grid ? ' grid' : '');
    arr.forEach((item, i) => {
      const row = document.createElement('div'); row.className = 'le-item';
      const ctr = '<div class="le-ctrl"><span class="le-n">' + (i + 1) + '</span><button class="icon-btn sm" data-u title="Yukarı" aria-label="Yukarı"' + (i ? '' : ' disabled') + '>' + I('yukari') + '</button><button class="icon-btn sm" data-d title="Aşağı" aria-label="Aşağı"' + (i < arr.length - 1 ? '' : ' disabled') + '>' + I('asagi') + '</button><button class="icon-btn sm danger" data-x title="Sil" aria-label="Sil">' + I('cop') + '</button></div>';
      if (b.plain) {
        row.innerHTML = '<input class="le-plain">' + ctr; row.classList.add('plain');
        const inp = $('input', row); inp.value = item; inp.oninput = () => { arr[i] = inp.value; changed(); };
      } else {
        row.innerHTML = '<div class="le-fields"></div>' + ctr;
        const fbox = $('.le-fields', row);
        b.fields.forEach(([k, l, t]) => {
          const fl = document.createElement('label'); fl.className = 'fld' + (t === 'ta' || t === 'img' ? ' full' : '');
          if (t === 'icon') {
            fl.innerHTML = '<span>' + esc(l) + '</span><div class="icon-pick"><span class="ip-cur">' + I(item[k]) + '</span><select>' + YK.ICON_CHOICES.map(n => '<option' + (n === item[k] ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>';
            const s = $('select', fl); s.onchange = () => { item[k] = s.value; $('.ip-cur', fl).innerHTML = I(s.value); changed(); };
          } else if (t === 'select') {
            const o = b.fields.find(f => f[0] === k)[3];
            if (!item[k]) item[k] = o[0][0];
            fl.innerHTML = '<span>' + esc(l) + '</span><select>' + o.map(([v, lab]) => '<option value="' + v + '"' + (item[k] === v ? ' selected' : '') + '>' + esc(lab) + '</option>').join('') + '</select>';
            const s2 = $('select', fl); s2.onchange = () => { item[k] = s2.value; changed(); };
          } else if (t === 'rating') {
            fl.innerHTML = '<span>' + esc(l) + '</span><select>' + [5, 4, 3, 2, 1].map(n => '<option value="' + n + '"' + (String(item[k] || 5) === String(n) ? ' selected' : '') + '>' + '★'.repeat(n) + '</option>').join('') + '</select>';
            const s = $('select', fl); s.onchange = () => { item[k] = s.value; changed(); };
          } else if (t === 'img') {
            fl.innerHTML = '<span>' + esc(l) + '</span><div class="le-img">' + (item[k] ? '<img data-src="' + esc(item[k]) + '" alt="">' : '<div class="le-noimg">' + I('gorsel') + '</div>') + '<div class="img-btns"><button type="button" class="btn btn-light sm" data-pick>' + I('gorsel') + (item[k] ? 'Değiştir' : 'Seç') + '</button>' + (item[k] && b.key !== 'gallery' ? '<button type="button" class="link-btn" data-clear>Kaldır</button>' : '') + '</div></div>';
            $('[data-pick]', fl).onclick = () => pickImage(src => { item[k] = src; changed(); redraw(); });
            const cl = $('[data-clear]', fl); if (cl) cl.onclick = () => { item[k] = ''; changed(); redraw(); };
          } else {
            fl.innerHTML = '<span>' + esc(l) + '</span>' + (t === 'ta' ? '<textarea rows="2"></textarea>' : '<input>');
            const inp = $('input,textarea', fl); inp.value = item[k] || ''; inp.oninput = () => { item[k] = inp.value; changed(); };
          }
          fbox.appendChild(fl);
        });
      }
      $('[data-u]', row).onclick = () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); changed(); redraw(); };
      $('[data-d]', row).onclick = () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); changed(); redraw(); };
      $('[data-x]', row).onclick = () => { arr.splice(i, 1); changed(); redraw(); };
      wrap.appendChild(row);
    });
    const add = document.createElement('button'); add.className = 'btn btn-light add-btn'; add.innerHTML = I('arti') + 'Yeni ' + esc(b.item) + ' ekle';
    add.onclick = () => {
      const blank = () => { if (b.plain) return ''; const o = {}; b.fields.forEach(([k, , t]) => { o[k] = t === 'icon' ? 'paket' : t === 'rating' ? '5' : t === 'select' ? b.fields.find(f => f[0] === k)[3][0][0] : ''; }); return o; };
      if (b.key === 'gallery') pickImage(src => { arr.push({ src: src, title: '' }); changed(); redraw(); });
      else { arr.push(blank()); changed(); redraw(); }
    };
    wrap.appendChild(add);
    return wrap;
  }

  /* Blog yazıları: liste ve yazı düzenleyici */
  function blogEditor(draft, changed, redraw, persist) {
    if (!Array.isArray(draft.blog)) draft.blog = [];
    const arr = draft.blog;
    const prevUrl = p => 'blog/yazi.html?s=' + encodeURIComponent(p.slug) + '&onizleme=1';
    const wrap = document.createElement('div'); wrap.className = 'blog-ed';
    wrap.innerHTML = '<p class="muted small">' + (R.on ? 'Kaydettiğiniz yazılar “Yayınla” ile sitede yayına girer; her yazı için <code>blog/adres.html</code> sayfası oluşturulur ve sitemap’e eklenir.' : 'Kaydettiğiniz yazılar <code>content.js</code> yayınlandığında sitede görünür. Yeni yazılar <code>blog/yazi.html?s=adres</code> adresinde açılır; ek dosya gerekmez.') + ' Taslak yazılar sitede görünmez.</p>' +
      '<div class="blog-top"><div class="seg" id="bfSeg">' + [['', 'Tümü'], ['kurye', 'Kuryeler'], ['isletme', 'İşletmeler'], ['taslak', 'Taslaklar']].map(([k, l]) => '<button type="button" data-f="' + k + '"' + (k === (state.blogFilt || '') ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<button type="button" class="btn btn-yellow" data-new>' + I('arti') + 'Yeni yazı</button></div><div class="blog-rows"></div>';
    const rows = $('.blog-rows', wrap);
    function drawRows() {
      const f = state.blogFilt || '';
      const idx = arr.map((p, i) => i).sort((a, b) => String(arr[b].tarih || '').localeCompare(String(arr[a].tarih || '')) || a - b)
        .filter(i => !f || (f === 'taslak' ? arr[i].yayinda === false : arr[i].kategori === f));
      rows.innerHTML = idx.length ? idx.map(i => {
        const p = arr[i], live = p.yayinda !== false;
        return '<div class="blog-row" data-i="' + i + '"><div class="br-img">' + (p.gorsel ? '<img data-src="' + esc(p.gorsel) + '" alt="">' : I('gorsel')) + '</div>' +
          '<div class="br-body"><b>' + esc(p.baslik || 'Başlıksız yazı') + '</b><small><span class="pill' + (p.kategori === 'isletme' ? ' dark' : '') + '">' + esc(YK.BLOG_KAT[p.kategori] || '') + '</span>' +
          '<span class="pill ' + (live ? 'green' : 'red') + '">' + (live ? 'Yayında' : 'Taslak') + '</span><span>' + esc(YK.blogDate(p.tarih)) + '</span><span class="br-url">blog/' + esc(p.slug) + '.html</span></small></div>' +
          '<div class="br-act"><a class="btn btn-light sm" target="_blank" rel="noopener" href="' + esc(prevUrl(p)) + '" title="Kaydedilmiş halini sitede gösterir">' + I('goz') + '<span class="hide-sm">Önizle</span></a>' +
          '<button type="button" class="btn btn-light sm" data-e>' + I('kalem') + '<span class="hide-sm">Düzenle</span></button><button type="button" class="icon-btn sm danger" data-x title="Sil" aria-label="Sil">' + I('cop') + '</button></div></div>';
      }).join('') : empty('yazi', 'Bu listede yazı yok', 'Yeni bir yazı ekleyerek başlayın.');
      $$('.blog-row', rows).forEach(r => {
        const i = +r.dataset.i;
        $('[data-e]', r).onclick = () => openPost(i);
        $('[data-x]', r).onclick = async () => {
          if (!(await confirmBox('“' + (arr[i].baslik || 'Bu yazı') + '” silinsin mi? Değişikliği kaydedip yayınladığınızda sitede de kaldırılır.'))) return;
          arr.splice(i, 1); changed(); persist(); redraw();
        };
        $('.blog-row b', r).onclick = () => openPost(i);
      });
      hydrate(rows);
    }
    $$('#bfSeg button', wrap).forEach(b => b.onclick = () => { state.blogFilt = b.dataset.f; $$('#bfSeg button', wrap).forEach(x => x.classList.toggle('on', x === b)); drawRows(); });
    $('[data-new]', wrap).onclick = () => openPost(null);
    drawRows();

    function openPost(i) {
      const isNew = i == null;
      const p = isNew ? { slug: '', baslik: '', kategori: state.blogFilt === 'isletme' ? 'isletme' : 'kurye', tarih: today(), ozet: '', seo_title: '', seo_desc: '', gorsel: '', gorsel_alt: '', icerik: '', sss: [], yayinda: true } : JSON.parse(JSON.stringify(arr[i]));
      p.sss = Array.isArray(p.sss) ? p.sss : [];
      const oldSlug = p.slug;
      let slugTouched = !isNew, edited = false;
      const body = document.createElement('div'); body.className = 'post-ed';
      const btn = (k, ic, l) => '<button type="button" data-md="' + k + '" title="' + l + '">' + ic + '</button>';
      body.innerHTML =
        '<div class="f-grid">' +
        '<label class="fld full"><span>Başlık <i>*</i></span><input data-k="baslik" maxlength="140" placeholder="Ör. Moto Kurye Nasıl Olunur?"><small class="cnt" data-c="baslik"></small></label>' +
        '<label class="fld"><span>Kime yönelik</span><select data-k="kategori"><option value="kurye">Kuryeler İçin</option><option value="isletme">İşletmeler İçin</option></select></label>' +
        '<label class="fld"><span>Yayın tarihi</span><input type="date" data-k="tarih"></label>' +
        '<label class="fld full"><span>Sayfa adresi <i>*</i></span><div class="slug-in"><em>blog/</em><input data-k="slug" maxlength="70" spellcheck="false"><em>.html</em></div><small>Başlıktan otomatik oluşur. Küçük harf, rakam ve tire kullanın; yayınlandıktan sonra değiştirirseniz eski adres çalışmaz.</small></label>' +
        '<label class="fld full"><span>Özet <small>(liste kartlarında ve başlığın altında görünür)</small></span><textarea data-k="ozet" rows="2" maxlength="320"></textarea></label>' +
        '</div>' +
        '<div class="pe-img"><div class="pe-img-prev"></div><div class="fld"><span>Kapak görseli</span><div class="btn-row"><button type="button" class="btn btn-light sm" data-pick>' + I('gorsel') + 'Görsel seç</button><button type="button" class="link-btn" data-clear>Kaldır</button></div><label class="fld"><span>Görsel açıklaması (alt metin)</span><input data-k="gorsel_alt" placeholder="Görselde ne var? (SEO ve erişilebilirlik)"></label></div></div>' +
        '<div class="fld full"><span>İçerik <i>*</i></span>' +
        '<div class="md-bar">' + btn('h2', 'B1', 'Ara başlık (##)') + btn('h3', 'B2', 'Alt başlık (###)') + btn('b', '<b>K</b>', 'Kalın (**metin**)') + btn('ul', '•', 'Madde listesi (-)') + btn('ol', '1.', 'Numaralı liste (1.)') + btn('a', I('dis'), 'Bağlantı') + btn('not', I('uyari'), 'Not kutusu (>)') + btn('tablo', I('liste'), 'Tablo') +
        '<span class="md-sp"></span><div class="seg sm" data-tab><button type="button" class="on" data-v="yaz">Yaz</button><button type="button" data-v="on">Önizle</button></div></div>' +
        '<textarea data-k="icerik" rows="18" class="md-ta" spellcheck="true" placeholder="Paragrafları boş satırla ayırın. Ara başlık için satır başına ## yazın."></textarea><div class="md-prev" hidden></div>' +
        '<small>## ara başlık · ### alt başlık · - madde · 1. numaralı madde · **kalın** · [metin](adres) · &gt; not kutusu · | tablo |. Site içi bağlantı örnekleri: <code>kuryeler.html</code>, <code>basvuru.html#kurye-basvuru</code>, <code>blog/moto-kurye-nasil-olunur.html</code>. Yazının sonuna başvuru kutusu otomatik eklenir.</small></div>' +
        '<div class="pe-sss"><div class="pe-h"><b>Sık sorulan sorular</b><small>İsteğe bağlı; yazının sonunda gösterilir ve Google’a soru-cevap olarak bildirilir.</small></div><div class="pe-sss-list"></div><button type="button" class="btn btn-light sm" data-sss>' + I('arti') + 'Soru ekle</button></div>' +
        '<details class="pe-seo"><summary>SEO ayarları <small>(boş bırakılırsa başlık ve özet kullanılır)</small></summary><div class="f-grid one">' +
        '<label class="fld"><span>Arama sonucu başlığı</span><input data-k="seo_title" maxlength="90"><small class="cnt" data-c="seo_title"></small></label>' +
        '<label class="fld"><span>Meta açıklama</span><textarea data-k="seo_desc" rows="2" maxlength="220"></textarea><small class="cnt" data-c="seo_desc"></small></label>' +
        '<label class="fld"><span>Güncellenme tarihi (içeriği önemli ölçüde güncellediyseniz)</span><input type="date" data-k="guncelleme"></label>' +
        '</div><div class="serp"><small>Google önizlemesi</small><div class="serp-box"><span class="serp-url"></span><span class="serp-title"></span><span class="serp-desc"></span></div></div></details>' +
        '<label class="switch full mt"><input type="checkbox" data-k="yayinda"><span class="sw"></span><span>Yayında <small class="muted">(kapalıysa taslak olarak saklanır, sitede görünmez)</small></span></label>';
      const f = k => $('[data-k="' + k + '"]', body);
      ['baslik', 'kategori', 'tarih', 'slug', 'ozet', 'gorsel_alt', 'icerik', 'seo_title', 'seo_desc', 'guncelleme'].forEach(k => { f(k).value = p[k] || ''; });
      f('yayinda').checked = p.yayinda !== false;
      const ta = f('icerik'), prev = $('.md-prev', body);

      function counts() {
        const lim = { baslik: [20, 70], seo_title: [30, 60], seo_desc: [120, 160] };
        Object.keys(lim).forEach(k => {
          const el = $('[data-c="' + k + '"]', body), n = f(k).value.length, l = lim[k];
          if (k !== 'baslik' && !n) { el.textContent = 'Boş: ' + (k === 'seo_title' ? 'başlık + “| Yakında Kurye”' : 'özet') + ' kullanılır'; el.className = 'cnt'; return; }
          el.textContent = n + ' karakter' + (n < l[0] ? ' · kısa' : n > l[1] ? ' · uzun' : ' · ideal'); el.className = 'cnt ' + (n >= l[0] && n <= l[1] ? 'good' : 'warn');
        });
        const base = (draft.settings.site_url || 'https://alanadiniz.com').replace(/\/+$/, '').replace(/^https?:\/\//, '');
        const t = f('seo_title').value || (f('baslik').value + ' | Yakında Kurye'), d = f('seo_desc').value || f('ozet').value;
        $('.serp-url', body).textContent = base + ' › blog › ' + (f('slug').value || 'adres');
        $('.serp-title', body).textContent = t.length > 62 ? t.slice(0, 60) + '…' : t;
        $('.serp-desc', body).textContent = d.length > 162 ? d.slice(0, 158) + '…' : d;
      }
      function drawImg() {
        $('.pe-img-prev', body).innerHTML = p.gorsel ? '<img data-src="' + esc(p.gorsel) + '" alt="">' : '<span>' + I('gorsel') + 'Kapak yok</span>';
        $('[data-clear]', body).hidden = !p.gorsel; hydrate(body);
      }
      function drawSss() {
        const list = $('.pe-sss-list', body);
        list.innerHTML = p.sss.map((x, k) => '<div class="pe-q" data-q="' + k + '"><div class="f-grid one"><label class="fld"><span>Soru</span><input value="' + esc(x.q || '') + '"></label><label class="fld"><span>Cevap</span><textarea rows="2">' + esc(x.a || '') + '</textarea></label></div><button type="button" class="icon-btn sm danger" title="Sil" aria-label="Soruyu sil">' + I('cop') + '</button></div>').join('');
        $$('.pe-q', list).forEach(r => {
          const k = +r.dataset.q;
          $('input', r).oninput = e => { p.sss[k].q = e.target.value; edited = true; };
          $('textarea', r).oninput = e => { p.sss[k].a = e.target.value; edited = true; };
          $('.icon-btn', r).onclick = () => { p.sss.splice(k, 1); edited = true; drawSss(); };
        });
      }
      const showPrev = () => { prev.innerHTML = YK.md(ta.value, '') || '<p class="muted">Önizlenecek içerik yok.</p>'; $$('a', prev).forEach(a => { a.target = '_blank'; a.rel = 'noopener'; }); };
      $$('[data-tab] button', body).forEach(b => b.onclick = () => {
        const on = b.dataset.v === 'on';
        $$('[data-tab] button', body).forEach(x => x.classList.toggle('on', x === b));
        prev.hidden = !on; ta.hidden = on; $$('[data-md]', body).forEach(x => { x.disabled = on; });
        if (on) showPrev(); else ta.focus();
      });

      // Biçim butonları: seçili metni sarar ya da satır başlarına işaret ekler
      const after = () => { edited = true; ta.focus(); ta.dispatchEvent(new Event('input')); };
      function wrapSel(pre, post, ph) {
        const s0 = ta.selectionStart, e0 = ta.selectionEnd, sel = ta.value.slice(s0, e0) || ph;
        ta.setRangeText(pre + sel + post, s0, e0, 'end');
        if (s0 === e0) ta.setSelectionRange(s0 + pre.length, s0 + pre.length + ph.length);
        after();
      }
      function lines(mark, ph) {
        const v = ta.value, s0 = ta.selectionStart, e0 = ta.selectionEnd;
        const a = v.lastIndexOf('\n', s0 - 1) + 1; let b = v.indexOf('\n', e0); if (b < 0) b = v.length;
        const cur = v.slice(a, b);
        const out = (cur.trim() ? cur : ph).split('\n').map((l, n) => (l.trim() ? mark(n) + l.replace(/^(#{2,3}\s+|[-*•]\s+|\d+[.)]\s+|>\s?)/, '') : l)).join('\n');
        ta.setRangeText(out, a, b, 'select'); after();
      }
      function block(txt) {
        const v = ta.value, s0 = ta.selectionEnd, pre = s0 && v[s0 - 1] !== '\n' ? '\n\n' : (s0 > 1 && v[s0 - 2] !== '\n' ? '\n' : '');
        ta.setRangeText(pre + txt + '\n', s0, s0, 'end'); after();
      }
      const MD = {
        h2: () => lines(() => '## ', 'Ara başlık'), h3: () => lines(() => '### ', 'Alt başlık'),
        b: () => wrapSel('**', '**', 'kalın metin'), ul: () => lines(() => '- ', 'Madde'), ol: () => lines(n => (n + 1) + '. ', 'Madde'),
        not: () => lines(() => '> ', 'Not metni'),
        tablo: () => block('| Başlık 1 | Başlık 2 |\n|---|---|\n| Hücre | Hücre |\n| Hücre | Hücre |'),
        a: () => {
          const u = prompt('Bağlantı adresi\nSite içi: kuryeler.html, basvuru.html#kurye-basvuru\nDış site: https://…', '');
          if (u && u.trim()) wrapSel('[', '](' + u.trim().replace(/\s/g, '%20') + ')', 'bağlantı metni');
        }
      };
      $$('[data-md]', body).forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => MD[b.dataset.md](); });

      $$('[data-k]', body).forEach(el => el.addEventListener('input', () => { edited = true; counts(); }));
      f('baslik').addEventListener('input', () => { if (!slugTouched) f('slug').value = YK.slugify(f('baslik').value); counts(); });
      f('slug').addEventListener('input', () => { slugTouched = true; });
      f('slug').addEventListener('blur', () => { f('slug').value = YK.slugify(f('slug').value); counts(); });
      f('yayinda').addEventListener('change', () => { edited = true; });
      $('[data-pick]', body).onclick = () => pickImage(src => { p.gorsel = src; edited = true; drawImg(); });
      $('[data-clear]', body).onclick = () => { p.gorsel = ''; edited = true; drawImg(); };
      $('[data-sss]', body).onclick = () => { p.sss.push({ q: '', a: '' }); edited = true; drawSss(); const q = $$('.pe-q input', body).pop(); if (q) q.focus(); };

      const m = modal({
        title: isNew ? 'Yeni blog yazısı' : 'Yazıyı düzenle', body: body, wide: true, sticky: true,
        actions: [{ label: 'Vazgeç', onClick: mm => { if (!edited || confirm('Kaydedilmemiş değişiklikler silinsin mi?')) mm.close(); } }, { label: I('check') + 'Kaydet', cls: 'btn-yellow', onClick: done }]
      });
      $('.m-x', m.el).onclick = () => { if (!edited || confirm('Kaydedilmemiş değişiklikler silinsin mi?')) m.close(); };
      drawImg(); drawSss(); counts();

      function done(mm) {
        ['baslik', 'kategori', 'tarih', 'ozet', 'gorsel_alt', 'icerik', 'seo_title', 'seo_desc', 'guncelleme'].forEach(k => { p[k] = f(k).value.trim(); });
        p.slug = YK.slugify(f('slug').value || p.baslik); f('slug').value = p.slug;
        p.yayinda = f('yayinda').checked;
        p.sss = p.sss.map(x => ({ q: String(x.q || '').trim(), a: String(x.a || '').trim() })).filter(x => x.q && x.a);
        if (!p.guncelleme) delete p.guncelleme;
        const bad = (k, msg) => { const el = f(k); el.classList.add('bad'); el.focus(); toast(msg, 'err'); setTimeout(() => el.classList.remove('bad'), 2500); };
        if (!p.baslik) return bad('baslik', 'Başlık girin');
        if (!p.slug || p.slug === 'yazi') return bad('slug', 'Geçerli bir sayfa adresi girin');
        if (arr.some((x, k) => k !== i && x.slug === p.slug)) return bad('slug', 'Bu adres başka bir yazıda kullanılıyor');
        if (!p.icerik) { if (ta.hidden) $('[data-tab] [data-v="yaz"]', body).click(); return bad('icerik', 'İçerik yazın'); }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(p.tarih)) p.tarih = today();
        if (isNew) arr.unshift(p); else arr[i] = p;
        changed(); persist(); mm.close(); redraw();
        if (!isNew && oldSlug && oldSlug !== p.slug) toast('Adres değişti: eski bağlantılar artık açılmaz', 'info');
      }
    }
    return wrap;
  }

  /* Tema: ana renk, koyu renk ve yazı tipi */
  const THEME_PRESETS = [['Yakında (varsayılan)', '#FFD500', '#0E0E0E'], ['Turuncu', '#FF8A00', '#121212'], ['Kırmızı', '#E63946', '#15110F'], ['Yeşil', '#22C55E', '#0B1A12'], ['Mavi', '#2F80ED', '#0B1220'], ['Mor', '#8B5CF6', '#120E1C']];
  function loadFont(f) {
    if (!f || f === 'Poppins' || document.getElementById('ykf-' + f)) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'ykf-' + f;
    l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f) + ':wght@400;600;800&display=swap'; document.head.appendChild(l);
  }
  function themeEditor(draft, changed) {
    const D = YK.DEFAULT_CONTENT.theme, th = draft.theme = Object.assign({}, D, draft.theme);
    const box = document.createElement('div'); box.className = 'theme-ed';
    const hex = v => /^#[0-9a-f]{6}$/i.test(v || '');
    function draw() {
      loadFont(th.font);
      box.innerHTML = '<div class="th-presets">' + THEME_PRESETS.map((p, i) => '<button type="button" class="th-pre' + (th.y.toUpperCase() === p[1] && th.k.toUpperCase() === p[2].toUpperCase() ? ' on' : '') + '" data-p="' + i + '"><i style="background:' + p[1] + '"></i><i style="background:' + p[2] + '"></i><span>' + esc(p[0]) + '</span></button>').join('') + '</div>' +
        '<div class="th-grid"><div class="f-grid one">' +
        '<label class="fld"><span>Ana renk (butonlar, vurgular)</span><span class="th-col"><input type="color" data-k="y" value="' + esc(th.y) + '"><input data-h="y" value="' + esc(th.y) + '" maxlength="7"></span></label>' +
        '<label class="fld"><span>Koyu renk (üst bilgi, koyu bölümler, yazılar)</span><span class="th-col"><input type="color" data-k="k" value="' + esc(th.k) + '"><input data-h="k" value="' + esc(th.k) + '" maxlength="7"></span></label>' +
        '<label class="fld"><span>Yazı tipi</span><select data-f>' + YK.FONTS.map(f => '<option' + (f === th.font ? ' selected' : '') + '>' + f + '</option>').join('') + '</select></label>' +
        '<button type="button" class="link-btn" data-reset>Varsayılan renklere dön</button></div>' +
        '<div class="th-prev" style="--ty:' + th.y + ';--tk:' + th.k + ';font-family:\'' + esc(th.font) + '\',system-ui,sans-serif"><div class="th-bar"><b>YAKINDA</b><span>Ana Sayfa · İşletmeler · Kuryeler</span><em>Kurye Ol</em></div><div class="th-hero"><small>● Kurye hizmeti</small><h3>Zamanında <i>Yanınızda</i></h3><p>Önizleme: sitedeki başlık, buton ve vurguların yeni görünümü.</p><div><em>Kurye Talep Et</em><u>Kurye Ol</u></div></div></div></div>' +
        '<p class="muted small mt">Renkler sitenin tüm sayfalarına uygulanır. Logo ve fotoğraflar değişmez. Okunabilirlik için ana rengin açık, koyu rengin koyu tonda olmasına dikkat edin.</p>';
      $$('[data-p]', box).forEach(b => b.onclick = () => { const p = THEME_PRESETS[b.dataset.p]; th.y = p[1]; th.k = p[2]; changed(); draw(); });
      $$('input[type=color]', box).forEach(inp => inp.oninput = () => { th[inp.dataset.k] = inp.value.toUpperCase(); changed(); draw(); });
      $$('[data-h]', box).forEach(inp => inp.onchange = () => { const v = inp.value.trim(); if (hex(v)) { th[inp.dataset.h] = v.toUpperCase(); changed(); draw(); } else { toast('Renk #RRGGBB biçiminde olmalı', 'err'); inp.value = th[inp.dataset.h]; } });
      $('[data-f]', box).onchange = e => { th.font = e.target.value; changed(); draw(); };
      $('[data-reset]', box).onclick = () => { Object.assign(th, D); changed(); draw(); };
    }
    draw();
    return box;
  }

  /* Duyuru / kampanya penceresi */
  function popupEditor(draft, changed, redraw) {
    const pp = draft.popup = Object.assign({}, YK.DEFAULT_CONTENT.popup, draft.popup);
    const box = document.createElement('div');
    const LINKS = [['basvuru.html#isletme-basvuru', 'İşletme talep formu'], ['basvuru.html#kurye-basvuru', 'Kurye başvuru formu'], ['kuryeler.html#kazanc', 'Kazanç hesaplayıcı'], ['isletmeler.html', 'İşletmeler sayfası'], ['blog.html', 'Blog']];
    box.innerHTML = '<label class="switch full"><input type="checkbox" data-on' + (pp.on ? ' checked' : '') + '><span class="sw"></span><span><b>Pencereyi sitede göster</b> — ziyaretçiye bir kez gösterilir, kapatınca tekrar çıkmaz</span></label>' +
      '<div class="f-grid mt"><label class="fld full"><span>Başlık</span><input data-k="title" maxlength="90" placeholder="Örn. Yeni şubemiz açıldı!"></label>' +
      '<label class="fld full"><span>Metin</span><textarea data-k="text" rows="3" maxlength="400" placeholder="Örn. Bu ay kurye hizmetine başlayan işletmelere ilk hafta %20 indirim."></textarea></label>' +
      '<label class="fld"><span>Buton yazısı (boşsa buton gösterilmez)</span><input data-k="btn" maxlength="40" placeholder="Hemen teklif al"></label>' +
      '<label class="fld"><span>Buton bağlantısı</span><input data-k="link" list="ppLinks" placeholder="basvuru.html#isletme-basvuru veya https://…"><datalist id="ppLinks">' + LINKS.map(l => '<option value="' + l[0] + '">' + l[1] + '</option>').join('') + '</datalist></label>' +
      '<label class="fld"><span>Gösterilecek sayfa</span><select data-k="pages">' + [['all', 'Tüm sayfalar'], ['home', 'Yalnızca ana sayfa'], ['isletme', 'İşletmeler sayfası'], ['kurye', 'Kuryeler sayfası'], ['basvuru', 'Başvuru sayfası'], ['blog', 'Blog sayfası']].map(o => '<option value="' + o[0] + '"' + ((pp.pages || 'all') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
      '<label class="fld"><span>Kaç saniye sonra açılsın</span><input data-k="delay" type="number" min="0" max="60"></label></div>' +
      '<div class="pe-img mt"><span class="muted small">Görsel (isteğe bağlı, yatay önerilir)</span><div class="img-card pp-img"><div class="img-prev">' + (pp.img ? '<img data-src="' + esc(pp.img) + '" alt="">' : '<span class="muted small">Görsel yok</span>') + '</div><div class="img-btns"><button type="button" class="btn btn-light sm" data-pick>' + I('gorsel') + (pp.img ? 'Değiştir' : 'Seç') + '</button>' + (pp.img ? '<button type="button" class="link-btn" data-clear>Kaldır</button>' : '') + '</div></div></div>' +
      '<div class="btn-row mt"><a class="btn btn-light sm" href="' + (R.on ? 'index.html?onizleme=1' : 'index.html') + '" target="_blank" rel="noopener">' + I('goz') + 'Önizle (kaydettikten sonra)</a><button type="button" class="btn btn-light sm" data-again>' + I('gecmis') + 'Daha önce kapatanlara tekrar göster</button></div>';
    $$('[data-k]', box).forEach(inp => { inp.value = pp[inp.dataset.k] == null ? '' : pp[inp.dataset.k]; inp.oninput = inp.onchange = () => { pp[inp.dataset.k] = inp.dataset.k === 'delay' ? Math.max(0, Math.min(60, Number(inp.value) || 0)) : inp.value; changed(); }; });
    $('[data-on]', box).onchange = e => { pp.on = e.target.checked; changed(); };
    $('[data-pick]', box).onclick = () => pickImage(src => { pp.img = src; changed(); redraw(); });
    const cl = $('[data-clear]', box); if (cl) cl.onclick = () => { pp.img = ''; changed(); redraw(); };
    $('[data-again]', box).onclick = () => { pp.ver = (Number(pp.ver) || 1) + 1; changed(); toast('Kaydedip yayınladığınızda pencere herkese yeniden gösterilir'); };
    return box;
  }

  /* =================== Görsel kütüphanesi =================== */
  const IMAGE_SLOTS = [['hero', 'Ana sayfa – ana görsel'], ['about', 'Hakkımızda'], ['business', 'İşletmeler – avantajlar'], ['business_sticker', 'İşletmeler – yuvarlak sticker'], ['courier', 'Kuryeler – Kurye Ol'], ['calc', 'Kuryeler – hesaplayıcı'], ['bizform', 'Başvuru – işletme formu'], ['courform', 'Başvuru – kurye formu'], ['contact', 'İletişim (harita yoksa)'], ['og', 'Sosyal medya paylaşım görseli'], ['logo', 'Logo (açık zemin)'], ['logo_dark', 'Logo (koyu zemin)']];
  function imageUsage(c) {
    const u = {}; const add = (src, l) => { if (src) (u[src] = u[src] || []).push(l); };
    IMAGE_SLOTS.forEach(([k, l]) => add(c.images[k], l));
    c.gallery.forEach(g => add(g && g.src, 'Galeri'));
    (c.testimonials || []).forEach(t => add(t && t.photo, 'Yorum fotoğrafı'));
    (c.blog || []).forEach(p => add(p && p.gorsel, 'Blog: ' + (p.baslik || '').slice(0, 28)));
    if (c.popup && c.popup.img) add(c.popup.img, 'Duyuru penceresi');
    return u;
  }
  function viewMedia() {
    setTop('Görseller', '<label class="btn btn-yellow">' + I('yukle') + '<span class="hide-sm">Görsel yükle</span><input type="file" accept="image/*" multiple hidden id="mdFile"></label>' + editBtn(), 'Yüklenen ve hazır görseller · bir görseli sitedeki bir alana tek tıkla atayın');
    view.innerHTML = '<div id="mdWrap"><div class="drop" id="mdDrop">' + I('yukle') + ' Görselleri buraya sürükleyip bırakın (JPG, PNG, WEBP · büyükler otomatik küçültülür)</div>' +
      '<section class="card"><div class="card-head"><h2>' + I('gorsel') + ' Yüklenen görseller</h2><span class="pill" id="mdCnt">…</span></div><div class="media-grid" id="mdUp"></div></section>' +
      '<section class="card"><div class="card-head"><h2>' + I('yildiz') + ' Hazır görseller</h2><span class="pill">' + YK.BUNDLED_IMAGES.length + '</span></div><p class="muted small">Siteyle birlikte gelen fotoğraflar, sticker’lar ve logolar. Kendi fotoğraflarınızı yükledikçe bunların yerine kullanabilirsiniz.</p><div class="media-grid" id="mdLib"></div></section></div>';
    const slotSel = '<select class="md-use"><option value="">Bir alana ata…</option>' + IMAGE_SLOTS.map(([k, l]) => '<option value="' + k + '">' + esc(l) + '</option>').join('') + '<option value="gallery">Galeriye ekle</option></select>';
    const cardHTML = (x, used, del) => '<div class="md-item"><a class="md-img" href="' + esc(x.url) + '" target="_blank" rel="noopener"><img src="' + esc(x.url) + '" alt="" loading="lazy"></a><div class="md-body"><b title="' + esc(x.name) + '">' + esc(x.name || 'Görsel') + '</b>' +
      (used && used.length ? '<small class="md-used">' + I('check') + esc(used.slice(0, 3).join(', ') + (used.length > 3 ? ' +' + (used.length - 3) : '')) + '</small>' : '<small class="muted">Kullanılmıyor</small>') +
      '<div class="md-act" data-src="' + esc(x.src) + '">' + slotSel + (del ? '<button class="icon-btn sm danger" data-del title="Kalıcı sil" aria-label="Kalıcı sil">' + I('cop') + '</button>' : '') + '</div></div></div>';
    function bind(root) {
      $$('.md-use', root).forEach(sel => sel.onchange = () => {
        const k = sel.value, src = sel.closest('.md-act').dataset.src; if (!k) return;
        const c = YK.getContent();
        if (k === 'gallery') c.gallery.push({ src: src, title: '' }); else c.images[k] = src;
        if (YK.saveContent(c)) { YK.log('Görsel atandı: ' + (k === 'gallery' ? 'galeri' : (IMAGE_SLOTS.find(s => s[0] === k) || [k, k])[1])); toast('Atandı — yayına almak için “Yayınla”'); updateBadges(); draw(); }
      });
      $$('[data-del]', root).forEach(b => b.onclick = async () => {
        const src = b.closest('.md-act').dataset.src, used = imageUsage(YK.getContent())[src];
        if (!(await confirmBox((used ? 'Bu görsel sitede kullanılıyor (' + used.join(', ') + '). Silerseniz o alanlarda görünmez. ' : '') + 'Görsel kalıcı olarak silinsin mi?'))) return;
        await YK.media.del(src); YK.log('Görsel silindi'); toast('Görsel silindi'); draw();
      });
    }
    async function draw() {
      const usage = imageUsage(YK.getContent());
      const lib = $('#mdLib'); if (!lib) return;
      lib.innerHTML = YK.BUNDLED_IMAGES.map(x => cardHTML({ src: x.src, url: x.src, name: x.title }, usage[x.src], false)).join(''); bind(lib);
      const up = $('#mdUp');
      let items = [];
      try { items = (await YK.media.all()).filter(Boolean).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); }
      catch (e) { up.innerHTML = '<div class="empty small">' + I('uyari') + '<p>' + esc(e.message) + '</p></div>'; return; }
      $('#mdCnt').textContent = items.length;
      up.innerHTML = items.length ? items.map(x => cardHTML(x, usage[x.src], true)).join('') : empty('gorsel', 'Henüz görsel yüklenmedi', 'Kendi fotoğraflarınızı (şube, kurye ekibi, çanta, motor) yükleyip sitedeki alanlara atayabilirsiniz.');
      bind(up);
    }
    async function upload(files) {
      files = files.filter(f => /^image\//.test(f.type)); if (!files.length) return;
      const d = $('#mdDrop'); d.classList.add('on'); d.textContent = 'Yükleniyor…'; let ok = 0;
      for (const f of files) { if (f.size > 15e6) { toast(f.name + ' çok büyük (15 MB üstü)', 'err'); continue; } try { await YK.media.put(await YK.fileToDataUrl(f, 1600), f.name); ok++; } catch (er) { toast(f.name + ': ' + (er && er.message ? er.message : 'yüklenemedi'), 'err'); } }
      d.classList.remove('on'); d.innerHTML = I('yukle') + ' Görselleri buraya sürükleyip bırakın (JPG, PNG, WEBP · büyükler otomatik küçültülür)';
      if (ok) { toast(ok + ' görsel yüklendi'); YK.log(ok + ' görsel yüklendi'); } draw();
    }
    $('#mdFile').onchange = e => { upload(Array.from(e.target.files || [])); e.target.value = ''; };
    const wrap = $('#mdWrap'), drop = $('#mdDrop');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('on'); }));
    wrap.addEventListener('dragleave', e => { if (e.target === wrap) drop.classList.remove('on'); });
    wrap.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('on'); upload(Array.from(e.dataTransfer.files || [])); });
    draw();
  }

  /* Görsel seçici */
  function pickImage(cb) {
    const body = document.createElement('div');
    body.innerHTML = '<div class="pick-top"><div class="seg" id="pkSeg"><button class="on" data-t="up">Yüklenenler</button><button data-t="lib">Hazır görseller</button></div><label class="btn btn-yellow">' + I('yukle') + 'Bilgisayardan yükle<input type="file" accept="image/*" multiple hidden id="pkFile"></label></div><div class="drop" id="pkDrop">' + I('yukle') + ' Görselleri buraya sürükleyip bırakabilirsiniz</div><div class="pick-grid" id="pkGrid"></div>';
    const m = modal({ title: 'Görsel seç', body: body, wide: true, noFocus: true });
    let tab = 'up';
    async function draw() {
      const g = $('#pkGrid', body);
      if (tab === 'lib') {
        g.innerHTML = YK.BUNDLED_IMAGES.map(x => '<button class="pk" data-src="' + esc(x.src) + '"><img src="' + esc(x.src) + '" alt="" loading="lazy"><span>' + esc(x.title) + '</span></button>').join('');
      } else {
        g.innerHTML = '<div class="empty small"><p>Yükleniyor…</p></div>';
        let items = [];
        try { items = (await YK.media.all()).filter(Boolean).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); }
        catch (e) { g.innerHTML = '<div class="empty small">' + I('uyari') + '<p>' + esc(e.message) + '</p></div>'; return; }
        g.innerHTML = items.length ? items.map(x => '<div class="pk-wrap"><button class="pk" data-src="' + esc(x.src) + '"><img src="' + esc(x.url) + '" alt="" loading="lazy"><span>' + esc(x.name || '') + '</span></button><button class="icon-btn sm danger pk-del" data-del="' + esc(x.src) + '" title="Kalıcı sil" aria-label="Kalıcı sil">' + I('cop') + '</button></div>').join('')
          : '<div class="empty small">' + I('gorsel') + '<p>Henüz yüklenmiş görsel yok. “Bilgisayardan yükle” ile görsel ekleyin ya da “Hazır görseller” sekmesinden seçin.</p></div>';
      }
      $$('.pk', g).forEach(b => b.onclick = () => { cb(b.dataset.src); m.close(); });
      $$('[data-del]', g).forEach(b => b.onclick = async () => { if (await confirmBox('Görsel kalıcı olarak silinsin mi? Sitede kullanılıyorsa görünmez hale gelir.')) { await YK.media.del(b.dataset.del); draw(); } });
    }
    async function upload(files) {
      files = files.filter(f => /^image\//.test(f.type)); if (!files.length) return;
      const drop2 = $('#pkDrop', body); drop2.classList.add('on'); drop2.textContent = 'Yükleniyor…';
      let ok = 0;
      for (const f of files) { if (f.size > 15e6) { toast(f.name + ' çok büyük (15 MB üstü)', 'err'); continue; } try { await YK.media.put(await YK.fileToDataUrl(f, 1600), f.name); ok++; } catch (er) { toast(f.name + ': ' + (er && er.message ? er.message : 'yüklenemedi'), 'err'); } }
      drop2.classList.remove('on'); drop2.innerHTML = I('yukle') + ' Görselleri buraya sürükleyip bırakabilirsiniz';
      if (ok) { toast(ok + ' görsel yüklendi'); YK.log(ok + ' görsel yüklendi'); } tab = 'up'; $$('#pkSeg button', body).forEach(x => x.classList.toggle('on', x.dataset.t === 'up')); draw();
    }
    $$('#pkSeg button', body).forEach(b => b.onclick = () => { tab = b.dataset.t; $$('#pkSeg button', body).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $('#pkFile', body).onchange = e => { upload(Array.from(e.target.files || [])); e.target.value = ''; };
    const drop = $('#pkDrop', body);
    ['dragenter', 'dragover'].forEach(ev => body.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('on'); }));
    ['dragleave', 'drop'].forEach(ev => body.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || e.target === body) drop.classList.remove('on'); }));
    body.addEventListener('drop', e => upload(Array.from(e.dataTransfer.files || [])));
    draw();
  }

  /* =================== Ayarlar =================== */
  function viewSettings() {
    setTop('Ayarlar', '', R.on ? 'Sunucu modu · veriler sunucuda saklanıyor' : 'Yerel mod · veriler bu tarayıcıda saklanıyor');
    const c = YK.auth.creds();
    let lastBackup = null; try { lastBackup = localStorage.getItem('yk_last_backup'); } catch (e) {}
    let usage = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); usage += (localStorage.getItem(k) || '').length; } } catch (e) {}
    const logs = YK.getLog(), ss = YK.serverSettings();
    const serverCard = R.on
      ? '<section class="card"><div class="card-head"><h2>' + I('kalkan') + ' Sunucu ve bildirimler</h2><span class="pill green">Bağlı</span></div>' +
        '<p class="muted">Site formlarından gelen tüm talep ve başvurular doğrudan sunucuya kaydedilir ve bu panelde görünür. Panel her cihazdan aynı veriyi gösterir.</p>' +
        '<form id="srvForm" class="f-grid one"><label class="fld"><span>Yeni başvuru bildirim e-postası</span><input name="notify_email" type="email" placeholder="ornek@alanadiniz.com" value="' + esc(ss.notify_email || '') + '"><small>Her yeni talep/başvuruda bu adrese e-posta gönderilir' + (R.mail ? '' : ' (bu sunucuda PHP mail() kapalı görünüyor; Web3Forms anahtarını kullanabilirsiniz)') + '. Spam klasörünü de kontrol edin.</small></label><button class="btn btn-dark">' + I('check') + 'Kaydet</button></form></section>'
      : '<section class="card"><div class="card-head"><h2>' + I('uyari') + ' Yerel mod</h2><span class="pill red">Sunucu yok</span></div>' +
        '<p class="muted">Panel şu an sunucuya bağlı değil; veriler yalnızca bu tarayıcıda saklanıyor. Site internette yayınlandığında ziyaretçilerin başvuruları bu panele <b>düşmez</b> (e-posta bildirimi ve WhatsApp ile iletilir).</p>' +
        '<p class="muted"><b>Sunucu modunu açmak için:</b> sitenin tüm dosyalarını (api klasörü dahil) PHP 7.4+ destekleyen bir hostinge yükleyin ve <code>admin.html</code> adresini açın. Panel sunucuyu otomatik algılar ve ilk girişte yönetici hesabı oluşturmanızı ister. Bu tarayıcıdaki verileri sonra tek tıkla sunucuya aktarabilirsiniz.</p></section>';
    view.innerHTML =
      migrateCard() +
      '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><h2>Giriş bilgileri</h2></div><form id="pwForm" class="f-grid one">' +
      '<label class="fld"><span>Kullanıcı adı</span><input name="user" value="' + esc(c.user) + '" required autocomplete="username" autocapitalize="off"></label>' +
      '<label class="fld"><span>Mevcut şifre</span><input name="old" type="password" required autocomplete="current-password"></label>' +
      '<label class="fld"><span>Yeni şifre (en az 8 karakter, harf ve rakam)</span><input name="pw" type="password" required minlength="8" autocomplete="new-password"><span class="pw-meter"><i id="pwBar"></i></span></label>' +
      '<label class="fld"><span>Yeni şifre (tekrar)</span><input name="pw2" type="password" required autocomplete="new-password"></label>' +
      '<button class="btn btn-dark">Şifreyi güncelle</button></form><p class="muted small mt">' + (R.on ? 'Şifreniz sunucuda şifrelenmiş (hash) olarak saklanır. 60 dakika işlem yapılmazsa oturum kapanır; 5 hatalı denemede giriş 5 dakika kilitlenir.' : 'Güvenlik: 60 dakika işlem yapılmazsa oturum kapanır; 5 hatalı denemede giriş 1 dakika kilitlenir.') + '</p></section>' +
      serverCard + '</div>' +
      '<div class="grid-2"><section class="card"><div class="card-head"><h2>Yedekleme</h2>' + (lastBackup ? '<span class="pill">Son yedek: ' + YK.fmtDate(lastBackup, true) + '</span>' : '<span class="pill red">Hiç yedek alınmadı</span>') + '</div><p class="muted">Tüm başvuruları, müşterileri, çalışanları, kayıtları ve site içeriğini tek bir dosyaya yedekleyin. ' + (R.on ? 'Yüklenen görseller sunucudaki <code>uploads</code> klasöründe kalır.' : 'Yüklenen görseller de yedeğe eklenir; başka bir bilgisayara/tarayıcıya taşımak için de kullanabilirsiniz.') + '</p>' +
      '<div class="btn-row"><button class="btn btn-dark" id="bExport">' + I('indir') + 'Yedek indir</button><label class="btn btn-light">' + I('yukle') + 'Yedekten geri yükle<input type="file" accept=".json,application/json" id="bImport" hidden></label></div>' +
      (R.on ? '' : '<p class="muted small mt">Kullanılan yerel depolama: ~' + (usage * 2 / 1048576).toFixed(2) + ' MB (tarayıcı sınırı genellikle 5–10 MB; görseller ayrı depolanır).</p>') + '</section>' +
      '<section class="card"><div class="card-head"><h2>Deneme verisi</h2></div><p class="muted">Paneli denemek için örnek başvuru, müşteri, çalışan ve kayıtlar ekler.' + (R.on ? ' <b>Sunucu modunda bu veriler gerçek verilerinizin yanına eklenir</b>; deneme sonrası silmeyi unutmayın.' : '') + '</p><button class="btn btn-light" id="bDemo">' + I('arti') + 'Örnek veri yükle</button></section></div>' +
      '<section class="card"><div class="card-head"><h2>' + I('gecmis') + ' İşlem geçmişi</h2><span class="pill">' + logs.length + ' kayıt</span></div>' +
      (logs.length ? '<ul class="log tall">' + logs.slice(0, 100).map(l => '<li><span>' + esc(l.text) + '</span><small>' + YK.fmtDate(l.t, true) + '</small></li>').join('') + '</ul>' : '<p class="muted small">Henüz işlem yok.</p>') + '</section>' +
      '<section class="card danger-zone"><div class="card-head"><h2>Tehlikeli işlemler</h2></div><p class="muted small">Bu işlemler geri alınamaz. Önce yedek almanız önerilir.</p><div class="btn-row">' +
      '<button class="btn btn-danger-ghost" id="rContent">Site içeriği taslağını sıfırla</button>' +
      '<button class="btn btn-danger-ghost" id="rApps">Tüm başvuruları sil</button>' +
      '<button class="btn btn-danger-ghost" id="rRecs">Tüm kayıtları sil</button>' +
      '<button class="btn btn-danger" id="rAll">Tüm verileri sil</button></div></section>';

    const f = $('#pwForm');
    f.pw.oninput = () => { const v = f.pw.value; let sc = 0; if (v.length >= 8) sc++; if (/[A-ZÇĞİÖŞÜ]/.test(v) && /[a-zçğıöşü]/.test(v)) sc++; if (/\d/.test(v)) sc++; if (/[^\wçğıöşüÇĞİÖŞÜ]/.test(v) || v.length >= 12) sc++; const bar = $('#pwBar'); bar.style.width = sc * 25 + '%'; bar.style.background = ['#dc2626', '#dc2626', '#d97706', '#65a30d', '#16a34a'][sc]; };
    f.onsubmit = async e => {
      e.preventDefault();
      if (f.pw.value.length < 8 || !/\d/.test(f.pw.value) || !/\D/.test(f.pw.value)) return toast('Yeni şifre en az 8 karakter olmalı ve harf + rakam içermeli', 'err');
      if (f.pw.value !== f.pw2.value) return toast('Yeni şifreler eşleşmiyor', 'err');
      if (R.on) {
        try { await YK.server.password(f.user.value.trim(), f.old.value, f.pw.value); } catch (er) { return toast(er.message, 'err'); }
        $('#suName').textContent = R.user;
      } else {
        if (!YK.auth.check(c.user, f.old.value)) return toast('Mevcut şifre hatalı', 'err');
        YK.auth.set(f.user.value, f.pw.value); YK.log('Panel giriş bilgileri değiştirildi');
      }
      toast('Giriş bilgileri güncellendi'); rerender();
    };
    const sf = $('#srvForm');
    if (sf) sf.onsubmit = e => {
      e.preventDefault();
      const em = sf.notify_email.value.trim();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return toast('Geçerli bir e-posta girin', 'err');
      YK.saveServerSettings(Object.assign({}, YK.serverSettings(), { notify_email: em })); YK.log('Bildirim e-postası ' + (em ? 'ayarlandı' : 'kaldırıldı')); toast('Kaydedildi');
    };
    bindMigrate(view);
    $('#bExport').onclick = async () => { const d = await YK.exportAll(); YK.download('yakinda-kurye-yedek-' + today() + '.json', JSON.stringify(d), 'application/json'); try { localStorage.setItem('yk_last_backup', new Date().toISOString()); } catch (er) {} YK.log('Yedek indirildi'); toast('Yedek indirildi'); rerender(); };
    $('#bImport').onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = async () => {
        let d; try { d = JSON.parse(fr.result); } catch (er) { return toast('Yedek dosyası okunamadı', 'err'); }
        if (!(await confirmBox('Mevcut veriler yedekteki verilerle değiştirilecek. Devam edilsin mi?', 'Geri yükle'))) return;
        try { await YK.importAll(d); YK.log('Yedekten geri yükleme yapıldı'); toast('Yedek geri yüklendi'); updateBadges(); rerender(); }
        catch (er) { toast(er.message || 'Yedek geri yüklenemedi', 'err'); }
      };
      fr.readAsText(file); e.target.value = '';
    };
    $('#bDemo').onclick = () => { loadDemo(); YK.log('Örnek veriler yüklendi'); toast('Örnek veriler eklendi'); location.hash = '#panel'; };
    $('#rContent').onclick = async () => { if (await confirmBox('Panelde kaydedilmiş (yayınlanmamış) site içeriği taslağı silinip yayındaki/varsayılan içeriğe dönülsün mü?', 'Sıfırla')) { YK.resetContent(); YK.log('Site içeriği taslağı sıfırlandı'); updateBadges(); toast('Site içeriği taslağı sıfırlandı'); } };
    $('#rApps').onclick = async () => { if (await confirmBox('Tüm başvurular kalıcı olarak silinsin mi?')) { YK.saveList('applications', []); YK.log('Tüm başvurular silindi'); updateBadges(); toast('Başvurular silindi'); } };
    $('#rRecs').onclick = async () => { if (await confirmBox('Tüm kayıtlar (vardiya, ödeme vb.) kalıcı olarak silinsin mi?')) { YK.saveList('records', []); YK.log('Tüm kayıtlar silindi'); toast('Kayıtlar silindi'); } };
    $('#rAll').onclick = async () => {
      if (!(await confirmBox('Başvurular, müşteriler, çalışanlar, kayıtlar ve site içeriği taslağı tamamen silinecek. Önce yedek almanız önerilir. Devam edilsin mi?', 'Hepsini sil'))) return;
      ['applications', 'employees', 'records', 'customers'].forEach(k => YK.saveList(k, [])); YK.resetContent(); YK.log('Tüm veriler silindi'); updateBadges(); toast('Tüm veriler silindi'); rerender();
    };
  }

  function loadDemo() {
    const d = n => addDays(today(), -n);
    const iso = (n, h) => { const x = new Date(); x.setDate(x.getDate() - n); x.setHours(h || 10, 15); return x.toISOString(); };
    const apps = YK.list('applications');
    [
      { type: 'kurye', status: 'yeni', createdAt: iso(0, 9), data: { adSoyad: 'Emre Örnek', telefon: '0532 000 00 01', eposta: '', dogumTarihi: '1998-04-12', il: 'Ankara', ilce: 'Çankaya', ehliyet: 'A2', motor: 'Kendi motorum var', calismaModeli: 'Tam zamanlı', deneyim: '1 – 3 yıl', kaynak: 'Sosyal medya', mesaj: 'Hafta içi her gün çalışabilirim.' } },
      { type: 'kurye', status: 'inceleniyor', createdAt: iso(1, 14), data: { adSoyad: 'Burak Deneme', telefon: '0533 000 00 02', dogumTarihi: '2001-09-03', il: 'Ankara', ilce: 'Yenimahalle', ehliyet: 'A1', motor: 'Motorum yok – şirket motoru istiyorum', calismaModeli: 'Yarı zamanlı (akşam)', deneyim: 'Deneyimim yok', kaynak: 'Arkadaş tavsiyesi' } },
      { type: 'isletme', status: 'yeni', createdAt: iso(0, 11), data: { isletmeAdi: 'Örnek Burger', sektor: 'Restoran / Kafe', yetkili: 'Selin Test', telefon: '0312 000 00 03', il: 'Ankara', ilce: 'Keçiören', gunlukPaket: '50 – 100', kuryeSayisi: '3', calismaSaatleri: '11:00 – 23:00', hizmetModeli: 'Vardiyalı / saatlik', baslangic: 'Hemen', adres: 'Örnek Mah. Deneme Sok. No:5' } },
      { type: 'isletme', status: 'gorusme', createdAt: iso(3, 16), data: { isletmeAdi: 'Deneme Eczanesi', sektor: 'Eczane', yetkili: 'Kaan Örnek', telefon: '0312 000 00 04', il: 'Ankara', ilce: 'Etimesgut', gunlukPaket: '0 – 20', kuryeSayisi: '1', calismaSaatleri: '09:00 – 19:00' } }
    ].forEach(a => { a.id = YK.uid(); a.ref = YK.refNo(); a.notes = []; a.kvkk = true; apps.push(a); });
    apps.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); YK.saveList('applications', apps);

    const custs = [
      { isletmeAdi: 'Deneme Pide Salonu', sektor: 'Restoran / Kafe', yetkili: 'Murat Örnek', telefon: '0312 000 00 20', durum: 'Aktif', hizmetModeli: 'Vardiyalı / saatlik', baslangic: d(90), kuryeSayisi: '2', calismaSaatleri: '11:00 – 23:00', ucret: 'Örnek koşul', il: 'Ankara', ilce: 'Çankaya' },
      { isletmeAdi: 'Örnek Market', sektor: 'Market', yetkili: 'Zeynep Deneme', telefon: '0312 000 00 21', durum: 'Deneme', hizmetModeli: 'Paket başı', baslangic: d(5), kuryeSayisi: '1', il: 'Ankara', ilce: 'Keçiören' }
    ].map(c => YK.add('customers', c));
    const emps = [
      { adSoyad: 'Ali Örnek', telefon: '0530 000 00 10', gorev: 'Moto Kurye', calismaModeli: 'Tam zamanlı', durum: 'Aktif', baslangic: d(120), bolge: 'Çankaya', musteriId: custs[0].id, il: 'Ankara', ilce: 'Çankaya', ehliyet: 'A2', motor: 'Kendi motoru', plaka: '06 ABC 001', ekipman: 'Çanta, kask, mont', sigortaBitis: addDays(today(), 12), evrak: YK.EMP_DOCS.slice(0, 7) },
      { adSoyad: 'Veli Deneme', telefon: '0530 000 00 11', gorev: 'Moto Kurye', calismaModeli: 'Tam zamanlı', durum: 'Aktif', baslangic: d(60), bolge: 'Keçiören', musteriId: custs[1].id, il: 'Ankara', ilce: 'Keçiören', ehliyet: 'A', motor: 'Şirket motoru', plaka: '06 ABC 002', ekipman: 'Çanta, kask', evrak: YK.EMP_DOCS.slice() },
      { adSoyad: 'Can Test', telefon: '0530 000 00 12', gorev: 'Moto Kurye', calismaModeli: 'Yarı zamanlı (akşam)', durum: 'İzinli', baslangic: d(30), bolge: 'Yenimahalle', il: 'Ankara', ilce: 'Yenimahalle', ehliyet: 'A1', motor: 'Kendi motoru', plaka: '06 ABC 003', muayeneBitis: addDays(today(), -3), evrak: YK.EMP_DOCS.slice(0, 3) }
    ].map(e => YK.add('employees', e));
    const recs = YK.list('records');
    for (let i = 0; i < 12; i++) emps.slice(0, 2).forEach((e, j) => recs.push({ id: YK.uid(), createdAt: new Date().toISOString(), empId: e.id, tarih: d(i), tur: 'Vardiya', paket: String(18 + ((i * 7 + j * 5) % 14)), saat: '10', tutar: String(1100 + ((i * 3 + j) % 5) * 60), aciklama: '' }));
    recs.push({ id: YK.uid(), createdAt: new Date().toISOString(), empId: emps[0].id, tarih: d(2), tur: 'Avans', tutar: '1500', aciklama: 'Nakit avans' });
    recs.push({ id: YK.uid(), createdAt: new Date().toISOString(), empId: emps[1].id, tarih: d(7), tur: 'Ödeme', tutar: '7500', aciklama: 'Haftalık ödeme' });
    recs.push({ id: YK.uid(), createdAt: new Date().toISOString(), empId: emps[2].id, tarih: d(1), tur: 'İzin', aciklama: 'Yıllık izin – 5 gün' });
    YK.saveList('records', recs);
  }

  /* Başlat: sunucu varsa sunucu modu, yoksa yerel mod */
  (async function start() {
    const st = await YK.server.connect();
    if (st && st.logged) {
      try { await YK.server.pull(); return showApp(); } catch (e) { return showLogin(e.message); }
    }
    if (!st && sifresiz()) YK.auth.login();
    if (!st && YK.auth.isLogged()) return showApp();
    showLogin();
  })();
})();
