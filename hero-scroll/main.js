/* ==========================================================================
   main.js — animazione della hero guidata dallo scroll
   Come funziona, in breve:
   1. si sceglie il set di fotogrammi (pieno su desktop, dimezzato su mobile);
   2. si precaricano tutti mostrando la barra di caricamento;
   3. ScrollTrigger traduce la posizione di scroll in un numero da 0 a 1;
   4. un ciclo requestAnimationFrame disegna sul canvas il fotogramma giusto.
   Il disegno è separato dallo scroll: lo scroll aggiorna solo un indice,
   il canvas viene ridipinto al massimo una volta per frame video.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIGURAZIONE
     I due valori "totale" devono corrispondere ai file davvero presenti
     in assets/frames/ e assets/frames-mobile/ (vedi README).
     ------------------------------------------------------------------ */
  var CONFIG = {
    /* larghezza: quella reale dei file WebP. Serve a non gonfiare il canvas
       oltre la risoluzione delle immagini: ingrandire non aggiunge dettaglio,
       costa solo pixel da disegnare a ogni fotogramma. */
    desktop: { cartella: 'assets/frames/',        totale: 150, dprMax: 2,   larghezza: 1920 },
    mobile:  { cartella: 'assets/frames-mobile/', totale: 75,  dprMax: 1.5, larghezza: 960 },
    sogliaMobile: 900,      // px: sotto questa larghezza si usa il set leggero
    concorrenza: 8          // quante immagini si scaricano in parallelo
  };

  /* Finestre di comparsa dei tre blocchi di testo, in percentuale di scroll.
     [entra, pieno-da, pieno-fino-a, esce] — fra entra e pieno-da c'è la
     dissolvenza in apertura, fra pieno-fino-a ed esce quella in chiusura. */
  var FINESTRE = [
    [-0.05, 0.00, 0.22, 0.31],   /* pieno già a pagina ferma in cima */
    [ 0.31, 0.40, 0.56, 0.65],
    [ 0.65, 0.74, 0.94, 1.02]
  ];

  /* ------------------------------------------------------------------
     ELEMENTI
     ------------------------------------------------------------------ */
  var canvas       = document.getElementById('hero-canvas');
  var ctx          = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  var hero         = document.querySelector('.hero');
  var blocchi      = Array.prototype.slice.call(document.querySelectorAll('.blocco'));
  var invitoScorri = document.getElementById('hero-scorri');
  var testata      = document.getElementById('testata');
  var overlay      = document.getElementById('caricamento');
  var barra        = document.getElementById('caricamento-avanzamento');
  var percentuale  = document.getElementById('caricamento-valore');

  if (!canvas || !ctx) { return; }

  /* ------------------------------------------------------------------
     STATO
     ------------------------------------------------------------------ */
  var mobile    = window.matchMedia('(max-width: ' + CONFIG.sogliaMobile + 'px)').matches;
  var set       = mobile ? CONFIG.mobile : CONFIG.desktop;
  var ridotto   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var immagini  = new Array(set.totale);   // le immagini precaricate
  var indice    = 0;                       // fotogramma attualmente richiesto
  var disegnato = -1;                      // ultimo fotogramma davvero disegnato
  var daRidipingere = true;                // true quando canvas o indice cambiano
  var avviato   = false;

  /* ------------------------------------------------------------------
     NOME FILE — frame_0001.webp, frame_0002.webp, ...
     ------------------------------------------------------------------ */
  function percorso(n) {
    return set.cartella + 'frame_' + String(n).padStart(4, '0') + '.webp';
  }

  /* ------------------------------------------------------------------
     CANVAS — dimensione reale in pixel fisici, con il DPR limitato.
     Su uno schermo Retina il canvas avrebbe il doppio dei pixel: bello ma
     costoso, quindi il moltiplicatore viene tagliato (2 desktop, 1.5 mobile).
     ------------------------------------------------------------------ */
  function dimensiona() {
    var largCss = canvas.clientWidth || 1;
    /* Tre limiti insieme: il DPR dello schermo, il tetto per tipo di
       dispositivo e la larghezza vera dei fotogrammi. Vince il più basso. */
    var dpr = Math.min(window.devicePixelRatio || 1, set.dprMax, set.larghezza / largCss);
    if (dpr < 1) { dpr = 1; }   /* mai sotto la dimensione CSS: sfocherebbe */
    var l = Math.round(canvas.clientWidth  * dpr);
    var a = Math.round(canvas.clientHeight * dpr);
    if (l === canvas.width && a === canvas.height) { return false; }
    canvas.width  = l;
    canvas.height = a;
    return true;
  }

  /* Osserva la dimensione reale del canvas: più affidabile del solo
     evento resize (copre anche layout tardivi e barra indirizzi mobile). */
  function osservaDimensioni() {
    if (typeof ResizeObserver !== 'function') { return; }
    var ro = new ResizeObserver(function () {
      if (dimensiona()) { daRidipingere = true; }
    });
    ro.observe(canvas);
  }

  /* ------------------------------------------------------------------
     DISEGNO — equivalente di object-fit: cover.
     Si sceglie la scala più grande fra le due necessarie a coprire, così
     l'immagine riempie sempre lo schermo e viene ritagliata sul lato lungo.
     ------------------------------------------------------------------ */
  function disegna(img) {
    if (!img || !img.naturalWidth) { return; }
    /* Il ridimensionamento "alta qualità" qui non serve e costa: i frame
       vengono mostrati quasi a scala 1:1 e cambiano 60 volte al secondo. */
    ctx.imageSmoothingQuality = 'low';
    var cl = canvas.width, ca = canvas.height;
    var scala = Math.max(cl / img.naturalWidth, ca / img.naturalHeight);
    var l = img.naturalWidth  * scala;
    var a = img.naturalHeight * scala;
    ctx.drawImage(img, (cl - l) / 2, (ca - a) / 2, l, a);
  }

  /* ------------------------------------------------------------------
     CICLO DI RENDER — gira di continuo ma ridipinge solo se serve
     ------------------------------------------------------------------ */
  function ciclo() {
    if (daRidipingere || indice !== disegnato) {
      var img = immagini[indice];
      if (img && img.complete && img.naturalWidth) {
        disegna(img);
        disegnato = indice;
        daRidipingere = false;
      }
    }
    requestAnimationFrame(ciclo);
  }

  /* ------------------------------------------------------------------
     DISSOLVENZE DEI TESTI
     Da 0 a 1 in entrata, 1 nel mezzo, da 1 a 0 in uscita. La curva è una
     smoothstep: niente stacchi netti ai bordi della finestra.
     ------------------------------------------------------------------ */
  function morbida(t) {
    t = Math.min(1, Math.max(0, t));
    return t * t * (3 - 2 * t);
  }

  function opacitaBlocco(p, f) {
    if (p <= f[0] || p >= f[3]) { return 0; }
    if (p < f[1]) { return morbida((p - f[0]) / (f[1] - f[0])); }
    if (p > f[2]) { return morbida(1 - (p - f[2]) / (f[3] - f[2])); }
    return 1;
  }

  function aggiornaTesti(p) {
    for (var i = 0; i < blocchi.length; i++) {
      var o = opacitaBlocco(p, FINESTRE[i] || FINESTRE[FINESTRE.length - 1]);
      blocchi[i].style.opacity = o.toFixed(3);
      /* Piccolo scorrimento verticale: il testo "sale" mentre appare */
      blocchi[i].style.transform = 'translate3d(0,' + ((1 - o) * 26).toFixed(1) + 'px,0)';
      /* Fuori dalla dissolvenza il blocco esce dal flusso di accessibilità */
      blocchi[i].setAttribute('aria-hidden', o < 0.05 ? 'true' : 'false');
    }
  }

  /* ------------------------------------------------------------------
     AGGIORNAMENTO DALLA POSIZIONE DI SCROLL (0 = inizio hero, 1 = fine)
     ------------------------------------------------------------------ */
  function aggiorna(p) {
    p = Math.min(1, Math.max(0, p));
    indice = Math.min(set.totale - 1, Math.round(p * (set.totale - 1)));
    aggiornaTesti(p);
    if (invitoScorri) { invitoScorri.classList.toggle('via', p > 0.02); }
    if (testata) { testata.classList.toggle('compatta', p > 0.98); }
  }

  /* ------------------------------------------------------------------
     PRECARICAMENTO con barra di avanzamento.
     Il primo fotogramma viene disegnato appena arriva, così lo sfondo nero
     dura il meno possibile. Le immagini rotte non bloccano il conteggio.
     ------------------------------------------------------------------ */
  function precarica(quali, alTermine) {
    var fatti = 0, prossimo = 0, totale = quali.length;

    function avanza() {
      fatti++;
      var pct = Math.round(fatti / totale * 100);
      if (barra) { barra.style.width = pct + '%'; }
      if (percentuale) { percentuale.textContent = pct + '%'; }
      if (fatti === totale) { alTermine(); } else { carica(); }
    }

    function carica() {
      if (prossimo >= totale) { return; }
      var n = quali[prossimo++];
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        immagini[n] = img;
        if (n === indice) { daRidipingere = true; }
        avanza();
      };
      img.onerror = avanza;          // un buco non deve fermare tutto
      img.src = percorso(n + 1);     // i file partono da frame_0001
    }

    var paralleli = Math.min(CONFIG.concorrenza, totale);
    for (var i = 0; i < paralleli; i++) { carica(); }
  }

  function chiudiCaricamento() {
    document.body.classList.remove('in-caricamento');
    if (overlay) { overlay.classList.add('finito'); }
  }

  /* ------------------------------------------------------------------
     PERCORSO 1 — MOVIMENTO RIDOTTO
     Si scarica un solo fotogramma, l'ultimo, e si mostra fermo.
     ------------------------------------------------------------------ */
  function avviaRidotto() {
    document.documentElement.classList.add('movimento-ridotto');
    var img = new Image();
    img.onload = function () {
      immagini[set.totale - 1] = img;
      indice = set.totale - 1;
      dimensiona();
      daRidipingere = true;
      requestAnimationFrame(ciclo);
      chiudiCaricamento();
    };
    img.onerror = chiudiCaricamento;
    img.src = percorso(set.totale);
    if (testata) { testata.classList.add('compatta'); }
    osservaDimensioni();
  }

  /* ------------------------------------------------------------------
     PERCORSO 2 — ANIMAZIONE COMPLETA
     ------------------------------------------------------------------ */
  function avviaAnimazione() {
    dimensiona();
    osservaDimensioni();
    requestAnimationFrame(ciclo);

    /* Resize: il canvas cambia dimensione, quindi va ridipinto.
       Il debounce evita di rifare i conti a ogni pixel di trascinamento. */
    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (dimensiona()) { daRidipingere = true; }
        if (window.ScrollTrigger) { window.ScrollTrigger.refresh(); }
      }, 150);
    });

    /* Anche il solo cambio di orientamento sposta l'altezza utile */
    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        if (dimensiona()) { daRidipingere = true; }
        if (window.ScrollTrigger) { window.ScrollTrigger.refresh(); }
      }, 300);
    });

    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,               // la posizione segue lo scroll, senza inerzia
        onUpdate: function (self) { aggiorna(self.progress); }
      });
      aggiorna(0);
    } else {
      /* Rete di sicurezza: se il CDN non risponde, l'animazione funziona
         comunque con un listener di scroll passivo. */
      var conScroll = function () {
        var r = hero.getBoundingClientRect();
        var corsa = hero.offsetHeight - window.innerHeight;
        aggiorna(corsa > 0 ? -r.top / corsa : 0);
      };
      window.addEventListener('scroll', conScroll, { passive: true });
      conScroll();
    }
  }

  /* ------------------------------------------------------------------
     PARTENZA
     ------------------------------------------------------------------ */
  function avvia() {
    if (avviato) { return; }
    avviato = true;

    if (ridotto) { avviaRidotto(); return; }

    document.body.classList.add('in-caricamento');
    dimensiona();

    var quali = [];
    for (var i = 0; i < set.totale; i++) { quali.push(i); }

    precarica(quali, function () {
      chiudiCaricamento();
      avviaAnimazione();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
