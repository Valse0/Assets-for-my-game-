# FIVEMORE — UI v3 Style Guide (`design-v3/`)

Don't Starve'dan esinlenmiş karanlık-gotik **16-bit piksel art** arayüz tasarım sistemi. Üç zaman-atmosfer temasını destekler: **DUSK** (sıcak gün batımı), **DUST** (tozlu alacakaranlık) ve **NIGHT** (mavi gece).

---

## 1. Renk Paletleri (Tema başına en fazla 16 renk)

Tüm temalar evrensel mürekkep konturu **`#0a090d`** ile çevrelenir.

### A. DUSK (`data-theme="dusk"` — 0:00 Sıcak Gün Batımı) — 15 Renk
| Rol | Hex | Kullanım |
| :--- | :--- | :--- |
| Outline | `#0a090d` | Tüm çerçeveler, sert piksel gölgeler, kontur |
| Ground | `#161210` | Sayfa/oyun arka planı, koyu kurum |
| Panel | `#211914` | HUD arka planı, modal kutu yüzeyi |
| Panel Alt | `#2b2019` | Panel üst geçişi, hover |
| Rim | `#594131` | 1px iç çerçeve kenarlığı |
| Primary Ink | `#efe0c8` | Ana başlıklar, HUD metinleri |
| Muted Ink | `#a7937c` | İkincil etiketler, alt yazılar |
| Signal Amber | `#e3a349` | PLAY üst tonu, Timer, `BEST`, `FIVE MORE?` |
| Signal Deep | `#c97e2c` | PLAY alt tonu |
| CTA Ink | `#140f0b` | PLAY üzeri koyu yazı |
| Slate Top | `#262321` | SETTINGS / ikincil buton üst |
| Slate Bot | `#181615` | SETTINGS / ikincil buton alt |
| HP Top / Bot | `#d45340` / `#9b2e23` | Segmentli can barı |
| XP Top / Bot | `#9dc284` / `#6c8f58` | Segmentli XP barı |

### B. DUST (`data-theme="dust"` — 1:40 Tozlu Alacakaranlık) — 15 Renk
| Rol | Hex | Kullanım |
| :--- | :--- | :--- |
| Outline | `#0a090d` | Evrensel 2px–3px kontur |
| Ground | `#1b1713` | Kurak tozlu zemin |
| Panel | `#26201a` | HUD / modal kutu |
| Panel Alt | `#322a21` | Panel üst tonu |
| Rim | `#645643` | 1px iç çerçeve |
| Primary Ink | `#ebe0cb` | Kemik beyazı yazı |
| Muted Ink | `#a89d8a` | Alt etiketler |
| Signal Ochre | `#e5b05d` | PLAY üst tonu, Timer, vurgu |
| Signal Deep | `#c3873a` | PLAY alt tonu |
| CTA Ink | `#17120c` | PLAY üzeri yazı |
| Slate Top | `#292622` | SETTINGS üst |
| Slate Bot | `#1b1916` | SETTINGS alt |
| HP Top / Bot | `#cf5643` / `#963226` | Segmentli can barı |
| XP Top / Bot | `#98b99a` / `#65886c` | Segmentli XP barı |

### C. NIGHT (`data-theme="night"` — 3:20 Mavi Gece) — 15 Renk
| Rol | Hex | Kullanım |
| :--- | :--- | :--- |
| Outline | `#0a090d` | Evrensel 2px–3px kontur |
| Ground | `#0b1016` | Soğuk gece arduvazı |
| Panel | `#131b23` | HUD / modal kutu |
| Panel Alt | `#1b2631` | Panel üst tonu |
| Rim | `#3d4f5f` | 1px iç çerçeve |
| Primary Ink | `#e7e3d5` | Ay ışığı tebeşir metin |
| Muted Ink | `#8b9aa6` | Soğuk ikincil metin |
| Signal Torch | `#e3aa55` | PLAY üst tonu, meşale sarısı Timer |
| Signal Deep | `#be8032` | PLAY alt tonu |
| CTA Ink | `#101419` | PLAY üzeri koyu yazı |
| Slate Top | `#1c252d` | SETTINGS üst |
| Slate Bot | `#11171d` | SETTINGS alt |
| HP Top / Bot | `#c94d3f` / `#8e2a21` | Segmentli can barı |
| XP Top / Bot | `#88b8a8` / `#578578` | Segmentli XP barı |

---

## 2. Kontur ve Gölge Kuralları
- **Dış Kontur**: Her kutu, buton, bar çerçevesi ve modal `2px` veya `3px solid #0a090d` kalın koyu kontur kullanır.
- **İç Kenarlık (Rim)**: Koyu paneller arka plandan kopmaması için `inset 0 0 0 1px var(--c-rim)` taşır.
- **Sert Piksel Gölge**: Blur'suz `0 3px 0 #0a090d` (HUD/ikonlar) veya `0 4px 0 #0a090d` (butonlar).
- **Basılı Durum**: `:active` / `.is-pressed` halinde buton `translateY(3px)` çöker ve alt gölge `0 1px 0 #0a090d` değerine iner.

---

## 3. Buton ve Bar Ölçüleri
- **Mobil Dokunma Hedefi**: Tüm etkileşimli butonlar en az **`48px`** yüksekliğindedir (`Play`: `54px`, `Settings`/`Restart`/`Menu`: `48px`, `#pause-game`: `48×48px`).
- **HUD Bütçesi (`<= %15` ekran alanı)**:
  - `.game-hud`: `width: min(64vw, 248px)`, üstte HP + XP segmentli bar paneli, altında `#run-timer` ve 6 haneli `#run-score` (`001840`).
  - `#pause-game`: `48×48px`, sağ üst köşe (`safe-area-inset-top` & `safe-area-inset-right` uyumlu).
  - Toplam HUD + Pause alanı `390×667` ekranda ~`%8.7` kaplar (`%15` sınırının oldukça altında).
- **Segmentli Barlar**: `.hp-track` (`11px`) ve `.xp-track` (`9px`), CSS `::after` üzerinden `12px` dolgu / `2px` `#0a090d` bölme çentikleri taşır. Değerler CSS değişkenleri (`--hp`, `--xp`) ve `data-*` öznitelikleriyle sürülür.
- **Atmosfer Geçişi (`atmosphere.css`)**: `#game-canvas` üstünde `pointer-events: none` ile duran `.atmosphere-layer`, `DUSK -> DUST -> NIGHT` tema değişimlerinde `--atmo-transition: 3s` yumuşak geçiş kullanır.

---

## 4. Yazı Tipi Önerisi (Ücretsiz OFL — Yerel Gömülü)
Hiçbir dış CDN/internet isteği yoktur. Tüm fontlar `design-v3/fonts/` altında `.ttf` + `OFL.txt` olarak gömülüdür:
1. **Başlık & Butonlar (`--font-display`)**: `Jolly Lodger` (`fonts/JollyLodger-Regular.ttf`, OFL) — Uzun, gotik el-oyması silüet (`PAUSED`, `YOU SURVIVED 2:14`, `PLAY`, `SETTINGS`).
2. **Sayılar, Rozet & HUD (`--font-pixel`)**: `Silkscreen` (`fonts/Silkscreen-Regular.ttf`, `Silkscreen-Bold.ttf`, OFL) — `tabular-nums` destekli 16-bit piksel netliği (`76 HP`, `LV 7`, `2:03`, `001840`).
3. **Alt Metinler (`--font-body`)**: `Patrick Hand` (`fonts/PatrickHand-Regular.ttf`, OFL) — Sıcak el yazısı yardımcı metinler.

---

## 5. YAPILMAYACAKLAR Listesi
- **Oyun mantığına veya diğer klasörlere dokunma** (`src/`, `public/`, `scripts/`, kök `index.html`). Tüm UI çıktıları yalnız `design-v3/` içindedir.
- **Dış font / CDN / harici URL kullanma** — fontlar mutlaka `design-v3/fonts/` üzerinden yerel `@font-face` ile yüklenmelidir.
- **Anti-aliasing / yumuşak bulanık neon gölgeler veya cam-efekti (glassmorphism) ekleme** — piksel sertliğini (`#0a090d` kontur, `image-rendering: pixelated`) bozar.
- **`48px` altında dokunma hedefi bırakma** — mobil parmak ergonomisi için ihlaldir.
- **HUD'u ekranın %15'inin üzerine taşırma** veya `#atmosphere-layer` üzerine `pointer-events: auto` koyarak `#virtual-stick` dokunmasını engelleme.
- **Mevcut zorunlu ID'leri silme/değiştirme**: `#hp-label`, `#pause-game`, `#game-canvas`, `#virtual-stick` her zaman korunmalıdır.
- **Sprite oranlarını esnetme** — farklı ekran yüksekliklerinde (`390×667`–`390×844`) sahneler esnek düzen (`100dvh`, `overflow: hidden`) ile uyum sağlamalıdır.
