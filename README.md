# Yakında Kurye — Web Sitesi ve Yönetim Paneli (Sürüm 5)

Restoran ve işletmelere kurye hizmeti veren, kurye alımı yapan **Yakında Kurye** için çok sayfalı web sitesi, blog ve yönetim paneli.

| Dosya / klasör | Ne işe yarar |
| --- | --- |
| `index.html` | Ana sayfa: tanıtım, "Size nasıl yardımcı olalım?" kartları, hakkımızda, referanslar, son blog yazıları |
| `isletmeler.html` | İşletmeler için: hizmetler, avantajlar, hizmet modelleri, nasıl çalışır, işletme SSS |
| `kuryeler.html` | Kuryeler için: neden biz, başvuru şartları, çalışma modelleri, kazanç hesaplayıcı, kurye SSS |
| `basvuru.html` | Başvuru ve iletişim: işletme talep formu / kurye başvuru formu (sekmeli), iletişim bilgileri |
| `blog.html`, `blog/` | Blog listesi ve yazı sayfaları (`blog/yazi.html` yazı şablonudur) |
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
  - **Geçici inceleme ayarı:** Yerel modda panel şu an şifre sormadan açılır (`assets/js/admin.js` içinde `YEREL_SIFRESIZ = true`). Yerel modda panel yalnızca o tarayıcının verisini gösterdiği için siteyi değiştirmez; yine de inceleme bitince `false` yapılması önerilir. Sunucu modunda giriş her zaman şifrelidir.
  - Ana sayfanın en altındaki **©** işareti yönetim paneline gider (görünüşte normal metindir).

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

## Sayfa yapısı ve blog

- Panelde düzenlenen metinler, görseller ve listeler hangi sayfada bulunuyorsa orada görünür (ör. kazanç hesaplayıcı Kuryeler sayfasında, formlar Başvuru sayfasında). Bölümleri aç/kapa ayarları aynen çalışır.
- Eski tek sayfalık sitenin bağlantıları (ör. `index.html#kurye-basvuru`) kendiliğinden yeni sayfalara yönlendirilir.
- Her sayfanın kendi başlığı, açıklaması ve yapısal verisi vardır (sayfa yolu, SSS, iş ilanı, blog yazısı). Panelde girilen SEO başlığı ve açıklaması ana sayfa içindir.
- **Blog yazıları panelden yönetilir:** Site İçeriği → **Blog Yazıları**. Yeni yazı ekleme, düzenleme, silme, taslak/yayında, kapak görseli, SSS ve SEO başlığı/açıklaması buradadır. İçerik, biçim butonlarıyla (ara başlık, kalın, liste, bağlantı, not kutusu, tablo) veya şu işaretlerle yazılır: `## başlık`, `- madde`, `**kalın**`, `[metin](adres)`, `> not`, `| tablo |`. "Önizle" ile kaydedilen hali sitede görülür.
  - **Sunucu modu:** "Yayınla" her yayındaki yazı için `blog/adres.html` sayfasını oluşturur (arama motorları için hazır içerikli), silinen/taslağa alınan yazıların sayfalarını kaldırır ve sitemap'i günceller.
  - **Yerel mod:** `content.js` yayınlandığında yazılar sitede görünür; yeni yazılar `blog/yazi.html?s=adres` adresinde açılır, ek dosya gerekmez.
  - Ana sayfa, İşletmeler ve Kuryeler sayfalarındaki "son yazılar" kartları ile blog listesi kendiliğinden güncellenir. Blog bölümü "Bölümler & Bant" sekmesinden kapatılabilir.
- Mevzuat içeren yazılar (ehliyet, SRC KURYE, ekipman) Ekim 2026 itibarıyla yazılmıştır; mevzuat değiştikçe güncellenmelidir.

## Telefon ve tablet görünümü

- Ana sayfa ve alt sayfalar telefonda kısa tutulur: hizmetler, hizmet modelleri, çalışma modelleri, yorumlar ve blog kartları yana kaydırılır; referans galerisi iki sıralı yatay galeridir; adımlar kısa bir zaman çizelgesidir.
- Hakkımızda bölümünde misyon, vizyon ve değerler telefonda "Devamını oku" ile açılır. Formlarda isteğe bağlı alanlar "Ek bilgiler" düğmesinin altında durur.
- Tablette (601–960 px) hero, görselli bölümler, hesaplayıcı, formlar ve iletişim iki sütunludur.

## Önceki sürüme dönmek

Tek sayfalık önceki sürüm iki yerde saklanır: GitHub'daki `yedek-tek-sayfa` dalı ve masaüstündeki `06_web_sitesi/yakinda-kurye-site_YEDEK_tek-sayfa_2026-10-23` klasörü. Geri dönmek için o klasördeki dosyalar hostinge yüklenir (sunucudaki `api/data` klasörüne dokunulmaz; başvurular ve panel verileri korunur).

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
