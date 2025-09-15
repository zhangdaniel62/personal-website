const THEMES = {
        light: "./styles/styles.css",
        dark: "./styles/dark-mode.css",
      };

      function applyStyle() {
        const theme = localStorage.getItem("theme") || "light";
        const linkElement = document.getElementById("style-element");
        if (linkElement) linkElement.href = THEMES[theme];
      }

      function changeStyle() {
        const current = localStorage.getItem("theme") || "light";
        const next = current === "light" ? "dark" : "light";
        localStorage.setItem("theme", next);
        applyStyle();
      }

      document.addEventListener("DOMContentLoaded", () => {
        applyStyle();
        document
          .getElementById("theme-toggle-btn")
          .addEventListener("click", changeStyle);
      });