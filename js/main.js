/**
 * CDP Platform — main.js
 * Bootstrap 5.3 compatible. Targets .cdp-nav (Bootstrap navbar).
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Navbar scroll: transparent → solid dark ── */
  var nav = document.querySelector('.cdp-nav');
  if (nav) {
    /* Only pages with a dark hero have a transparent state to return to.
       Elsewhere the bar stays solid — the scroll handler used to strip
       .scrolled back off at the top of the page, leaving contact.html with
       a see-through navbar and menu. */
    if (!document.querySelector('.cdp-hero')) {
      nav.classList.add('scrolled');
    } else {
      var onScroll = function () {
        nav.classList.toggle('scrolled', window.scrollY > 80);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* ── Smooth scroll for in-page anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var offset = 80; // navbar height
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  });

  /* ── IntersectionObserver: fade-up on scroll ── */
  var fadeEls = document.querySelectorAll('.fade-up');
  function revealAll() {
    fadeEls.forEach(function (el) { el.classList.add('visible'); });
  }
  if (!fadeEls.length) {
    /* nothing to reveal */
  } else if (reduceMotion || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var fadeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(function (el) { fadeIO.observe(el); });
    /* Safety net: if anything is still hidden after load, show it rather
       than leaving the page blank. */
    window.addEventListener('load', function () {
      setTimeout(function () {
        fadeEls.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('visible');
        });
      }, 600);
    });
  }
  /* Only drop the no-JS guard once the reveal path above is wired. */
  document.documentElement.classList.remove('no-js');

  /* ── Counter animation on hero stat cards ── */
  function animateCounter(el) {
    var raw = el.getAttribute('data-counter');
    if (!raw) return;
    var target = parseFloat(raw);
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var isFloat = raw.indexOf('.') !== -1;
    var duration = 1600;
    var start = null;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var value = easeOut(progress) * target;
      var display = isFloat ? value.toFixed(1) : Math.round(value).toLocaleString();
      el.textContent = prefix + display + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counterEls = document.querySelectorAll('[data-counter]');
  if (counterEls.length && !reduceMotion && 'IntersectionObserver' in window) {
    var counterIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counterEls.forEach(function (el) { counterIO.observe(el); });
  }

  /* ── ROI Calculator ── */
  var roiGuests = document.getElementById('roi-guests');
  var roiAov    = document.getElementById('roi-aov');
  var roiFreq   = document.getElementById('roi-freq');

  /* Model assumptions ─ all tunable in one place.
     Uplifts apply only to the reachable audience (guests you can actually
     contact and who still engage), not to the entire database. */
  var REACHABLE  = 0.35;  // share of the guest DB that is contactable + engaged
  var MARGIN     = 0.30;  // contribution margin on incremental covers
  var OFFER_RATE = 0.08;  // average discount given on campaign-driven revenue

  /* Charge the plan the guest count would actually land on. */
  function planFor(guests) {
    if (guests <= 10000) return { name: 'Starter',    cost: 79  };
    if (guests <= 50000) return { name: 'Growth',     cost: 199 };
    return                      { name: 'Enterprise', cost: 499 };
  }

  function fmt(n) {
    var a = Math.abs(n);
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e5) return '$' + Math.round(n / 1e3).toLocaleString() + 'K';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n).toLocaleString();
  }

  function updateRoi() {
    if (!roiGuests) return;
    var guests = parseInt(roiGuests.value, 10);
    var aov    = parseFloat(roiAov.value);
    var freq   = parseFloat(roiFreq.value);

    // Update display labels
    var gv = document.getElementById('roi-guests-val');
    var av = document.getElementById('roi-aov-val');
    var fv = document.getElementById('roi-freq-val');
    if (gv) gv.textContent = guests.toLocaleString();
    if (av) av.textContent = '$' + aov;
    if (fv) fv.textContent = freq + '×';

    /* Only guests you can reach can be moved by a campaign. */
    var reachable = guests * REACHABLE;
    var atRisk    = reachable * 0.15;
    var returning = reachable * 0.45;
    var churned   = reachable * 0.08;

    var winback    = atRisk    * 0.22 * aov;         // 22% win back one visit
    var freqUplift = returning * 0.18 * aov;         // +0.18 visits/mo
    var ticketUp   = reachable * freq * aov * 0.08;  // 8% larger ticket
    var reactivate = churned   * 0.12 * aov;         // 12% reactivation

    var monthly = winback + freqUplift + ticketUp + reactivate;
    var annual  = monthly * 12;

    /* Real ROI: incremental gross profit measured against what you actually
       spend to earn it ─ the platform fee plus the discounts handed out.
       (The old version divided gross revenue by the plan price, which
       produced meaningless 700x figures.) */
    var plan        = planFor(guests);
    var grossProfit = monthly * MARGIN;
    var investment  = plan.cost + monthly * OFFER_RATE;
    var roi         = investment > 0 ? grossProfit / investment : 0;

    var levers = [winback, freqUplift, ticketUp, reactivate];
    levers.forEach(function (value, i) {
      var cell = document.getElementById('roi-row' + (i + 1));
      if (cell) cell.textContent = '+' + fmt(value) + '/mo';
    });

    var rt = document.getElementById('roi-total');
    if (rt) rt.textContent = '+' + fmt(monthly) + '/mo';

    var rm = document.getElementById('roi-monthly');
    var ra = document.getElementById('roi-annual');
    var rr = document.getElementById('roi-multiple');
    var rb = document.getElementById('roi-basis');
    if (rm) rm.textContent = '+' + fmt(monthly);
    if (ra) ra.textContent = '+' + fmt(annual);
    if (rr) rr.textContent = roi.toFixed(1) + '×';
    if (rb) rb.textContent = 'Gross profit vs spend on the ' + plan.name +
                             ' plan ($' + plan.cost + '/mo) plus offer costs';
  }

  if (roiGuests) {
    roiGuests.addEventListener('input', updateRoi);
    roiAov.addEventListener('input', updateRoi);
    roiFreq.addEventListener('input', updateRoi);
    updateRoi();
  }

  /* ── Active nav link on scroll ── */
  var sections = document.querySelectorAll('section[id], footer[id]');
  var navLinks = document.querySelectorAll('.cdp-nav .nav-link[href^="#"]');
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          navLinks.forEach(function (link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            }
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { sectionIO.observe(s); });
  }

})();
