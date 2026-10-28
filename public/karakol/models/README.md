# İsteğe bağlı 3D modeller (GLB / GLTF)

Oyun varsayılan olarak tüm modelleri kodla üretir. Kendi **lisansı uygun** GLB modellerinizi
kullanmak için dosyaları bu klasöre koyup `models.json` içinde ilgili yuvaya yazın:

```json
{
  "rifle": "tufek.glb",
  "binoculars": "durbun.glb",
  "soldier": "asker.glb",
  "enemy": "orgut.glb",
  "civilian": "sivil.glb",
  "truck": "kamyon.glb"
}
```

| Yuva | Beklenti |
|---|---|
| rifle | Birinci şahıs tüfek, namlu −Z yönüne bakar. Otomatik 0,9 m uzunluğa ölçeklenir. |
| binoculars | Dürbün, otomatik ölçeklenir. |
| soldier / enemy / civilian | İnsan modeli, ayak tabanı y=0, yüz +Z. 1,78 m boya ölçeklenir. Animasyon klip adları `idle`, `walk`, `run`, `aim`/`shoot`, `crouch`, `die` içerirse otomatik kullanılır. |
| truck | Çiftlikteki kamyon. 7 m boya ölçeklenir. |

Dosya bulunamazsa, bozuksa ya da yüklenemezse oyun çökmez; konsola bir uyarı yazar ve yerleşik modele döner.
Lisansı belirsiz (ör. kaynağı belli olmayan "ücretsiz" paketler) modelleri kullanmayın; CC0 veya açıkça izin veren
lisansları tercih edin ve kaynağı bu dosyaya not edin.
