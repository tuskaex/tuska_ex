/* Speed Trade Technologies — site interactions */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header state on scroll ---------- */
  var header = document.getElementById("header");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation ---------- */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        // Stagger siblings that enter together
        var siblings = Array.prototype.filter.call(entry.target.parentElement.children, function (el) {
          return el.classList.contains("reveal");
        });
        entry.target.style.transitionDelay = Math.min(siblings.indexOf(entry.target) * 90, 450) + "ms";
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Hero typewriter (endless loop through headlines) ---------- */
  // Each headline is typed, held, deleted, then the next one starts. Untyped text stays
  // in the DOM as invisible "ghost" text so the centred lines never shift while typing.
  var HEADLINES = [
    ["Platform technology built for ", "speed."],
    ["Real-time data, delivered at ", "scale."],
    ["White-label platforms, launched ", "faster."],
    ["Secure infrastructure you can ", "trust."],
    ["Desktop, web and mobile in ", "one platform."],
    ["Open APIs that connect ", "everything."],
    ["Cloud-native systems built to ", "grow."],
    ["Enterprise-grade security, ", "by design."],
    ["Data that powers smarter ", "decisions."],
    ["Your brand, powered by ", "our engine."],
    ["Financial technology, engineered in ", "Malaysia."],
    ["Low-latency systems that never ", "sleep."]
  ];
  var TYPE_MS = 65, DELETE_MS = TYPE_MS, HOLD_MS = 2200, GAP_MS = 400;

  var heroTitle = document.getElementById("heroTitle");
  var heroType = document.getElementById("heroType");

  function piece(text, cls) {
    var span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text;
    return span;
  }

  // Renders a headline with the first `count` characters visible
  function renderHeadline(target, headline, count, caret) {
    var segments = [{ text: headline[0], cls: "" }, { text: headline[1], cls: "gradient-text" }];
    target.textContent = "";
    var left = count;
    segments.forEach(function (seg) {
      var shown = Math.max(0, Math.min(seg.text.length, left));
      left -= seg.text.length;
      if (shown) target.appendChild(piece(seg.text.slice(0, shown), seg.cls));
      if (shown < seg.text.length) {
        if (caret && !caret.parentNode) target.appendChild(caret);
        target.appendChild(piece(seg.text.slice(shown), (seg.cls ? seg.cls + " " : "") + "type-ghost"));
      }
    });
    if (caret && !caret.parentNode) target.appendChild(caret);
  }

  // Reserve the height of the tallest headline so the hero never jumps between lines
  function reserveHeight() {
    var probe = heroType.cloneNode(false);
    probe.removeAttribute("id");
    probe.style.cssText = "position:absolute;visibility:hidden;left:0;top:0;width:" + heroType.offsetWidth + "px";
    heroTitle.appendChild(probe);
    var max = 0;
    HEADLINES.forEach(function (h) {
      renderHeadline(probe, h, h[0].length + h[1].length, null);
      max = Math.max(max, probe.offsetHeight);
    });
    heroTitle.removeChild(probe);
    heroTitle.style.minHeight = max + "px";
  }

  if (heroTitle && heroType && !reduceMotion) {
    var caret = document.createElement("span");
    caret.className = "type-caret";
    var index = 0;

    var loop = function () {
      var headline = HEADLINES[index];
      var total = headline[0].length + headline[1].length;
      var count = 0;

      (function type() {
        renderHeadline(heroType, headline, ++count, caret);
        if (count < total) return setTimeout(type, TYPE_MS);
        setTimeout(function erase() {
          renderHeadline(heroType, headline, --count, caret);
          if (count > 0) return setTimeout(erase, DELETE_MS);
          index = (index + 1) % HEADLINES.length;
          setTimeout(loop, GAP_MS);
        }, HOLD_MS);
      })();
    };

    var start = function () {
      reserveHeight();
      renderHeadline(heroType, HEADLINES[0], 0, caret);
      setTimeout(loop, 350);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    else start();

    var heightTimer;
    window.addEventListener("resize", function () {
      clearTimeout(heightTimer);
      heightTimer = setTimeout(reserveHeight, 150);
    });
  }

  /* ---------- Active nav link ---------- */
  var navLinks = nav.querySelectorAll('a[href^="#"]:not(.btn)');
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { sectionObserver.observe(s); });
  }

  /* ---------- Card hover effects ---------- */
  // Every card gets a cursor-following glow, an animated brand border and a light sweep
  // (styled in CSS). Mouse users also get a subtle 3D tilt toward the pointer.
  var CARD_SELECTOR = ".service, .platform, .insight, .module, .solution, .spec, .values > div";
  var canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion;

  document.querySelectorAll(CARD_SELECTOR).forEach(function (card) {
    card.classList.add("fx-card");
    ["fx-glow", "fx-border", "fx-shine"].forEach(function (cls) {
      var layer = document.createElement("span");
      layer.className = cls;
      layer.setAttribute("aria-hidden", "true");
      card.appendChild(layer);
    });

    // Cards that fade in on scroll must finish that transition before hover takes over
    var markReady = function () {
      card.style.transitionDelay = "";
      card.classList.add("fx-ready");
    };
    if (card.classList.contains("reveal") && !card.classList.contains("is-visible")) {
      card.addEventListener("transitionend", markReady, { once: true });
    } else {
      markReady();
    }

    if (!canTilt) return;
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      if (card.classList.contains("fx-ready")) {
        card.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * 7).toFixed(2) + "deg) rotateY(" +
          ((x - 0.5) * 9).toFixed(2) + "deg) translateY(-6px)";
      }
    });
    card.addEventListener("pointerleave", function () {
      card.style.transform = "";
    });
  });

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Hero network animation ---------- */
  var canvas = document.getElementById("heroCanvas");
  if (canvas && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var points = [];
    var width = 0, height = 0, running = true;

    function resize() {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(90, (width * height) / 16000));
      points = [];
      for (var i = 0; i < count; i++) {
        points.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      var maxDist = 130;
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        for (var j = i + 1; j < points.length; j++) {
          var q = points[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) {
            ctx.strokeStyle = "rgba(1, 182, 252," + (0.16 * (1 - d / maxDist)) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(120, 200, 255, 0.75)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    // Pause when the hero is off-screen to save battery
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var visible = entries[0].isIntersecting;
        if (visible && !running) { running = true; requestAnimationFrame(draw); }
        else if (!visible) { running = false; }
      }).observe(canvas);
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    resize();
    requestAnimationFrame(draw);
  }

  /* ---------- Contact form ---------- */
  // No server backend: validates, then opens the visitor's email app with the message pre-filled.
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  var CONTACT_EMAIL = "info@speedtrade.com.my";

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var invalid = [];
    form.querySelectorAll("[required]").forEach(function (field) {
      var ok = field.value.trim() !== "" && (field.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));
      field.classList.toggle("is-invalid", !ok);
      if (!ok) invalid.push(field);
    });

    if (invalid.length) {
      note.className = "form-note is-error";
      note.textContent = "Please fill in your name, a valid email and a message.";
      invalid[0].focus();
      return;
    }

    var data = new FormData(form);
    var subject = "Website enquiry: " + data.get("service");
    var body = [
      "Name: " + data.get("name"),
      "Company: " + (data.get("company") || "-"),
      "Email: " + data.get("email"),
      "Phone: " + (data.get("phone") || "-"),
      "I am a: " + data.get("role"),
      "Interested in: " + data.get("service"),
      "",
      data.get("message")
    ].join("\n");

    window.location.href = "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    note.className = "form-note is-success";
    note.textContent = "Your email app should open with your message ready to send.";
  });

  form.addEventListener("input", function (e) {
    e.target.classList.remove("is-invalid");
  });
})();
