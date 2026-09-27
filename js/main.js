/**
 * CDP Platform — main.js
 * Bootstrap 5.3 compatible. Targets .cdp-nav (Bootstrap navbar).
 */
(function () {
  'use strict';

  /* ── Navbar scroll: transparent → solid dark ── */
  var nav = document.querySelector('.cdp-nav');
  if (nav) {
    function onScroll() {
      if (window.scrollY > 80) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Ensure navbar is solid on pages without a hero ── */
  if (nav && !document.querySelector('.cdp-hero')) {
    nav.classList.add('scrolled');
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
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* ── IntersectionObserver: fade-up on scroll ── */
  var fadeEls = document.querySelectorAll('.fade-up');
  if (fadeEls.length && 'IntersectionObserver' in window) {
    var fadeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(function (el) { fadeIO.observe(el); });
  }

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
  if (counterEls.length && 'IntersectionObserver' in window) {
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

  function fmt(n) {
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
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

    // Revenue lever calculations (conservative estimates)
    var atRisk   = Math.round(guests * 0.15);  // 15% are at-risk
    var returning = Math.round(guests * 0.45); // 45% returning
    var all       = guests;
    var churned   = Math.round(guests * 0.08); // 8% churned

    var winback    = atRisk * 0.22 * aov;                    // 22% win-back, one visit
    var freqUplift = returning * 0.18 * aov;                 // +18% visit increase
    var ticketUp   = all * freq * aov * 0.08;                // 8% ticket size uplift
    var reactivate = churned * 0.12 * aov;                   // 12% reactivation

    var monthly = winback + freqUplift + ticketUp + reactivate;
    var annual  = monthly * 12;
    var planCost = 199; // Growth plan reference
    var roi = (monthly / planCost).toFixed(1) + '×';

    var r1 = document.getElementById('roi-row1');
    var r2 = document.getElementById('roi-row2');
    var r3 = document.getElementById('roi-row3');
    var r4 = document.getElementById('roi-row4');
    if (r1) r1.textContent = '+' + fmt(winback) + '/mo';
    if (r2) r2.textContent = '+' + fmt(freqUplift) + '/mo';
    if (r3) r3.textContent = '+' + fmt(ticketUp) + '/mo';
    if (r4) r4.textContent = '+' + fmt(reactivate) + '/mo';

    var rm = document.getElementById('roi-monthly');
    var ra = document.getElementById('roi-annual');
    var rr = document.getElementById('roi-multiple');
    if (rm) rm.textContent = '+' + fmt(monthly);
    if (ra) ra.textContent = '+' + fmt(annual);
    if (rr) rr.textContent = roi + ' ROI';
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
