// scripts/genai.js

(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const styleLink = $("#style1");
  const themeBtn = $("#themeToggleBtn");
  const seedInput = $("#seedColor");
  const seedHexInput = $("#seedHex");
  const generateBtn = $("#generateBtn");
  const paletteEl = $("#palette");

  // ---------------------------
  // Theme toggle (CSS swap)
  // ---------------------------
  const LIGHT = "./styles/styles.css";
  const DARK = "./styles/styles-dark.css";

  function isDark() {
    return styleLink.getAttribute("href") === DARK;
  }

  function toggleTheme() {
    const next = isDark() ? LIGHT : DARK;
    styleLink.setAttribute("href", next);
    const pressed = isDark();
    themeBtn.setAttribute("aria-pressed", String(pressed));
    // Persist choice
    try { localStorage.setItem("theme", next); } catch (_) {}
  }

  // Restore last theme
  (function restoreTheme() {
    try {
      const saved = localStorage.getItem("theme");
      if (saved && (saved === LIGHT || saved === DARK)) {
        styleLink.setAttribute("href", saved);
        themeBtn.setAttribute("aria-pressed", String(saved === DARK));
      }
    } catch (_) {}
  })();

  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  // ---------------------------
  // Color utilities (HSL <-> HEX)
  // ---------------------------
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function hslToHex(h, s, l) {
    // h:[0,360), s,l:[0,100]
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(255 * x).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  function hexToHsl(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return null;
    const r = parseInt(m[1], 16) / 255;
    const g = parseInt(m[2], 16) / 255;
    const b = parseInt(m[3], 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h: (h + 360) % 360, s: s * 100, l: l * 100 };
  }

  function relativeLuminance(hex) {
    // For contrast-aware text color on swatches
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return 0;
    let [r, g, b] = [m[1], m[2], m[3]].map(v => parseInt(v, 16) / 255);
    const f = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055)/1.055, 2.4));
    [r,g,b] = [f(r), f(g), f(b)];
    return 0.2126*r + 0.7152*g + 0.0722*b;
  }

  const textColorFor = hex => (relativeLuminance(hex) > 0.42 ? "#111111" : "#ffffff");

  // Crypto-strong random if available
  function rand() {
    if (window.crypto && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] / 2**32;
    }
    return Math.random();
  }
  const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  // ---------------------------
  // Palette generation
  // ---------------------------
  const schemes = [
    "complementary",
    "split-complementary",
    "analogous+accent",
    "tetradic",
  ];

  function normalizeHue(h) { return (h % 360 + 360) % 360; }

  function buildHues(baseHue) {
    const scheme = schemes[randInt(0, schemes.length - 1)];
    const j = () => randInt(-10, 10); // small jitter

    switch (scheme) {
      case "complementary":
        return [
          normalizeHue(baseHue + j()),
          normalizeHue(baseHue + 180 + j()),
          normalizeHue(baseHue + 30 + j()),
          normalizeHue(baseHue + 210 + j()),
        ];
      case "split-complementary":
        return [
          normalizeHue(baseHue + j()),
          normalizeHue(baseHue + 150 + j()),
          normalizeHue(baseHue + 210 + j()),
          normalizeHue(baseHue + 330 + j()),
        ];
      case "analogous+accent":
        return [
          normalizeHue(baseHue - 30 + j()),
          normalizeHue(baseHue + j()),
          normalizeHue(baseHue + 30 + j()),
          normalizeHue(baseHue + 180 + j()),
        ];
      case "tetradic":
      default:
        return [
          normalizeHue(baseHue + j()),
          normalizeHue(baseHue + 90 + j()),
          normalizeHue(baseHue + 180 + j()),
          normalizeHue(baseHue + 270 + j()),
        ];
    }
  }

  function generatePalette(seedHexOrNull) {
    let h, s, l;
    if (seedHexOrNull) {
      const hsl = hexToHsl(seedHexOrNull);
      if (!hsl) { h = randInt(0, 359); s = randInt(55, 75); l = randInt(45, 60); }
      else { h = hsl.h; s = clamp(hsl.s, 45, 80); l = clamp(hsl.l, 35, 65); }
    } else {
      h = randInt(0, 359);
      s = randInt(55, 75);
      l = randInt(45, 60);
    }

    const hues = buildHues(h);
    // Vary S/L a bit per swatch for depth, but keep within pleasing ranges
    const colors = hues.map((hh, idx) => {
      const sVar = clamp(s + randInt(-8, 8), 45, 85);
      const lVar = clamp(l + [-8, -2, 2, 8][idx], 30, 70);
      return hslToHex(hh, sVar, lVar);
    });

    // Ensure variety on repeated clicks: shuffle order randomly
    for (let i = colors.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    return colors;
  }

  // ---------------------------
  // UI binding
  // ---------------------------
  function renderPalette(colors) {
    paletteEl.innerHTML = "";
    colors.forEach((hex, i) => {
      const sw = document.createElement("article");
      sw.className = "cg-swatch";
      sw.setAttribute("role", "button");
      sw.setAttribute("tabindex", "0");
      sw.setAttribute("aria-label", `Color ${i + 1} ${hex}`);

      const top = document.createElement("div");
      top.className = "cg-swatch-top";
      top.style.background = hex;
      top.style.color = textColorFor(hex);
      top.textContent = "";

      const hexRow = document.createElement("div");
      hexRow.className = "cg-swatch-hex";

      const code = document.createElement("span");
      code.textContent = hex.toUpperCase();

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "cg-copy-btn";
      copyBtn.textContent = "Copy";

      function copy() {
        navigator.clipboard?.writeText(hex.toUpperCase())
          .then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1000);
          })
          .catch(() => {});
      }

      copyBtn.addEventListener("click", (e) => { e.stopPropagation(); copy(); });
      sw.addEventListener("click", copy);
      sw.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copy(); } });

      hexRow.append(code, copyBtn);
      sw.append(top, hexRow);
      paletteEl.appendChild(sw);
    });
  }

  function sanitizeHex(str) {
    const v = str.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) return v;
    return null;
  }

  // Sync color input <-> hex input
  seedInput.addEventListener("input", () => {
    seedHexInput.value = seedInput.value;
  });
  seedHexInput.addEventListener("input", () => {
    const v = seedHexInput.value.trim();
    if (v.startsWith("#") && v.length === 7) {
      const ok = sanitizeHex(v);
      if (ok) seedInput.value = ok;
    }
  });

  generateBtn.addEventListener("click", () => {
    const seed = sanitizeHex(seedHexInput.value) || null;
    const colors = generatePalette(seed);
    renderPalette(colors);
  });

  // Initial palette
  renderPalette(generatePalette(sanitizeHex(seedHexInput.value)));

})();
