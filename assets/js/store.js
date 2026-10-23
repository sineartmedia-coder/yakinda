/* ==========================================================================
   Yakında Kurye — Ortak veri katmanı (site + admin paneli)
   İki çalışma modu vardır:
   • Sunucu modu: hosting'de PHP varsa (api/index.php yanıt veriyorsa) tüm
     başvurular ve panel verileri sunucuda saklanır, her cihazdan aynı veri görünür.
   • Yerel mod: PHP yoksa (ör. dosyayı çift tıklayarak açma, statik hosting)
     veriler tarayıcıda saklanır: JSON veriler localStorage'da, yüklenen
     görseller IndexedDB'de (desteklenmezse localStorage'da).
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- İkonlar ---------- */
  const ICONS = {
    paket: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    simsek: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    yemek: '<path d="M6 2v7a2 2 0 0 0 4 0V2"/><path d="M8 2v20"/><path d="M18 22V2c-2.5 1.5-4 4.5-4 8v3h4"/>',
    saat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    motor: '<circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M8.5 17h6l-2.5-6H9"/><path d="M14 5h2.5l2 12"/><path d="M12 11h4.5"/>',
    para: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
    takvim: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    kalkan: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    kask: '<path d="M3 17a9 9 0 0 1 18 0v2H3v-2z"/><path d="M12 8v5h9"/>',
    konum: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    kullanici: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    ekip: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',
    grafik: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>',
    telefon: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    destek: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="14" width="5" height="6" rx="1.5"/><rect x="17" y="14" width="5" height="6" rx="1.5"/>',
    yildiz: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z"/>',
    belge: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    magaza: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9z"/><path d="M5 13v8h14v-8"/>',
    rota: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h8"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    whatsapp: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4l-4.5 1.1z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a5 5 0 0 1-2.8-2.8l.8-1-1-2-1.5 1z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    ok: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    kapat: '<path d="M6 6l12 12M18 6L6 18"/>',
    arti: '<path d="M12 5v14M5 12h14"/>',
    cop: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    kalem: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
    goz: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    yukari: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    asagi: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    indir: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    yukle: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>',
    panel: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
    gelen: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    liste: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    gorsel: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    soru: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
    ayar: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    cikis: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    dis: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    ara: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    yazi: '<path d="M4 6V4h16v2M12 4v16M9 20h6"/>',
    yazdir: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    uyari: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17.5v.01"/>',
    gecmis: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    hesap: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>',
    tirnak: '<path d="M7 17c-2 0-3-1.5-3-4 0-3 2-6 5-7l.5 1.5C7.5 8.5 7 10 7 11h3v6H7zM17 17c-2 0-3-1.5-3-4 0-3 2-6 5-7l.5 1.5c-2 1-2.5 2.5-2.5 3.5h3v6h-3z"/>',
    gonder: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    eczane: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
    sepet: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11.5l2-8H6.2"/>',
    cicek: '<circle cx="12" cy="7" r="3"/><path d="M12 10v11M12 16c-3 0-5-2-5-5M12 18c3 0 5-2 5-5"/>',
    bina: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/>'
  };
  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.paket) + '</svg>';
  }
  const ICON_CHOICES = ['paket', 'simsek', 'yemek', 'saat', 'motor', 'para', 'takvim', 'kalkan', 'kask', 'konum', 'kullanici', 'ekip', 'grafik', 'telefon', 'destek', 'yildiz', 'belge', 'magaza', 'rota', 'check', 'eczane', 'sepet', 'cicek', 'bina'];

  /* ---------- Paketle gelen görseller ---------- */
  const IMG = 'assets/img/';
  const BUNDLED_IMAGES = [
    ['logo.png', 'Logo (açık zemin)'], ['logo-koyu.png', 'Logo (koyu zemin)'], ['logo-kare.jpg', 'Logo ikon (kare)'],
    ['hero-kurye.jpg', 'Kurye - yolda'], ['kurye-canta.jpg', 'Kurye - çanta yakın'],
    ['canta1.jpg', 'Çanta 1'], ['canta2.jpg', 'Çanta 2'], ['canta3.jpg', 'Çanta 3'], ['canta4.jpg', 'Çanta 4'],
    ['canta5.jpg', 'Çanta 5'], ['canta6.jpg', 'Çanta 6'], ['canta-on.jpg', 'Çanta ön yüz'],
    ['sube-cephe.jpg', 'Şube cephe'], ['sube-cam.jpg', 'Şube cam giydirme'], ['sube-kapi.jpg', 'Şube kapı'],
    ['hizmet-banner1.jpg', 'Hizmet afişi 1'], ['hizmet-banner2.jpg', 'Hizmet afişi 2'],
    ['sticker-calisiyor.jpg', 'Sticker - Çalışıyor'], ['sticker-ortak.jpg', 'Sticker - İş Ortağı']
  ].map(([f, t]) => ({ src: IMG + f, title: t }));

  /* ---------- Varsayılan site içeriği ---------- */
  const DEFAULT_CONTENT = {
    texts: {
      site_title: 'Yakında Kurye — Zamanında Yanınızda',
      seo_title: 'Yakında Kurye | Ankara Kurye Hizmeti ve Kurye Alımı',
      slogan: 'Zamanında Yanınızda',
      top_note: 'İşletmelere kurye hizmeti, kuryelere iş fırsatı — online talep ve başvurularımız açık.',
      hero_badge: 'Restoran ve işletmeler için kurye hizmeti',
      hero_title: 'Zamanında',
      hero_title_highlight: 'Yanınızda',
      hero_text: 'Restoranınızın, marketinizin ya da mağazanızın teslimatlarını eğitimli ve sigortalı kuryelerimizle zamanında ulaştırıyoruz. Kurye olarak ekibimize katılmak isteyenlere ise düzenli kazanç sunuyoruz.',
      path_biz_label: 'İşletmeyim',
      path_biz_text: 'Restoranım / işletmem için kurye hizmeti almak istiyorum.',
      path_biz_btn: 'Kurye Talep Et',
      path_cour_label: 'Kuryeyim',
      path_cour_text: 'Yakında Kurye ekibine katılıp kazanmak istiyorum.',
      path_cour_btn: 'Kurye Ol',
      nav_cta_biz: 'Kurye Talep Et',
      nav_cta_cour: 'Kurye Ol',
      hero_chip1: 'Hızlı Teslimat',
      hero_chip2: '7/24 Operasyon',
      about_kicker: 'Hakkımızda',
      about_title: 'Teslimatı işimiz, zamanında olmayı ilkemiz bildik',
      about_text: 'Yakında Kurye; restoranlar, kafeler, marketler, eczaneler ve e-ticaret işletmeleri için şehir içi kurye hizmeti sunan bir kurye hizmet şirketidir. İşletmelerin kendi kurye kadrosunu kurma, yönetme ve maliyetini taşıma yükünü üstleniyor; doğru sayıda kuryeyi doğru saatte işletmenin kapısına getiriyoruz.\n\nKuryelerimizi ise ekibimizin en değerli parçası olarak görüyoruz: düzenli ödeme, sigorta, ekipman ve 7/24 operasyon desteğiyle güvenle çalışabilecekleri bir ortam sağlıyoruz.',
      about_mission_title: 'Misyonumuz',
      about_mission: 'İşletmelerin teslimatlarını hızlı, güvenli ve zamanında ulaştırarak müşterilerine verdikleri sözü tutmalarına yardımcı olmak.',
      about_vision_title: 'Vizyonumuz',
      about_vision: 'Hizmet verdiğimiz her şehirde işletmelerin ilk tercih ettiği, kuryelerin gururla çalıştığı kurye markası olmak.',
      about_values_title: 'Değerlerimiz',
      biz_zone_tag: 'Restoran · Market · Eczane · E-ticaret',
      biz_zone_title: 'İşletmeler İçin',
      biz_zone_text: 'Restoran, kafe, market, eczane ve e-ticaret işletmelerine özel kurye çözümleri',
      cour_zone_tag: 'Moto kurye · Tam / yarı zamanlı',
      cour_zone_title: 'Kuryeler İçin',
      cour_zone_text: 'Yakında Kurye ekibine katıl: düzenli kazanç, esnek vardiya ve tam destek',
      wa_label: 'WhatsApp ile yazın',
      services_kicker: 'Hizmetlerimiz',
      services_title: 'Her teslimat için doğru kurye',
      services_text: 'Paketten yemeğe, acil gönderilerden gün boyu hizmete kadar işletmenizin ihtiyacı olan tüm kurye çözümleri tek çatı altında.',
      business_kicker: 'Neden Yakında Kurye?',
      business_title: 'Kurye yükünü bize bırakın, siz işinize odaklanın',
      business_text: 'Kadrolu kurye maliyeti, motor bakımı, sigorta ve vardiya planlaması derdine son. İhtiyacınız kadar kuryeyi, ihtiyacınız olan saatlerde size sağlıyoruz.',
      business_cta: 'Ücretsiz Teklif Alın',
      sectors_title: 'Hizmet verdiğimiz sektörler',
      bizmodels_kicker: 'Çözümler',
      bizmodels_title: 'İşletmenize uygun hizmet modeli',
      bizmodels_text: 'Yoğunluğunuza ve bütçenize en uygun modeli birlikte belirleyelim.',
      bizsteps_kicker: 'Nasıl Çalışır?',
      bizsteps_title: '4 adımda kuryeniz kapınızda',
      bizform_kicker: 'Ücretsiz Teklif',
      bizform_title: 'İşletmeniz için kurye talep edin',
      bizform_text: 'Formu doldurun; ihtiyacınızı dinleyip size özel kurye planı ve fiyat teklifini en kısa sürede iletelim.',
      bizform_p1: 'Ücretsiz ihtiyaç analizi',
      bizform_p2: 'Size özel fiyat teklifi',
      bizform_p3: 'Hızlı kurulum, hızlı başlangıç',
      bizform_btn: 'Teklif İste',
      bizform_success_title: 'Talebiniz alındı!',
      bizform_success_text: 'Ekibimiz en kısa sürede sizi arayarak ihtiyaçlarınızı dinleyecek ve size özel teklifimizi iletecek.',
      courier_kicker: 'Kurye Ol',
      courier_title: 'Yakında Kurye ailesine katıl, kazancını kendin belirle',
      courier_text: 'Kendi motorunla ya da şirket motoruyla, tam zamanlı veya yarı zamanlı çalış. Haftalık ödeme, ekipman desteği ve 7/24 operasyon desteğiyle yanındayız.',
      courier_img_tag: 'Ekipman desteği',
      req_title: 'Başvuru şartları',
      req_btn: 'Kurye Başvurusu Yap',
      models_title: 'Çalışma modelleri',
      steps_title: 'Başvuru süreci nasıl işliyor?',
      calc_kicker: 'Kazanç Hesaplayıcı',
      calc_title: 'Ne kadar kazanabileceğini hesapla',
      calc_text: 'Günlük teslim edeceğin paket sayısını ve haftada kaç gün çalışacağını seç; tahmini kazancını hemen gör.',
      calc_note: 'Hesaplama tahminidir. Gerçek kazanç bölge, vardiya, prim ve paket yoğunluğuna göre değişir.',
      calc_btn: 'Hemen Başvur, Kazanmaya Başla',
      courform_kicker: 'Kurye Başvurusu',
      courform_title: 'Başvurunu 2 dakikada tamamla',
      courform_text: 'Formu doldur, ekibimiz en geç 48 saat içinde seninle iletişime geçsin.',
      courform_p1: '2 dakikada tamamlanır',
      courform_p2: '48 saat içinde dönüş',
      courform_p3: 'Bilgilerin KVKK ile korunur',
      courform_btn: 'Başvuruyu Gönder',
      courform_success_title: 'Başvurun alındı!',
      courform_success_text: 'Ekibimiz en kısa sürede seni arayacak. Başvuru numaranı not almayı unutma.',
      kvkk_text: 'Kişisel verilerimin 6698 sayılı KVKK kapsamında talebimin/başvurumun değerlendirilmesi amacıyla işlenmesini kabul ediyorum.',
      testimonials_kicker: 'Yorumlar',
      testimonials_title: 'Bizimle çalışanlar ne diyor?',
      refs_kicker: 'Referanslar',
      refs_title: 'Sahada Yakında Kurye',
      refs_text: 'Şubelerimizden, ekipmanlarımızdan ve iş ortaklarımızdan kareler.',
      regions_kicker: 'Hizmet Bölgeleri',
      regions_title: 'Hizmet verdiğimiz bölgeler',
      regions_text: 'Bölgeniz listede yoksa bize ulaşın; yeni bölgelerde açılış çalışmalarımız sürüyor.',
      faq_kicker: 'Sıkça Sorulan Sorular',
      faq_title: 'Merak edilenler',
      contact_kicker: 'İletişim',
      contact_title: 'Bize ulaşın',
      contact_text: 'Kurye hizmeti talebi, kurye başvurusu veya her türlü sorunuz için bize ulaşabilirsiniz.',
      footer_text: 'Yakında Kurye; restoran ve işletmelere hızlı, güvenli ve zamanında kurye hizmeti sunan, kuryelerine düzenli kazanç sağlayan kurye hizmet şirketidir.',
      seo_description: 'Ankara’da restoran, market ve işletmelere hızlı, sigortalı kurye hizmeti. Kurye olmak isteyenlere haftalık ödeme ve esnek çalışma. Teklif alın, başvurun.',
      mobile_cta1: 'Kurye Talep Et',
      mobile_cta2: 'Kurye Ol',
      kvkk_title: 'KVKK Aydınlatma Metni',
      kvkk_full: 'Veri sorumlusu sıfatıyla Yakında Kurye olarak; talep ve başvuru formları aracılığıyla paylaştığınız ad-soyad, iletişim, işletme, adres, doğum tarihi, ehliyet ve çalışma tercihi bilgilerinizi yalnızca talebinizin/başvurunuzun değerlendirilmesi, sizinle iletişime geçilmesi ve olası iş/hizmet ilişkisinin kurulması amacıyla, 6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 5. maddesinde belirtilen hukuki sebeplere dayanarak işlemekteyiz.\n\nKişisel verileriniz, yasal yükümlülükler ve yetkili kurumlar dışında üçüncü kişilerle paylaşılmaz; süreç sonuçlandıktan sonra mevzuatta öngörülen süre boyunca saklanır.\n\nKVKK’nın 11. maddesi kapsamındaki haklarınızı kullanmak için iletişim bölümündeki e-posta adresi üzerinden bize başvurabilirsiniz.'
    },
    images: {
      logo: IMG + 'logo.png',
      logo_dark: IMG + 'logo-koyu.png',
      hero: IMG + 'hero-kurye.jpg',
      about: IMG + 'sube-kapi.jpg',
      business: IMG + 'sube-cephe.jpg',
      business_sticker: IMG + 'sticker-calisiyor.jpg',
      bizform: IMG + 'sticker-ortak.jpg',
      courier: IMG + 'kurye-canta.jpg',
      calc: IMG + 'canta6.jpg',
      courform: IMG + 'canta5.jpg',
      contact: IMG + 'sube-cam.jpg',
      og: ''
    },
    settings: {
      phone: '0850 000 00 00',
      whatsapp: '905000000000',
      email: 'info@yakindakurye.com',
      address: 'Örnek Mah. Örnek Cad. No:10/A, Ankara',
      hours: 'Operasyon: 7/24 · Ofis: Hafta içi 09:00 – 18:00',
      instagram: '',
      facebook: '',
      linkedin: '',
      map_embed: '',
      notify_key: '',
      wa_forward: true,
      site_url: '',
      seo_keywords: 'kurye, moto kurye, restoran kuryesi, paket servis kurye, kurye hizmeti, kurye iş ilanı, kurye alımı, Ankara kurye',
      city: 'Ankara',
      district: '',
      postal: '',
      geo_lat: '',
      geo_lng: '',
      opening_hours: 'Mo-Su 00:00-23:59',
      price_range: '',
      gsc_verify: '',
      ga_id: '',
      noindex: false,
      job_enabled: true,
      job_title: 'Moto Kurye',
      job_salary: '',
      job_posted: ''
    },
    stats: [
      { value: '7/24', label: 'Kesintisiz operasyon' },
      { value: '30 dk', label: 'Hedef teslim süresi' },
      { value: '%100', label: 'Sigortalı kurye' },
      { value: 'Esnek', label: 'İhtiyaca göre kurye sayısı' }
    ],
    values: [
      { icon: 'saat', title: 'Zamanında', desc: 'Her teslimatı söz verdiğimiz sürede ulaştırırız.' },
      { icon: 'kalkan', title: 'Güvenli', desc: 'Eğitimli, sigortalı kuryeler ve kayıt altında operasyon.' },
      { icon: 'destek', title: 'Ulaşılabilir', desc: '7/24 operasyon ekibimizle işletmelerimizin ve kuryelerimizin yanındayız.' },
      { icon: 'ekip', title: 'Adil', desc: 'Kuryelerimize düzenli ödeme ve şeffaf hakediş.' }
    ],
    services: [
      { icon: 'paket', title: 'Paket Teslimatı', desc: 'Şehir içi evrak, koli ve paket gönderilerinizi aynı gün güvenle teslim ediyoruz.' },
      { icon: 'simsek', title: 'Acil Teslimat', desc: 'Bekleyemeyecek gönderiler için en yakın kuryeyi hemen yönlendiriyoruz.' },
      { icon: 'yemek', title: 'Yemek Teslimatı', desc: 'Restoran ve kafeler için sıcak ve zamanında servis; yoğun saatlerde ek kurye desteği.' },
      { icon: 'saat', title: '7/24 Hizmet', desc: 'Gece gündüz, hafta sonu ve bayram demeden kesintisiz operasyon.' }
    ],
    businessBenefits: [
      { icon: 'para', title: 'Sabit maliyet yok', desc: 'Maaş, SGK, motor ve bakım giderleriyle uğraşmazsınız.' },
      { icon: 'ekip', title: 'Esnek kurye sayısı', desc: 'Yoğun saatlerde kurye sayısını artırır, sakin saatlerde azaltırız.' },
      { icon: 'kalkan', title: 'Sigortalı ve eğitimli', desc: 'Kuryelerimiz eğitimli, sigortalı ve markanızı temsil edecek donanımda.' },
      { icon: 'grafik', title: 'Raporlama', desc: 'Teslimat ve vardiya raporlarıyla hizmeti şeffaf şekilde takip edin.' }
    ],
    sectors: [
      { icon: 'yemek', title: 'Restoran & Kafe' }, { icon: 'magaza', title: 'Market' }, { icon: 'eczane', title: 'Eczane' },
      { icon: 'sepet', title: 'E-ticaret' }, { icon: 'cicek', title: 'Çiçekçi' }, { icon: 'belge', title: 'Kurumsal / Evrak' }
    ],
    bizModels: [
      { icon: 'paket', title: 'Paket Başı', desc: 'Yalnızca teslim edilen paket kadar ödeyin. Yoğunluğu değişken işletmeler için ideal.', tag: '' },
      { icon: 'saat', title: 'Vardiyalı / Saatlik', desc: 'Yoğun saatlerinizde belirlediğiniz sayıda kurye işletmenizde hazır bekler.', tag: 'En çok tercih edilen' },
      { icon: 'ekip', title: 'İşletmeye Özel Kurye', desc: 'Size atanmış, işletmenizi ve müşterilerinizi tanıyan sabit kurye ekibi.', tag: '' }
    ],
    bizSteps: [
      { title: 'Talep oluşturun', desc: 'Formu doldurun veya bizi arayın.' },
      { title: 'İhtiyaç analizi', desc: 'Yoğun saatlerinizi ve paket hacminizi birlikte inceleyelim.' },
      { title: 'Size özel teklif', desc: 'Uygun modeli ve fiyat teklifimizi iletelim.' },
      { title: 'Kuryeleriniz hazır', desc: 'Anlaştığımız gün kuryeleriniz kapınızda.' }
    ],
    courierBenefits: [
      { icon: 'para', title: 'Haftalık ödeme', desc: 'Kazancın her hafta düzenli olarak hesabına yatar.' },
      { icon: 'takvim', title: 'Esnek çalışma', desc: 'Tam zamanlı, yarı zamanlı ya da hafta sonu; sana uyan vardiyayı seç.' },
      { icon: 'motor', title: 'Motorlu / motorsuz', desc: 'Kendi motorunla çalış ya da şirket motoru desteğinden yararlan.' },
      { icon: 'kalkan', title: 'Sigorta güvencesi', desc: 'Tüm kuryelerimiz sigortalı olarak güvenle çalışır.' },
      { icon: 'kask', title: 'Ekipman desteği', desc: 'Kask, mont, termal çanta ve telefon tutucu ile sahaya hazır çık.' },
      { icon: 'destek', title: '7/24 destek', desc: 'Sahada yalnız değilsin; operasyon ekibimiz her an ulaşılabilir.' }
    ],
    requirements: [
      '18 yaşını doldurmuş olmak',
      'A1, A2 veya A sınıfı motosiklet ehliyetine sahip olmak',
      'Akıllı telefon kullanabilmek',
      'Adli sicil kaydının temiz olması',
      'Tercihen bölgeyi iyi tanımak'
    ],
    workModels: [
      { title: 'Tam Zamanlı', hours: 'Haftada 6 gün · Vardiyalı', desc: 'Düzenli ve yüksek kazanç isteyenler için.', tag: 'En çok tercih edilen' },
      { title: 'Yarı Zamanlı', hours: 'Akşam 18:00 – 24:00', desc: 'Ek gelir arayan, gündüz başka işte çalışanlar için.', tag: '' },
      { title: 'Hafta Sonu', hours: 'Cumartesi – Pazar', desc: 'Öğrenciler ve hafta sonu çalışmak isteyenler için.', tag: '' }
    ],
    steps: [
      { title: 'Online başvur', desc: 'Formu doldur, başvuru numaranı al.' },
      { title: 'Ön görüşme', desc: 'Ekibimiz seni arar, kısa bir görüşme yapar.' },
      { title: 'Evrak teslimi', desc: 'Ehliyet, kimlik ve gerekli belgeleri teslim et.' },
      { title: 'Eğitim & ekipman', desc: 'Kısa oryantasyon ve ekipman teslimi.' },
      { title: 'Yola çık', desc: 'İlk vardiyanla kazanmaya başla.' }
    ],
    gallery: [
      { src: IMG + 'sube-cephe.jpg', title: 'Şube cephe giydirme' },
      { src: IMG + 'hero-kurye.jpg', title: 'Sahada kuryemiz' },
      { src: IMG + 'canta5.jpg', title: 'Termal kurye çantası' },
      { src: IMG + 'sticker-ortak.jpg', title: 'İş ortağı sticker' },
      { src: IMG + 'sube-kapi.jpg', title: 'Şube giriş' },
      { src: IMG + 'hizmet-banner2.jpg', title: 'Hizmet afişi' },
      { src: IMG + 'kurye-canta.jpg', title: 'Kurye ekipmanı' },
      { src: IMG + 'sticker-calisiyor.jpg', title: 'İşletme sticker' }
    ],
    marquee: ['Restoran Kuryesi', 'Paket Teslimatı', 'Acil Teslimat', 'Yemek Teslimatı', 'Market & Eczane', 'E-ticaret Teslimatı', '7/24 Hizmet', 'Sigortalı Kurye'],
    testimonials: [],
    regions: [],
    calc: { perPackage: 40, minPackages: 5, maxPackages: 60, defPackages: 25, defDays: 6, configured: false },
    sections: { marquee: true, stats: true, about: true, services: true, business: true, bizSolutions: true, bizSteps: true, bizForm: true, courier: true, calc: true, courForm: true, testimonials: true, refs: true, regions: true, faq: true, contact: true },
    formOptions: {},
    reviewed: {},
    faq: [
      { cat: 'isletme', q: 'Fiyatlandırma nasıl yapılıyor?', a: 'Paket başı, vardiyalı/saatlik veya işletmeye özel kurye modellerinden size uygun olanı birlikte belirliyoruz. Talep formunu doldurmanız hâlinde size özel teklif hazırlıyoruz.' },
      { cat: 'isletme', q: 'İşletmem için kaç kurye alabilirim?', a: 'İhtiyacınıza göre tek kuryeden tam ekibe kadar esnek planlama yapıyoruz. Yoğun saatlerde kurye sayısını artırıp sakin saatlerde azaltabiliyoruz.' },
      { cat: 'isletme', q: 'Kuryelerin maaş, SGK ve motor masrafları kime ait?', a: 'Kuryelerin istihdamı, sigortası, ekipmanı ve operasyonu bize aittir. Siz yalnızca anlaştığımız hizmet bedelini ödersiniz.' },
      { cat: 'isletme', q: 'Ne kadar sürede başlayabiliriz?', a: 'Talebinizin ardından ihtiyaç analizini yapıp teklifimizi iletiyoruz; anlaştığımızda başlangıç tarihini birlikte belirliyoruz.' },
      { cat: 'isletme', q: 'Hangi bölgelerde hizmet veriyorsunuz?', a: 'Güncel hizmet bölgelerimiz için bizimle iletişime geçebilirsiniz. Yeni bölgelerde açılış çalışmalarımız sürüyor.' },
      { cat: 'kurye', q: 'Kurye olmak için kendi motorumun olması gerekir mi?', a: 'Hayır. Kendi motorun varsa onunla çalışabilirsin; yoksa şirket motoru desteğimizden yararlanabilirsin. Başvuru formunda tercihini belirtmen yeterli.' },
      { cat: 'kurye', q: 'Ödemeler ne zaman yapılıyor?', a: 'Kurye ödemeleri haftalık olarak, her hafta belirlenen gün banka hesabına yatırılır.' },
      { cat: 'kurye', q: 'Yarı zamanlı çalışabilir miyim?', a: 'Evet. Akşam vardiyası ve hafta sonu vardiyası seçeneklerimiz bulunuyor.' },
      { cat: 'kurye', q: 'Başvurum ne zaman sonuçlanır?', a: 'Başvurular genellikle 48 saat içinde değerlendirilir ve ekibimiz seni telefonla arar.' }
    ]
  };

  // Önceki sürümün varsayılanları: kullanıcı bunları değiştirmediyse yeni varsayılanlar kullanılır
  const OLD_DEFAULTS = {
    texts: {
      top_note: 'Yeni şubemiz açıldı! Kurye ve işletme başvurularını online alıyoruz.',
      hero_badge: 'Kurye alımlarımız devam ediyor',
      hero_text: 'Yakında Kurye; işletmelere hızlı, güvenli ve esnek kurye hizmeti sunan, kuryelerine ise düzenli kazanç ve esnek çalışma imkânı sağlayan yeni nesil kurye platformudur.',
      hero_chip1: 'Haftalık Ödeme',
      business_kicker: 'İşletmeler İçin',
      business_cta: 'İşletme Başvurusu Yap',
      kvkk_text: 'Kişisel verilerimin 6698 sayılı KVKK kapsamında başvurumun değerlendirilmesi amacıyla işlenmesini kabul ediyorum.',
      contact_text: 'Kurye başvurusu, işletme iş birliği veya her türlü sorunuz için bize ulaşabilirsiniz.',
      footer_text: 'Yakında Kurye, işletmeler ile kuryeleri buluşturan; hızlı, güvenli ve zamanında teslimatı ilke edinen kurye hizmet platformudur.',
      seo_description: 'Yakında Kurye: işletmelere hızlı, güvenli ve esnek kurye hizmeti; kuryelere haftalık ödeme ve esnek çalışma. Online kurye ve işletme başvurusu.',
      mobile_cta1: 'Kurye Ol',
      mobile_cta2: 'İşletme Başvurusu',
      kvkk_full: 'Veri sorumlusu sıfatıyla Yakında Kurye olarak; başvuru formu aracılığıyla paylaştığınız ad-soyad, iletişim, doğum tarihi, adres, ehliyet ve çalışma tercihi bilgilerinizi yalnızca başvurunuzun değerlendirilmesi, sizinle iletişime geçilmesi ve olası iş/hizmet ilişkisinin kurulması amacıyla, 6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 5. maddesinde belirtilen hukuki sebeplere dayanarak işlemekteyiz.\n\nKişisel verileriniz, yasal yükümlülükler ve yetkili kurumlar dışında üçüncü kişilerle paylaşılmaz; başvurunuz sonuçlandıktan sonra mevzuatta öngörülen süre boyunca saklanır.\n\nKVKK’nın 11. maddesi kapsamındaki haklarınızı kullanmak için iletişim bölümündeki e-posta adresi üzerinden bize başvurabilirsiniz.'
    },
    arrays: {
      stats: [{ value: '7/24', label: 'Kesintisiz operasyon' }, { value: 'Haftalık', label: 'Düzenli kurye ödemesi' }, { value: '30 dk', label: 'Hedef teslim süresi' }, { value: '%100', label: 'Sigortalı kurye' }],
      marquee: ['Paket Teslimatı', 'Acil Teslimat', 'Yemek Teslimatı', '7/24 Hizmet', 'Haftalık Ödeme', 'Sigortalı Kurye', 'Esnek Çalışma'],
      faq: [
        { q: 'Kurye olmak için kendi motorumun olması gerekir mi?', a: 'Hayır. Kendi motorun varsa onunla çalışabilirsin; yoksa şirket motoru desteğimizden yararlanabilirsin. Başvuru formunda tercihini belirtmen yeterli.' },
        { q: 'Ödemeler ne zaman yapılıyor?', a: 'Kurye ödemeleri haftalık olarak, her hafta belirlenen gün banka hesabına yatırılır.' },
        { q: 'Yarı zamanlı çalışabilir miyim?', a: 'Evet. Akşam vardiyası ve hafta sonu vardiyası seçeneklerimiz bulunuyor.' },
        { q: 'Başvurum ne zaman sonuçlanır?', a: 'Başvurular genellikle 48 saat içinde değerlendirilir ve ekibimiz seni telefonla arar.' },
        { q: 'İşletmem için kaç kurye alabilirim?', a: 'İhtiyacınıza göre tek kuryeden tam ekibe kadar esnek planlama yapıyoruz. İşletme başvurusu formunu doldurun, size özel teklif hazırlayalım.' },
        { q: 'Hangi bölgelerde hizmet veriyorsunuz?', a: 'Güncel hizmet bölgelerimiz için bizimle iletişime geçebilirsiniz. Yeni bölgelerde açılış çalışmalarımız sürüyor.' }
      ]
    }
  };

  /* ---------- Form tanımları (site ve admin ortak) ---------- */
  const ILLER = ['Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'];

  const FORMS = {
    kurye: {
      label: 'Kurye Başvurusu',
      fields: [
        { name: 'adSoyad', label: 'Ad Soyad', type: 'text', required: true, auto: 'name' },
        { name: 'telefon', label: 'Telefon', type: 'tel', required: true, placeholder: '05xx xxx xx xx' },
        { name: 'eposta', label: 'E-posta', type: 'email' },
        { name: 'dogumTarihi', label: 'Doğum Tarihi', type: 'date', required: true },
        { name: 'il', label: 'İl', type: 'select', options: ILLER, required: true, def: 'Ankara' },
        { name: 'ilce', label: 'İlçe', type: 'text', required: true },
        { name: 'ehliyet', label: 'Ehliyet Sınıfı', type: 'select', options: ['A1', 'A2', 'A', 'B', 'Ehliyetim yok'], required: true },
        { name: 'motor', label: 'Motor Durumu', type: 'select', options: ['Kendi motorum var', 'Motorum yok – şirket motoru istiyorum'], required: true },
        { name: 'calismaModeli', label: 'Çalışma Tercihi', type: 'select', options: ['Tam zamanlı', 'Yarı zamanlı (akşam)', 'Hafta sonu'], required: true },
        { name: 'deneyim', label: 'Kuryelik Deneyimi', type: 'select', options: ['Deneyimim yok', '1 yıldan az', '1 – 3 yıl', '3 yıldan fazla'] },
        { name: 'kaynak', label: 'Bizi nereden duydunuz?', type: 'select', options: ['Sosyal medya', 'Arkadaş tavsiyesi', 'İlan sitesi', 'Şube / sticker', 'Diğer'] },
        { name: 'mesaj', label: 'Eklemek istedikleriniz', type: 'textarea', full: true }
      ]
    },
    isletme: {
      label: 'İşletme Talebi',
      fields: [
        { name: 'isletmeAdi', label: 'İşletme Adı', type: 'text', required: true },
        { name: 'sektor', label: 'Sektör', type: 'select', options: ['Restoran / Kafe', 'Market', 'Eczane', 'E-ticaret', 'Çiçekçi', 'Diğer'], required: true },
        { name: 'yetkili', label: 'Yetkili Ad Soyad', type: 'text', required: true, auto: 'name' },
        { name: 'telefon', label: 'Telefon', type: 'tel', required: true, placeholder: '05xx xxx xx xx' },
        { name: 'eposta', label: 'E-posta', type: 'email' },
        { name: 'il', label: 'İl', type: 'select', options: ILLER, required: true, def: 'Ankara' },
        { name: 'ilce', label: 'İlçe', type: 'text', required: true },
        { name: 'gunlukPaket', label: 'Günlük Tahmini Paket', type: 'select', options: ['0 – 20', '20 – 50', '50 – 100', '100+'], required: true },
        { name: 'kuryeSayisi', label: 'İhtiyaç Duyulan Kurye', type: 'number', placeholder: 'Örn. 2' },
        { name: 'calismaSaatleri', label: 'Çalışma Saatleri', type: 'text', placeholder: 'Örn. 10:00 – 23:00' },
        { name: 'hizmetModeli', label: 'Tercih Edilen Hizmet Modeli', type: 'select', options: ['Paket başı', 'Vardiyalı / saatlik', 'İşletmeye özel kurye', 'Bilmiyorum – önerin'] },
        { name: 'baslangic', label: 'Ne Zaman Başlamak İstersiniz?', type: 'select', options: ['Hemen', '1 hafta içinde', '1 ay içinde', 'Sadece bilgi almak istiyorum'] },
        { name: 'adres', label: 'Adres', type: 'textarea', full: true },
        { name: 'mesaj', label: 'Notunuz', type: 'textarea', full: true }
      ]
    }
  };

  const APP_STATUSES = [
    { key: 'yeni', label: 'Yeni', color: '#2563eb' },
    { key: 'inceleniyor', label: 'İnceleniyor', color: '#d97706' },
    { key: 'gorusme', label: 'Görüşme', color: '#7c3aed' },
    { key: 'onaylandi', label: 'Onaylandı', color: '#16a34a' },
    { key: 'reddedildi', label: 'Reddedildi', color: '#dc2626' }
  ];

  const EMP_FIELDS = [
    { name: 'adSoyad', label: 'Ad Soyad', type: 'text', required: true },
    { name: 'tc', label: 'T.C. Kimlik No', type: 'text', maxlength: 11 },
    { name: 'telefon', label: 'Telefon', type: 'tel', required: true },
    { name: 'eposta', label: 'E-posta', type: 'email' },
    { name: 'dogumTarihi', label: 'Doğum Tarihi', type: 'date' },
    { name: 'gorev', label: 'Görev', type: 'select', options: ['Moto Kurye', 'Araçlı Kurye', 'Operasyon', 'Ofis', 'Yönetici'], def: 'Moto Kurye' },
    { name: 'calismaModeli', label: 'Çalışma Modeli', type: 'select', options: ['Tam zamanlı', 'Yarı zamanlı (akşam)', 'Hafta sonu'] },
    { name: 'durum', label: 'Durum', type: 'select', options: ['Aktif', 'İzinli', 'Pasif', 'Ayrıldı'], def: 'Aktif' },
    { name: 'baslangic', label: 'İşe Başlama', type: 'date' },
    { name: 'musteriId', label: 'Çalıştığı İşletme', type: 'customer' },
    { name: 'bolge', label: 'Bölge', type: 'text' },
    { name: 'il', label: 'İl', type: 'select', options: ILLER, def: 'Ankara' },
    { name: 'ilce', label: 'İlçe', type: 'text' },
    { name: 'ehliyet', label: 'Ehliyet', type: 'select', options: ['A1', 'A2', 'A', 'B', 'Yok'] },
    { name: 'motor', label: 'Motor', type: 'select', options: ['Kendi motoru', 'Şirket motoru', 'Yok'] },
    { name: 'plaka', label: 'Plaka', type: 'text' },
    { name: 'ehliyetBitis', label: 'Ehliyet Geçerlilik Bitişi', type: 'date' },
    { name: 'sigortaBitis', label: 'Motor Sigorta Bitişi', type: 'date' },
    { name: 'muayeneBitis', label: 'Motor Muayene Bitişi', type: 'date' },
    { name: 'ekipman', label: 'Teslim Edilen Ekipman', type: 'text', placeholder: 'Çanta, kask, mont…' },
    { name: 'iban', label: 'IBAN', type: 'text' },
    { name: 'acilKisi', label: 'Acil Durum Kişisi', type: 'text' },
    { name: 'acilTelefon', label: 'Acil Durum Telefonu', type: 'tel' },
    { name: 'adres', label: 'Adres', type: 'textarea', full: true },
    { name: 'notlar', label: 'Notlar', type: 'textarea', full: true }
  ];

  const EMP_DOCS = ['Kimlik fotokopisi', 'Ehliyet fotokopisi', 'Adli sicil kaydı', 'İkametgâh', 'Sağlık raporu', 'Diploma', 'SGK girişi', 'Sözleşme', 'Ekipman zimmet tutanağı'];
  const CUST_STATUSES = ['Aktif', 'Deneme', 'Pasif', 'Ayrıldı'];
  const CUST_FIELDS = [
    { name: 'isletmeAdi', label: 'İşletme Adı', type: 'text', required: true },
    { name: 'sektor', label: 'Sektör', type: 'select', options: ['Restoran / Kafe', 'Market', 'Eczane', 'E-ticaret', 'Çiçekçi', 'Kurumsal', 'Diğer'] },
    { name: 'yetkili', label: 'Yetkili Ad Soyad', type: 'text', required: true },
    { name: 'telefon', label: 'Telefon', type: 'tel', required: true },
    { name: 'eposta', label: 'E-posta', type: 'email' },
    { name: 'durum', label: 'Durum', type: 'select', options: CUST_STATUSES, def: 'Aktif' },
    { name: 'hizmetModeli', label: 'Hizmet Modeli', type: 'select', options: ['Paket başı', 'Vardiyalı / saatlik', 'İşletmeye özel kurye', 'Belirlenmedi'] },
    { name: 'baslangic', label: 'Hizmet Başlangıcı', type: 'date' },
    { name: 'kuryeSayisi', label: 'Anlaşılan Kurye Sayısı', type: 'number' },
    { name: 'calismaSaatleri', label: 'Hizmet Saatleri', type: 'text', placeholder: 'Örn. 11:00 – 23:00' },
    { name: 'ucret', label: 'Anlaşılan Ücret / Koşullar', type: 'text', placeholder: 'Örn. paket başı … ₺' },
    { name: 'odemeGunu', label: 'Fatura / Ödeme Günü', type: 'text', placeholder: 'Örn. her ayın 5’i' },
    { name: 'vergi', label: 'Vergi Dairesi / No', type: 'text' },
    { name: 'il', label: 'İl', type: 'select', options: ILLER, def: 'Ankara' },
    { name: 'ilce', label: 'İlçe', type: 'text' },
    { name: 'adres', label: 'Adres', type: 'textarea', full: true },
    { name: 'notlar', label: 'Notlar', type: 'textarea', full: true }
  ];
  const EXPIRY_FIELDS = [['ehliyetBitis', 'Ehliyet'], ['sigortaBitis', 'Motor sigortası'], ['muayeneBitis', 'Motor muayenesi']];

  const RECORD_TYPES = [
    { key: 'Vardiya', sign: 0 }, { key: 'Hakediş', sign: 1 }, { key: 'Prim', sign: 1 },
    { key: 'Ödeme', sign: 0 }, { key: 'Avans', sign: 0 }, { key: 'Kesinti', sign: -1 },
    { key: 'İzin', sign: 0 }, { key: 'Kaza / Hasar', sign: 0 }, { key: 'Uyarı', sign: 0 }, { key: 'Not', sign: 0 }
  ];

  /* ---------- Depolama ---------- */
  const KEYS = { content: 'yk_content', applications: 'yk_applications', employees: 'yk_employees', customers: 'yk_customers', records: 'yk_records', auth: 'yk_auth', log: 'yk_log', server: 'yk_server' };
  // Sunucu modunda sunucuyla eşitlenen anahtarlar → sunucudaki karşılıkları
  const SYNC = { yk_applications: 'applications', yk_employees: 'employees', yk_customers: 'customers', yk_records: 'records', yk_log: 'log', yk_content: 'draft', yk_server: 'settings' };
  const LIST_COLLS = ['applications', 'employees', 'customers', 'records'];
  const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  const remote = { on: false, setup: false, logged: false, user: '', error: '', mail: false, publishedAt: '', problem: '' };
  const mem = {};

  function load(key, def) {
    if (remote.on && SYNC[key]) return mem[key] == null ? clone(def) : clone(mem[key]);
    const v = ls.get(key);
    return v == null ? clone(def) : v;
  }
  function save(key, val) {
    if (remote.on && SYNC[key]) { queue(key, val); return true; }
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { alert('Veri kaydedilemedi. Tarayıcı depolama alanı dolmuş veya engellenmiş olabilir.'); return false; }
  }

  /* ---------- Sunucu bağlantısı ---------- */
  const API = 'api/index.php';
  const emit = (name, detail) => { try { window.dispatchEvent(new CustomEvent('yk:' + name, { detail: detail || {} })); } catch (e) {} };
  // e.absent = bu adreste sunucu (PHP) yok: dosyadan açma veya statik hosting → yerel mod
  // e.offline = sunucudan geçerli yanıt alınamadı (bağlantı kopması, güvenlik duvarı, çökme)
  // e.status = HTTP kodu
  function api(action, body) {
    if (location.protocol === 'file:') { const e = new Error('Sunucu yok'); e.offline = e.absent = true; return Promise.reject(e); }
    const o = { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'X-YK': '1', Accept: 'application/json' } };
    if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(API + '?a=' + action, o).then(r => r.text().then(t => {
      let j = null; try { j = JSON.parse(t); } catch (e) {}
      if (!j || typeof j !== 'object') {
        const e = new Error(r.status >= 500 ? 'Sunucuda teknik bir sorun oluştu.' : 'Sunucudan geçerli yanıt alınamadı.'); e.offline = true; e.status = r.status;
        // Statik hostingler PHP dosyasını bulamaz (404), POST'u desteklemez (405/501) ya da dosyayı düz metin olarak verir (200)
        e.absent = [404, 405, 501].indexOf(r.status) >= 0 || r.status === 200;
        throw e;
      }
      if (!r.ok || j.ok === false) {
        const e = new Error(j.error || ('Sunucu hatası (' + r.status + ')')); e.status = r.status; e.code = j.code || ''; e.data = j;
        if (r.status === 401 && remote.logged) { remote.logged = false; emit('auth'); }
        throw e;
      }
      return j;
    }), () => { const e = new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'); e.offline = true; e.network = true; throw e; });
  }

  // Bekleyen değişiklikler sırayla sunucuya gönderilir; hata olursa tekrar denenir
  const ops = [];
  let busy = false, retryT = null, dropped = 0;
  function queue(key, val) {
    const coll = SYNC[key], prev = mem[key];
    mem[key] = clone(val);
    if (key === KEYS.content) ls.set('yk_preview', val);
    let op;
    if (LIST_COLLS.indexOf(coll) >= 0) {
      const pm = {}; (prev || []).forEach(x => { if (x && x.id) pm[x.id] = JSON.stringify(x); });
      const ids = {}; (val || []).forEach(x => { if (x && x.id) ids[x.id] = 1; });
      const upsert = (val || []).filter(x => x && x.id && pm[x.id] !== JSON.stringify(x));
      const del = Object.keys(pm).filter(id => !ids[id]);
      if (!upsert.length && !del.length) return;
      op = { coll: coll, upsert: upsert, delete: del };
    } else if (coll === 'log') {
      const known = {}; (prev || []).forEach(x => { known[x.t + '|' + x.text] = 1; });
      const append = (val || []).filter(x => x && !known[x.t + '|' + x.text]);
      if (!append.length) return;
      op = { coll: 'log', append: append };
    } else {
      for (let i = ops.length - 1; i > 0; i--) if (ops[i].coll === coll && 'value' in ops[i]) ops.splice(i, 1);
      op = { coll: coll, value: val };
    }
    ops.push(op); emit('sync', syncState()); flush();
  }
  function syncState() { return { pending: ops.length, error: remote.error }; }
  function flush() {
    if (busy || !ops.length || !remote.logged) return;
    busy = true; clearTimeout(retryT);
    api('sync', ops[0]).then(() => {
      ops.shift(); busy = false; remote.error = ''; emit('sync', syncState()); flush();
    }, e => {
      busy = false;
      // Sunucunun açıkça reddettiği (JSON hata yanıtı) değişiklik sıradan çıkarılır; diğer hatalar tekrar denenir
      if (!e.offline && e.status >= 400 && e.status < 500 && [401, 408, 429].indexOf(e.status) < 0) { ops.shift(); dropped++; remote.error = 'Bir değişiklik kaydedilemedi: ' + e.message; emit('sync', syncState()); flush(); return; }
      remote.error = e.status === 401 ? 'Oturum kapandı' : 'Sunucuya kaydedilemedi, tekrar deneniyor…';
      emit('sync', syncState());
      if (e.status !== 401) retryT = setTimeout(flush, 6000);
    });
  }

  function applyPull(j) {
    LIST_COLLS.forEach(c => { if (Array.isArray(j[c])) mem['yk_' + c] = j[c]; });
    if ('log' in j) mem[KEYS.log] = Array.isArray(j.log) ? j.log : [];
    if ('draft' in j) { mem[KEYS.content] = j.draft || null; if (j.draft) ls.set('yk_preview', j.draft); else ls.del('yk_preview'); }
    if ('settings' in j) mem[KEYS.server] = j.settings || {};
    if (j.published && typeof j.published === 'object') window.YK_PUBLISHED = j.published;
    if ('mail' in j) remote.mail = !!j.mail;
  }
  // Yeni başvuruları kontrol eder: 30 sn'de bir ve sekmeye geri dönüldüğünde
  let pollT = null, lastPoll = 0;
  function pollNow() {
    if (!remote.logged || Date.now() - lastPoll < 3000) return;
    lastPoll = Date.now();
    api('pull&only=applications').then(j => {
      if (ops.some(o => o.coll === 'applications')) return;
      const before = JSON.stringify(mem[KEYS.applications] || []);
      if (Array.isArray(j.applications) && JSON.stringify(j.applications) !== before) { mem[KEYS.applications] = j.applications; emit('remote', { key: KEYS.applications }); }
    }).catch(() => {});
  }
  function poll() {
    clearInterval(pollT); lastPoll = Date.now();
    pollT = setInterval(() => { if (!document.hidden) pollNow(); }, 30000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && remote.on) pollNow(); });
  window.addEventListener('focus', () => { if (remote.on) pollNow(); });

  const server = {
    // Sunucu var mı? Varsa durumunu döndürür, yoksa null.
    connect() {
      return api('status').then(j => {
        remote.on = true; remote.setup = !!j.setup; remote.logged = !!j.logged; remote.user = j.user || '';
        ls.set('yk_mode', 'server');
        return j;
      }, e => {
        // Sunucu var ama yanlış yapılandırılmış (ör. api/data klasörüne yazma izni yok)
        if (!e.absent) remote.problem = e.network ? 'Sunucuya ulaşılamadı; internet bağlantınızı kontrol edip sayfayı yenileyin.' : e.message;
        return null;
      });
    },
    // Önce bekleyen değişiklikler gönderilir, sonra sunucudaki güncel veri alınır
    pull() {
      const before = ops.length ? (flush(), waitSync().catch(() => {})) : Promise.resolve();
      return before.then(() => api('pull')).then(j => { applyPull(j); poll(); return j; });
    },
    setupAdmin(user, pass, code) { return api('setup', { user: user, pass: pass, code: code || '' }).then(j => { remote.setup = false; remote.logged = true; remote.user = j.user; return j; }); },
    login(user, pass) { return api('login', { user: user, pass: pass }).then(j => { remote.logged = true; remote.user = j.user; return j; }); },
    logout() { clearInterval(pollT); return api('logout', {}).catch(() => {}).then(() => { remote.logged = false; LIST_COLLS.forEach(c => { delete mem['yk_' + c]; }); }); },
    password(user, old, pass) { return api('password', { user: user, old: old, pass: pass }).then(j => { remote.user = j.user; return j; }); },
    publish(content) {
      const c = clone(content);
      return api('publish', { content: c }).then(j => { delete c.reviewed; window.YK_PUBLISHED = c; mem[KEYS.content] = clone(content); ls.set('yk_preview', content); remote.publishedAt = j.at; return j; });
    },
    refresh: pollNow,
    hasDraft: () => !!mem[KEYS.content],
    pending: () => ops.length,
    state: syncState,
    retry: flush,
    // Bu tarayıcıda yerel modda kaydedilmiş veri var mı?
    localData() {
      const n = {}; let any = false;
      LIST_COLLS.forEach(c => { const v = ls.get('yk_' + c); n[c] = Array.isArray(v) ? v.length : 0; if (n[c]) any = true; });
      n.content = !!ls.get(KEYS.content); if (n.content) any = true;
      return any ? n : null;
    },
    // Yerel verileri sunucudakilere ekler (aynı kayıtlar güncellenir), sonra yereli temizler.
    // useLocalContent: sunucuda da taslak varsa yerel site içeriği taslağı onun yerine geçsin mi?
    // Herhangi bir görsel yüklenemez ya da değişiklik reddedilirse yerel kopya silinmez.
    migrateLocal(useLocalContent) {
      const local = { content: ls.get(KEYS.content), log: ls.get(KEYS.log) || [] };
      LIST_COLLS.forEach(c => { local[c] = ls.get('yk_' + c) || []; });
      return localMedia().then(items => uploadMedia(items)).then(map => {
        if (map.failed) throw new Error(map.failed + ' görsel sunucuya yüklenemedi; yerel veriler silinmedi. Tekrar deneyin.');
        const fix = o => rewriteMedia(o, map);
        LIST_COLLS.forEach(c => {
          const cur = load('yk_' + c, []), byId = {}; cur.forEach((x, i) => { byId[x.id] = i; });
          fix(local[c]).forEach(x => { if (x && x.id) { if (x.id in byId) cur[byId[x.id]] = x; else cur.push(x); } });
          if (c === 'applications') cur.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
          save('yk_' + c, cur);
        });
        if (local.content && (!mem[KEYS.content] || useLocalContent)) save(KEYS.content, fix(local.content));
        log('Bu tarayıcıdaki yerel veriler sunucuya aktarıldı');
        return waitSync();
      }).then(() => server.clearLocal());
    },
    clearLocal() {
      LIST_COLLS.forEach(c => ls.del('yk_' + c));
      [KEYS.content, KEYS.log, KEYS.auth].forEach(ls.del);
      try { Object.keys(localStorage).filter(k => k.indexOf('yk_media_') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {}
      return localMedia().then(items => Promise.all(items.map(m => idb('readwrite', s => s.delete(m.id)).catch(() => {}))));
    }
  };
  // Bekleyen değişikliklerin hepsi sunucuya ulaşınca çözülür; biri reddedilirse hata verir
  function waitSync() {
    const d0 = dropped;
    return new Promise((res, rej) => {
      const t0 = Date.now();
      (function check() {
        if (dropped > d0) return rej(new Error(remote.error || 'Bazı değişiklikler sunucuya kaydedilemedi'));
        if (!ops.length) return res();
        if (Date.now() - t0 > 60000) return rej(new Error('Sunucuya kaydetme zaman aşımına uğradı'));
        setTimeout(check, 300);
      })();
    });
  }
  // 'media:<id>' referanslarını yeni adreslerle değiştirir
  function rewriteMedia(o, map) {
    if (o == null || !Object.keys(map).length) return o;
    return JSON.parse(JSON.stringify(o).replace(/"media:([a-z0-9]+)"/g, (m, id) => map[id] ? JSON.stringify(map[id]) : '""'));
  }
  // Yerel görselleri sunucuya yükler; SVG'ler PNG'ye çevrilir. map.failed = yüklenemeyen sayısı
  function uploadMedia(items) {
    const map = {}; let failed = 0;
    return items.reduce((p, m) => p.then(() => {
      if (!m || !m.data || m.data.indexOf('data:image/') !== 0) return null;
      return (m.data.indexOf('data:image/svg') === 0 ? svgToPng(m.data) : Promise.resolve(m.data))
        .then(data => api('upload', { data: data, name: m.name || 'görsel' }))
        .then(j => { map[m.id] = j.item.src; }, () => { failed++; });
    }), Promise.resolve()).then(() => { Object.defineProperty(map, 'failed', { value: failed }); return map; });
  }
  function svgToPng(url) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth || 800; c.height = im.naturalHeight || 800; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); };
      im.onerror = rej; im.src = url;
    });
  }

  // Site formları: sunucu varsa oraya gönderilir
  function submitForm(type, data, honeypot) {
    return api('submit', { type: type, data: data, website: honeypot || '', kvkk: true });
  }

  /* ---------- Site içeriği ---------- */
  // Katmanlar: varsayılan → yayındaki içerik (content.js) → bu tarayıcıdaki taslak (panel)
  function mergeLayer(c, layer) {
    if (!layer || typeof layer !== 'object') return;
    layer = clone(layer);
    if (layer.texts) Object.keys(OLD_DEFAULTS.texts).forEach(k => { if (layer.texts[k] === OLD_DEFAULTS.texts[k]) delete layer.texts[k]; });
    Object.keys(OLD_DEFAULTS.arrays).forEach(k => { if (layer[k] && JSON.stringify(layer[k]) === JSON.stringify(OLD_DEFAULTS.arrays[k])) delete layer[k]; });
    if (layer.sections && layer.sections.apply === false) { layer.sections.bizForm = false; layer.sections.courForm = false; }
    if (layer.images && layer.images.apply && !layer.images.courform) layer.images.courform = layer.images.apply;
    ['texts', 'images', 'settings', 'calc', 'sections', 'formOptions', 'reviewed'].forEach(k => { if (layer[k]) Object.assign(c[k], layer[k]); });
    Object.keys(DEFAULT_CONTENT).forEach(k => { if (Array.isArray(DEFAULT_CONTENT[k]) && Array.isArray(layer[k])) c[k] = layer[k]; });
  }
  function publishedContent() { const c = clone(DEFAULT_CONTENT); mergeLayer(c, window.YK_PUBLISHED); return c; }
  // Sitede ?onizleme=1 ile panelde kaydedilip henüz yayınlanmamış içerik gösterilir
  const isPreview = () => /[?&]onizleme(=|&|$)/.test(location.search);
  function draftLayer() {
    if (remote.on) return load(KEYS.content, null);
    if (ls.get('yk_mode') === 'server') return isPreview() ? ls.get('yk_preview') : null;
    return ls.get(KEYS.content);
  }
  function getContent() {
    const c = clone(DEFAULT_CONTENT);
    mergeLayer(c, window.YK_PUBLISHED);
    mergeLayer(c, draftLayer());
    return c;
  }
  // Panelde kaydedilen içerik, yayındaki içerikten farklı mı?
  function hasUnpublished() {
    const strip = o => { o = clone(o); delete o.reviewed; return JSON.stringify(o); };
    return !!draftLayer() && strip(getContent()) !== strip(publishedContent());
  }
  // Yayın dosyası (content.js): yerel moddaki görseller dosyanın içine gömülür
  async function buildPublishFile() {
    const c = getContent(); delete c.reviewed;
    const fix = async src => (src && src.indexOf('media:') === 0) ? await resolve(src) : src;
    for (const k of Object.keys(c.images)) c.images[k] = await fix(c.images[k]);
    for (const g of c.gallery) g.src = await fix(g.src);
    for (const t of c.testimonials) if (t.photo) t.photo = await fix(t.photo);
    return '/* Yakında Kurye — yayındaki site içeriği (' + new Date().toLocaleString('tr-TR') + ' tarihinde yönetim panelinden oluşturuldu). */\nwindow.YK_PUBLISHED = ' + JSON.stringify(c, null, 1) + ';\n';
  }
  // Sitedeki sayfalar (yeni blog yazısı eklenince bu listeye de eklenir)
  const PAGES = /*SAYFALAR*/['', 'isletmeler.html', 'kuryeler.html', 'basvuru.html', 'blog.html', 'blog/moto-kurye-nasil-olunur.html', 'blog/restoran-kendi-kuryesi-mi-kurye-firmasi-mi.html', 'blog/kurye-kazanci-nasil-artirilir.html', 'blog/paket-basi-mi-vardiyali-kurye-mi.html', 'blog/kurye-olmak-icin-hangi-ehliyet-gerekir.html', 'blog/yogun-saatlerde-paket-servis-gecikmesi.html', 'blog/moto-kurye-ekipmanlari.html']/*/SAYFALAR*/;
  function sitemapXML(base) {
    base = (base || '').replace(/\/+$/, '');
    const day = new Date().toISOString().slice(0, 10);
    const pri = p => p === '' ? '1.0' : /^blog\//.test(p) ? '0.7' : /^(isletmeler|kuryeler)/.test(p) ? '0.9' : '0.8';
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      PAGES.map(p => '  <url><loc>' + base + '/' + p + '</loc><lastmod>' + day + '</lastmod><changefreq>' + (/^blog\//.test(p) ? 'monthly' : 'weekly') + '</changefreq><priority>' + pri(p) + '</priority></url>\n').join('') + '</urlset>\n';
  }
  function robotsTXT(base, noindex) {
    base = (base || '').replace(/\/+$/, '');
    return noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\n' + (base ? '\nSitemap: ' + base + '/sitemap.xml\n' : '');
  }
  const saveContent = c => save(KEYS.content, c);
  const resetContent = () => { if (remote.on) save(KEYS.content, null); else ls.del(KEYS.content); };

  function list(coll) { return load(KEYS[coll], []); }
  function saveList(coll, arr) { return save(KEYS[coll], arr); }
  function add(coll, obj) { const a = list(coll); obj.id = obj.id || uid(); obj.createdAt = obj.createdAt || new Date().toISOString(); a.unshift(obj); return saveList(coll, a) ? obj : null; }
  function update(coll, id, patch) { const a = list(coll); const i = a.findIndex(x => x.id === id); if (i < 0) return null; a[i] = Object.assign({}, a[i], patch, { updatedAt: new Date().toISOString() }); saveList(coll, a); return a[i]; }
  function remove(coll, id) { saveList(coll, list(coll).filter(x => x.id !== id)); }
  function get(coll, id) { return list(coll).find(x => x.id === id) || null; }

  // Admin panelinden düzenlenen seçenekleri form tanımına uygular
  function getForms(content) {
    const ov = (content || getContent()).formOptions || {};
    const f = clone(FORMS);
    Object.keys(f).forEach(t => f[t].fields.forEach(x => {
      const o = ov[t + '.' + x.name];
      if (x.type === 'select' && Array.isArray(o) && o.filter(Boolean).length) x.options = o.filter(Boolean);
    }));
    return f;
  }

  function log(text) {
    const a = load(KEYS.log, []);
    a.unshift({ t: new Date().toISOString(), text: text });
    save(KEYS.log, a.slice(0, 300));
  }
  const getLog = () => load(KEYS.log, []);
  const serverSettings = () => load(KEYS.server, {}) || {};
  const saveServerSettings = s => save(KEYS.server, s);

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function refNo() {
    const d = new Date();
    return 'YK' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fmtDate(iso, withTime) {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    const o = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return d.toLocaleString('tr-TR', o);
  }
  function fmtMoney(n) { return (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₺'; }
  // WhatsApp için numarayı uluslararası biçime çevirir (0532… → 90532…)
  function waNumber(t) {
    let d = String(t || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d[0] === '0') d = '90' + d.slice(1);
    else if (d.length === 10 && d[0] === '5') d = '90' + d;
    return d;
  }

  /* ---------- Medya deposu (yüklenen görseller) ---------- */
  const DB_NAME = 'yk_media_db';
  let dbPromise = null;
  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((res, rej) => {
      try {
        const r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('media', { keyPath: 'id' });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbPromise;
  }
  function idb(mode, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction('media', mode); const s = t.objectStore('media');
      const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error);
    }));
  }
  function localMedia() {
    const fromLS = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf('yk_media_') === 0) fromLS.push(ls.get(k)); } } catch (e) {}
    return idb('readonly', s => s.getAll()).then(r => (r || []).concat(fromLS).filter(Boolean)).catch(() => fromLS.filter(Boolean));
  }
  const media = {
    // Görseli kaydeder, sitede kullanılacak adresi döndürür
    put(dataUrl, name) {
      if (remote.on) {
        return (/^data:image\/svg/.test(dataUrl) ? svgToPng(dataUrl) : Promise.resolve(dataUrl))
          .then(d => api('upload', { data: d, name: name || 'görsel' })).then(j => j.item.src);
      }
      const item = { id: uid(), data: dataUrl, name: name || 'görsel', createdAt: new Date().toISOString() };
      return idb('readwrite', s => s.put(item)).then(() => 'media:' + item.id)
        .catch(() => { save('yk_media_' + item.id, item); return 'media:' + item.id; });
    },
    get(id) {
      return idb('readonly', s => s.get(id)).then(r => r || ls.get('yk_media_' + id)).catch(() => ls.get('yk_media_' + id));
    },
    // id, 'media:<id>' veya sunucudaki adres (uploads/…) kabul eder
    del(ref) {
      ref = String(ref || '');
      if (remote.on && ref.indexOf('media:') !== 0) return api('media_delete', { id: ref }).catch(() => {});
      const id = ref.replace(/^media:/, '');
      ls.del('yk_media_' + id);
      return idb('readwrite', s => s.delete(id)).catch(() => {});
    },
    // Görsel seçici için liste: { id, src (kullanılacak değer), url (önizleme), name }
    all() {
      if (remote.on) return api('media').then(j => (j.items || []).map(x => ({ id: x.id, src: x.src, url: x.src, name: x.name, createdAt: x.createdAt })));
      return localMedia().then(items => items.map(x => ({ id: x.id, src: 'media:' + x.id, url: x.data, name: x.name, createdAt: x.createdAt })));
    }
  };
  const cache = {};
  function resolve(src) {
    if (!src || src.indexOf('media:') !== 0) return Promise.resolve(src || '');
    const id = src.slice(6);
    if (cache[id]) return Promise.resolve(cache[id]);
    return media.get(id).then(r => (cache[id] = r ? r.data : ''));
  }
  function setImg(el, src) { if (!el) return; resolve(src).then(u => { if (u) el.src = u; }); }
  function setBg(el, src) { if (!el) return; resolve(src).then(u => { if (u) el.style.backgroundImage = 'url("' + u + '")'; }); }

  // Görseli küçültüp dataURL'e çevirir (depolama alanı ve hız için)
  function fileToDataUrl(file, maxSize) {
    maxSize = maxSize || 1600;
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const url = fr.result;
        if (file.type === 'image/svg+xml' || file.type === 'image/gif' || (file.type === 'image/png' && file.size < 400000)) return res(url);
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, maxSize / Math.max(im.width, im.height));
          const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          const x = c.getContext('2d');
          if (file.type === 'image/png') { x.drawImage(im, 0, 0, c.width, c.height); return res(c.toDataURL('image/png')); }
          x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.85));
        };
        im.onerror = rej; im.src = url;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- Yönetici girişi ---------- */
  // Yerel mod: tarayıcı tarafı basit koruma (veriler zaten yalnızca bu tarayıcıda).
  // Sunucu modu: giriş sunucuda doğrulanır (api/index.php, şifre hash'lenmiş saklanır).
  function hash(s) { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16); }
  const DEFAULT_USER = 'admin', DEFAULT_PASS = 'yakinda2026';
  const auth = {
    creds() { return remote.on ? { user: remote.user || DEFAULT_USER } : load(KEYS.auth, { user: DEFAULT_USER, hash: hash('yk:' + DEFAULT_PASS) }); },
    check(user, pw) { const c = auth.creds(); return user.trim().toLowerCase() === c.user.toLowerCase() && hash('yk:' + pw) === c.hash; },
    set(user, pw) { return save(KEYS.auth, { user: user.trim() || DEFAULT_USER, hash: hash('yk:' + pw) }); },
    login() { try { sessionStorage.setItem('yk_session', '1'); } catch (e) { window.__ykSession = true; } },
    logout() { try { sessionStorage.removeItem('yk_session'); } catch (e) {} window.__ykSession = false; },
    isLogged() { if (remote.on) return remote.logged; try { return sessionStorage.getItem('yk_session') === '1' || !!window.__ykSession; } catch (e) { return !!window.__ykSession; } },
    isDefault() { if (remote.on) return false; const c = auth.creds(); return c.hash === hash('yk:' + DEFAULT_PASS); }
  };

  /* ---------- Yedekleme ---------- */
  function exportAll() {
    const base = { app: 'yakinda-kurye', version: 2, mode: remote.on ? 'server' : 'local', exportedAt: new Date().toISOString(),
      content: load(KEYS.content, {}), applications: list('applications'), employees: list('employees'), records: list('records'), customers: list('customers'), log: getLog() };
    // Sunucu modunda görseller sunucudaki uploads klasöründe kalır; yedekte adresleri bulunur
    return (remote.on ? Promise.resolve([]) : localMedia()).then(m => Object.assign(base, { media: m }));
  }
  function importAll(data) {
    if (!data || data.app !== 'yakinda-kurye') return Promise.reject(new Error('Geçersiz yedek dosyası'));
    if (remote.on) {
      return uploadMedia(data.media || []).then(map => {
        const fix = o => rewriteMedia(o, map);
        return api('restore', { applications: fix(data.applications || []), employees: fix(data.employees || []), customers: fix(data.customers || []), records: data.records || [], log: data.log || [], draft: fix(data.content && Object.keys(data.content).length ? data.content : null) });
      }).then(() => server.pull());
    }
    save(KEYS.content, data.content || {});
    saveList('applications', data.applications || []);
    saveList('employees', data.employees || []);
    saveList('records', data.records || []);
    saveList('customers', data.customers || []);
    save(KEYS.log, data.log || []);
    return Promise.all((data.media || []).filter(m => m && m.data).map(m => idb('readwrite', s => s.put(m)).catch(() => save('yk_media_' + m.id, m))));
  }

  function toCSV(rows, cols) {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    return '﻿' + [cols.map(c => q(c.label)).join(';')].concat(rows.map(r => cols.map(c => q(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(';'))).join('\r\n');
  }
  function download(name, text, type) {
    const b = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  window.YK = {
    ICONS, ICON_CHOICES, icon, BUNDLED_IMAGES, DEFAULT_CONTENT, FORMS, getForms, ILLER, APP_STATUSES, EMP_FIELDS, EMP_DOCS, CUST_FIELDS, CUST_STATUSES, EXPIRY_FIELDS, RECORD_TYPES, log, getLog,
    getContent, publishedContent, hasUnpublished, isPreview, buildPublishFile, sitemapXML, robotsTXT, saveContent, resetContent, list, saveList, add, update, remove, get,
    serverSettings, saveServerSettings, uid, refNo, esc, fmtDate, fmtMoney, waNumber, media, resolve, setImg, setBg, fileToDataUrl, auth,
    exportAll, importAll, toCSV, download, remote, server, submitForm
  };
})();
