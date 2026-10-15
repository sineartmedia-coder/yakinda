# Yakında Kurye — Web Sitesi ve Yönetim Paneli (Sürüm 4)

Restoran ve işletmelere kurye hizmeti veren, kurye alımı yapan **Yakında Kurye** için tek sayfalık web sitesi ve yönetim paneli.

| Dosya / klasör | Ne işe yarar |
| --- | --- |
| `index.html` | Web sitesi |
| `admin.html` | Yönetim paneli |
| `api/index.php` | Sunucu kodu: formları kaydeder, panel verilerini saklar, "Yayınla" ile siteyi günceller |
| `assets/` | Görseller, stil ve JavaScript dosyaları |
| `assets/js/content.js` | Yayındaki site içeriği (panelden "Yayınla" ile güncellenir) |
| `uploads/` | Panelden yüklenen görseller (sunucu modunda) |
| `.htaccess`, `robots.txt` | Hosting ayarları ve arama motoru kuralları |

## İki çalışma modu

Site ve panel, yüklendiği yere göre kendiliğinden doğru modu seçer:

- **Sunucu modu** (önerilen): Site **PHP 7.4 veya üzeri** destekleyen bir hostinge yüklendiğinde açılır. Türkiye'deki cPanel / Plesk hostinglerin neredeyse hepsi PHP destekler.
  - Ziyaretçilerin her cihazdan gönderdiği kurye başvuruları ve işletme talepleri **doğrudan yönetim paneline düşer**.
  - Panele her bilgisayardan ve telefondan girilir; herkes aynı veriyi görür.
  - Panelde **"Yayınla"** butonu siteyi tek tıkla günceller. Metinler, görseller, SEO etiketleri, `sitemap.xml` ve `robots.txt` buna dahildir.
  - Yönetici şifresi sunucuda şifrelenmiş olarak saklanır. 5 hatalı denemede giriş 5 dakika kilitlenir.
- **Yerel mod**: PHP yoksa açılır (dosyayı çift tıklayarak açma, GitHub Pages gibi statik hostingler).
  - Veriler yalnızca o tarayıcıda saklanır. Farklı cihazlardan gelen başvurular panele düşmez; e-posta bildirimi (Web3Forms) ve "WhatsApp ile ilet" butonuyla size ulaşır.
  - Panel değişikliklerini yayınlamak için indirilen `content.js` dosyası `assets/js/` klasörüne konur.
  - Varsayılan giriş bilgileri: kullanıcı adı `admin`, şifre `yakinda2026` (Ayarlar'dan değiştirin).

Panelin sol alt köşesinde hangi modda çalıştığı yazar.

## Hostinge yükleme (sunucu modu)

1. Bu klasördeki **tüm dosyaları** (gizli `.htaccess` dosyaları ve `api`, `uploads` klasörleri dahil) hostingdeki `public_html` klasörüne yükleyin.
2. `https://alanadiniz.com/admin.html` adresini açın. Panel "İlk kurulum" ekranını gösterir.
3. Hosting dosya yöneticisinde (cPanel → Dosya Yöneticisi) `api/data/kurulum-kodu.php` dosyasını açın. "KOD:" satırındaki kodu (ör. `ABCD-1234`) ekrandaki "Kurulum kodu" alanına yazın, kullanıcı adı ve şifre belirleyip yönetici hesabını oluşturun.
   > Bu kod sayesinde yönetici hesabını yalnızca hosting'e erişimi olan kişi oluşturabilir. Hesap oluşturulunca kod dosyası kendiliğinden silinir.
4. Panelde **Genel Bakış → Yayına hazırlık kontrol listesi**'ni tamamlayın: telefon, WhatsApp, adres, e-posta, kazanç ücreti, SEO alan adı ve bildirim e-postası.
5. **Site İçeriği → Yayınla → Sitede yayınla** ile değişiklikleri yayına alın.

**Klasör izinleri:** `api/` klasöründe `data` adında bir klasör otomatik oluşturulur. Bu klasör, `uploads/`, `assets/js/` ve site ana klasörü PHP tarafından yazılabilir olmalıdır (cPanel'de genellikle varsayılan olarak öyledir; değilse klasör iznini 755 yapın). Bir izin sorunu varsa panel giriş ekranında açıkça yazar.

**Daha önce yerel modda veri girdiyseniz:** Aynı tarayıcıyla sunucudaki panele girdiğinizde "Sunucuya aktar" kutusu çıkar. Tek tıkla tüm başvuru, müşteri, çalışan ve kayıtlar sunucuya taşınır.

## Panelde neler var?

- **Genel Bakış:** Kontrol listesi, yeni talep/başvuru sayıları, evrak ve tarih uyarıları, 14 günlük paket ve başvuru grafikleri, en çok teslimat yapanlar, son işlemler.
- **İşletme Talepleri / Kurye Başvuruları:** Filtre, arama, sıralama, toplu durum değiştirme, CSV, toplu silme, notlar, yazdırma, arama ve WhatsApp kısayolları.
  - Bilgileri **düzenleme**.
  - Telefonla gelenleri **elle ekleme** ("Yeni talep / Yeni başvuru").
  - Tek tıkla müşteriye veya çalışana dönüştürme.
  - Sunucu modunda yeni başvurular 30 saniyede bir ve sekmeye dönüldüğünde kontrol edilir; sesli bildirim verilir.
- **Müşteriler:** Anlaşılan işletmeler, hizmet modeli, ücret koşulları, kurye atama.
- **Çalışanlar:** Fotoğraf, T.C. ve IBAN doğrulama, evrak listesi, ehliyet / sigorta / muayene bitiş uyarıları, bakiye, yazdırma.
- **Kayıtlar & Puantaj:** Vardiya, hakediş, prim, ödeme, avans, kesinti, izin vb. Günlük puantajda paket başı ücretle otomatik tutar hesaplanır. Hakediş raporu yazdırılabilir, CSV alınabilir ve tek tıkla ödenebilir.
- **Site İçeriği:** Sitedeki tüm yazılar ve buton metinleri, görseller (sürükle-bırak), bölümleri aç/kapa, kayan bant, istatistikler, hesaplayıcı, yorumlar, galeri, bölgeler, SSS, KVKK metni ve form seçenekleri.
  - Kaydedilen değişiklikler önce taslaktır. **Önizle** ile (`index.html?onizleme=1`) yayına almadan görülebilir.
  - Ctrl/Cmd + S ile kaydedilir.
- **SEO:** SEO puanı, Google önizlemesi, başlık/açıklama, alan adı, yerel SEO, Search Console, Google Analytics (çerez onaylı), kurye iş ilanı yapısal verisi.
- **Ayarlar:** Şifre, bildirim e-postası (sunucu modu), yedek indir / geri yükle, işlem geçmişi, örnek veri, sıfırlama.

## Bildirimler

- **Sunucu modu:** Ayarlar → "Yeni başvuru bildirim e-postası" alanına adres girin. Her yeni talep ve başvuru e-posta ile gelir (hostingin PHP `mail()` fonksiyonuyla). Spam klasörünü de kontrol edin.
- **Her iki mod:** Site İçeriği → Genel & İletişim → "Başvuru bildirimleri" bölümüne ücretsiz [Web3Forms](https://web3forms.com) erişim anahtarı girilirse başvurular ayrıca e-postanıza gelir.
- Başvuru sonrası çıkan **"WhatsApp ile ilet"** butonu, başvuru bilgilerini WhatsApp numaranıza hazır mesaj olarak gönderir.

## Güvenlik ve yedekleme

- Başvuru verileri `api/data` klasöründe, tarayıcıdan doğrudan açılamayan `.php` dosyalarında tutulur. Bu klasör **asla GitHub'a yüklenmez** (`.gitignore`).
- Formlarda bot tuzağı, IP başına gönderim sınırı (10 dakikada 15), aynı telefonla 24 saatte tek başvuru, 18 yaş ve alan kontrolleri vardır; bu kontroller sunucuda da yapılır.
- Panel 60 dakika işlem yapılmazsa oturumu kapatır.
- **Ayarlar → Yedek indir** ile düzenli yedek alın. Sunucu modunda yüklenen görseller `uploads/` klasöründe durur; hosting yedeğinize dahil edin.

## Mutlaka güncellenecek örnek değerler

Telefon, WhatsApp, e-posta, adres, istatistik bandındaki değerler ve kazanç hesaplayıcıdaki paket başı ücret (40 ₺) örnek olarak girilmiştir. KVKK aydınlatma metni genel bir şablondur; hukukçunuza kontrol ettirmeniz önerilir. Yorumlar bölümüne yalnızca izin aldığınız gerçek yorumları ekleyin.
