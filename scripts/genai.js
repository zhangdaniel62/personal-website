// scripts/genai.js (Aesthetic-tuned palettes)

(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

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
    try { localStorage.setItem("theme", next); } catch (_) {}
  }
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
  // Color utilities
  // ---------------------------
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function hslToHex(h, s, l) {
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
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return 0;
    let [r, g, b] = [m[1], m[2], m[3]].map(v => parseInt(v, 16) / 255);
    const f = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055)/1.055, 2.4));
    [r,g,b] = [f(r), f(g), f(b)];
    return 0.2126*r + 0.7152*g + 0.0722*b;
  }
  const textColorFor = hex => (relativeLuminance(hex) > 0.42 ? "#111111" : "#ffffff");

  // Random helpers
  function rand() {
    if (window.crypto && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] / 2**32;
    }
    return Math.random();
  }
  const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const randFloat = (min, max) => rand() * (max - min) + min;

  // ---------------------------
  // Aesthetic palette logic
  // ---------------------------

  // Weighted pick favors harmonious schemes
  function weightedPick(items) {
    const total = items.reduce((a, b) => a + b.w, 0);
    let r = rand() * total;
    for (const it of items) {
      if ((r -= it.w) <= 0) return it.v;
    }
    return items[0].v;
  }

  const schemeWeights = [
    { v: "analogous+accent",      w: 0.42 },
    { v: "split-complementary",   w: 0.32 },
    { v: "complementary",         w: 0.16 },
    { v: "tetradic",              w: 0.10 },
  ];

  const normalizeHue = h => (h % 360 + 360) % 360;

  // Smaller, tasteful offsets and a touch of golden-angle spacing to avoid blandness
  const GOLDEN = 137.5;

  function buildHuesAesthetic(baseHue) {
    const scheme = weightedPick(schemeWeights);
    const j = () => randFloat(-8, 8);        // gentle jitter
    const g = k => normalizeHue(baseHue + k * GOLDEN * 0.12 + j()); // tiny golden push

    switch (scheme) {
      case "analogous+accent": {
        // tight cluster + distant accent
        const a = normalizeHue(baseHue - 28 + j());
        const b = normalizeHue(baseHue + j());
        const c = normalizeHue(baseHue + 28 + j());
        const accent = normalizeHue(baseHue + 180 + j());
        return [a, b, c, accent];
      }
      case "split-complementary": {
        const main = normalizeHue(baseHue + j());
        const s1 = normalizeHue(baseHue + 150 + j());
        const s2 = normalizeHue(baseHue + 210 + j());
        // a gentle neighbor for cohesion
        const near = normalizeHue(baseHue + 20 + j());
        return [main, s1, s2, near];
      }
      case "complementary": {
        const main = normalizeHue(baseHue + j());
        const comp = normalizeHue(baseHue + 180 + j());
        const near1 = normalizeHue(baseHue + 24 + j());
        const near2 = normalizeHue(baseHue + 204 + j()); // near complement neighbor
        return [main, comp, near1, near2];
      }
      case "tetradic":
      default: {
        const h1 = normalizeHue(baseHue + j());
        const h2 = normalizeHue(baseHue + 90 + j());
        const h3 = normalizeHue(baseHue + 180 + j());
        const h4 = normalizeHue(baseHue + 270 + j());
        // Nudge one with golden hint
        return [h1, g(1), h3, g(2)];
      }
    }
  }

  // Tone roles with curated HSL ranges:
  // - Soft: airy pastel for backgrounds
  // - Accent: the star color
  // - Muted: balanced supporting tone
  // - Deep: grounding shade for contrast
  const TONES = {
    Soft:   { s: [24, 38],  l: [78, 86] },
    Accent: { s: [60, 72],  l: [50, 58] },
    Muted:  { s: [26, 38],  l: [58, 66] },
    Deep:   { s: [38, 52],  l: [32, 40] },
  };

  // Slightly bias certain hues to be less neon (e.g., yellows can be too bright)
  function toneAdjustments(h, tone) {
    let sBoost = 0, lTrim = 0;
    // Yellows: lower L a bit to avoid glare
    if (h >= 45 && h <= 70) {
      if (tone === "Soft") lTrim = 4;
      if (tone === "Accent") lTrim = 2;
    }
    // Blue-cyans can handle a touch more saturation on accent
    if ((h >= 180 && h <= 220) && tone === "Accent") {
      sBoost = 4;
    }
    return { sBoost, lTrim };
  }

  function pickTone(toneName, hue) {
    const t = TONES[toneName];
    const { sBoost, lTrim } = toneAdjustments(hue, toneName);
    const s = clamp(randInt(t.s[0], t.s[1]) + sBoost, 18, 85);
    const l = clamp(randInt(t.l[0], t.l[1]) - lTrim, 28, 88);
    return hslToHex(hue, s, l);
  }

  function generatePalette(seedHexOrNull) {
    // Seed handling
    let h, s, l;
    if (seedHexOrNull) {
      const hsl = hexToHsl(seedHexOrNull);
      if (!hsl) { h = randInt(0, 359); s = randInt(55, 70); l = randInt(45, 60); }
      else { h = hsl.h; s = clamp(hsl.s, 38, 75); l = clamp(hsl.l, 40, 62); }
    } else {
      h = randInt(0, 359);
      s = randInt(55, 70);
      l = randInt(45, 60);
    }

    // Build aesthetic hues
    const hues = buildHuesAesthetic(h);

    // Assign tone roles to hues with a pleasing mapping:
    // [Soft -> hues[0]], [Accent -> hues[1]], [Muted -> hues[2]], [Deep -> hues[3]]
    // Then lightly shuffle to keep variety across clicks.
    const roles = [
      { role: "Soft",   hue: hues[0] },
      { role: "Accent", hue: hues[1] },
      { role: "Muted",  hue: hues[2] },
      { role: "Deep",   hue: hues[3] },
    ];

    // Convert to HEX based on tone-specific S/L ranges
    const colors = roles.map(({ role, hue }) => pickTone(role, hue));

    // Ensure variety across repeated clicks: random swap a couple pairs
    const swap = (a, i, j) => ([a[i], a[j]] = [a[j], a[i]]);
    if (rand() > 0.5) swap(colors, 0, 1);
    if (rand() > 0.5) swap(colors, 2, 3);

    // Deduplicate edge-case collisions
    const uniq = Array.from(new Set(colors));
    while (uniq.length < 4) {
      uniq.push(hslToHex(normalizeHue(h + randInt(10, 60)), randInt(45, 65), randInt(45, 60)));
    }
    return uniq.slice(0, 4);
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
          .then(() => { copyBtn.textContent = "Copied!"; setTimeout(() => (copyBtn.textContent = "Copy"), 900); })
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
    // Allow 3-digit? Sticking to 6-digit for clarity.
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
