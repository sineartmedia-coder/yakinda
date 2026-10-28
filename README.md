# Yakında Kurye — Web Sitesi ve Yönetim Paneli (Sürüm 7)

Restoran ve işletmelere kurye hizmeti veren, kurye alımı yapan **Yakında Kurye** için çok sayfalı web sitesi, blog ve yönetim paneli.

| Dosya / klasör | Ne işe yarar |
| --- | --- |
| `index.html` | Ana sayfa: tanıtım, "Size nasıl yardımcı olalım?" kartları, hakkımızda, referanslar, son blog yazıları |
| `isletmeler.html` | İşletmeler için: hizmetler, avantajlar, hizmet modelleri, nasıl çalışır, işletme SSS |
| `kuryeler.html` | Kuryeler için: neden biz, başvuru şartları, çalışma modelleri, kazanç hesaplayıcı, kurye SSS |
| `basvuru.html` | Başvuru ve iletişim: işletme talep formu / kurye başvuru formu (sekmeli), iletişim bilgileri |
| `blog.html`, `blog/` | Blog listesi ve yazı sayfaları (`blog/yazi.html` yazı şablonudur) |
| `admin.html` | Yönetim paneli |
| `assets/js/firebase-config.js` | Firebase bağlantı ayarları ve panele girebilecek Google hesapları |
| `firestore.rules` | Firebase veritabanı güvenlik kuralları (kim neyi okuyup yazabilir) |
| `firebase.json` | Yalnızca Firebase Hosting için yayın ayarları |
| `assets/` | Görseller, stil ve JavaScript dosyaları |
| `assets/img/foto/` | Sitede kullanılan gerçek fotoğraflar (bkz. **Görseller ve lisans**) |
| `assets/js/editor.js` | Sitede tıklayarak düzenleme modu (yalnızca yönetici) |
| `assets/js/content.js` | Yedek site içeriği (Firebase'e ulaşılamazsa kullanılır) |
| `404.html` | “Sayfa bulunamadı” sayfası |
| `.htaccess`, `robots.txt` | Apache/cPanel hosting ayarları ve arama motoru kuralları |

## Nasıl çalışır? (PHP yok, her hostingte çalışır)

Site yalnızca **HTML, CSS ve JavaScript** dosyalarından oluşur; sunucuda çalışan kod (PHP vb.) yoktur. Veriler **Firebase** (Google) üzerinde tutulur ve tarayıcıdan doğrudan bağlanılır. Bu yüzden dosyaları hangi hostinge yüklerseniz yükleyin (Firebase Hosting, cPanel, Netlify, Vercel, GitHub Pages…) site, formlar ve panel aynı şekilde çalışır.

- **Bulut modu** (`assets/js/firebase-config.js` dolu):
  - Ziyaretçilerin her cihazdan gönderdiği kurye başvuruları ve işletme talepleri **yönetim paneline düşer** (Firestore veritabanı).
  - Panele her bilgisayardan ve telefondan **yönetici Google hesabıyla** (“Google ile giriş yap”) girilir; herkes aynı veriyi görür. Yalnızca `firebase-config.js` ve `firestore.rules` içindeki listede bulunan e-posta adresleri panele girebilir.
  - Panelde **“Yayınla”** siteyi tek tıkla günceller: içerik Firebase'e kaydedilir, ziyaretçiler sayfayı yenileyince yeni hali görür. Dosya yüklemeye gerek yoktur.
  - Yüklenen görseller de Firebase'de saklanır (görsel başına ~1 MB'a kadar; büyükler otomatik küçültülür).
- **Yerel mod** (Firebase ayarı boş): Veriler yalnızca o tarayıcıda saklanır; geliştirme ve deneme içindir. Panel şifresiz açılır (`assets/js/admin.js` içinde `YEREL_SIFRESIZ`).

Panelin sol alt köşesinde hangi modda çalıştığı yazar.

## Firebase kurulumu (bir kez)

1. [console.firebase.google.com](https://console.firebase.google.com) › proje oluşturun (Google Analytics gerekmez).
2. **Firestore Database** › Veritabanı oluştur (konum: `europe-west3` Frankfurt önerilir) › üretim modunda başlatın.
3. **Authentication** › Başlayın › **Sign-in method** › **Google**'ı etkinleştirin (destek e-postası olarak yönetici adresini seçin).
4. **Proje ayarları** › Uygulamalarınız › **Web uygulaması ekle** › çıkan `apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId` değerlerini `assets/js/firebase-config.js` dosyasına yazın.
5. `firestore.rules` dosyasındaki kuralları Firestore › **Kurallar** sekmesine yapıştırıp yayınlayın (ya da komut satırından: `firebase deploy --only firestore:rules`).
6. Panele girip **Site İçeriği › Yayınla** deyin; ilk yayından sonra site içeriği Firebase'den okunur.

## Yayına alma / hosting değiştirme

- **Firebase Hosting:** Klasörde `firebase deploy --only hosting` (ayarlar `firebase.json` dosyasında). Alan adı: Firebase › Hosting › **Özel alan adı ekle**; verilen DNS kayıtlarını alan adı firmanızın panelinde girin.
- **Başka bir hosting (cPanel, Netlify, Vercel, GitHub Pages…):** Klasördeki tüm dosyaları (gizli `.htaccess` dahil) sitenin ana klasörüne yükleyin. `firebase.json`, `firestore.rules` ve `README.md` yüklenmese de olur.
- **Her yeni alan adında tek bir ayar gerekir:** Firebase › Authentication › Settings › **Authorized domains** listesine alan adını ekleyin (ör. `yakindakurye.com` ve `www.yakindakurye.com`). Eklenmezse site ve formlar çalışır ama panele Google ile giriş yapılamaz.
- Panel › SEO bölümüne sitenin tam adresini girin; `sitemap.xml` ve `robots.txt` dosyalarını aynı yerden indirip ana klasöre koyun.
## Panelde neler var?

- **Genel Bakış:** Kontrol listesi, yeni talep/başvuru sayıları, evrak ve tarih uyarıları, 14 günlük paket ve başvuru grafikleri, en çok teslimat yapanlar, son işlemler.
- **İşletme Talepleri / Kurye Başvuruları:** Filtre, arama, sıralama, toplu durum değiştirme, CSV, toplu silme, notlar, yazdırma, arama ve WhatsApp kısayolları.
  - Bilgileri **düzenleme**.
  - Telefonla gelenleri **elle ekleme** ("Yeni talep / Yeni başvuru").
  - Tek tıkla müşteriye veya çalışana dönüştürme.
  - Bulut modunda yeni başvurular 30 saniyede bir ve sekmeye dönüldüğünde kontrol edilir; sesli bildirim verilir.
- **Müşteriler:** Anlaşılan işletmeler, hizmet modeli, ücret koşulları, kurye atama.
- **Çalışanlar:** Fotoğraf, T.C. ve IBAN doğrulama, evrak listesi, ehliyet / sigorta / muayene bitiş uyarıları, bakiye, yazdırma.
- **Kayıtlar & Puantaj:** Vardiya, hakediş, prim, ödeme, avans, kesinti, izin vb. Günlük puantajda paket başı ücretle otomatik tutar hesaplanır. Hakediş raporu yazdırılabilir, CSV alınabilir ve tek tıkla ödenebilir.
- **Site İçeriği:** Sitedeki tüm yazılar ve buton metinleri, görseller (sürükle-bırak), bölümleri aç/kapa, kayan bant, istatistikler, hesaplayıcı, yorumlar, galeri, bölgeler, SSS, KVKK metni ve form seçenekleri.
  - Kaydedilen değişiklikler önce taslaktır. **Önizle** ile (`index.html?onizleme=1`) yayına almadan görülebilir.
  - Ctrl/Cmd + S ile kaydedilir.
- **Görseller:** Yüklenen ve hazır tüm görseller tek sayfada. Her görselin sitede nerede kullanıldığı yazar; “Bir alana ata” ile tek tıkla ana görsel, hakkımızda, form görselleri, paylaşım görseli vb. alanlara atanır ya da galeriye eklenir. Sürükle-bırak ile yükleme, kullanılmayanları silme.
- **Sitede düzenle:** Panelin üstündeki “Sitede düzenle” butonu siteyi düzenleme modunda açar (`sayfa.html?onizleme=1&duzenle=1`). Yazılara tıklayıp yerinde değiştirirsiniz (başlıklar, açıklamalar, butonlar, menü, alt bilgi, hizmet kartları, adımlar, SSS, istatistikler, iletişim bilgileri…), görsellere tıklayıp yenisini seçer ya da yüklersiniz. Alttaki çubuktan kaydedilir; sunucu modunda “Yayınla” ile oradan yayına alınır. Düzenleme modunda bağlantılar açılmaz ve formlar gönderilmez. Yalnızca panele giriş yapmış yönetici kullanabilir.
- **Site İçeriği › Menü & Alt Bilgi / Sayfa Başlıkları:** Üst menü yazıları, alt bilgi sütun başlıkları ve telif satırı; İşletmeler, Kuryeler, Başvuru ve Blog sayfalarının üst bölümleri. Sitede artık panelden değiştirilemeyen sabit yazı kalmadı (form alan adları ve blog kategori adları hariç). Değiştirilen her yazının yanında “Varsayılana dön” bağlantısı çıkar.
- **Site İçeriği › Tema & Renkler:** Ana renk, koyu renk ve yazı tipi (Poppins, Montserrat, Nunito, Inter, Rubik, Outfit); hazır renk paketleri ve canlı önizleme.
- **Site İçeriği › Duyuru Penceresi:** Kampanya/duyuru açılır penceresi: başlık, metin, buton, bağlantı, görsel, gecikme ve hangi sayfada çıkacağı. Her ziyaretçiye bir kez gösterilir; “Daha önce kapatanlara tekrar göster” ile yeniden çıkarılır.
- **SEO:** SEO puanı, Google önizlemesi, başlık/açıklama, alan adı, yerel SEO, Search Console, Google Analytics (çerez onaylı), kurye iş ilanı yapısal verisi.
- **Ayarlar:** Giriş bilgileri, Firebase bağlantı durumu, yedek indir / geri yükle, işlem geçmişi, örnek veri, sıfırlama.

## Sayfa yapısı ve blog

- Panelde düzenlenen metinler, görseller ve listeler hangi sayfada bulunuyorsa orada görünür (ör. kazanç hesaplayıcı Kuryeler sayfasında, formlar Başvuru sayfasında). Bölümleri aç/kapa ayarları aynen çalışır.
- Eski tek sayfalık sitenin bağlantıları (ör. `index.html#kurye-basvuru`) kendiliğinden yeni sayfalara yönlendirilir.
- Her sayfanın kendi başlığı, açıklaması ve yapısal verisi vardır (sayfa yolu, SSS, iş ilanı, blog yazısı). Ana sayfanın ve alt sayfaların (İşletmeler, Kuryeler, Başvuru, Blog) arama sonucu başlık/açıklamaları SEO sekmesinden değiştirilir.
  - Ana sayfanınkiler “Yayınla” ile `index.html` dosyasına da yazılır. Alt sayfalarınkiler sayfa açılırken uygulanır (Google sayfaları bu haliyle görür); sosyal medya önizlemelerinde alt sayfaların HTML’deki varsayılan başlığı görünür.
- **Blog yazıları panelden yönetilir:** Site İçeriği → **Blog Yazıları**. Yeni yazı ekleme, düzenleme, silme, taslak/yayında, kapak görseli, SSS ve SEO başlığı/açıklaması buradadır. İçerik, biçim butonlarıyla (ara başlık, kalın, liste, bağlantı, not kutusu, tablo) veya şu işaretlerle yazılır: `## başlık`, `- madde`, `**kalın**`, `[metin](adres)`, `> not`, `| tablo |`. "Önizle" ile kaydedilen hali sitede görülür.
  - Hazır gelen 7 yazının `blog/adres.html` sayfaları vardır; panelden eklenen yeni yazılar `blog/yazi.html?s=adres` adresinde açılır, ek dosya gerekmez. Yazı düzenlendiğinde sayfalar içeriği Firebase'den okuyarak güncel hali gösterir.
  - Ana sayfa, İşletmeler ve Kuryeler sayfalarındaki "son yazılar" kartları ile blog listesi kendiliğinden güncellenir. Blog bölümü "Bölümler & Bant" sekmesinden kapatılabilir.
- Mevzuat içeren yazılar (ehliyet, SRC KURYE, ekipman) Ekim 2026 itibarıyla yazılmıştır; mevzuat değiştikçe güncellenmelidir.

## Telefon ve tablet görünümü

- Ana sayfa ve alt sayfalar telefonda kısa tutulur: hizmetler, hizmet modelleri, çalışma modelleri, yorumlar ve blog kartları yana kaydırılır; referans galerisi iki sıralı yatay galeridir; adımlar kısa bir zaman çizelgesidir.
- Hakkımızda bölümünde misyon, vizyon ve değerler telefonda "Devamını oku" ile açılır. Formlarda isteğe bağlı alanlar "Ek bilgiler" düğmesinin altında durur.
- Tablette (601–960 px) hero, görselli bölümler, hesaplayıcı, formlar ve iletişim iki sütunludur.

## Önceki sürüme dönmek

Tek sayfalık eski sürüm GitHub'daki `yedek-tek-sayfa` dalında ve masaüstündeki `06_web_sitesi/yakinda-kurye-site_YEDEK_tek-sayfa_2026-10-23` klasöründe saklanır. PHP'li sürüm 6 ise GitHub'da `1d6d839` ve `84e6170` commit'lerindedir.

## Bildirimler

- Yeni başvurular panelde anında görünür; panel açıkken 30 saniyede bir kontrol edilir ve sesli bildirim verilir.
- **E-posta bildirimi:** Site İçeriği › Genel & İletişim › “Başvuru bildirimleri” bölümüne ücretsiz [Web3Forms](https://web3forms.com) erişim anahtarı girilirse her başvuru e-postanıza da gelir (önerilir).
- Başvuru sonrası çıkan **“WhatsApp ile ilet”** butonu, başvuru bilgilerini WhatsApp numaranıza hazır mesaj olarak gönderir.

## Güvenlik ve yedekleme

- Veritabanı erişimi `firestore.rules` ile korunur: ziyaretçiler yalnızca yeni başvuru oluşturabilir, başvuruları okuyamaz veya değiştiremez; yayındaki içerik ve görseller herkese açıktır; diğer her şey yalnızca yönetici Google hesabına açıktır.
- `firebase-config.js` içindeki anahtarlar gizli değildir (her Firebase web sitesinde görünür); güvenlik kurallarla sağlanır.
- Formlarda bot tuzağı, aynı cihazdan aynı telefonla 24 saatte tek başvuru, 18 yaş ve alan kontrolleri vardır. Yoğun spam görülürse Firebase › App Check açılabilir.
- Panel 60 dakika işlem yapılmazsa oturumu kapatır. Yönetici Google hesabında iki adımlı doğrulamayı açın.
- **Ayarlar › Yedek indir** ile düzenli yedek alın (başvurular, müşteriler, çalışanlar, kayıtlar ve site içeriği).

## Görseller ve lisans

- Önceki sürümdeki çanta/vitrin maketleri (mockup) kaldırıldı. Sitedeki fotoğraflar `assets/img/foto/` klasöründedir ve [Unsplash](https://unsplash.com) üzerinden **Unsplash Lisansı** ile alınmıştır: ticari kullanım ücretsizdir, kaynak gösterme zorunlu değildir. Rakip kurye markalarının logosu bulunan fotoğraflar seçilmemiştir.
- Logo, sticker tasarımları (`sticker-*.jpg`) ve sosyal medya paylaşım görseli (`og.png`) markanın kendi görselleridir.
- Kendi fotoğraflarınızı (şube, kurye ekibi, markalı çanta ve motorlar) çektikçe **Görseller** sayfasından yükleyip ilgili alana atamanız önerilir; gerçek ekip fotoğrafları güveni artırır.
- Daha önce panelde eski maket görselleri seçilmiş olsa bile site bozulmaz: kayıtlı içerikteki eski görsel yolları otomatik olarak yeni fotoğraflarla değiştirilir.

## Mutlaka güncellenecek örnek değerler

Telefon, WhatsApp, e-posta, adres, istatistik bandındaki değerler ve kazanç hesaplayıcıdaki paket başı ücret (40 ₺) örnek olarak girilmiştir. KVKK aydınlatma metni genel bir şablondur; hukukçunuza kontrol ettirmeniz önerilir. Yorumlar bölümüne yalnızca izin aldığınız gerçek yorumları ekleyin.
