<?php
/* ==========================================================================
   Yakında Kurye — Sunucu API'si (PHP 7.4+)
   - Site formlarından gelen talep ve başvuruları kaydeder.
   - Yönetim panelinin verilerini (başvurular, müşteriler, çalışanlar,
     kayıtlar, site içeriği) sunucuda saklar; panel her cihazdan aynı veriyi görür.
   - "Yayınla" ile assets/js/content.js, index.html SEO etiketleri,
     blog/<adres>.html yazı sayfalarını, sitemap.xml ve robots.txt dosyalarını günceller.
   Veriler api/data klasöründe, doğrudan okunamayan .php dosyalarında tutulur.
   Hosting'de PHP yoksa site ve panel otomatik olarak "yerel mod"da çalışır.
   ========================================================================== */
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');
date_default_timezone_set('Europe/Istanbul');

const YK_VERSION = 4;
define('YK_ROOT', dirname(__DIR__));
define('YK_DATA', __DIR__ . '/data');
const YK_GUARD = "<?php http_response_code(404); exit; ?>\n";
const YK_LISTS = ['applications', 'employees', 'customers', 'records'];
const YK_VALUES = ['log', 'draft', 'settings'];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Robots-Tag: noindex, nofollow');

set_exception_handler(function ($e) {
  error_log('[yakinda-api] ' . $e->getMessage() . ' @' . $e->getFile() . ':' . $e->getLine());
  fail('Sunucuda beklenmeyen bir hata oluştu.', 500);
});

// mbstring eklentisi olmayan sunucular için basit yedekler
if (!function_exists('mb_substr')) {
  function mb_substr(string $s, int $start, ?int $len = null, ?string $enc = null): string { preg_match_all('/./us', $s, $m); return implode('', array_slice($m[0], $start, $len)); }
  function mb_strlen(string $s, ?string $enc = null): int { return (int) preg_match_all('/./us', $s); }
  function mb_strtolower(string $s, ?string $enc = null): string { return strtolower($s); }
}

/* ---------------- Yardımcılar ---------------- */
function out(array $data, int $code = 200): void {
  http_response_code($code);
  echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function fail(string $msg, int $code = 400, string $errCode = '', array $extra = []): void {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg, 'code' => $errCode] + $extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') return [];
  $j = json_decode($raw, true);
  if (!is_array($j)) fail('Geçersiz istek.', 400);
  return $j;
}
function uid(): string { return base_convert((string) (int) (microtime(true) * 1000), 10, 36) . bin2hex(random_bytes(3)); }
function now(): string { return (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'); }
function str($v, int $max): string {
  $s = is_scalar($v) ? trim((string) $v) : '';
  $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
  return mb_substr($s, 0, $max, 'UTF-8');
}
function digits($v): string { return preg_replace('/\D/', '', (string) $v) ?? ''; }
function client_ip(): string { return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'); }

/* ---------------- Veri dosyaları ---------------- */
function ensure_data(): void {
  if (!is_dir(YK_DATA) && !@mkdir(YK_DATA, 0750, true)) fail('api/data klasörü oluşturulamadı. Klasöre yazma izni verin.', 500, 'nodata');
  if (!is_writable(YK_DATA)) fail('api/data klasörüne yazılamıyor. Klasör izinlerini kontrol edin (755).', 500, 'nodata');
  $ht = YK_DATA . '/.htaccess';
  if (!is_file($ht)) @file_put_contents($ht, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
  if (!is_file(YK_DATA . '/index.html')) @file_put_contents(YK_DATA . '/index.html', '');
  if (!is_dir(YK_DATA . '/sessions')) @mkdir(YK_DATA . '/sessions', 0750);
  if (!is_file(YK_DATA . '/sessions/index.html')) @file_put_contents(YK_DATA . '/sessions/index.html', '');
}
function store_path(string $name): string { return YK_DATA . '/' . preg_replace('/[^a-z_]/', '', $name) . '.php'; }
function read_store(string $name, $def) {
  $f = store_path($name);
  if (!is_file($f)) return $def;
  $raw = (string) file_get_contents($f);
  if (strpos($raw, YK_GUARD) === 0) $raw = substr($raw, strlen(YK_GUARD));
  $v = json_decode($raw, true);
  return ($v === null && trim($raw) !== 'null') ? $def : $v;
}
function write_file_atomic(string $file, string $content): bool {
  $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
  if (@file_put_contents($tmp, $content, LOCK_EX) === false) return false;
  if (!@rename($tmp, $file)) { @unlink($tmp); return false; }
  return true;
}
function write_store(string $name, $val): void {
  $json = json_encode($val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false || !write_file_atomic(store_path($name), YK_GUARD . $json)) fail('Veri kaydedilemedi (disk / izin hatası).', 500);
}
// Okuma-değiştirme-yazma işlemlerini sıraya sokar
function locked(callable $fn) {
  $h = fopen(YK_DATA . '/.lock', 'c');
  if ($h) flock($h, LOCK_EX);
  try { return $fn(); } finally { if ($h) { flock($h, LOCK_UN); fclose($h); } }
}
function sort_apps(array &$a): void {
  usort($a, function ($x, $y) { return strcmp((string) ($y['createdAt'] ?? ''), (string) ($x['createdAt'] ?? '')); });
}

/* ---------------- Oturum ---------------- */
function start_session(): void {
  $dir = YK_DATA . '/sessions';
  if (is_dir($dir) && is_writable($dir)) session_save_path($dir);
  ini_set('session.use_strict_mode', '1');
  ini_set('session.use_only_cookies', '1');
  ini_set('session.gc_maxlifetime', '28800');
  ini_set('session.gc_probability', '1');
  ini_set('session.gc_divisor', '100');
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
  session_name('YKPANEL');
  session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
  session_start();
  // 8 saat işlem yapılmazsa oturum kapanır (panel ayrıca 60 dk boşta kalınca kapatır)
  if (!empty($_SESSION['user']) && time() - (int) ($_SESSION['seen'] ?? 0) > 28800) { $_SESSION = []; }
  if (!empty($_SESSION['user'])) $_SESSION['seen'] = time();
}
function logged(): bool { return !empty($_SESSION['user']); }
function require_auth(): void { if (!logged()) fail('Oturum süresi doldu. Lütfen yeniden giriş yapın.', 401, 'auth'); }
function auth_data(): ?array { $a = read_store('auth', null); return is_array($a) && !empty($a['hash']) ? $a : null; }
// İlk kurulum kodu: yalnızca hosting dosya yöneticisinden okunabilir (api/data/kurulum-kodu.php).
// Böylece yönetici hesabını siteyi yükleyen kişiden başkası oluşturamaz.
function setup_code_file(): string { return YK_DATA . '/kurulum-kodu.php'; }
function setup_code(): string {
  $f = setup_code_file(); $m = [];
  if (is_file($f) && preg_match('/KOD:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/', (string) file_get_contents($f), $m)) return $m[1];
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $c = '';
  for ($i = 0; $i < 8; $i++) $c .= $chars[random_int(0, strlen($chars) - 1)];
  $code = substr($c, 0, 4) . '-' . substr($c, 4);
  write_file_atomic($f, YK_GUARD . "Yakında Kurye yönetim paneli — ilk kurulum kodu\nKOD: {$code}\n\nBu kodu admin.html'deki ilk kurulum ekranına yazın.\nYönetici hesabı oluşturulunca bu dosya otomatik silinir.\n");
  return $code;
}
function norm_code(string $c): string { return preg_replace('/[^A-Z0-9]/', '', strtoupper($c)) ?? ''; }
function valid_password(string $pw): bool { return mb_strlen($pw) >= 8 && preg_match('/\d/', $pw) && preg_match('/\D/', $pw); }

// IP başına deneme sınırı (giriş ve form gönderimi)
function throttle(string $bucket, int $max, int $window, bool $count = true): bool {
  return locked(function () use ($bucket, $max, $window, $count) {
    $t = read_store('throttle', []);
    $now = time();
    foreach ($t as $k => $v) if (($v['until'] ?? 0) < $now) unset($t[$k]);
    $key = $bucket . ':' . hash('sha256', client_ip());
    $row = $t[$key] ?? ['n' => 0, 'until' => $now + $window];
    if ($row['n'] >= $max) { write_store('throttle', $t); return false; }
    if ($count) { $row['n']++; $t[$key] = $row; }
    write_store('throttle', $t);
    return true;
  });
}
function throttle_reset(string $bucket): void {
  locked(function () use ($bucket) { $t = read_store('throttle', []); unset($t[$bucket . ':' . hash('sha256', client_ip())]); write_store('throttle', $t); });
}

function add_log(string $text): void {
  locked(function () use ($text) {
    $l = read_store('log', []);
    if (!is_array($l)) $l = [];
    array_unshift($l, ['t' => now(), 'text' => $text]);
    write_store('log', array_slice($l, 0, 300));
  });
}

/* ---------------- Form tanımları (site/assets/js/store.js ile aynı alanlar) ---------------- */
const YK_FORMS = [
  'kurye' => [
    'label' => 'Kurye Başvurusu',
    'fields' => ['adSoyad' => 'Ad Soyad', 'telefon' => 'Telefon', 'eposta' => 'E-posta', 'dogumTarihi' => 'Doğum Tarihi', 'il' => 'İl', 'ilce' => 'İlçe', 'ehliyet' => 'Ehliyet Sınıfı', 'motor' => 'Motor Durumu', 'calismaModeli' => 'Çalışma Tercihi', 'deneyim' => 'Kuryelik Deneyimi', 'kaynak' => 'Bizi nereden duydunuz?', 'mesaj' => 'Eklemek istedikleriniz'],
    'required' => ['adSoyad', 'telefon', 'dogumTarihi', 'il', 'ilce', 'ehliyet', 'motor', 'calismaModeli']
  ],
  'isletme' => [
    'label' => 'İşletme Talebi',
    'fields' => ['isletmeAdi' => 'İşletme Adı', 'sektor' => 'Sektör', 'yetkili' => 'Yetkili Ad Soyad', 'telefon' => 'Telefon', 'eposta' => 'E-posta', 'il' => 'İl', 'ilce' => 'İlçe', 'gunlukPaket' => 'Günlük Tahmini Paket', 'kuryeSayisi' => 'İhtiyaç Duyulan Kurye', 'calismaSaatleri' => 'Çalışma Saatleri', 'hizmetModeli' => 'Tercih Edilen Hizmet Modeli', 'baslangic' => 'Ne Zaman Başlamak İstersiniz?', 'adres' => 'Adres', 'mesaj' => 'Notunuz'],
    'required' => ['isletmeAdi', 'sektor', 'yetkili', 'telefon', 'il', 'ilce', 'gunlukPaket']
  ]
];

function ref_no(): string {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $r = '';
  for ($i = 0; $i < 4; $i++) $r .= $chars[random_int(0, strlen($chars) - 1)];
  return 'YK' . date('ymd') . '-' . $r;
}

function notify_mail(string $type, string $ref, array $data): void {
  $s = read_store('settings', []);
  $to = trim((string) ($s['notify_email'] ?? ''));
  if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL) || !function_exists('mail')) return;
  $def = YK_FORMS[$type];
  $host = preg_replace('/[^a-z0-9.\-]/i', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost')) ?: 'localhost';
  $host = preg_replace('/^www\./', '', $host);
  $lines = ['Web sitesinden yeni ' . mb_strtolower($def['label'], 'UTF-8') . ' geldi.', '', 'No: ' . $ref, 'Tarih: ' . date('d.m.Y H:i'), ''];
  foreach ($def['fields'] as $k => $label) if (($data[$k] ?? '') !== '') $lines[] = $label . ': ' . $data[$k];
  $lines[] = ''; $lines[] = 'Yönetim panelinden görüntüleyebilirsiniz.';
  $subject = '=?UTF-8?B?' . base64_encode('Yeni ' . $def['label'] . ' – ' . $ref) . '?=';
  $headers = "From: Yakinda Kurye <noreply@{$host}>\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\nMIME-Version: 1.0";
  if (!empty($data['eposta']) && filter_var($data['eposta'], FILTER_VALIDATE_EMAIL)) $headers .= "\r\nReply-To: " . $data['eposta'];
  @mail($to, $subject, implode("\n", $lines), $headers);
}

/* ---------------- Yayınlama ---------------- */
function h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_HTML5, 'UTF-8'); }
function abs_url(string $base, string $u): string {
  if ($u === '' || strpos($u, 'data:') === 0 || strpos($u, 'media:') === 0) return '';
  if (preg_match('#^https?://#i', $u)) return $u;
  return $base ? $base . '/' . ltrim(preg_replace('#^\./#', '', $u), '/') : '';
}
function seo_block(array $c): string {
  $t = $c['texts'] ?? []; $s = $c['settings'] ?? []; $img = $c['images'] ?? [];
  $base = rtrim(trim((string) ($s['site_url'] ?? '')), '/');
  $title = (string) ($t['seo_title'] ?? $t['site_title'] ?? 'Yakında Kurye');
  $desc = (string) ($t['seo_description'] ?? '');
  $og = abs_url($base, (string) ($img['og'] ?? '')) ?: abs_url($base, (string) ($img['hero'] ?? ''));
  $robots = !empty($s['noindex']) ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  $o = [];
  $o[] = '<title>' . h($title) . '</title>';
  $o[] = '<meta name="description" content="' . h($desc) . '">';
  $o[] = '<meta name="robots" content="' . $robots . '">';
  if (!empty($s['seo_keywords'])) $o[] = '<meta name="keywords" content="' . h($s['seo_keywords']) . '">';
  if (!empty($s['gsc_verify'])) $o[] = '<meta name="google-site-verification" content="' . h($s['gsc_verify']) . '">';
  if ($base) $o[] = '<link rel="canonical" href="' . h($base . '/') . '">';
  $o[] = '<meta property="og:type" content="website">';
  $o[] = '<meta property="og:site_name" content="Yakında Kurye">';
  $o[] = '<meta property="og:locale" content="tr_TR">';
  $o[] = '<meta property="og:title" content="' . h($title) . '">';
  $o[] = '<meta property="og:description" content="' . h($desc) . '">';
  if ($base) $o[] = '<meta property="og:url" content="' . h($base . '/') . '">';
  if ($og) $o[] = '<meta property="og:image" content="' . h($og) . '">';
  $o[] = '<meta name="twitter:card" content="summary_large_image">';
  $hero = (string) ($img['hero'] ?? '');
  if ($hero !== '' && !preg_match('#^(data|media):#', $hero)) $o[] = '<link rel="preload" as="image" href="' . h($hero) . '">';
  return "<!--SEO-->\n  " . implode("\n  ", $o) . "\n  <!--/SEO-->";
}
/* ---------------- Blog sayfaları ---------------- */
// Yayındaki her yazı için blog/yazi.html şablonundan blog/<adres>.html üretir.
// Sayfa gövdesini panel gönderir (sitedeki görünümle birebir aynı); panelden silinen veya taslağa alınan yazıların eski sayfaları kaldırılır.
function blog_files(array $c, array $pages): array {
  $dir = YK_ROOT . '/blog';
  $tpl = is_file($dir . '/yazi.html') ? (string) file_get_contents($dir . '/yazi.html') : '';
  $res = ['files' => [], 'failed' => 0, 'ok' => false];
  if ($tpl === '' || strpos($tpl, '<!--YAZI-->') === false || !preg_match('/<!--META-->.*?<!--\/META-->/s', $tpl)) return $res;
  $res['ok'] = true;
  $s = $c['settings'] ?? [];
  $base = rtrim(trim((string) ($s['site_url'] ?? '')), '/');
  $kat = ['kurye' => 'Kuryeler İçin', 'isletme' => 'İşletmeler İçin'];
  foreach (($c['blog'] ?? []) as $p) {
    if (!is_array($p)) continue;
    $slug = (string) ($p['slug'] ?? '');
    if (!preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug) || $slug === 'yazi' || ($p['yayinda'] ?? true) === false) continue;
    if (!isset($pages[$slug]) || !is_string($pages[$slug]) || strlen($pages[$slug]) > 800000) continue;
    $t = trim((string) ($p['seo_title'] ?? '')); if ($t === '') $t = (string) ($p['baslik'] ?? '') . ' | Yakında Kurye';
    $d = trim((string) ($p['seo_desc'] ?? '')); if ($d === '') $d = (string) ($p['ozet'] ?? '');
    $img = (string) ($p['gorsel'] ?? '');
    $img = preg_match('#^(media|data):#', $img) ? '' : abs_url($base, $img);
    $url = $base ? $base . '/blog/' . $slug . '.html' : '';
    $o = ['<title>' . h($t) . '</title>', '<meta name="description" content="' . h($d) . '">', '<meta name="robots" content="' . (!empty($s['noindex']) ? 'noindex, nofollow' : 'index, follow, max-image-preview:large') . '">'];
    if ($url) $o[] = '<link rel="canonical" href="' . h($url) . '">';
    $o[] = '<meta property="og:type" content="article">';
    $o[] = '<meta property="og:site_name" content="Yakında Kurye">';
    $o[] = '<meta property="og:locale" content="tr_TR">';
    $o[] = '<meta property="og:title" content="' . h($t) . '">';
    $o[] = '<meta property="og:description" content="' . h($d) . '">';
    if ($url) $o[] = '<meta property="og:url" content="' . h($url) . '">';
    if ($img) $o[] = '<meta property="og:image" content="' . h($img) . '">';
    $o[] = '<meta name="twitter:card" content="summary_large_image">';
    $o[] = '<meta property="article:published_time" content="' . h($p['tarih'] ?? '') . '">';
    $o[] = '<meta property="article:modified_time" content="' . h(($p['guncelleme'] ?? '') ?: ($p['tarih'] ?? '')) . '">';
    $o[] = '<meta property="article:section" content="' . h($kat[$p['kategori'] ?? ''] ?? '') . '">';
    $meta = "<!--META-->\n  " . implode("\n  ", $o) . "\n  <!--/META-->";
    $html = $pages[$slug];
    $page = preg_replace_callback('/<!--META-->.*?<!--\/META-->/s', function () use ($meta) { return $meta; }, $tpl, 1);
    $page = preg_replace_callback('/<!--YAZI-->.*?<!--\/YAZI-->/s', function () use ($html) { return '<!--YAZI-->' . $html . '<!--/YAZI-->'; }, (string) $page, 1);
    $page = preg_replace('/<body[^>]*>/', '<body data-page="yazi" data-root="../" data-path="blog/' . $slug . '.html" data-slug="' . $slug . '">', (string) $page, 1);
    $page = preg_replace('/^<!doctype html>/i', "<!doctype html>\n<!--YK-BLOG: panelden \"Yayınla\" ile üretilir, elle düzenlemeyin-->", (string) $page, 1);
    if (is_string($page) && $page !== '' && write_file_atomic($dir . '/' . $slug . '.html', $page)) $res['files'][] = $slug; else $res['failed']++;
  }
  foreach (glob($dir . '/*.html') ?: [] as $f) {
    $b = basename($f, '.html');
    if ($b === 'yazi' || in_array($b, $res['files'], true)) continue;
    if (strpos((string) @file_get_contents($f, false, null, 0, 300), '<!--YK-BLOG') !== false) @unlink($f);
  }
  return $res;
}
function publish(array $c, array $blogPages = []): array {
  $res = ['content' => false, 'index' => false, 'sitemap' => false, 'robots' => false, 'blog' => 0, 'blog_files' => []];
  unset($c['reviewed']);
  $blog = blog_files($c, $blogPages);
  $res['blog'] = count($blog['files']); $res['blog_files'] = $blog['files']; $res['blog_failed'] = $blog['failed'];
  $js = "/* Yakında Kurye — yayındaki site içeriği (" . date('d.m.Y H:i') . " tarihinde yönetim panelinden yayınlandı). */\nwindow.YK_PUBLISHED = "
    . json_encode($c, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . ";\n"
    . ($blog['ok'] ? "// Sayfası oluşturulmuş blog yazıları (diğerleri blog/yazi.html?s=adres ile açılır)\nwindow.YK_BLOG_FILES = " . json_encode($blog['files'], JSON_UNESCAPED_SLASHES) . ";\n" : '');
  $res['content'] = write_file_atomic(YK_ROOT . '/assets/js/content.js', $js);

  $idx = YK_ROOT . '/index.html';
  $html = is_file($idx) ? (string) file_get_contents($idx) : '';
  if ($html && preg_match('/<!--SEO-->.*?<!--\/SEO-->/s', $html)) {
    $new = preg_replace_callback('/<!--SEO-->.*?<!--\/SEO-->/s', function () use ($c) { return seo_block($c); }, $html, 1);
    $res['index'] = $new !== null && ($new === $html || write_file_atomic($idx, $new));
  }
  $s = $c['settings'] ?? [];
  $base = rtrim(trim((string) ($s['site_url'] ?? '')), '/');
  $noindex = !empty($s['noindex']);
  if ($base && preg_match('#^https?://#i', $base)) {
    // Ana sayfalar + blog klasöründeki tüm yazılar
    $pages = [['', 'weekly', '1.0'], ['isletmeler.html', 'weekly', '0.9'], ['kuryeler.html', 'weekly', '0.9'], ['basvuru.html', 'monthly', '0.8'], ['blog.html', 'weekly', '0.8']];
    foreach (glob(YK_ROOT . '/blog/*.html') ?: [] as $f) if (basename($f) !== 'yazi.html') $pages[] = ['blog/' . basename($f), 'monthly', '0.7', date('Y-m-d', (int) filemtime($f))];
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($pages as $p) {
      if ($p[0] !== '' && !is_file(YK_ROOT . '/' . $p[0])) continue;
      $xml .= '  <url><loc>' . h($base . '/' . $p[0]) . '</loc><lastmod>' . ($p[3] ?? date('Y-m-d')) . '</lastmod><changefreq>' . $p[1] . '</changefreq><priority>' . $p[2] . "</priority></url>\n";
    }
    $res['sitemap'] = write_file_atomic(YK_ROOT . '/sitemap.xml', $xml . "</urlset>\n");
  }
  $robots = $noindex ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\n" . ($base ? "\nSitemap: " . $base . "/sitemap.xml\n" : '');
  $res['robots'] = write_file_atomic(YK_ROOT . '/robots.txt', $robots);
  return $res;
}

/* ---------------- Görseller ---------------- */
function media_list(): array { $m = read_store('media', []); return is_array($m) ? $m : []; }

/* ==================== İstek yönlendirme ==================== */
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$a = (string) ($_GET['a'] ?? 'status');

if ($method === 'POST') {
  // CSRF koruması: özel başlık zorunlu (başka sitelerden gönderilemez) + aynı köken
  if (($_SERVER['HTTP_X_YK'] ?? '') !== '1') fail('Geçersiz istek.', 403);
  $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
  if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) fail('Geçersiz istek kaynağı.', 403);
} elseif ($method !== 'GET') {
  fail('Desteklenmeyen istek.', 405);
}

ensure_data();
// Ziyaretçi form gönderiminde oturum açılmaz (gereksiz oturum dosyası oluşmasın)
if ($a !== 'submit') start_session();

switch ($a) {

  case 'status': {
    $setup = auth_data() === null;
    if ($setup) setup_code();
    out(['version' => YK_VERSION, 'setup' => $setup, 'logged' => logged(), 'user' => $_SESSION['user'] ?? '']);
  }

  case 'setup': {
    if ($method !== 'POST') fail('POST gerekli.', 405);
    if (auth_data() !== null) fail('Yönetici hesabı zaten oluşturulmuş. Giriş yapın.', 409, 'exists');
    if (!throttle('setup', 8, 600)) fail('Çok fazla deneme yapıldı. 10 dakika sonra tekrar deneyin.', 429, 'locked');
    $b = body();
    if (!hash_equals(norm_code(setup_code()), norm_code((string) ($b['code'] ?? '')))) fail('Kurulum kodu hatalı. Kodu hosting dosya yöneticisinde api/data/kurulum-kodu.php dosyasında bulabilirsiniz.', 403, 'badcode');
    $user = str($b['user'] ?? '', 40); $pw = (string) ($b['pass'] ?? '');
    if ($user === '' || !preg_match('/^[\p{L}\p{N}._@-]{3,40}$/u', $user)) fail('Kullanıcı adı en az 3 karakter olmalı (boşluk içermemeli).');
    if (!valid_password($pw)) fail('Şifre en az 8 karakter olmalı ve harf ile rakam içermeli.');
    $created = locked(function () use ($user, $pw) {
      if (auth_data() !== null) return false;
      write_store('auth', ['user' => $user, 'hash' => password_hash($pw, PASSWORD_DEFAULT), 'createdAt' => now()]);
      return true;
    });
    if (!$created) fail('Yönetici hesabı zaten oluşturulmuş. Giriş yapın.', 409, 'exists');
    @unlink(setup_code_file());
    throttle_reset('setup');
    session_regenerate_id(true);
    $_SESSION['user'] = $user; $_SESSION['seen'] = time();
    add_log('Yönetici hesabı oluşturuldu');
    out(['user' => $user]);
  }

  case 'login': {
    if ($method !== 'POST') fail('POST gerekli.', 405);
    $auth = auth_data();
    if ($auth === null) fail('Önce yönetici hesabı oluşturun.', 409, 'setup');
    if (!throttle('login', 5, 300, false)) fail('Çok fazla hatalı deneme. 5 dakika sonra tekrar deneyin.', 429, 'locked');
    $b = body();
    $user = str($b['user'] ?? '', 40); $pw = (string) ($b['pass'] ?? '');
    $ok = mb_strtolower($user, 'UTF-8') === mb_strtolower((string) $auth['user'], 'UTF-8') && password_verify($pw, (string) $auth['hash']);
    if (!$ok) { throttle('login', 5, 300); usleep(400000); fail('Kullanıcı adı veya şifre hatalı.', 401, 'badlogin'); }
    throttle_reset('login');
    if (password_needs_rehash((string) $auth['hash'], PASSWORD_DEFAULT)) { $auth['hash'] = password_hash($pw, PASSWORD_DEFAULT); write_store('auth', $auth); }
    session_regenerate_id(true);
    $_SESSION['user'] = (string) $auth['user']; $_SESSION['seen'] = time();
    add_log('Panele giriş yapıldı');
    out(['user' => $_SESSION['user']]);
  }

  case 'logout':
    $_SESSION = [];
    session_destroy();
    out([]);

  case 'password': {
    require_auth();
    if ($method !== 'POST') fail('POST gerekli.', 405);
    $b = body();
    $auth = auth_data();
    if (!$auth || !password_verify((string) ($b['old'] ?? ''), (string) $auth['hash'])) fail('Mevcut şifre hatalı.', 400, 'badold');
    $user = str($b['user'] ?? '', 40) ?: (string) $auth['user'];
    if (!preg_match('/^[\p{L}\p{N}._@-]{3,40}$/u', $user)) fail('Kullanıcı adı en az 3 karakter olmalı (boşluk içermemeli).');
    $pw = (string) ($b['pass'] ?? '');
    if (!valid_password($pw)) fail('Yeni şifre en az 8 karakter olmalı ve harf ile rakam içermeli.');
    write_store('auth', ['user' => $user, 'hash' => password_hash($pw, PASSWORD_DEFAULT), 'createdAt' => $auth['createdAt'] ?? now(), 'updatedAt' => now()]);
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    add_log('Panel giriş bilgileri değiştirildi');
    out(['user' => $user]);
  }

  case 'pull': {
    require_auth();
    $only = (string) ($_GET['only'] ?? '');
    $res = [];
    foreach (array_merge(YK_LISTS, YK_VALUES) as $k) {
      if ($only && $only !== $k) continue;
      $res[$k] = read_store($k, in_array($k, YK_LISTS, true) || $k === 'log' ? [] : null);
    }
    if (!$only) {
      $res['published'] = read_store('published', null);
      $res['mail'] = function_exists('mail');
    }
    out($res);
  }

  case 'sync': {
    require_auth();
    if ($method !== 'POST') fail('POST gerekli.', 405);
    $b = body();
    $coll = (string) ($b['coll'] ?? '');
    if (in_array($coll, YK_LISTS, true)) {
      $up = is_array($b['upsert'] ?? null) ? $b['upsert'] : [];
      $del = is_array($b['delete'] ?? null) ? array_map('strval', $b['delete']) : [];
      $n = locked(function () use ($coll, $up, $del) {
        $list = read_store($coll, []);
        if (!is_array($list)) $list = [];
        $byId = [];
        foreach ($list as $i => $x) if (is_array($x) && isset($x['id'])) $byId[(string) $x['id']] = $i;
        foreach ($up as $item) {
          if (!is_array($item) || empty($item['id']) || !is_string($item['id'])) continue;
          $id = $item['id'];
          if (isset($byId[$id])) $list[$byId[$id]] = $item;
          else { array_unshift($list, $item); $byId = []; foreach ($list as $i => $x) if (isset($x['id'])) $byId[(string) $x['id']] = $i; }
        }
        if ($del) { $dset = array_flip($del); $list = array_values(array_filter($list, function ($x) use ($dset) { return !isset($dset[(string) ($x['id'] ?? '')]); })); }
        if ($coll === 'applications') sort_apps($list);
        write_store($coll, $list);
        return count($list);
      });
      out(['count' => $n]);
    }
    if (in_array($coll, YK_VALUES, true)) {
      $val = $b['value'] ?? null;
      if ($coll === 'log') {
        // İşlem geçmişi yalnızca eklenir (sunucunun kendi kayıtları kaybolmasın)
        $add = is_array($b['append'] ?? null) ? $b['append'] : [];
        locked(function () use ($add) {
          $l = read_store('log', []);
          if (!is_array($l)) $l = [];
          foreach (array_reverse($add) as $e) if (is_array($e)) array_unshift($l, ['t' => str($e['t'] ?? now(), 40), 'text' => str($e['text'] ?? '', 300)]);
          write_store('log', array_slice($l, 0, 300));
        });
        out([]);
      }
      if ($coll === 'settings') {
        $v = is_array($val) ? $val : [];
        $email = str($v['notify_email'] ?? '', 120);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Bildirim e-posta adresi geçersiz.');
        $val = ['notify_email' => $email];
      }
      locked(function () use ($coll, $val) { write_store($coll, $val); });
      out([]);
    }
    fail('Bilinmeyen veri türü.', 400);
  }

  case 'restore': {
    require_auth();
    if ($method !== 'POST') fail('POST gerekli.', 405);
    $b = body();
    locked(function () use ($b) {
      foreach (YK_LISTS as $k) { $v = is_array($b[$k] ?? null) ? array_values($b[$k]) : []; if ($k === 'applications') sort_apps($v); write_store($k, $v); }
      write_store('draft', $b['draft'] ?? null);
      write_store('log', is_array($b['log'] ?? null) ? array_slice($b['log'], 0, 300) : []);
    });
    out([]);
  }

  case 'submit': {
    if ($method !== 'POST') fail('POST gerekli.', 405);
    $b = body();
    $type = (string) ($b['type'] ?? '');
    if (!isset(YK_FORMS[$type])) fail('Geçersiz form.', 400);
    // Bot tuzağı: gizli alan doluysa kaydetmeden başarılı görün
    if (trim((string) ($b['website'] ?? '')) !== '') out(['ref' => ref_no()]);
    if (!throttle('submit', 15, 600)) fail('Kısa sürede çok fazla gönderim yapıldı. Lütfen biraz sonra tekrar deneyin veya bizi arayın.', 429, 'rate');
    $def = YK_FORMS[$type];
    $in = is_array($b['data'] ?? null) ? $b['data'] : [];
    $data = [];
    foreach ($def['fields'] as $k => $label) $data[$k] = str($in[$k] ?? '', in_array($k, ['mesaj', 'adres'], true) ? 1000 : 120);
    foreach ($def['required'] as $k) if ($data[$k] === '') fail('Lütfen zorunlu alanları doldurun: ' . $def['fields'][$k], 422, 'invalid');
    $tel = digits($data['telefon']);
    if (strlen($tel) !== 11 || $tel[0] !== '0') fail('Telefonu 05xx xxx xx xx biçiminde girin.', 422, 'invalid');
    if ($data['eposta'] !== '' && !filter_var($data['eposta'], FILTER_VALIDATE_EMAIL)) fail('Geçerli bir e-posta girin.', 422, 'invalid');
    if ($type === 'kurye') {
      $dt = DateTime::createFromFormat('!Y-m-d', $data['dogumTarihi']);
      if (!$dt) fail('Doğum tarihini kontrol edin.', 422, 'invalid');
      $age = (int) $dt->diff(new DateTime('today'))->y;
      if ($age < 18) fail('Başvuru için 18 yaşını doldurmuş olmalısınız.', 422, 'invalid');
      if ($age > 75) fail('Doğum tarihini kontrol edin.', 422, 'invalid');
    }
    if (empty($b['kvkk'])) fail('KVKK onayı gerekli.', 422, 'invalid');
    $host = preg_replace('/[^a-z0-9.\-:]/i', '', (string) ($_SERVER['HTTP_HOST'] ?? '')) ?: 'site';
    $result = locked(function () use ($type, $data, $tel, $host) {
      $apps = read_store('applications', []);
      if (!is_array($apps)) $apps = [];
      $limit = time() - 86400;
      foreach ($apps as $x) {
        if (($x['type'] ?? '') === $type && digits($x['data']['telefon'] ?? '') === $tel && strtotime((string) ($x['createdAt'] ?? '')) > $limit) return ['dup' => (string) ($x['ref'] ?? '')];
      }
      $app = ['id' => uid(), 'type' => $type, 'status' => 'yeni', 'ref' => ref_no(), 'data' => $data, 'kvkk' => true, 'notes' => [], 'source' => $host, 'createdAt' => now()];
      array_unshift($apps, $app);
      write_store('applications', $apps);
      return ['app' => $app];
    });
    if (isset($result['dup'])) fail('Bu telefon numarasıyla son 24 saat içinde zaten ' . ($type === 'kurye' ? 'başvuru' : 'talep') . ' yapılmış.', 409, 'dup', ['ref' => $result['dup']]);
    notify_mail($type, $result['app']['ref'], $data);
    out(['ref' => $result['app']['ref']]);
  }

  case 'publish': {
    require_auth();
    if ($method !== 'POST') fail('POST gerekli.', 405);
    $b = body();
    $c = $b['content'] ?? null;
    if (!is_array($c) || !isset($c['texts'], $c['settings'])) fail('Geçersiz içerik.', 400);
    $bh = is_array($b['blog_html'] ?? null) ? $b['blog_html'] : [];
    $res = locked(function () use ($c, $bh) {
      $r = publish($c, $bh);
      if ($r['content']) { write_store('published', $c); write_store('draft', $c); }
      return $r;
    });
    if (!$res['content']) fail('assets/js/content.js dosyası yazılamadı. Dosya/klasör izinlerini kontrol edin veya content.js dosyasını indirip FTP ile yükleyin.', 500, 'nowrite', ['result' => $res]);
    out(['result' => $res, 'at' => now()]);
  }

  case 'upload': {
    require_auth();
    if ($method !== 'POST') fail('POST gerekli.', 405);
    $b = body();
    $m = [];
    if (!preg_match('#^data:image/(jpeg|png|webp|gif);base64,#', (string) ($b['data'] ?? ''), $m)) fail('Yalnızca JPG, PNG, WEBP veya GIF görsel yüklenebilir.', 415);
    $bin = base64_decode(substr((string) $b['data'], strlen($m[0])), true);
    if ($bin === false || strlen($bin) < 64) fail('Görsel okunamadı.', 400);
    if (strlen($bin) > 8 * 1024 * 1024) fail('Görsel 8 MB sınırını aşıyor.', 413);
    $info = @getimagesizefromstring($bin);
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$info['mime'] ?? ''] ?? '';
    if (!$info || !$ext) fail('Geçersiz görsel dosyası.', 415);
    $dir = YK_ROOT . '/uploads';
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) fail('uploads klasörü oluşturulamadı.', 500);
    $id = uid();
    $file = $id . '.' . $ext;
    if (@file_put_contents($dir . '/' . $file, $bin) === false) fail('Görsel kaydedilemedi (uploads klasörüne yazma izni gerekli).', 500);
    $item = ['id' => $id, 'src' => 'uploads/' . $file, 'name' => str($b['name'] ?? 'görsel', 80), 'w' => $info[0], 'h' => $info[1], 'createdAt' => now()];
    locked(function () use ($item) { $l = media_list(); array_unshift($l, $item); write_store('media', $l); });
    out(['item' => $item]);
  }

  case 'media':
    require_auth();
    out(['items' => media_list()]);

  case 'media_delete': {
    require_auth();
    if ($method !== 'POST') fail('POST gerekli.', 405);
    $b = body();
    $id = (string) ($b['id'] ?? '');
    $removed = locked(function () use ($id) {
      $l = media_list(); $hit = null;
      foreach ($l as $i => $x) if (($x['id'] ?? '') === $id || ($x['src'] ?? '') === $id) { $hit = $x; array_splice($l, $i, 1); break; }
      if (!$hit) return false;
      write_store('media', $l);
      $f = YK_ROOT . '/uploads/' . basename((string) $hit['src']);
      if (is_file($f)) @unlink($f);
      return true;
    });
    out(['removed' => $removed]);
  }

  default:
    fail('Bilinmeyen işlem.', 404);
}
