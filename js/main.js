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
     4. COMPARSA DELLE SEZIONI
     Le sezioni salgono di poco entrando in vista; card e foto entrano
     una dopo l'altra con un ritardo crescente, non tutte insieme.
     Se l'utente ha attivato "riduci animazioni" non tocchiamo nulla:
     il CSS le lascia gia' visibili.
     --------------------------------------------------------------- */
  var pocoMoto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var puoOsservare = !pocoMoto && 'IntersectionObserver' in window;

  if (puoOsservare) {
    var mostra = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (!v.isIntersecting) return;
        v.target.classList.add('is-visible');
        mostra.unobserve(v.target);      // una volta comparso, basta
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(function (sezione) {
      sezione.classList.add('reveal');
      mostra.observe(sezione);

      // Cascata sugli elementi ripetuti della sezione
      var figli = sezione.querySelectorAll('.card, .galleria-box');
      figli.forEach(function (el, i) {
        el.classList.add('reveal-item');
        // il ritardo si ferma a 320ms: oltre, l'ultima card arriva tardi
        el.style.setProperty('--ritardo', Math.min(i * 55, 320) + 'ms');
        mostra.observe(el);
      });
    });
  } else {
    // Nessun osservatore disponibile: le sezioni restano visibili,
    // cosi' il filetto sotto i titoli viene comunque disegnato.
    document.querySelectorAll('[data-reveal]').forEach(function (s) {
      s.classList.add('is-visible');
    });
  }

  /* ---------------------------------------------------------------
     5. EFFETTI LEGATI ALLO SCORRIMENTO
     Barra di avanzamento, voce di menu attiva e parallasse dell'emblema.
     Tutto dentro un solo listener con requestAnimationFrame: il calcolo
     viene fatto una volta per fotogramma, non a ogni evento di scroll
     (altrimenti su telefono si vedrebbero gli scatti).
     --------------------------------------------------------------- */
  var barra    = document.getElementById('scroll-barra');
  var emblema  = document.querySelector('.hero-emblema');
  var inCoda   = false;

  function suScroll() {
    var y = window.scrollY;

    // ombra sull'header
    if (header) header.classList.toggle('is-scrolled', y > 12);

    // avanzamento della lettura, da 0 a 100%
    if (barra) {
      var totale = document.documentElement.scrollHeight - window.innerHeight;
      barra.style.width = (totale > 0 ? Math.min(y / totale, 1) * 100 : 0) + '%';
    }

    // l'emblema dell'hero scorre piu' lentamente della pagina
    if (emblema && !pocoMoto) {
      emblema.style.setProperty('--py', (y * 0.18) + 'px');
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

  /* ---------------------------------------------------------------
     6. VOCE DI MENU DELLA SEZIONE CORRENTE
     Un secondo osservatore, con una fascia stretta a un terzo dall'alto:
     e' attiva la sezione che sta attraversando quella fascia.
     --------------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    var voci = {};
    document.querySelectorAll('.nav-list a[href^="#"]').forEach(function (a) {
      voci[a.getAttribute('href').slice(1)] = a;
    });

    var spia = new IntersectionObserver(function (entrate) {
      entrate.forEach(function (e) {
        var voce = voci[e.target.id];
        if (!voce) return;
        if (e.isIntersecting) {
          for (var k in voci) voci[k].classList.remove('is-attivo');
          voce.classList.add('is-attivo');
        }
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
