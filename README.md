# Patara Board — 3B ürün tanıtım sitesi

[Patara Board](https://github.com/Robotistan/Patara-Board) için, masa üstünde duran etkileşimli bir 3B sahne olarak
tasarlanmış ürün tanıtım sitesi. Safari şapkalı kaplumbağa Patara masada duruyor; muz, elma, kaşık ve oyun hamuru kıskaçlı kablolarla kollarındaki pedlere bağlı; nesnelere
tıkladığınızda akım kablo boyunca ilerler, ped yanar, LED matris ok gösterir ve arkadaki bilgisayar tuşu görür.

Sekiz bölümlük tur (Tak → Kıskaçla → Oyna → Kollar → LED & piyano → Tuşlar → Etkinlikler → Kutuda) ürünü adım adım
anlatır. Her şey yereldir: derleme adımı, paket yöneticisi ya da CDN yoktur.

## Canlı

GitHub Pages ile yayınlanır: <https://hakanatas.github.io/patara/>
`.github/workflows/pages.yml` iş akışı `main` ve geliştirme dalına yapılan her push'ta siteyi yeniden yayınlar.
Depo ayarlarında **Settings → Pages → Source: GitHub Actions** seçili olmalıdır (iş akışı ilk çalıştığında Pages'i
kendisi etkinleştirmeyi dener).

## Yerelde çalıştırma

```bash
node serve.mjs          # → http://localhost:8080
# ya da
python3 -m http.server 8080
```

ES modülleri `http://` gerektirir; `index.html` dosyasını diskten doğrudan açmak çalışmaz.

## İçerik

| Özellik | Nerede |
| --- | --- |
| Kart: gerçek ön/arka baskı (`assets/board-front.webp`, `assets/board-back.webp`; kaynak SVG'ler `assets/` altında) ince bir PCB olarak kesilir, silüet alfa kanalından izlenir; üstüne altın pedler, 5×5 LED, ayak pinleri ve USB‑C eklenir; yön / X / Y tuşları ve piyano baskı üzerinde tıklanabilir | `js/artwork.js`, `js/board.js` |
| İletken nesneler (muz, elma, oyun hamuru, kaşık, kalem çizgisi; folyo, madeni para, anahtar), kıskaçlı kablolar, GND bilekliği, etkinlik kitabı | `js/objects.js`, `js/config.js` |
| Bilgisayar ekranı: kartın kontrol ettiği mini oyun ve “bilgisayarın gördüğü” tuş günlüğü | `js/monitor.js` |
| Sekiz bölümlük tur, kamera odakları ve yüzen etiketler | `js/steps.js`, `js/main.js` |
| Sentezlenmiş ses efektleri (ses dosyası yok) | `js/audio.js` |
| Kaydırmalı klasik sürüm (önceki tasarım) | `klasik/` |

### Kontroller

- **Mutfak / Kırtasiye** nesne setini değiştirir · **GND**: siyah GND kablosunun kıskacını sürükleyip "sen" figürünün eline bırakırsın (elinden çekince kopar; alttaki GND anahtarı ve G tuşu kısayoldur). Kıskaç elinde değilken devre açık kalır: akım nesneden sana geçer, karta dönemez. Kıskaçla bölümünde canlı devre şeması vardır
- **Ses**, **Otomatik** (bölümleri kendi kendine gezer) · **Arayüzü gizle** (veya `H`)
- Klavye: `←` `→` bölüm · `W` `A` `S` `D` yön nesnelerine dokun · boşluk = Space nesnesi · `Enter` bölüm eylemi · `G` GND · `M` ses · `O` otomatik · `R` oyunu sıfırla
- Fare: nesnelere, pedlere, piyano tuşlarına, yön ve X/Y tuşlarına, bilekliğe ve kitaba tıklanabilir; sürükleyerek döndür, tekerlekle yaklaş

`prefers-reduced-motion` animasyonları kısaltır.

## Kaynaklar

- Ürün deposu: <https://github.com/Robotistan/Patara-Board> (Apache‑2.0)
- Ürün kiti: <https://www.robotistan.com/patara-board-urun-kiti>
- Destek: <https://community.robotistan.com/>

## Üçüncü taraf

- Three.js r170 (MIT) — `vendor/three/` (bkz. `vendor/three/LICENSE`)
- Fraunces ve Instrument Sans (SIL Open Font License) — `assets/fonts/`
