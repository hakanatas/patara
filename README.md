# Patara Board — Ürün Tanıtım Sitesi

[Patara Board](https://github.com/Robotistan/Patara-Board) için hazırlanmış, tek sayfalık, kaydırma‑odaklı (scroll‑driven) bir ürün tanıtım sitesi.
Bağımlılık yok; saf HTML + CSS + JavaScript. Herhangi bir statik sunucudan yayınlanabilir.

## Yerelde çalıştırma

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Sayfa bölümleri (hash yönlendirme ile)

| Rota | Bölüm |
| --- | --- |
| `#/` | Giriş (hero) |
| `#/nasil-calisir` | 3 adımda nasıl çalışır |
| `#/dene` | Etkileşimli tarayıcı simülatörü |
| `#/kart` | Kart turu (parçalar tek tek vurgulanır) |
| `#/etkinlikler` | Etkinlik kitabındaki 12 etkinlik |
| `#/kimler-icin` | Hedef kitle ve kazanımlar |
| `#/teknik` | Teknik özellikler |
| `#/sss` | Sıkça sorulan sorular |

## Yayınlama

`.github/workflows/pages.yml` iş akışı, `main` dalına yapılan her push'ta siteyi GitHub Pages'e yayınlar.
Depo ayarlarında **Settings → Pages → Source: GitHub Actions** seçilmelidir.

## Kaynaklar

- Ürün deposu: <https://github.com/Robotistan/Patara-Board> (Apache‑2.0)
- Ürün kiti: <https://www.robotistan.com/patara-board-urun-kiti>
- Destek: <https://community.robotistan.com/>
