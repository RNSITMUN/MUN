/**
 * RNSMUN 2026 - Multilingual Global Language Switcher
 * Curated Diplomatic Cadence, Entity Protection & Smooth Internationalization
 */

(function () {
  const SUPPORTED_LANGS = [
    { code: "en", name: "English", native: "English", flag: "🇬🇧", dir: "ltr" },
    { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸", dir: "ltr" },
    { code: "fr", name: "French", native: "Français", flag: "🇫🇷", dir: "ltr" },
    { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪", dir: "ltr" },
    { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦", dir: "rtl" },
    { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵", dir: "ltr" },
    { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺", dir: "ltr" },
    { code: "zh-CN", name: "Chinese", native: "简体中文", flag: "🇨🇳", dir: "ltr" },
    { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳", dir: "ltr" }
  ];

  // Curated Diplomatic & Authentic Terminology Glossary
  const DIPLOMATIC_GLOSSARY = {
    es: {
      "Model United Nations Conference": "Conferencia del Modelo de las Naciones Unidas",
      "EARLY BIRD": "TARIFA ANTICIPADA",
      "Register": "Inscripción",
      "Registration": "Inscripciones",
      "Venue": "Sede",
      "Contact": "Contacto",
      "Team": "Secretaría",
      "Equity Policy": "Código de Equidad",
      "Past Events": "Ediciones Anteriores",
      "Best Delegation Trophy": "Trofeo a la Mejor Delegación",
      "DOWNLOAD": "DESCARGAR",
      "External": "Delegados Externos",
      "RNSIT": "RNSIT"
    },
    fr: {
      "Model United Nations Conference": "Conférence de Simulation des Nations Unies",
      "EARLY BIRD": "TARIF PRÉVENTE",
      "Register": "Inscription",
      "Registration": "Inscriptions",
      "Venue": "Lieu & Accès",
      "Contact": "Secrétariat",
      "Team": "Équipe",
      "Equity Policy": "Charte d'Équité",
      "Past Events": "Archives",
      "Best Delegation Trophy": "Trophée de la Meilleure Délégation",
      "DOWNLOAD": "TÉLÉCHARGER",
      "External": "Délégués Externes",
      "RNSIT": "RNSIT"
    },
    de: {
      "Model United Nations Conference": "Modell-Konferenz der Vereinten Nationen",
      "EARLY BIRD": "FRÜHBUCHER",
      "Register": "Anmelden",
      "Registration": "Anmeldung",
      "Venue": "Veranstaltungsort",
      "Contact": "Kontakt",
      "Team": "Organisationsteam",
      "Equity Policy": "Verhaltenskodex",
      "Past Events": "Vergangene Konferenzen",
      "Best Delegation Trophy": "Trophäe für die Beste Delegation",
      "DOWNLOAD": "HERUNTERLADEN",
      "External": "Externe Delegierte",
      "RNSIT": "RNSIT"
    },
    ar: {
      "Model United Nations Conference": "مؤتمر نموذج الأمم المتحدة",
      "EARLY BIRD": "التسجيل المبكر",
      "Register": "سجّل الآن",
      "Registration": "التسجيل",
      "Venue": "مقر المؤتمر",
      "Contact": "الاتصال بالأمانة",
      "Team": "فريق الأمانة العامة",
      "Equity Policy": "ميثاق السلوك والإنصاف",
      "Past Events": "المؤتمرات السابقة",
      "Best Delegation Trophy": "كأس أفضل وفد مشارك",
      "DOWNLOAD": "تحميل",
      "External": "المندوبون الخارجيون",
      "RNSIT": "RNSIT"
    },
    ja: {
      "Model United Nations Conference": "模擬国連会議 2026",
      "EARLY BIRD": "早期割引",
      "Register": "代表登録",
      "Registration": "参加登録",
      "Venue": "開催会場",
      "Contact": "事務局連絡先",
      "Team": "運営事務局",
      "Equity Policy": "行動規範・公平性",
      "Past Events": "過去の会議記録",
      "Best Delegation Trophy": "最優秀代表団トロフィー",
      "DOWNLOAD": "ダウンロード",
      "External": "外部代表",
      "RNSIT": "RNSIT"
    },
    ru: {
      "Model United Nations Conference": "Конференция Модели ООН 2026",
      "EARLY BIRD": "РАННЯЯ РЕГИСТРАЦИЯ",
      "Register": "Регистрация",
      "Registration": "Регистрация",
      "Venue": "Место проведения",
      "Contact": "Секретариат",
      "Team": "Команда",
      "Equity Policy": "Кодекс равенства",
      "Past Events": "Архив конференций",
      "Best Delegation Trophy": "Кубок лучшей делегации",
      "DOWNLOAD": "СКАЧАТЬ",
      "External": "Внешние делегаты",
      "RNSIT": "RNSIT"
    },
    "zh-CN": {
      "Model United Nations Conference": "模拟联合国大会 2026",
      "EARLY BIRD": "早鸟特惠",
      "Register": "代表报名",
      "Registration": "报名注册",
      "Venue": "会议地点",
      "Contact": "组委会联络",
      "Team": "组委会团队",
      "Equity Policy": "行为准则与公平政策",
      "Past Events": "往届回顾",
      "Best Delegation Trophy": "最佳代表团总冠军奖杯",
      "DOWNLOAD": "下载资料",
      "External": "校外代表",
      "RNSIT": "RNSIT"
    },
    hi: {
      "Model United Nations Conference": "मॉडल संयुक्त राष्ट्र सम्मेलन 2026",
      "EARLY BIRD": "आरंभिक छूट",
      "Register": "पंजीकरण करें",
      "Registration": "प्रतिनिधि पंजीकरण",
      "Venue": "सम्मेलन स्थल",
      "Contact": "सचिवालय संपर्क",
      "Team": "आयोजन समिति",
      "Equity Policy": "समानता व आचार संहिता",
      "Past Events": "पूर्व सम्मेलन",
      "Best Delegation Trophy": "सर्वश्रेष्ठ प्रतिनिधिमंडल ट्रॉफी",
      "DOWNLOAD": "डाउनलोड करें",
      "External": "बाहरी प्रतिनिधि",
      "RNSIT": "RNSIT"
    },
    kn: {
      "Model United Nations Conference": "ಮಾದರಿ ವಿಶ್ವಸಂಸ್ಥೆ ಸಮ್ಮೇಳನ 2026",
      "EARLY BIRD": "ಆರಂಭಿಕ ರಿಯಾಯಿತಿ",
      "Register": "ನೋಂದಣಿ ಮಾಡಿ",
      "Registration": "ಪ್ರತಿನಿಧಿ ನೋಂದಣಿ",
      "Venue": "ಸಮ್ಮೇಳನ ಸ್ಥಳ",
      "Contact": "ಸಂಪರ್ಕಿಸಿ",
      "Team": "ಆಯೋಜಕ ತಂಡ",
      "Equity Policy": "ನೀತಿ ಸಂಹಿತೆ",
      "Past Events": "ಹಿಂದಿನ ಸಮ್ಮೇಳನಗಳು",
      "Best Delegation Trophy": "ಅತ್ಯುತ್ತಮ ನಿಯೋಗ ಟ್ರೋಫಿ",
      "DOWNLOAD": "ಡೌನ್‌ಲೋಡ್",
      "External": "ಹೊರಗಿನ ಪ್ರತಿನಿಧಿಗಳು",
      "RNSIT": "RNSIT"
    }
  };

  /**
   * 1. Brand & Sensitive Entity Protection
   * Ensures logos, acronyms (UNSC, DISEC), currency (₹), proper nouns, and handles never get mangled.
   */
  function applyBrandProtection() {
    const protectSelectors = [
      ".top-left-logo-container",
      ".top-right-logo-container",
      ".globe-hero-logo",
      ".brand-logo",
      ".person-phone",
      ".person-copy-btn",
      ".contact-email-link",
      ".hero-date-text",
      ".hpm-val",
      ".hpm-val-internal",
      ".hpm-del",
      ".qr-preview-img-wrap",
      ".committee-badge",
      ".upi-id",
      ".code-block"
    ];

    protectSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.add("notranslate");
        el.setAttribute("translate", "no");
      });
    });

    // Also protect specific brand name spans if found
    const textNodesToProtect = ["UNSC", "Lok Sabha", "DISEC", "UNHRC", "UNODC", "IP", "RNSIT", "MUNSoc", "RNS MUN", "₹999", "₹1,200", "₹1,349", "₹10,000"];
    const badges = document.querySelectorAll(".venue-meta-tag, .hpm-tag, .nav-item, .floating-menu-item span, .hpm-lbl");
    badges.forEach(el => {
      if (textNodesToProtect.includes(el.textContent.trim())) {
        el.classList.add("notranslate");
        el.setAttribute("translate", "no");
      }
    });
  }

  /**
   * 2. Curated Diplomatic Tone Refinement
   * Replaces robotic direct translations of key headings and slogans with native diplomatic phrasing.
   */
  function applyDiplomaticPhrasing(langCode) {
    if (!langCode || langCode === "en") return;
    const glossary = DIPLOMATIC_GLOSSARY[langCode];
    if (!glossary) return;

    // Subtitle tagline
    const subtitleSpans = document.querySelectorAll(".globe-hero-subtitle span");
    subtitleSpans.forEach((span) => {
      const text = span.textContent.trim();
      if (glossary[text]) {
        span.textContent = glossary[text];
      }
    });

    // Early Bird tags & labels
    document.querySelectorAll(".hpm-tag, .qr-preview-badge").forEach((el) => {
      const txt = el.textContent.replace("★", "").trim();
      if (glossary[txt]) {
        el.textContent = (el.textContent.includes("★") ? "★ " : "") + glossary[txt];
      }
    });
  }

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
    const langObj = SUPPORTED_LANGS.find((l) => l.code === langCode) || SUPPORTED_LANGS[0];

    // Handle RTL
    if (langObj.dir === "rtl") {
      document.documentElement.setAttribute("dir", "rtl");
      document.body.classList.add("mun-lang-rtl", "mun-lang-ar");
    } else {
      document.documentElement.removeAttribute("dir");
      document.body.classList.remove("mun-lang-rtl", "mun-lang-ar");
    }

    // Set active language class for font stacks
    SUPPORTED_LANGS.forEach(l => document.body.classList.remove(`mun-lang-${l.code}`));
    if (!isEnglish) {
      document.body.classList.add(`mun-lang-${langCode}`);
    }

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
      setTimeout(() => applyDiplomaticPhrasing(langCode), 300);
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

    // Apply brand and proper-noun shielding
    applyBrandProtection();

    const currentCode = getSavedLang();
    const currentLang = SUPPORTED_LANGS.find((l) => l.code === currentCode) || SUPPORTED_LANGS[0];

    // Set initial direction & classes
    if (currentLang.dir === "rtl") {
      document.documentElement.setAttribute("dir", "rtl");
      document.body.classList.add("mun-lang-rtl", "mun-lang-ar");
    }
    if (currentCode !== "en") {
      document.body.classList.add(`mun-lang-${currentCode}`);
    }

    const widget = document.createElement("div");
    widget.id = "munLangWidgetRoot";
    widget.className = "mun-lang-widget notranslate";
    widget.setAttribute("translate", "no");
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

    // Set up MutationObserver to safeguard dynamically created modals and popups
    const observer = new MutationObserver(() => {
      applyBrandProtection();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initialize Google Translate
    initGoogleTranslateEngine();

    // Apply diplomatic cadence after initial boot
    if (currentCode !== "en") {
      setTimeout(() => applyDiplomaticPhrasing(currentCode), 600);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountLanguageWidget);
  } else {
    mountLanguageWidget();
  }
})();
