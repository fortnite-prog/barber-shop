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
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri il menu');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var aperto = menu.classList.toggle('is-open');
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
     2. OMBRA SULL'HEADER QUANDO SI SCROLLA
     --------------------------------------------------------------- */
  var header = document.getElementById('site-header');
  if (header) {
    var aggiornaHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    aggiornaHeader();
    window.addEventListener('scroll', aggiornaHeader, { passive: true });
  }

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
  function prossimoPassaggio(s) {
    if (s.aperto) return 'Chiudiamo alle ' + hhmm(s.giorno.chiude);
    if (s.minuti < s.giorno.apre) return 'Apriamo alle ' + hhmm(s.giorno.apre);
    // Dopo la chiusura guardo il giorno dopo (il 7 serve per tornare a domenica)
    var domani = ORARI[(new Date().getDay() + 1) % 7];
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
    if (box) box.innerHTML = pastiglia(s.aperto) + prossimoPassaggio(s);

    // --- pastiglia sotto la tabella degli orari ---
    var stato = document.getElementById('orari-stato');
    if (stato) {
      stato.innerHTML = pastiglia(s.aperto) +
        '<span>' + s.giorno.nome + ', ' + prossimoPassaggio(s).toLowerCase() + '</span>';
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
     4. ANIMAZIONI DI COMPARSA
     Se l'utente ha attivato "riduci animazioni" non aggiungiamo nulla.
     --------------------------------------------------------------- */
  var pocoMoto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!pocoMoto && 'IntersectionObserver' in window) {
    var bersagli = document.querySelectorAll('[data-reveal]');
    var osservatore = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) {
          v.target.classList.add('is-visible');
          osservatore.unobserve(v.target);   // una volta comparso, basta
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    bersagli.forEach(function (el) {
      el.classList.add('reveal');
      osservatore.observe(el);
    });
  }

  /* ---------------------------------------------------------------
     5. ANNO NEL FOOTER
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
     6. LINK NON ANCORA COLLEGATI
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
