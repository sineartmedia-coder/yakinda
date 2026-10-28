/* Yakında Kurye — Firebase bağlantı ayarları
   Site her hostingte (Firebase Hosting, cPanel, Netlify, GitHub Pages…) aynı şekilde çalışır; veriler bu
   Firebase projesinde tutulur. Ayarlar boş bırakılırsa site ve panel "yerel modda" çalışır (veriler yalnızca
   o tarayıcıda). Değerler Firebase konsolu › Proje ayarları › Uygulamalarınız › Web uygulaması bölümündedir.
   Bu anahtarlar gizli değildir; veriler firestore.rules dosyasındaki kurallarla korunur.
   admins: panele giriş yapabilecek Google hesapları (firestore.rules dosyasındaki listeyle aynı olmalı). */
window.YK_FIREBASE = {
  apiKey: 'AIzaSyCy9vCC4-Uo3pKaDftG_HPS2GoO3sjjJ0U',
  authDomain: 'yakinda-29909.firebaseapp.com',
  projectId: 'yakinda-29909',
  appId: '1:90084698716:web:48d9a788acef235aad9499',
  messagingSenderId: '90084698716',
  admins: ['kuryeyakinda@gmail.com']
};
