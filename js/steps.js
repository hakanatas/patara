/**
 * Chapters of the Patara tour. Each step has Turkish copy, optional action
 * buttons and enter/act hooks that receive the shared scene context.
 */
import { ACTIVITIES } from './config.js';

const actList = ACTIVITIES.map(([p, name]) => `<li><span>${String(p).padStart(2, '0')}</span>${name}</li>`).join('');

export const STEPS = [
  {
    id: 'tak',
    label: 'Tak',
    title: 'Bir kabloyla başlar',
    body: `
      <p>Safari şapkalı kaplumbağa Patara'yı USB kablosuyla bilgisayara tak. O kadar. Bilgisayar onu sıradan bir <b>klavye ve fare</b> sanır; sürücü, kurulum, uygulama gerekmez.</p>
      <p>Windows, macOS, Linux ya da Chromebook fark etmez. <span class="moss">Raspberry Pi</span> tabanlı küçük işlemci, kabloyu taktığın an hazır.</p>
      <p class="note">Klavye gibi göründüğü için Scratch oyunları, sunumlar, müzik uygulamaları… klavyeyle çalışan her şeyle çalışır.</p>`,
    focus: 'usb',
    action: 'Kabloyu tak',
    enter(c) {
      c.board.highlight('usb');
      c.unplug(false);
      c.later(0.9, () => c.plugIn());
    },
    act(c) {
      c.unplug(true);
      c.later(0.8, () => c.plugIn());
    },
  },
  {
    id: 'kiskacla',
    label: 'Kıskaçla',
    title: 'Kıskaçla, devreyi kapat',
    body: `
      <p>Kıskaçlı kablonun bir ucunu koldaki bir pede, öbür ucunu iletken bir nesneye tak: muz, kaşık, oyun hamuru, kurşun kalemle çizilmiş koyu bir çizgi…</p>
      <p>Bir kablo da <span class="warm">GND</span> pedinden sana gelir (bileklik ya da elinde tuttuğun bir kıskaç). Sen nesneye dokununca devre <b>vücudunun üzerinden</b> tamamlanır; Patara bu minicik akımı algılar.</p>
      <p class="note">GND bağlı değilse hiçbir şey olmaz. Denemek için alttaki <b>GND</b> anahtarını kapat ve bir nesneye tıkla.</p>`,
    focus: 'objects',
    action: 'Kabloları yeniden tak',
    enter(c) {
      c.board.highlight(null);
      c.board.setLed('smile');
      c.attachWires(true);
    },
    act(c) {
      c.attachWires(true);
    },
  },
  {
    id: 'oyna',
    label: 'Oyna',
    title: 'Dokun, tuş bassın',
    body: `
      <p>Muza dokun: <span class="key">↑</span>. Kaşığa dokun: <span class="key">→</span>. Kalem çizgisine dokun: <span class="key">Space</span>. Arkadaki bilgisayar yalnızca tuşları görüyor; robotu yıldıza sen götürüyorsun.</p>
      <p>Nesnelere tıklayarak ya da klavyende <span class="key">W</span> <span class="key">A</span> <span class="key">S</span> <span class="key">D</span> ve boşluk tuşuyla dene. Üstteki <b>Mutfak / Kırtasiye</b> anahtarı nesne setini değiştirir.</p>`,
    focus: 'overview',
    action: 'Muza dokun',
    action2: 'Hepsine dokun',
    enter(c) {
      c.board.highlight(null);
      c.board.setLed('smile');
      c.monitor.say('Yıldıza git!');
    },
    act(c) {
      c.touch(c.objects[0]?.userData.def.id, 'auto');
    },
    act2(c) {
      c.touchAll();
    },
  },
  {
    id: 'kollar',
    label: 'Kollar',
    title: 'İki kol, on ped',
    body: `
      <p>Sol kolda yön pedleri <span class="key">↑</span> <span class="key">←</span> <span class="key">→</span> <span class="key">↓</span>; sağ kolda <span class="key">Space</span>, fare için <span class="key">L.Click</span> ve <span class="key">R.Click</span>, bir de <span class="key">Enter</span>.</p>
      <p>Her kolun kabuğa yakın ucunda bir <span class="warm">GND</span> pedi var. Kıskaçlar delikli altın pedlere kolayca tutunur; küçük eller için tasarlandı.</p>`,
    focus: 'arms',
    action: 'Pedleri yak',
    enter(c) {
      c.board.highlight('arms');
      c.showPadTags();
      c.pulsePads();
    },
    act(c) {
      c.pulsePads();
    },
  },
  {
    id: 'matris',
    label: 'LED & piyano',
    title: 'Işık ve ses kartın üstünde',
    body: `
      <p>Kabuğun üstündeki <b>5×5 LED matris</b> hangi tuşa basıldığını gösterir; oklar, kalpler, yüzler ve küçük animasyonlar için 25 ışık.</p>
      <p>Kabuğun altındaki <b>dokunmatik piyano</b> (C‑D‑E‑F‑G‑A‑B‑C) hiçbir kablo istemez: parmağını dokundur, çalsın. Kapasitif tuşlar, iletkenlik dersinin en tatlı hali. Tuşlara tıklayıp deneyebilirsin.</p>`,
    focus: 'body',
    action: 'Bir melodi çal',
    action2: 'Kalp göster',
    enter(c) {
      c.board.highlight('matrix');
      c.ledShow();
      c.later(2.6, () => c.board.highlight('piano'));
    },
    act(c) {
      c.board.highlight('piano');
      c.playMelody();
    },
    act2(c) {
      c.board.highlight('matrix');
      c.board.setLed('heart', true);
    },
  },
  {
    id: 'tuslar',
    label: 'Tuşlar',
    title: 'Kıskaçsız da oynanır',
    body: `
      <p>Kartın üstündeki <b>yön tuşları</b> ile <span class="warm">X</span> ve <span class="warm">Y</span> fonksiyon tuşları hazır bir oyun kolu gibi çalışır; kıskaç ve GND gerekmez.</p>
      <p>Ayaklardaki pin girişleri bir sonraki adım: <b>fare yön kontrolü</b>, birden çok <b>GND</b> ve jumper kabloyla sürülen <b>W A S D</b> pinleri. Kıskaçtan jumper'a, oradan breadboard'a.</p>`,
    focus: 'bottom',
    action: 'Yön tuşlarına bas',
    enter(c) {
      c.board.highlight('func');
      c.showPinTags();
      c.later(2.2, () => c.board.highlight('pins'));
    },
    act(c) {
      c.board.highlight('func');
      c.pressDpadSequence();
    },
  },
  {
    id: 'etkinlik',
    label: 'Etkinlikler',
    title: 'On iki macera, bir kitap',
    body: `
      <p>Kitle gelen etkinlik kitabı, her biri bir hikâyeye sarılı 12 uygulama içerir. Kolaydan zora ilerler; her etkinlik yeni bir malzeme ve yeni bir fikir tanıtır.</p>
      <ul class="acts">${actList}</ul>
      <p class="note">Numaralar kitaptaki sayfalardır. Adım adım yönergeler kitapta ve GitHub deposundadır.</p>
      <div class="links"><a class="btn btn--small" href="https://github.com/Robotistan/Patara-Board/tree/main/Activities" target="_blank" rel="noopener">Etkinlikler (GitHub) ↗</a></div>`,
    focus: 'book',
    enter(c) {
      c.board.highlight(null);
      c.board.setLed('star');
      c.pulsePads();
    },
  },
  {
    id: 'kutu',
    label: 'Kutuda',
    title: 'Kutuda ne var?',
    body: `
      <ul class="summary">
        <li>Patara Board</li>
        <li>USB kablo</li>
        <li>Kıskaçlı (timsah) bağlantı kabloları</li>
        <li>Jumper kablolar</li>
        <li>12 etkinlikli etkinlik kitabı</li>
      </ul>
      <dl class="glossary">
        <dt>Platform</dt><dd>Raspberry Pi tabanlı; USB klavye + fare (HID)</dd>
        <dt>Pedler</dt><dd>↑ ↓ ← → · Space · Enter · Click · R.Click · 2× GND</dd>
        <dt>Kart üstü</dt><dd>5×5 LED matris · dokunmatik piyano · yön, X, Y tuşları</dd>
        <dt>Alt pinler</dt><dd>Fare yönü · çoklu GND · W A S D</dd>
        <dt>Lisans</dt><dd>Apache‑2.0 (kaynak ve dokümanlar)</dd>
      </dl>
      <div class="links">
        <a class="btn btn--small btn--accent" href="https://www.robotistan.com/patara-board-urun-kiti" target="_blank" rel="noopener">Robotistan'da incele ↗</a>
        <a class="btn btn--small" href="https://github.com/Robotistan/Patara-Board" target="_blank" rel="noopener">GitHub ↗</a>
        <a class="btn btn--small" href="https://community.robotistan.com/" target="_blank" rel="noopener">Topluluk ↗</a>
      </div>`,
    focus: 'wide',
    action: 'Baştan başla',
    autoAct: false,
    enter(c) {
      c.board.highlight(null);
      c.board.setLed('heart', true);
      c.pulsePads();
    },
    act(c) {
      c.goStep(0);
    },
  },
];
