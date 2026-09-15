/**
 * RNSMUN 2026 - Multilingual Global Language Switcher
 * Provides zero-friction, client-side translation across 10 global & regional languages.
 */

(function () {
  const SUPPORTED_LANGS = [
    { code: "en", name: "English", native: "English", flag: "🇬🇧" },
    { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
    { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
    { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
    { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦" },
    { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
    { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
    { code: "zh-CN", name: "Chinese", native: "简体中文", flag: "🇨🇳" },
    { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" }
  ];

  function getSavedLang() {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-zA-Z\-]+)/);
    if (match && match[1]) return match[1];
    return localStorage.getItem("mun_user_lang") || "en";
  }

  function initGoogleTranslateEngine() {
    if (!document.getElementById("google_translate_element")) {
      const el = document.createElement("div");
      el.id = "google_translate_element";
      el.style.display = "none";
      document.body.appendChild(el);
    }

    window.googleTranslateElementInit = function () {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,es,fr,de,ar,ja,ru,zh-CN,hi,kn",
            autoDisplay: false
          },
          "google_translate_element"
        );
      } catch (err) {
        console.warn("Translation initialization notice:", err);
      }
    };

    if (!document.getElementById("google-translate-core-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-core-script";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.head.appendChild(script);
    }
  }

  function setLanguage(langCode) {
    const isEnglish = langCode === "en";
    const hostname = window.location.hostname;

    if (isEnglish) {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${hostname}; path=/;`;
      localStorage.removeItem("mun_user_lang");
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/;`;
      document.cookie = `googtrans=/en/${langCode}; domain=.${hostname}; path=/;`;
      localStorage.setItem("mun_user_lang", langCode);
    }

    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event("change"));
      updateUI(langCode);
    } else {
      window.location.reload();
    }
  }

  function updateUI(activeCode) {
    const langObj = SUPPORTED_LANGS.find((l) => l.code === activeCode) || SUPPORTED_LANGS[0];
    const flagEl = document.getElementById("munLangCurrentFlag");
    const codeEl = document.getElementById("munLangCurrentCode");
    const items = document.querySelectorAll(".mun-lang-item");

    if (flagEl) flagEl.textContent = langObj.flag;
    if (codeEl) codeEl.textContent = langObj.code.toUpperCase().replace("-CN", "");

    items.forEach((item) => {
      const code = item.getAttribute("data-lang");
      if (code === activeCode) {
        item.classList.add("is-selected");
      } else {
        item.classList.remove("is-selected");
      }
    });
  }

  function mountLanguageWidget() {
    if (document.getElementById("munLangWidgetRoot")) return;

    const currentCode = getSavedLang();
    const currentLang = SUPPORTED_LANGS.find((l) => l.code === currentCode) || SUPPORTED_LANGS[0];

    const widget = document.createElement("div");
    widget.id = "munLangWidgetRoot";
    widget.className = "mun-lang-widget";
    widget.innerHTML = `
      <button type="button" id="munLangToggleBtn" class="mun-lang-btn" aria-label="Change Language" aria-expanded="false">
        <span class="mun-lang-globe-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </span>
        <span class="mun-lang-flag" id="munLangCurrentFlag">${currentLang.flag}</span>
        <span class="mun-lang-code" id="munLangCurrentCode">${currentLang.code.toUpperCase().replace("-CN", "")}</span>
        <span class="mun-lang-chevron" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>

      <div id="munLangModal" class="mun-lang-modal" role="dialog" aria-modal="true" aria-label="Select Language">
        <div class="mun-lang-modal-header">
          <span class="mun-lang-modal-title">Global Languages</span>
          <span class="mun-lang-modal-sub">10 Options</span>
        </div>
        <ul class="mun-lang-list">
          ${SUPPORTED_LANGS.map(
            (lang) => `
            <li class="mun-lang-item ${lang.code === currentCode ? "is-selected" : ""}" data-lang="${lang.code}">
              <div class="mun-lang-item-left">
                <span class="mun-lang-item-flag">${lang.flag}</span>
                <div class="mun-lang-item-names">
                  <span class="mun-lang-item-native">${lang.native}</span>
                  <span class="mun-lang-item-english">${lang.name}</span>
                </div>
              </div>
              <span class="mun-lang-item-check">✓</span>
            </li>
          `
          ).join("")}
        </ul>
        <button type="button" id="munLangResetBtn" class="mun-lang-reset-btn">
          Reset to English
        </button>
      </div>
    `;

    document.body.appendChild(widget);

    const toggleBtn = document.getElementById("munLangToggleBtn");
    const modal = document.getElementById("munLangModal");
    const resetBtn = document.getElementById("munLangResetBtn");
    let isOpen = false;

    function toggleMenu(state) {
      isOpen = typeof state === "boolean" ? state : !isOpen;
      if (isOpen) {
        modal.classList.add("is-open");
        toggleBtn.classList.add("is-open");
        toggleBtn.setAttribute("aria-expanded", "true");
      } else {
        modal.classList.remove("is-open");
        toggleBtn.classList.remove("is-open");
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    }

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    document.addEventListener("click", (e) => {
      if (isOpen && !widget.contains(e.target)) {
        toggleMenu(false);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) {
        toggleMenu(false);
      }
    });

    widget.querySelectorAll(".mun-lang-item").forEach((item) => {
      item.addEventListener("click", () => {
        const selectedCode = item.getAttribute("data-lang");
        setLanguage(selectedCode);
        toggleMenu(false);
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        setLanguage("en");
        toggleMenu(false);
      });
    }

    // Initialize Google Translate
    initGoogleTranslateEngine();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountLanguageWidget);
  } else {
    mountLanguageWidget();
  }
})();
