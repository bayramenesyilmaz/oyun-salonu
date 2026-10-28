# Oyun Salonu

Tarayıcıda oynanan 3B oyunlar için tek site ve ortak motor.

| Adres | Oyun |
|---|---|
| `/` | Oyun Salonu (portal) |
| `/karakuyu` | Karakuyu — korku |
| `/karakol` | KARAKOL — Son Tahliye — aksiyon/kurtarma |

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run preview  # dist/ önizleme
```

## Yapı

```
src/
  main.jsx          Adrese göre oyunu seçer (her oyun ayrı yüklenir)
  games.js          Oyun listesi (yeni oyun = yeni satır)
  portal/           Ana sayfa
  engine/           Ortak motor: zaman/yavaş çekim, çarpışma, ses, seslendirme, efektler, son işlem, dokular, GLB yükleyici
  games/<oyun>/     Her oyunun kendi kodu, arayüzü ve stilleri
public/             Simgeler ve oyunlara özel dosyalar (ör. public/karakol/models)
```

Kullanılan ücretsiz/açık kaynak paketler: three (MIT), react (MIT), @dimforge/rapier3d-compat (Apache-2.0),
postprocessing (Zlib), vite + vite-plugin-pwa (MIT).

## PWA

Site tek bir uygulama olarak yüklenebilir (Ana ekrana ekle). Açılan oyunların dosyaları önbelleğe alınır;
bir kez açılan oyun internetsiz de oynanır.
