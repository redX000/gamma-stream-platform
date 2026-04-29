/**
 * @fileoverview Premium hero motion for gammacash.online.
 * Magnetic CTA, card tilt, stat counters, nav shrink, scroll parallax.
 * No external deps. Fully respects prefers-reduced-motion.
 * Inject via WordPress Code Snippets plugin (run everywhere) or as footer <script>.
 */
(function () {
  'use strict';

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var isTouch  = matchMedia('(pointer: coarse)').matches;
  var isMobile = function () { return window.innerWidth < 768; };

  // ── 1. Magnetic CTA button ────────────────────────────────────────
  if (!isTouch) {
    var btn = document.querySelector('.hero-cta-magnetic');
    if (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r  = this.getBoundingClientRect();
        var dx = e.clientX - r.left  - r.width  / 2;
        var dy = e.clientY - r.top   - r.height / 2;
        this.style.transform = 'translate(' + (dx * 0.18) + 'px,' + (dy * 0.18) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        this.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
        this.style.transform  = '';
        var self = this;
        setTimeout(function () { self.style.transition = ''; }, 600);
      });
    }
  }

  // ── 2. Card tilt (rotateX/Y on mouse-move) ───────────────────────
  if (!isTouch) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = this.getBoundingClientRect();
        var x =  ((e.clientX - r.left) / r.width  - 0.5) * 16;
        var y = -((e.clientY - r.top)  / r.height - 0.5) * 16;
        this.style.transform = 'perspective(600px) rotateX(' + y + 'deg) rotateY(' + x + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        this.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
        this.style.transform  = '';
        var self = this;
        setTimeout(function () { self.style.transition = ''; }, 600);
      });
    });
  }

  // ── 3. Stats counters (IntersectionObserver + rAF) ───────────────
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCount(el) {
    var target   = parseInt(el.dataset.target, 10);
    var prefix   = el.dataset.prefix  || '';
    var suffix   = el.dataset.suffix  || '';
    var duration = 1800;
    var start    = null;
    function tick(now) {
      if (!start) start = now;
      var t   = Math.min((now - start) / duration, 1);
      var val = Math.round(easeOutCubic(t) * target);
      el.textContent = prefix + val.toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll('.hero-stat-value[data-target]');
  if (counters.length && 'IntersectionObserver' in window) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          cObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { cObs.observe(c); });
  }

  // ── 4. Sticky nav/header shrink on scroll ────────────────────────
  var header = document.querySelector('.site-header, #masthead, header.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('gc-scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // ── 5. Hamburger menu toggle (for custom gs-nav if injected) ─────
  var hamburger  = document.querySelector('#gs-hamburger');
  var navLinks   = document.querySelector('#gs-nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  // ── 6. Scroll parallax (desktop only, rAF throttled) ─────────────
  if (!isMobile()) {
    var wraps = [
      { el: document.querySelector('.hero-card-wrap-1'), rate: -0.15 },
      { el: document.querySelector('.hero-card-wrap-2'), rate: -0.25 },
      { el: document.querySelector('.hero-card-wrap-3'), rate: -0.20 },
    ].filter(function (w) { return !!w.el; });

    if (wraps.length) {
      var raf = null;
      window.addEventListener('scroll', function () {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          if (isMobile()) return;
          var sy = window.scrollY;
          wraps.forEach(function (w) {
            w.el.style.transform = 'translateY(' + (sy * w.rate) + 'px)';
          });
        });
      }, { passive: true });
    }
  }

})();
