/* ==========================================================================
   Parrucchiere della Città — Lecco  |  SITO DIMOSTRATIVO
   JavaScript vanilla, nessuna libreria, nessun cookie, nessun tracciamento.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     ORARI DI APERTURA
     Indice 0 = domenica, 1 = lunedì ... 6 = sabato (come Date.getDay()).
     apre/chiude sono minuti dalla mezzanotte: 9:00 = 540, 21:00 = 1260.
     Per cambiare gli orari basta modificare questa tabella.
     --------------------------------------------------------------- */
  var ORARI = [
    { nome: 'Domenica',  apre: 540, chiude: 1260 },
    { nome: 'Lunedì',    apre: 540, chiude: 1260 },
    { nome: 'Martedì',   apre: 540, chiude: 1260 },
    { nome: 'Mercoledì', apre: 540, chiude: 1260 },
    { nome: 'Giovedì',   apre: 540, chiude: 1260 },
    { nome: 'Venerdì',   apre: 540, chiude: 1260 },
    { nome: 'Sabato',    apre: 540, chiude: 1260 }
  ];

  /* ---------------------------------------------------------------
     1. MENU HAMBURGER
     --------------------------------------------------------------- */
  var toggle = document.getElementById('nav-toggle');
  var menu   = document.getElementById('nav-menu');

  function chiudiMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-aperto');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri il menu');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var aperto = menu.classList.toggle('is-open');
      document.body.classList.toggle('menu-aperto', aperto);
      toggle.setAttribute('aria-expanded', aperto ? 'true' : 'false');
      toggle.setAttribute('aria-label', aperto ? 'Chiudi il menu' : 'Apri il menu');
    });

    // Dopo il click su una voce il menu si richiude, così si vede la sezione
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) chiudiMenu();
    });

    // ESC chiude il menu e riporta il focus sul bottone
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        chiudiMenu();
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------------
     2. RIFERIMENTO ALL'HEADER
     --------------------------------------------------------------- */
  // L'ombra dell'header viene aggiornata dentro suScroll() (punto 5),
  // insieme agli altri effetti di scorrimento: un solo listener in tutto.
  var header = document.getElementById('site-header');

  /* ---------------------------------------------------------------
     3. APERTO ORA / CHIUSO ORA
     Attenzione: usa l'orologio del dispositivo del visitatore, quindi in
     teoria un telefono con fuso diverso vedrebbe un orario diverso.
     Per una demo va benissimo; per il sito ufficiale, se serve precisione,
     si può forzare il fuso Europe/Rome con Intl.DateTimeFormat.
     --------------------------------------------------------------- */
  function statoAttuale(adesso) {
    var giorno = ORARI[adesso.getDay()];
    var minuti = adesso.getHours() * 60 + adesso.getMinutes();
    var aperto = giorno.apre !== null && minuti >= giorno.apre && minuti < giorno.chiude;
    return { aperto: aperto, giorno: giorno, minuti: minuti };
  }

  function hhmm(minuti) {
    var h = Math.floor(minuti / 60);
    var m = minuti % 60;
    return h + ':' + (m < 10 ? '0' + m : m);
  }

  // Testo della prossima apertura/chiusura, in italiano corrente
  function prossimoPassaggio(s, adesso) {
    if (s.aperto) return 'Chiudiamo alle ' + hhmm(s.giorno.chiude);
    if (s.minuti < s.giorno.apre) return 'Apriamo alle ' + hhmm(s.giorno.apre);
    // Dopo la chiusura guardo il giorno dopo (il modulo 7 torna a domenica).
    // Uso la stessa ora passata da chi mi chiama, non una nuova: altrimenti
    // a cavallo del minuto le due frasi potrebbero non coincidere.
    var domani = ORARI[(adesso.getDay() + 1) % 7];
    return 'Riapriamo domani alle ' + hhmm(domani.apre);
  }

  function pastiglia(aperto) {
    return '<span class="pill ' + (aperto ? 'pill-open">Aperto ora' : 'pill-closed">Chiuso ora') + '</span>';
  }

  function aggiornaStato() {
    var adesso = new Date();
    var s = statoAttuale(adesso);

    // --- pastiglia nell'hero ---
    var box = document.getElementById('hero-status');
    if (box) box.innerHTML = pastiglia(s.aperto) + prossimoPassaggio(s, adesso);

    // --- pastiglia sotto la tabella degli orari ---
    var stato = document.getElementById('orari-stato');
    if (stato) {
      stato.innerHTML = pastiglia(s.aperto) +
        '<span>' + s.giorno.nome + ', ' + prossimoPassaggio(s, adesso).toLowerCase() + '</span>';
    }

    // --- evidenzia la riga del giorno corrente ---
    var righe = document.querySelectorAll('.orari-tabella tr[data-giorno]');
    for (var i = 0; i < righe.length; i++) {
      var riga = righe[i];
      var oggi = Number(riga.getAttribute('data-giorno')) === adesso.getDay();
      riga.classList.toggle('is-oggi', oggi);

      // L'etichetta "Oggi" si aggiunge una volta sola, non a ogni giro
      var tag = riga.querySelector('.oggi-tag');
      if (oggi && !tag) {
        tag = document.createElement('span');
        tag.className = 'oggi-tag';
        tag.textContent = 'Oggi';
        riga.querySelector('th').appendChild(tag);
      } else if (!oggi && tag) {
        tag.remove();
      }
    }
  }

  aggiornaStato();
  // Ricontrollo ogni minuto: se la pagina resta aperta lo stato resta corretto
  // (e a mezzanotte si sposta da solo sul giorno nuovo).
  setInterval(aggiornaStato, 60000);

  /* ---------------------------------------------------------------
     4. MOTORE DELLE ANIMAZIONI (GSAP + ScrollTrigger + Lenis)
     Le librerie sono servite dal sito stesso, non da CDN: vedi il
     commento in fondo a index.html e js/lib/LICENZE.txt.

     Regola di fondo: NESSUN contenuto e' nascosto dal CSS. Le opacita'
     di partenza le imposta GSAP a runtime con .from(). Cosi' se una
     libreria non carica, o l'utente ha JavaScript spento, la pagina si
     vede tutta lo stesso: niente sezioni bianche.
     --------------------------------------------------------------- */
  var pocoMoto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var haGsap   = typeof window.gsap === 'function' || typeof window.gsap === 'object';
  var haScroll = haGsap && typeof window.ScrollTrigger !== 'undefined';
  var haLenis  = typeof window.Lenis !== 'undefined';
  var animato  = haGsap && haScroll && !pocoMoto;

  var lenis = null;

  if (animato) {
    gsap.registerPlugin(ScrollTrigger);

    /* --- Lenis: scorrimento con inerzia -------------------------- */
    if (haLenis) {
      lenis = new Lenis({
        duration: 1.05,        // quanto "scivola" dopo la rotella
        smoothWheel: true,
        touchMultiplier: 1.6   // sul touch il sistema e' gia' fluido: tocco leggero
      });
      // Lenis e ScrollTrigger devono battere lo stesso tempo, altrimenti
      // le animazioni arrivano in ritardo di un fotogramma sullo scroll.
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (tempo) { lenis.raf(tempo * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    /* --- Titolo dell'hero, una parola alla volta ------------------
       Ogni parola finisce dentro due span: quello esterno taglia
       (overflow), quello interno e' cio' che sale. Serve l'effetto
       "la parola emerge da sotto la riga". --------------------------- */
    function spezzaInParole(radice) {
      var testi = [], parole = [];
      (function raccogli(n) {
        for (var i = 0; i < n.childNodes.length; i++) {
          var c = n.childNodes[i];
          if (c.nodeType === 3 && c.textContent.trim()) testi.push(c);
          else if (c.nodeType === 1) raccogli(c);
        }
      })(radice);

      testi.forEach(function (nodo) {
        var pezzo = document.createDocumentFragment();
        nodo.textContent.split(/(\s+)/).forEach(function (p) {
          if (!p.trim()) { pezzo.appendChild(document.createTextNode(p)); return; }
          var fuori = document.createElement('span');
          fuori.className = 'parola';
          var dentro = document.createElement('span');
          dentro.className = 'parola-int';
          dentro.textContent = p;
          fuori.appendChild(dentro);
          pezzo.appendChild(fuori);
          parole.push(dentro);
        });
        nodo.parentNode.replaceChild(pezzo, nodo);
      });
      return parole;
    }

    var titolo = document.getElementById('hero-title');
    var parole = titolo ? spezzaInParole(titolo) : [];

    var entrata = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (parole.length) {
      entrata.from(parole, { yPercent: 118, duration: .95, stagger: .075 }, .1);
    }
    entrata
      .from('.hero-kicker',  { autoAlpha: 0, y: 16, duration: .7 }, 0)
      .from('.hero-sub',     { autoAlpha: 0, y: 18, duration: .7 }, .45)
      .from('.hero-actions', { autoAlpha: 0, y: 20, duration: .7 }, .58)
      .from('.hero-status',  { autoAlpha: 0, duration: .6 }, .72);

    /* --- Comparsa delle sezioni ----------------------------------
       La sezione compare SOLO in dissolvenza, senza spostarsi: se si
       spostasse, i link del menu si fermerebbero nel punto sbagliato
       (il browser calcola la destinazione mentre e' ancora traslata).
       A muoversi sono le card, che stando dentro non spostano il
       bordo superiore della sezione. --------------------------------- */
    gsap.utils.toArray('[data-reveal]').forEach(function (sez) {
      gsap.from(sez, {
        autoAlpha: 0, duration: .8, ease: 'power2.out',
        scrollTrigger: { trigger: sez, start: 'top 85%' }
      });

      var figli = sez.querySelectorAll('.card, .galleria-box');
      if (figli.length) {
        gsap.from(figli, {
          autoAlpha: 0, y: 26, duration: .6, ease: 'power2.out', stagger: .06,
          scrollTrigger: { trigger: sez, start: 'top 78%' }
        });
      }
    });

    /* --- Filetto sotto i titoli, disegnato da sinistra ------------ */
    gsap.utils.toArray('.sezione-titolo').forEach(function (t) {
      gsap.fromTo(t, { '--filetto': 0 }, {
        '--filetto': 1, duration: .8, ease: 'power2.out',
        scrollTrigger: { trigger: t, start: 'top 88%' }
      });
    });

    /* --- Parallasse ----------------------------------------------
       scrub: true = l'animazione e' legata alla posizione dello
       scorrimento, non parte e finisce da sola. Spostamenti piccoli:
       oltre il 10% si nota il trucco e da' fastidio. ----------------- */
    gsap.to('.hero-foto', {
      yPercent: 11, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero-logo', {
      yPercent: 18, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // Le foto della galleria scorrono piu' piano del riquadro che le
    // contiene. Restano ingrandite del 12% per tutta la corsa, altrimenti
    // muovendosi scoprirebbero i bordi del riquadro.
    gsap.utils.toArray('.galleria-box img').forEach(function (img) {
      gsap.fromTo(img,
        { yPercent: -5, scale: 1.12 },
        { yPercent: 5,  scale: 1.12, ease: 'none',
          scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // I font arrivano dopo il primo calcolo: senza questo, i punti di
    // partenza delle animazioni restano tarati sul testo di ripiego.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }

  /* ---------------------------------------------------------------
     5. SCORRIMENTO AI LINK INTERNI
     Con Lenis attivo lo scorrimento lo gestisce lui, altrimenti resta
     quello nativo del browser (scroll-behavior nel CSS). In entrambi i
     casi ci si ferma sotto le due barre fisse.
     --------------------------------------------------------------- */
  function altezzaBarreFisse() {
    var barra = document.querySelector('.demo-bar');
    var testa = document.getElementById('site-header');
    return (barra ? barra.offsetHeight : 0) + (testa ? testa.offsetHeight : 0) + 8;
  }

  if (lenis) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id === '#' || a.getAttribute('aria-disabled') === 'true') return;
      var meta = document.querySelector(id);
      if (!meta) return;
      e.preventDefault();
      lenis.scrollTo(meta, { offset: -altezzaBarreFisse() });
    });
  }

  /* ---------------------------------------------------------------
     6. EFFETTI LEGATI ALLO SCORRIMENTO
     Barra di avanzamento, ombra dell'header e voce di menu attiva.
     Un solo listener con requestAnimationFrame: il calcolo viene fatto
     una volta per fotogramma, non a ogni evento di scorrimento.
     --------------------------------------------------------------- */
  var barra  = document.getElementById('scroll-barra');
  var inCoda = false;

  function suScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (barra) {
      var totale = document.documentElement.scrollHeight - window.innerHeight;
      barra.style.width = (totale > 0 ? Math.min(y / totale, 1) * 100 : 0) + '%';
    }
    inCoda = false;
  }
  function programmaScroll() {
    if (inCoda) return;
    inCoda = true;
    window.requestAnimationFrame(suScroll);
  }
  suScroll();
  window.addEventListener('scroll', programmaScroll, { passive: true });
  window.addEventListener('resize', programmaScroll, { passive: true });

  // Voce di menu della sezione che si sta guardando
  if ('IntersectionObserver' in window) {
    var voci = {};
    document.querySelectorAll('.nav-list a[href^="#"]').forEach(function (a) {
      voci[a.getAttribute('href').slice(1)] = a;
    });
    var spia = new IntersectionObserver(function (entrate) {
      entrate.forEach(function (e) {
        var voce = voci[e.target.id];
        if (!voce || !e.isIntersecting) return;
        for (var k in voci) voci[k].classList.remove('is-attivo');
        voce.classList.add('is-attivo');
      });
    }, { rootMargin: '-33% 0px -60% 0px' });
    Object.keys(voci).forEach(function (id) {
      var sez = document.getElementById(id);
      if (sez) spia.observe(sez);
    });
  }

  /* ---------------------------------------------------------------
     7. ANNO NEL FOOTER
     --------------------------------------------------------------- */
  var anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // Data di "ultimo aggiornamento" sul segnaposto della privacy policy
  var dataPagina = document.getElementById('data-pagina');
  if (dataPagina) {
    dataPagina.textContent = new Date().toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /* ---------------------------------------------------------------
     8. LINK NON ANCORA COLLEGATI
     I bottoni con aria-disabled (Facebook, recensioni Google) hanno
     ancora href="#": senza questo blocco riporterebbero l'utente in
     cima alla pagina, sembrando rotti. Da togliere quando i link
     veri saranno inseriti.
     --------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var todo = e.target.closest('[aria-disabled="true"]');
    if (todo) e.preventDefault();
  });

})();
