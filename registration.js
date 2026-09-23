    const COMMITTEE_MATRIX_LINKS = {
      all: 'https://docs.google.com/spreadsheets/d/1qOp6gJYndOc7b3xpyF1BmxrFWXyaRoDa/edit?gid=201693632#gid=201693632',
      unsc: 'https://docs.google.com/spreadsheets/d/1ilmTRceKjf9o5yGb820WMFA7UygDcb8bF_lIhUpvFQ8/edit?gid=1436649926#gid=1436649926',
      disec: 'https://docs.google.com/spreadsheets/d/1I4qiQA-zt2Omkx6LjjnCHnt-owW9iagOqrQojUwESFg/edit?gid=1518538601#gid=1518538601',
      unhrc: 'https://docs.google.com/spreadsheets/d/1p0DNw4iAw4I539Jyv3vDJWoVYUfh9Tu__qcCXmnvB2Q/edit?gid=71089615#gid=71089615',
      unodc: 'https://docs.google.com/spreadsheets/d/1wRuUi-KbHaURPyxpwDWXD9U7AHZQHj0CjNyRF8-PlRE/edit?gid=1309158459#gid=1309158459',
      loksabha: 'https://docs.google.com/spreadsheets/d/1lOaYUwb-LSyeD2b1oj_ZZGkaol2a5P3sF0n7IROSbrA/edit?gid=206665824#gid=206665824',
      ip: 'https://docs.google.com/spreadsheets/d/1NZ51QrJF74J2xoSiwgFGP8qVJnOOFgTArjvuiHmy1rc/edit?gid=1843717965#gid=1843717965'
    };

    const COMMITTEES = {
      unsc: {
        id: "unsc",
        name: "UNSC",
        fullName: "United Nations Security Council",
        logo: "/RNSMUN_LOGO/2.svg",
        tagline: "Navigate sovereign flashpoints, contested territorial control, and international recognition dynamics in civil warfare.",
        agenda: "Addressing Parallel Governments and De Facto Authorities in Civil Wars: Sovereignty, Territorial Control and International Recognition"
      },
      loksabha: {
        id: "loksabha",
        name: "LOK SABHA",
        fullName: "House of the People (Indian Parliament)",
        logo: "/RNSMUN_LOGO/5.svg",
        tagline: "Deliberate constitutional representation, parliamentary seat distribution, and inter-state fiscal equity in modern India.",
        agenda: "Post Census Delimitation and Fiscal Redistribution: Addressing Regional Representation and Inter-State Fiscal Equity"
      },
      disec: {
        id: "disec",
        name: "DISEC",
        fullName: "Disarmament & International Security",
        logo: "/RNSMUN_LOGO/4.svg",
        tagline: "Tackle the world's most complex security challenges and negotiate practical paths toward disarmament and lasting peace.",
        agenda: "Regulating the Militarisation of Outer space and the Development of ANTI-SATELLITE (ASAT) Weapons"
      },
      unhrc: {
        id: "unhrc",
        name: "UNHRC",
        fullName: "United Nations Human Rights Council",
        logo: "/RNSMUN_LOGO/3.svg",
        tagline: "Champion fundamental civil liberties, protect media freedom, and enforce the safety of journalists in conflict zones.",
        agenda: "Safeguarding Freedom of Expression and the Safety of Journalists in Conflict and Post-Conflict Zone"
      },
      unodc: {
        id: "unodc",
        name: "UNODC",
        fullName: "United Nations Office on Drugs and Crime",
        logo: "/RNSMUN_LOGO/1.svg",
        tagline: "Disrupt darknet contraband cartels, combat tech-enabled human exploitation, and freeze illicit cross-border money flows.",
        agenda: "Combating technology - Facilitated Human Trafficking, Online Child Exploitation, and Illicit Financial Flows"
      },
      ip: {
        id: "ip",
        name: "IP",
        fullName: "International Press",
        logo: "/RNSMUN_LOGO/6.svg",
        tagline: "Hold global councils accountable through unfiltered investigative reporting, live press briefings, and daily editorial journalism.",
        agenda: "Unfiltered Investigative Journalism, Real-Time Crisis Coverage, Press Conferences, and Daily Newsletter Publications"
      }
    };

    let activeCommitteeData = null;
    let activeClickedCard = null;
    let isCardAnimating = false;
    let savedScrollPosition = 0;

    // Robust background scroll locking when modals are active
    function lockBackgroundScroll() {
      savedScrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    function unlockBackgroundScroll() {
      // Check if any backdrop is still visible/active
      setTimeout(() => {
        const activeModals = document.querySelectorAll('.committee-modal-backdrop.active');
        if (activeModals.length === 0) {
          document.body.classList.remove('modal-open');
          document.documentElement.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';

          requestAnimationFrame(() => {
            window.scrollTo({
              top: savedScrollPosition,
              behavior: 'instant'
            });
          });
        }
      }, 50);
    }

    // Intelligent mobile viewport and scroll handling for modal forms & virtual keyboard
    function initMobileVirtualKeyboardScroll() {
      if (window.visualViewport) {
        const updateVisualViewport = () => {
          const vv = window.visualViewport;
          const fullHeight = window.innerHeight || document.documentElement.clientHeight;
          const keyboardHeight = Math.max(0, fullHeight - vv.height);

          document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
          document.documentElement.style.setProperty('--visual-viewport-height', `${vv.height}px`);

          const activeBackdrops = document.querySelectorAll('.committee-modal-backdrop.active');
          activeBackdrops.forEach(backdrop => {
            if (keyboardHeight > 80) {
              backdrop.classList.add('keyboard-open');
            } else {
              backdrop.classList.remove('keyboard-open');
            }
          });

          // If focused element is inside modal, ensure it remains in comfortable viewing range
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
            const card = activeEl.closest('.modal-registration-card');
            if (card) {
              const cardRect = card.getBoundingClientRect();
              const elRect = activeEl.getBoundingClientRect();
              if (elRect.bottom > cardRect.bottom - 20 || elRect.top < cardRect.top + 20) {
                activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }
            }
          }
        };

        window.visualViewport.addEventListener('resize', updateVisualViewport);
        window.visualViewport.addEventListener('scroll', updateVisualViewport);
      }

      // Smooth auto-scroll when any input inside registration modal is tapped/focused
      const formFields = document.querySelectorAll(
        '.modal-registration-card input, .modal-registration-card select, .modal-registration-card textarea'
      );
      formFields.forEach(field => {
        field.addEventListener('focus', () => {
          setTimeout(() => {
            const card = field.closest('.modal-registration-card');
            if (card) {
              const cardRect = card.getBoundingClientRect();
              const fieldRect = field.getBoundingClientRect();
              // Scroll card so focused field has plenty of space above and below
              const offsetFromTop = fieldRect.top - cardRect.top;
              const desiredPos = card.scrollTop + offsetFromTop - Math.min(100, cardRect.height * 0.25);
              card.scrollTo({
                top: Math.max(0, desiredPos),
                behavior: 'smooth'
              });
            }
          }, 300);
        }, { passive: true });
      });

      // Prevent backdrop touches from scrolling underlying page while allowing inner card to scroll freely
      document.querySelectorAll('.committee-modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('touchmove', (e) => {
          if (e.target === backdrop && !backdrop.classList.contains('keyboard-open') && backdrop.scrollHeight <= backdrop.clientHeight) {
            e.preventDefault();
          }
        }, { passive: false });
      });
    }

    document.addEventListener('DOMContentLoaded', initMobileVirtualKeyboardScroll);

    // =========================================================================
    // NATIVE MOBILE BROWSER & PHONE HARDWARE BACK BUTTON CONTROLLER
    // =========================================================================
    let isProgrammaticHistoryBack = false;

    function pushModalHistoryState(modalId) {
      if (!window.history.state || !window.history.state.munModalActive) {
        try {
          window.history.pushState(
            { munModalActive: true, modalId: modalId, t: Date.now() },
            '',
            window.location.pathname + window.location.search
          );
        } catch (err) {}
      }
    }

    function popModalHistoryState() {
      if (window.history.state && window.history.state.munModalActive) {
        isProgrammaticHistoryBack = true;
        window.history.back();
        setTimeout(() => { isProgrammaticHistoryBack = false; }, 150);
      }
    }

    // Intercept phone back button / swipe back gesture to smoothly dismiss open modals
    window.addEventListener('popstate', (e) => {
      if (isProgrammaticHistoryBack) {
        isProgrammaticHistoryBack = false;
        return;
      }

      const regBackdrop = document.getElementById('registration-modal-backdrop');
      const dlgBackdrop = document.getElementById('delegation-modal-backdrop');
      const typeBackdrop = document.getElementById('delegate-type-modal-backdrop');
      const commBackdrop = document.getElementById('committee-modal-backdrop');

      // Dismiss any open form/modal cleanly without exiting the registration page
      if (regBackdrop && (regBackdrop.classList.contains('active') || regBackdrop.style.display === 'flex')) {
        closeRegistrationModal(true);
      }
      if (dlgBackdrop && (dlgBackdrop.classList.contains('active') || dlgBackdrop.style.display === 'flex')) {
        closeDelegationRegistrationModal(true);
      }
      if (typeBackdrop && (typeBackdrop.classList.contains('active') || typeBackdrop.style.display === 'flex')) {
        closeDelegateTypeModal(null, true);
      }
      if (commBackdrop && (commBackdrop.classList.contains('active') || commBackdrop.style.display === 'flex')) {
        closeCommitteeModal(null, true);
      }
    });

    // Handle Card Click - Ultra Smooth FLIP Expansion
    function handleCardClick(committeeId, cardElement) {
      if (isCardAnimating) return;
      const data = COMMITTEES[committeeId];
      if (!data) return;

      pushModalHistoryState('committee-profile');
      activeCommitteeData = data;
      activeClickedCard = cardElement;
      isCardAnimating = true;

      // 1. Populate Modal Content
      document.getElementById('modal-logo').src = data.logo;
      document.getElementById('modal-name').textContent = data.name;
      document.getElementById('modal-fullname').textContent = data.fullName;
      document.getElementById('modal-tagline').textContent = data.tagline;
      document.getElementById('modal-agenda-title').textContent = data.agenda;

      const modalMatrixBtn = document.getElementById('modal-matrix-btn');
      if (modalMatrixBtn) {
        modalMatrixBtn.href = COMMITTEE_MATRIX_LINKS[committeeId] || COMMITTEE_MATRIX_LINKS.all;
      }

      const backdrop = document.getElementById('committee-modal-backdrop');
      const modalCard = document.getElementById('committee-modal-card');

      // 2. Measure initial card bounding rect
      const startRect = cardElement ? cardElement.getBoundingClientRect() : {
        left: window.innerWidth / 2 - 100,
        top: window.innerHeight / 2 - 100,
        width: 200,
        height: 200
      };

      // 3. Reveal backdrop & card (Hidden visibility during layout prep)
      backdrop.style.display = 'flex';
      backdrop.style.opacity = '1';
      backdrop.classList.add('active');
      lockBackgroundScroll();

      if (window.gsap) {
        gsap.set(modalCard, { clearProps: 'transform,x,y,scale,scaleX,scaleY,opacity' });
      }
      const endRect = modalCard.getBoundingClientRect();

      const deltaX = startRect.left - endRect.left;
      const deltaY = startRect.top - endRect.top;
      const scaleX = endRect.width > 0 ? startRect.width / endRect.width : 1;
      const scaleY = endRect.height > 0 ? startRect.height / endRect.height : 1;

      if (window.gsap) {
        // Set modal start position exactly over the clicked card
        gsap.set(modalCard, {
          x: deltaX,
          y: deltaY,
          scaleX: scaleX,
          scaleY: scaleY,
          transformOrigin: 'top left',
          borderRadius: '20px',
          boxShadow: '4px 4px 0px #000000',
          opacity: 1
        });

        // Hide clicked card during morph
        if (cardElement) {
          gsap.set(cardElement, { opacity: 0 });
        }

        // Stagger inner items
        const innerStagger = [
          document.querySelector('.profile-emblem-wrap'),
          document.querySelector('.profile-kicker'),
          document.getElementById('modal-name'),
          document.getElementById('modal-fullname'),
          document.getElementById('modal-tagline'),
          document.querySelector('.profile-agenda-card'),
          document.querySelector('.profile-actions-row')
        ].filter(Boolean);

        gsap.set(innerStagger, { opacity: 0, y: 16 });

        // Buttery smooth expansion animation
        const tl = gsap.timeline({
          onComplete: () => {
            isCardAnimating = false;
            modalCard.focus();
          }
        });

        tl.to(modalCard, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          borderRadius: '22px',
          boxShadow: '8px 8px 0px #000000',
          duration: 0.52,
          ease: 'power4.out'
        }, 0);

        tl.to(innerStagger, {
          opacity: 1,
          y: 0,
          duration: 0.38,
          stagger: 0.03,
          ease: 'power3.out'
        }, 0.1);
      } else {
        isCardAnimating = false;
      }
    }

    // Close Modal - Ultra Smooth Reverse FLIP Collapse
    function closeCommitteeModal(callback, fromPopState = false) {
      if (!fromPopState) {
        popModalHistoryState();
      }
      if (isCardAnimating) {
        if (typeof callback === 'function') callback();
        return;
      }

      const backdrop = document.getElementById('committee-modal-backdrop');
      const modalCard = document.getElementById('committee-modal-card');
      const targetCard = activeClickedCard;

      if (!backdrop || !modalCard) {
        if (typeof callback === 'function') callback();
        return;
      }

      isCardAnimating = true;

      const currentCardRect = targetCard ? targetCard.getBoundingClientRect() : {
        left: window.innerWidth / 2 - 100,
        top: window.innerHeight / 2 - 100,
        width: 200,
        height: 200
      };
      const currentModalRect = modalCard.getBoundingClientRect();

      const deltaX = currentCardRect.left - currentModalRect.left;
      const deltaY = currentCardRect.top - currentModalRect.top;
      const scaleX = currentModalRect.width > 0 ? currentCardRect.width / currentModalRect.width : 1;
      const scaleY = currentModalRect.height > 0 ? currentCardRect.height / currentModalRect.height : 1;

      if (window.gsap) {
        const innerStagger = [
          document.querySelector('.profile-emblem-wrap'),
          document.querySelector('.profile-kicker'),
          document.getElementById('modal-name'),
          document.getElementById('modal-fullname'),
          document.getElementById('modal-tagline'),
          document.querySelector('.profile-agenda-card'),
          document.querySelector('.profile-actions-row')
        ].filter(Boolean);

        const tl = gsap.timeline({
          onComplete: () => {
            backdrop.classList.remove('active');
            backdrop.style.display = 'none';
            unlockBackgroundScroll();

            // Restore all cards to visible
            document.querySelectorAll('.committee-card').forEach(c => {
              gsap.set(c, { opacity: 1, clearProps: 'opacity' });
              c.style.opacity = '1';
            });

            gsap.set(modalCard, { clearProps: 'all' });
            activeCommitteeData = null;
            activeClickedCard = null;
            isCardAnimating = false;

            if (targetCard) {
              try {
                targetCard.focus({ preventScroll: true });
              } catch (e) {
                targetCard.focus();
              }
            }
            if (typeof callback === 'function') callback();
          }
        });

        tl.to(innerStagger, {
          opacity: 0,
          duration: 0.14,
          ease: 'power2.in'
        }, 0);

        tl.to(modalCard, {
          x: deltaX,
          y: deltaY,
          scaleX: scaleX,
          scaleY: scaleY,
          borderRadius: '20px',
          boxShadow: '4px 4px 0px #000000',
          duration: 0.42,
          ease: 'power3.inOut'
        }, 0.02);
      } else {
        backdrop.classList.remove('active');
        backdrop.style.display = 'none';
        unlockBackgroundScroll();
        if (targetCard) targetCard.style.opacity = '1';
        isCardAnimating = false;
        if (typeof callback === 'function') callback();
      }
    }

    // IDs that should render as a combobox (input = trigger + search)
    const SEARCHABLE_SELECT_IDS = new Set([
      'reg-portfolio-1', 'reg-portfolio-2',
      'reg-comm2-portfolio-1', 'reg-comm2-portfolio-2'
    ]);

    // Custom Dropdown Integration
    function initCustomSelects() {
      const selects = document.querySelectorAll('select.form-select');

      selects.forEach(select => {
        if (select.closest('.custom-select-wrapper')) return;

        const isSearchable = SEARCHABLE_SELECT_IDS.has(select.id);

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper' + (isSearchable ? ' is-combobox' : '');
        wrapper.id = `custom-select-wrap-${select.id}`;

        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);

        // ─────────────────────────────────────────────
        // COMBOBOX PATH — input IS the trigger + search
        // ─────────────────────────────────────────────
        if (isSearchable) {
          const comboWrap = document.createElement('div');
          comboWrap.className = 'combobox-trigger-wrap';

          const comboInput = document.createElement('input');
          comboInput.type = 'text';
          comboInput.className = 'combobox-input';
          comboInput.setAttribute('autocomplete', 'off');
          comboInput.setAttribute('spellcheck', 'false');
          comboInput.setAttribute('role', 'combobox');
          comboInput.setAttribute('aria-haspopup', 'listbox');
          comboInput.setAttribute('aria-expanded', 'false');
          comboInput.setAttribute('aria-autocomplete', 'list');

          // Set placeholder from select placeholder option
          const placeholderOpt = Array.from(select.options).find(o => o.disabled || o.value === '');
          comboInput.placeholder = placeholderOpt ? placeholderOpt.text : 'Select…';

          // Restore value if already selected
          const initialOpt = select.options[select.selectedIndex];
          if (initialOpt && initialOpt.value !== '') {
            comboInput.value = initialOpt.text;
          }

          const comboArrow = document.createElement('span');
          comboArrow.className = 'custom-select-arrow combobox-arrow';
          comboArrow.setAttribute('aria-hidden', 'true');
          comboArrow.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

          comboWrap.appendChild(comboInput);
          comboWrap.appendChild(comboArrow);
          wrapper.appendChild(comboWrap);

          const menu = document.createElement('div');
          menu.className = 'custom-select-menu';
          menu.setAttribute('role', 'listbox');

          const noResults = document.createElement('div');
          noResults.className = 'custom-select-no-results';
          noResults.textContent = 'No results found';
          menu.appendChild(noResults);

          // Build option divs
          Array.from(select.options).forEach((opt, idx) => {
            if (opt.disabled || opt.value === '') return;
            const optionDiv = document.createElement('div');
            const isSelected = opt.selected && opt.value !== '';
            optionDiv.className = 'custom-select-option' + (isSelected ? ' is-selected' : '');
            optionDiv.setAttribute('role', 'option');
            optionDiv.setAttribute('data-value', opt.value);
            optionDiv.setAttribute('data-index', idx);
            optionDiv.setAttribute('aria-selected', isSelected ? 'true' : 'false');

            const labelSpan = document.createElement('span');
            labelSpan.className = 'option-label';
            labelSpan.textContent = opt.text;

            const checkSpan = document.createElement('span');
            checkSpan.className = 'option-check';
            checkSpan.textContent = '✓';

            optionDiv.appendChild(labelSpan);
            optionDiv.appendChild(checkSpan);

            // mousedown (not click) so blur doesn't close before we process
            optionDiv.addEventListener('mousedown', (e) => {
              e.preventDefault(); // prevent input blur
              commitOption(idx);
            });

            menu.appendChild(optionDiv);
          });

          wrapper.appendChild(menu);

          // ── helpers ──

          function filterMenu(query) {
            let anyVisible = false;
            menu.querySelectorAll('.custom-select-option').forEach(el => {
              const label = el.querySelector('.option-label')?.textContent.toLowerCase() || '';
              const match = !query || label.includes(query.toLowerCase());
              el.style.display = match ? '' : 'none';
              el.classList.remove('is-highlighted');
              if (match) anyVisible = true;
            });
            noResults.style.display = anyVisible ? 'none' : 'block';
          }

          function openMenu() {
            if (wrapper.classList.contains('is-open')) return;
            closeAllCustomSelects();
            const card = document.getElementById('registration-modal-card');
            if (card) {
              const inputRect = comboInput.getBoundingClientRect();
              const cardRect = card.getBoundingClientRect();
              const spaceBelow = cardRect.bottom - inputRect.bottom;
              wrapper.classList.toggle('dropup', spaceBelow < 210 && (inputRect.top - cardRect.top) > 210);
            }
            wrapper.closest('.form-group')?.classList.add('has-open-select');
            wrapper.classList.add('is-open');
            comboInput.setAttribute('aria-expanded', 'true');
            comboArrow.style.transform = 'rotate(180deg)';
          }

          function closeMenu() {
            if (!wrapper.classList.contains('is-open')) return;
            wrapper.classList.remove('is-open');
            wrapper.closest('.form-group')?.classList.remove('has-open-select');
            comboInput.setAttribute('aria-expanded', 'false');
            comboArrow.style.transform = '';
            // Restore display text to selected value (in case user typed but didn't pick)
            const sel = select.options[select.selectedIndex];
            comboInput.value = (sel && sel.value !== '') ? sel.text : '';
            filterMenu(''); // reset filter
          }

          function commitOption(index) {
            if (index < 0 || index >= select.options.length) return;
            select.selectedIndex = index;
            const opt = select.options[index];
            comboInput.value = opt.text;

            menu.querySelectorAll('.custom-select-option').forEach(el => {
              const isMatch = parseInt(el.getAttribute('data-index'), 10) === index;
              el.classList.toggle('is-selected', isMatch);
              el.classList.remove('is-highlighted');
              el.setAttribute('aria-selected', isMatch ? 'true' : 'false');
            });

            comboInput.classList.remove('has-error');
            wrapper.classList.remove('has-error');
            const errorEl = document.getElementById(`${select.id}-error`);
            if (errorEl) errorEl.style.display = 'none';

            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
            filterMenu('');
            closeMenu();
          }

          // ── events ──

          // Open on focus / click
          comboInput.addEventListener('focus', () => openMenu());
          comboInput.addEventListener('click', (e) => { e.stopPropagation(); openMenu(); });

          // Filter as user types
          comboInput.addEventListener('input', () => {
            openMenu();
            filterMenu(comboInput.value.trim());
          });

          // Close on blur (delayed so mousedown on option fires first)
          comboInput.addEventListener('blur', () => {
            setTimeout(() => closeMenu(), 150);
          });

          // Arrow toggle
          comboArrow.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (wrapper.classList.contains('is-open')) {
              closeMenu();
              comboInput.blur();
            } else {
              comboInput.focus();
            }
          });

          // Keyboard nav
          comboInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              closeMenu();
              comboInput.blur();
              return;
            }
            if (e.key === 'Tab') {
              closeMenu();
              return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              if (!wrapper.classList.contains('is-open')) openMenu();
              const visibleOpts = Array.from(menu.querySelectorAll('.custom-select-option')).filter(el => el.style.display !== 'none');
              if (!visibleOpts.length) return;
              const highlighted = menu.querySelector('.custom-select-option.is-highlighted');
              let nextEl;
              if (!highlighted) {
                nextEl = e.key === 'ArrowDown' ? visibleOpts[0] : visibleOpts[visibleOpts.length - 1];
              } else {
                const cur = visibleOpts.indexOf(highlighted);
                highlighted.classList.remove('is-highlighted');
                nextEl = e.key === 'ArrowDown'
                  ? visibleOpts[Math.min(cur + 1, visibleOpts.length - 1)]
                  : visibleOpts[Math.max(cur - 1, 0)];
              }
              nextEl.classList.add('is-highlighted');
              nextEl.scrollIntoView({ block: 'nearest' });
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              const highlighted = menu.querySelector('.custom-select-option.is-highlighted');
              if (highlighted) {
                const idx = parseInt(highlighted.getAttribute('data-index'), 10);
                commitOption(idx);
                comboInput.blur();
              }
            }
          });

          select.addEventListener('change', () => {
            const sel = select.options[select.selectedIndex];
            if (sel && sel.value !== '') comboInput.value = sel.text;
            menu.querySelectorAll('.custom-select-option').forEach(el => {
              const isMatch = el.getAttribute('data-value') === sel?.value;
              el.classList.toggle('is-selected', isMatch);
              el.setAttribute('aria-selected', isMatch ? 'true' : 'false');
            });
          });

          return; // done for searchable — skip the normal button trigger
        }

        // ─────────────────────────────────────────────
        // NORMAL (non-searchable) SELECT — button trigger
        // ─────────────────────────────────────────────
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const textSpan = document.createElement('span');
        textSpan.className = 'custom-select-text';
        const selectedOption = select.options[select.selectedIndex] || select.options[0];
        textSpan.textContent = selectedOption ? selectedOption.text : '';

        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'custom-select-arrow';
        arrowSpan.setAttribute('aria-hidden', 'true');
        arrowSpan.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        `;

        trigger.appendChild(textSpan);
        trigger.appendChild(arrowSpan);
        wrapper.appendChild(trigger);

        const menu = document.createElement('div');
        menu.className = 'custom-select-menu';
        menu.setAttribute('role', 'listbox');

        Array.from(select.options).forEach((opt, idx) => {
          if (opt.disabled || opt.value === '') return;
          const optionDiv = document.createElement('div');
          const isSelected = opt.selected && opt.value !== '';
          optionDiv.className = 'custom-select-option' + (isSelected ? ' is-selected' : '');
          optionDiv.setAttribute('role', 'option');
          optionDiv.setAttribute('data-value', opt.value);
          optionDiv.setAttribute('data-index', idx);
          optionDiv.setAttribute('aria-selected', isSelected ? 'true' : 'false');

          const labelSpan = document.createElement('span');
          labelSpan.className = 'option-label';
          labelSpan.textContent = opt.text;

          const checkSpan = document.createElement('span');
          checkSpan.className = 'option-check';
          checkSpan.textContent = '✓';

          optionDiv.appendChild(labelSpan);
          optionDiv.appendChild(checkSpan);

          optionDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            selectOption(idx);
            closeAllCustomSelects();
            trigger.focus();
          });

          menu.appendChild(optionDiv);
        });

        wrapper.appendChild(menu);

        function selectOption(index) {
          if (index < 0 || index >= select.options.length) return;
          select.selectedIndex = index;
          const opt = select.options[index];
          textSpan.textContent = opt.text;

          menu.querySelectorAll('.custom-select-option').forEach((el) => {
            const isMatch = parseInt(el.getAttribute('data-index'), 10) === index;
            el.classList.toggle('is-selected', isMatch);
            el.classList.remove('is-highlighted');
            el.setAttribute('aria-selected', isMatch ? 'true' : 'false');
          });

          trigger.classList.remove('has-error');
          wrapper.classList.remove('has-error');
          const errorEl = document.getElementById(`${select.id}-error`);
          if (errorEl) errorEl.style.display = 'none';

          select.dispatchEvent(new Event('change', { bubbles: true }));
          select.dispatchEvent(new Event('input', { bubbles: true }));
        }

        function syncFromNative() {
          const idx = select.selectedIndex;
          if (idx >= 0 && idx < select.options.length) {
            textSpan.textContent = select.options[idx].text;
            menu.querySelectorAll('.custom-select-option').forEach((el) => {
              const isMatch = parseInt(el.getAttribute('data-index'), 10) === idx;
              el.classList.toggle('is-selected', isMatch);
              el.setAttribute('aria-selected', isMatch ? 'true' : 'false');
            });
          }
        }

        const isSingleOption = select.options.length <= 1;
        if (isSingleOption) {
          trigger.disabled = true;
          trigger.style.cursor = 'default';
          trigger.style.opacity = '0.9';
          arrowSpan.style.display = 'none';
        }

        trigger.addEventListener('click', (e) => {
          if (isSingleOption) return;
          e.stopPropagation();
          const isOpen = wrapper.classList.contains('is-open');
          closeAllCustomSelects();
          if (!isOpen) {
            const card = document.getElementById('registration-modal-card');
            if (card) {
              const triggerRect = trigger.getBoundingClientRect();
              const cardRect = card.getBoundingClientRect();
              const spaceBelow = cardRect.bottom - triggerRect.bottom;
              if (spaceBelow < 210 && (triggerRect.top - cardRect.top) > 210) {
                wrapper.classList.add('dropup');
              } else {
                wrapper.classList.remove('dropup');
              }
            }
            wrapper.closest('.form-group')?.classList.add('has-open-select');
            wrapper.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            const selectedEl = menu.querySelector('.custom-select-option.is-selected');
            if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
          }
        });

        trigger.addEventListener('keydown', (e) => {
          const isOpen = wrapper.classList.contains('is-open');
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) { wrapper.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); }
            else {
              let nextIdx = select.selectedIndex + 1;
              while (nextIdx < select.options.length && (select.options[nextIdx].disabled || select.options[nextIdx].value === '')) nextIdx++;
              if (nextIdx < select.options.length) selectOption(nextIdx);
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) { wrapper.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); }
            else {
              let prevIdx = select.selectedIndex - 1;
              while (prevIdx >= 0 && (select.options[prevIdx].disabled || select.options[prevIdx].value === '')) prevIdx--;
              if (prevIdx >= 0) selectOption(prevIdx);
            }
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen) closeAllCustomSelects();
            else { wrapper.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); }
          } else if (e.key === 'Escape' || e.key === 'Tab') {
            if (isOpen) closeAllCustomSelects();
          }
        });

        select.addEventListener('change', syncFromNative);
      });
    }




    function rebuildCustomSelect(selectId) {
      const select = document.getElementById(selectId);
      if (!select) return;
      const wrapper = select.closest('.custom-select-wrapper');
      if (wrapper) {
        wrapper.parentNode.insertBefore(select, wrapper);
        wrapper.remove();
      }
      initCustomSelects();
    }

    const ALL_COMMITTEES_LIST = [
      { value: 'unsc', label: 'UNSC — United Nations Security Council' },
      { value: 'loksabha', label: 'Lok Sabha — House of the People' },
      { value: 'disec', label: "DISEC — Disarmament & Int'l Security" },
      { value: 'unhrc', label: 'UNHRC — UN Human Rights Council' },
      { value: 'unodc', label: 'UNODC — UN Office on Drugs & Crime' },
      { value: 'ip', label: 'IP — International Press Corps' }
    ];

    const COMMITTEE_PORTFOLIOS = {
      unsc: [
        "United States of America",
        "Russian Federation",
        "French Republic",
        "United Kingdom of Great Britain and Northern Ireland",
        "People’s Republic of China",
        "Kingdom of Bahrain",
        "Republic of Colombia",
        "Democratic Republic of the Congo",
        "Kingdom of Denmark",
        "Hellenic Republic",
        "Republic of Latvia",
        "Republic of Liberia",
        "Islamic Republic of Pakistan",
        "Republic of Panama",
        "Federal Republic of Somalia",
        "Republic of the Sudan",
        "State of Libya",
        "Republic of Yemen",
        "Syrian Arab Republic",
        "Republic of the Union of Myanmar",
        "Lebanese Republic",
        "State of Palestine",
        "State of Israel",
        "Ukraine",
        "Republic of India",
        "Islamic Republic of Iran",
        "Republic of Türkiye",
        "Arab Republic of Egypt",
        "Kingdom of Saudi Arabia",
        "United Arab Emirates",
        "State of Qatar",
        "Federal Democratic Republic of Ethiopia",
        "Republic of Iraq",
        "Hashemite Kingdom of Jordan",
        "Republic of Rwanda"
      ],
      loksabha: [
        "Narendra Modi (BJP)",
        "Amit Shah (BJP)",
        "Rajnath Singh (BJP)",
        "Kiren Rijiju (BJP)",
        "Piyush Goyal (BJP)",
        "Nitin Gadkari (BJP)",
        "Pralhad Joshi (BJP)",
        "Basavaraj Bommai (BJP)",
        "G. Kishan Reddy (BJP)",
        "Dharmendra Pradhan (BJP)",
        "Sarbananda Sonowal (BJP)",
        "Nishikant Dubey (BJP)",
        "Bandi Sanjay Kumar (BJP)",
        "Bhartruhari Mahtab (BJP)",
        "Anurag Thakur (BJP)",
        "Tejasvi Surya (BJP)",
        "Brijmohan Agrawal (BJP)",
        "Rahul Gandhi (INC)",
        "Priyanka Gandhi Vadra (INC)",
        "K. C. Venugopal (INC)",
        "Shashi Tharoor (INC)",
        "Karti Chidambaram (INC)",
        "Gaurav Gogoi (INC)",
        "Manickam Tagore (INC)",
        "Kodikunnil Suresh (INC)",
        "Manish Tewari (INC)",
        "Tariq Anwar (INC)",
        "A. Raja (DMK)",
        "T. R. Baalu (DMK)",
        "Kanimozhi Karunanidhi (DMK)",
        "Dayanidhi Maran (DMK)",
        "Abhishek Banerjee (TMC)",
        "Kalyan Banerjee (TMC)",
        "Mahua Moitra (TMC)",
        "Saugata Roy (TMC)",
        "Akhilesh Yadav (SP)",
        "Dimple Yadav (SP)",
        "K. Ram Mohan Naidu (TDP)",
        "G. M. Harish Balayogi (TDP)",
        "Rajiv Ranjan Singh (JD(U))",
        "Supriya Sule (NCP(SP))",
        "Arvind Sawant (SHIV SENA (UBT))",
        "Gurmeet Singh Meet Hayer (AAP)",
        "Mian Altaf Ahmad (J&KNC)",
        "Asaduddin Owaisi (AIMIM)",
        "Chirag Paswan (L J P (R V))",
        "Harsimrat Kaur Badal (SAD)",
        "Surendra Prasad Yadav (RJD)"
      ],
      disec: [
        "United States of America",
        "Russian Federation",
        "People’s Republic of China",
        "Republic of India",
        "French Republic",
        "United Kingdom of Great Britain and Northern Ireland",
        "Japan",
        "Commonwealth of Australia",
        "Federal Republic of Germany",
        "State of Israel",
        "Republic of Korea",
        "Islamic Republic of Iran",
        "Democratic People’s Republic of Korea",
        "Islamic Republic of Pakistan",
        "Canada",
        "Italian Republic",
        "Kingdom of Spain",
        "Kingdom of the Netherlands",
        "Kingdom of Belgium",
        "Republic of Poland",
        "Republic of Türkiye",
        "Federative Republic of Brazil",
        "Argentine Republic",
        "United Arab Emirates",
        "Kingdom of Saudi Arabia",
        "Republic of Kazakhstan",
        "Republic of South Africa",
        "Republic of Indonesia",
        "Malaysia",
        "Republic of Singapore",
        "Kingdom of Thailand",
        "Socialist Republic of Viet Nam",
        "Republic of the Philippines",
        "United Mexican States",
        "Republic of Colombia",
        "Republic of Chile",
        "Arab Republic of Egypt",
        "Kingdom of Morocco",
        "Federal Republic of Nigeria",
        "Swiss Confederation",
        "Republic of Austria",
        "Ireland",
        "Kingdom of Norway",
        "Kingdom of Sweden",
        "Republic of Finland",
        "New Zealand",
        "Mongolia",
        "Portuguese Republic",
        "Czech Republic",
        "Ukraine"
      ],
      unhrc: [
        "Democratic Republic of the Congo",
        "Federal Democratic Republic of Ethiopia",
        "Arab Republic of Egypt",
        "Republic of Iraq",
        "Republic of India",
        "Islamic Republic of Pakistan",
        "Republic of Colombia",
        "United Mexican States",
        "People’s Republic of China",
        "Republic of Indonesia",
        "Kingdom of Thailand",
        "Socialist Republic of Viet Nam",
        "Republic of Cuba",
        "State of Kuwait",
        "State of Qatar",
        "Republic of Korea",
        "Japan",
        "Republic of Ghana",
        "Republic of Kenya",
        "Republic of South Africa",
        "Federative Republic of Brazil",
        "Republic of Ecuador",
        "Republic of Chile",
        "Plurinational State of Bolivia",
        "French Republic",
        "United Kingdom of Great Britain and Northern Ireland",
        "Kingdom of the Netherlands",
        "Swiss Confederation",
        "Kingdom of Spain",
        "Italian Republic",
        "Republic of Iceland",
        "Republic of Estonia",
        "Czech Republic",
        "Republic of Slovenia",
        "Republic of Albania",
        "Republic of The Gambia",
        "Dominican Republic",
        "Republic of Cyprus",
        "State of Palestine",
        "State of Israel",
        "Ukraine",
        "Russian Federation",
        "Republic of the Sudan",
        "Republic of the Union of Myanmar",
        "Syrian Arab Republic",
        "Republic of Yemen",
        "Islamic Republic of Iran",
        "Islamic Emirate of Afghanistan",
        "Republic of Türkiye",
        "United States of America"
      ],
      unodc: [
        "Republic of the Union of Myanmar",
        "Kingdom of Cambodia",
        "Lao People’s Democratic Republic",
        "Republic of the Philippines",
        "Malaysia",
        "Socialist Republic of Viet Nam",
        "Kingdom of Thailand",
        "Republic of Indonesia",
        "Republic of Singapore",
        "People’s Republic of China",
        "Republic of India",
        "People’s Republic of Bangladesh",
        "Federal Democratic Republic of Nepal",
        "Islamic Republic of Pakistan",
        "Democratic Socialist Republic of Sri Lanka",
        "Islamic Emirate of Afghanistan",
        "Kingdom of Bhutan",
        "Mongolia",
        "Republic of Kenya",
        "Federal Republic of Nigeria",
        "United States of America",
        "United Kingdom of Great Britain and Northern Ireland",
        "United Arab Emirates",
        "Swiss Confederation",
        "Kingdom of the Netherlands",
        "Grand Duchy of Luxembourg",
        "Japan",
        "Republic of Korea",
        "Commonwealth of Australia",
        "Canada",
        "Federal Republic of Germany",
        "French Republic",
        "Italian Republic",
        "Kingdom of Spain",
        "Kingdom of Belgium",
        "Republic of Austria",
        "Republic of Finland",
        "Portuguese Republic",
        "Republic of Poland",
        "Republic of Malta",
        "State of Qatar",
        "Kingdom of Saudi Arabia",
        "Republic of Türkiye",
        "State of Kuwait",
        "Kingdom of Bahrain",
        "Republic of South Africa",
        "Republic of Ghana",
        "United Republic of Tanzania",
        "United Mexican States",
        "Federative Republic of Brazil"
      ],
      ip: [
        "Reuters",
        "Associated Press (AP)",
        "The Straits Times",
        "Al-Jazeera",
        "BBC",
        "Deutsche Welle (DW)",
        "Russia Today (RT)",
        "Xinhua News Agency",
        "TRT World",
        "The New York Times",
        "WIRED",
        "The Wall Street Journal",
        "The Diplomat",
        "NHK World-Japan",
        "South China Morning Post",
        "The Hindu",
        "Financial Times",
        "France 24",
        "The Africa Report",
        "Asia News International (ANI)",
        "Press Trust of India (PTI)",
        "Times of India (TOI)"
      ]
    };

    function updatePortfoliosForCommittee(commId, port1SelectId, port2SelectId) {
      const p1Select = document.getElementById(port1SelectId);
      const p2Select = document.getElementById(port2SelectId);
      if (!p1Select || !p2Select) return;

      const list = (commId && COMMITTEE_PORTFOLIOS[commId.toLowerCase()]) ? COMMITTEE_PORTFOLIOS[commId.toLowerCase()] : [];

      // Save previous selections if still present in new list
      const prevP1 = p1Select.value;
      const prevP2 = p2Select.value;

      // Populate Portfolio 1
      p1Select.innerHTML = '<option value="" disabled selected>Select Portfolio Preference 1</option>';
      list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        p1Select.appendChild(opt);
      });

      if (prevP1 && list.includes(prevP1)) {
        p1Select.value = prevP1;
      }

      // Populate Portfolio 2 (filtering out selected Portfolio 1)
      updatePortfolio2Options(commId, port1SelectId, port2SelectId, prevP2);

      rebuildCustomSelect(port1SelectId);
    }

    function updatePortfolio2Options(commId, port1SelectId, port2SelectId, desiredValue) {
      const p1Select = document.getElementById(port1SelectId);
      const p2Select = document.getElementById(port2SelectId);
      if (!p2Select) return;

      const list = (commId && COMMITTEE_PORTFOLIOS[commId.toLowerCase()]) ? COMMITTEE_PORTFOLIOS[commId.toLowerCase()] : [];
      const selectedP1 = p1Select ? p1Select.value : '';

      // Exclude chosen Portfolio Preference 1 from Portfolio Preference 2 options
      const availableForP2 = list.filter(item => item !== selectedP1);

      p2Select.innerHTML = '<option value="" disabled selected>Select Portfolio Preference 2</option>';
      availableForP2.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        p2Select.appendChild(opt);
      });

      const valToSet = desiredValue !== undefined ? desiredValue : p2Select.value;
      if (valToSet && valToSet !== selectedP1 && availableForP2.includes(valToSet)) {
        p2Select.value = valToSet;
      } else {
        p2Select.value = '';
      }

      rebuildCustomSelect(port2SelectId);
    }

    function handlePortfolio1Change(port1SelectId, port2SelectId, commId) {
      const p1Select = document.getElementById(port1SelectId);
      if (p1Select) {
        p1Select.classList.remove('has-error');
        const trigger = p1Select.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger, .combobox-input');
        if (trigger) trigger.classList.remove('has-error');
        const err = document.getElementById(`${port1SelectId}-error`);
        if (err) err.style.display = 'none';
      }
      updatePortfolio2Options(commId, port1SelectId, port2SelectId);
    }

    function handlePortfolio2Change(port2SelectId) {
      const p2Select = document.getElementById(port2SelectId);
      if (p2Select) {
        p2Select.classList.remove('has-error');
        const trigger = p2Select.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger, .combobox-input');
        if (trigger) trigger.classList.remove('has-error');
        const err = document.getElementById(`${port2SelectId}-error`);
        if (err) err.style.display = 'none';
      }
    }

    function setCommittee1Selection(preferredCommId) {
      const comm1Select = document.getElementById('reg-committee-1');
      if (!comm1Select) return;

      const targetId = (preferredCommId || 'unsc').toLowerCase();
      const matchedComm = ALL_COMMITTEES_LIST.find(c => c.value === targetId) || ALL_COMMITTEES_LIST[0];

      // Committee 1 only shows this selected committee option
      comm1Select.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = matchedComm.value;
      opt.textContent = matchedComm.label;
      comm1Select.appendChild(opt);
      comm1Select.value = matchedComm.value;

      rebuildCustomSelect('reg-committee-1');
      updatePortfoliosForCommittee(matchedComm.value, 'reg-portfolio-1', 'reg-portfolio-2');
      
      // Update Committee 1 Matrix link
      const comm1MatrixLink = document.getElementById('reg-comm1-matrix-link');
      const comm1MatrixText = document.getElementById('comm1-matrix-btn-text');
      if (comm1MatrixLink) comm1MatrixLink.href = COMMITTEE_MATRIX_LINKS[matchedComm.value] || COMMITTEE_MATRIX_LINKS.all;
      if (comm1MatrixText) comm1MatrixText.textContent = (matchedComm.value || 'UNSC').toUpperCase();

      updateCommittee2Options();
    }

    function handleCommittee2Change(selectEl) {
      if (!selectEl) return;
      const chosenComm2 = (selectEl.value || '').toLowerCase();
      updatePortfoliosForCommittee(selectEl.value, 'reg-comm2-portfolio-1', 'reg-comm2-portfolio-2');

      const comm2MatrixLink = document.getElementById('reg-comm2-matrix-link');
      const comm2MatrixText = document.getElementById('comm2-matrix-btn-text');
      if (comm2MatrixLink) comm2MatrixLink.href = COMMITTEE_MATRIX_LINKS[chosenComm2] || COMMITTEE_MATRIX_LINKS.all;
      if (comm2MatrixText) comm2MatrixText.textContent = chosenComm2.toUpperCase();
    }

    function updateCommittee2Options() {
      const comm1Select = document.getElementById('reg-committee-1');
      const comm2Select = document.getElementById('reg-committee-2');
      if (!comm1Select || !comm2Select) return;

      const selectedComm1 = comm1Select.value.toLowerCase();
      const currentComm2Val = comm2Select.value.toLowerCase();

      // Filter out Committee 1 so Preference 2 only contains all OTHER committees
      const availableComm2 = ALL_COMMITTEES_LIST.filter(c => c.value !== selectedComm1);

      // Rebuild native options for Committee 2
      comm2Select.innerHTML = '';
      availableComm2.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.value;
        opt.textContent = c.label;
        comm2Select.appendChild(opt);
      });

      // Keep previously selected value if still valid in available options, otherwise default to first available
      if (currentComm2Val && currentComm2Val !== selectedComm1 && availableComm2.some(c => c.value === currentComm2Val)) {
        comm2Select.value = currentComm2Val;
      } else if (availableComm2.length > 0) {
        comm2Select.value = availableComm2[0].value;
      }

      // Rebuild custom dropdown UI for Committee 2
      rebuildCustomSelect('reg-committee-2');
      // Populate portfolios for Committee 2
      updatePortfoliosForCommittee(comm2Select.value, 'reg-comm2-portfolio-1', 'reg-comm2-portfolio-2');

      // Update Committee 2 Matrix link
      const comm2MatrixLink = document.getElementById('reg-comm2-matrix-link');
      const comm2MatrixText = document.getElementById('comm2-matrix-btn-text');
      const finalComm2 = (comm2Select.value || '').toLowerCase();
      if (comm2MatrixLink) comm2MatrixLink.href = COMMITTEE_MATRIX_LINKS[finalComm2] || COMMITTEE_MATRIX_LINKS.all;
      if (comm2MatrixText) comm2MatrixText.textContent = finalComm2.toUpperCase();
    }

    function closeAllCustomSelects() {
      document.querySelectorAll('.form-group.has-open-select').forEach(fg => fg.classList.remove('has-open-select'));
      document.querySelectorAll('.custom-select-wrapper.is-open').forEach(w => {
        w.classList.remove('is-open');
        const trigger = w.querySelector('.custom-select-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');

        const comboInput = w.querySelector('.combobox-input');
        if (comboInput) {
          comboInput.setAttribute('aria-expanded', 'false');
          const sel = w.querySelector('select');
          if (sel) {
            const selectedOpt = sel.options[sel.selectedIndex];
            comboInput.value = (selectedOpt && selectedOpt.value !== '') ? selectedOpt.text : '';
          }
          const arrow = w.querySelector('.combobox-arrow');
          if (arrow) arrow.style.transform = '';
          w.querySelectorAll('.custom-select-option').forEach(el => {
            el.style.display = '';
            el.classList.remove('is-highlighted');
          });
          const noResults = w.querySelector('.custom-select-no-results');
          if (noResults) noResults.style.display = 'none';
        }
      });
    }

    // Register CTA inside Committee Modal
    function handleRegisterFromModal() {
      const commId = activeCommitteeData ? activeCommitteeData.id : 'unsc';
      closeCommitteeModal(() => {
        openDelegateTypeModal(commId);
      });
    }

    // ==========================================
    // DELEGATE TYPE SELECTION
    // ==========================================
    let selectedCommitteeForReg = 'unsc';
    let currentDelegateType = 'external';

    function openDelegateTypeModal(preferredCommitteeId = 'unsc') {
      selectedCommitteeForReg = preferredCommitteeId || 'unsc';
      const typeBackdrop = document.getElementById('delegate-type-modal-backdrop');
      const typeCard = document.getElementById('delegate-type-modal-card');
      if (!typeBackdrop || !typeCard) return;

      pushModalHistoryState('delegate-type');
      typeBackdrop.classList.add('active');
      typeBackdrop.style.display = 'flex';
      lockBackgroundScroll();

      if (window.gsap) {
        gsap.fromTo(typeCard,
          { scale: 0.92, y: 30, opacity: 0 },
          { scale: 1, y: 0, opacity: 1, duration: 0.35, ease: 'power4.out' }
        );
        const closeBtn = document.getElementById('type-modal-close');
        if (closeBtn) {
          gsap.fromTo(closeBtn,
            { scale: 0.5, rotation: -90, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.4, delay: 0.12, ease: 'back.out(2.5)' }
          );
        }
      }
    }

    function closeDelegateTypeModal(callback, fromPopState = false) {
      if (!fromPopState) {
        popModalHistoryState();
      }
      const typeBackdrop = document.getElementById('delegate-type-modal-backdrop');
      const typeCard = document.getElementById('delegate-type-modal-card');
      const closeBtn = document.getElementById('type-modal-close');
      if (!typeBackdrop || !typeCard) return;

      if (window.gsap) {
        if (closeBtn) {
          gsap.to(closeBtn, {
            rotation: 180,
            scale: 0.72,
            duration: 0.2,
            ease: 'power2.in'
          });
        }
        gsap.to(typeCard, {
          scale: 0.94,
          y: 20,
          opacity: 0,
          duration: 0.22,
          ease: 'power3.in',
          onComplete: () => {
            typeBackdrop.classList.remove('active');
            typeBackdrop.style.display = 'none';
            unlockBackgroundScroll();
            gsap.set(typeCard, { clearProps: 'all' });
            if (closeBtn) gsap.set(closeBtn, { clearProps: 'all' });
            if (typeof callback === 'function') callback();
          }
        });
      } else {
        typeBackdrop.classList.remove('active');
        typeBackdrop.style.display = 'none';
        unlockBackgroundScroll();
        if (callback) callback();
      }
    }

    function selectDelegateType(type) {
      currentDelegateType = type;

      // Clear any prior draft of a different delegate type so it doesn't cross-contaminate
      const rawDraft = sessionStorage.getItem(DRAFT_KEY);
      if (rawDraft) {
        try {
          const parsed = JSON.parse(rawDraft);
          if (parsed && parsed['_delegateType'] !== type) {
            clearDraft();
          }
        } catch (e) { clearDraft(); }
      }

      applyDelegateTypeUI(type);

      closeDelegateTypeModal(() => {
        openRegistrationModal(selectedCommitteeForReg, type);
      }, true);
    }

    
    function getSelectedInternalInstitution() {
      const selectEl = document.getElementById('reg-institution-select');
      if (selectEl && selectEl.value) return selectEl.value;
      const instInput = document.getElementById('reg-institution');
      return instInput ? instInput.value.trim() : 'RNS Institute of Technology';
    }

    // Validate Internal USN:
    // - For RNS First Grade College: Any input up to 10 chars (no prefix/pattern requirement)
    // - For RNS Institute of Technology: Must start with 1RN, 1RX, 1IB or be FRESHER (4-10 alphanumeric chars)
    function isValidInternalUSN(val) {
      if (!val) return false;
      const clean = val.trim();
      if (clean.length === 0 || clean.length > 10) return false;

      const inst = getSelectedInternalInstitution();
      if (inst === 'RNS First Grade College') {
        return clean.length <= 10;
      }

      const lower = clean.toLowerCase();
      // Allow secret keywords: FRESHER, Fresher, fresher
      if (lower === 'fresher') {
        return true;
      }

      // Must start with: 1RN, 1RX, 1IB, 1rn, 1rx, 1ib
      const validPrefixes = ['1rn', '1rx', '1ib'];
      const hasPrefix = validPrefixes.some(p => lower.startsWith(p));
      if (!hasPrefix) return false;

      // Must be alphanumeric between 4 and 10 characters (e.g. 1RN22CS001)
      return /^[0-9a-zA-Z]{4,10}$/.test(clean);
    }

    function getInternalUSNErrorMessage() {
      const inst = getSelectedInternalInstitution();
      return inst === 'RNS First Grade College'
        ? 'Please enter your USN / Roll No (max 10 chars)'
        : 'Please enter a valid RNSIT USN (starting with 1RN, 1RX, 1IB) or FRESHER (max 10 chars)';
    }

    function updateInternalUSNFieldState() {
      if (currentDelegateType !== 'internal') return;
      const usnInput = document.getElementById('reg-usn');
      const errEl = document.getElementById('reg-usn-error');
      if (!usnInput) return;

      const inst = getSelectedInternalInstitution();
      usnInput.maxLength = 10;
      usnInput.setAttribute('maxlength', '10');

      if (inst === 'RNS First Grade College') {
        usnInput.placeholder = 'Enter your USN/Roll Number';
      } else {
        usnInput.placeholder = 'e.g. 1RN22CS001 or FRESHER';
      }

      if (usnInput.value.trim()) {
        const isValid = isValidInternalUSN(usnInput.value.trim());
        if (isValid) {
          usnInput.classList.remove('has-error');
          if (errEl) errEl.style.display = 'none';
        } else {
          usnInput.classList.add('has-error');
          if (errEl) {
            errEl.textContent = getInternalUSNErrorMessage();
            errEl.style.display = 'block';
          }
        }
      } else {
        usnInput.classList.remove('has-error');
        if (errEl) errEl.style.display = 'none';
      }
      updateStep1NextButtonState();
    }

    function updateStep1NextButtonState() {
      const nextBtn = document.getElementById('reg-step-1-next');
      if (!nextBtn) return;

      if (currentDelegateType === 'internal') {
        const usnInput = document.getElementById('reg-usn');
        const usnVal = usnInput ? usnInput.value.trim() : '';
        const isValid = isValidInternalUSN(usnVal);

        if (isValid) {
          nextBtn.disabled = false;
          nextBtn.removeAttribute('disabled');
          nextBtn.style.opacity = '1';
          nextBtn.style.cursor = 'pointer';
          if (usnInput) {
            usnInput.classList.remove('has-error');
            const errEl = document.getElementById('reg-usn-error');
            if (errEl) errEl.style.display = 'none';
          }
        } else {
          nextBtn.disabled = true;
          nextBtn.setAttribute('disabled', 'true');
          nextBtn.style.opacity = '0.45';
          nextBtn.style.cursor = 'not-allowed';
        }
      } else {
        nextBtn.disabled = false;
        nextBtn.removeAttribute('disabled');
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
        const errEl = document.getElementById('reg-usn-error');
        if (errEl) errEl.style.display = 'none';
      }
    }

    function handleInternalInstitutionChange(selectEl) {
      if (!selectEl) return;
      const institution = document.getElementById('reg-institution');
      if (institution) {
        institution.value = selectEl.value;
        institution.classList.remove('has-error');
      }
      const errEl = document.getElementById('reg-institution-error');
      if (errEl) errEl.style.display = 'none';
      updateInternalUSNFieldState();
    }

    function applyDelegateTypeUI(type) {
      currentDelegateType = type;
      const typeHidden = document.getElementById('reg-delegate-type');
      if (typeHidden) typeHidden.value = type;

      const titleEl = document.getElementById('reg-form-title');
      if (titleEl) {
        titleEl.textContent = type === 'internal' ? 'Internal Delegate Registration' : 'External Delegate Registration';
      }

      const institution = document.getElementById('reg-institution');
      const institutionSelect = document.getElementById('reg-institution-select');
      const institutionSelectWrap = document.getElementById('custom-select-wrap-reg-institution-select');
      const step1Ind = document.getElementById('step-indicator-1');
      const step2Ind = document.getElementById('step-indicator-2');
      const step3Ind = document.getElementById('step-indicator-3');
      const step4Ind = document.getElementById('step-indicator-4');
      const step5Arrow = document.getElementById('step-arrow-5');
      const step5Ind = document.getElementById('step-indicator-5');

      const usnLabel = document.getElementById('reg-usn-label') || document.querySelector('label[for="reg-usn"]');
      const usnInput = document.getElementById('reg-usn');
      const usnErr = document.getElementById('reg-usn-error');

      if (type === 'internal') {
        if (institutionSelect) {
          if (!institutionSelect.value) {
            institutionSelect.value = 'RNS Institute of Technology';
          }
          institutionSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (institution) {
          institution.value = institutionSelect ? institutionSelect.value : 'RNS Institute of Technology';
          institution.readOnly = true;
          institution.style.display = 'none';
          institution.classList.remove('has-error');
          const errEl = document.getElementById('reg-institution-error');
          if (errEl) errEl.style.display = 'none';
        }
        if (institutionSelectWrap) {
          institutionSelectWrap.style.display = '';
        }
        if (usnLabel) usnLabel.innerHTML = 'USN / Roll No *';
        if (usnInput) {
          usnInput.required = true;
          usnInput.setAttribute('required', 'true');
        }
        updateInternalUSNFieldState();
        if (step1Ind) step1Ind.textContent = 'Delegate Details';
        if (step2Ind) step2Ind.textContent = 'Step 1';
        if (step3Ind) step3Ind.textContent = 'Step 2';
        if (step4Ind) step4Ind.textContent = 'Step 3';
        if (step5Arrow) step5Arrow.style.display = 'none';
        if (step5Ind) step5Ind.style.display = 'none';
        updateStep1NextButtonState();
      } else {
        if (institutionSelectWrap) {
          institutionSelectWrap.style.display = 'none';
        }
        if (institution) {
          institution.style.display = '';
          if (institution.value === 'RNS Institute of Technology' || institution.value === 'RNS First Grade College') {
            institution.value = '';
          }
          institution.readOnly = false;
          institution.placeholder = 'e.g. College / Institute Name';
        }
        if (usnLabel) usnLabel.innerHTML = 'USN / Roll No';
        if (usnInput) {
          usnInput.required = false;
          usnInput.removeAttribute('required');
          usnInput.removeAttribute('maxlength');
          usnInput.placeholder = '';
          usnInput.classList.remove('has-error');
        }
        if (usnErr) usnErr.style.display = 'none';
        if (step1Ind) step1Ind.textContent = 'Delegate Details';
        if (step2Ind) step2Ind.textContent = 'Step 1';
        if (step3Ind) step3Ind.textContent = 'Step 2';
        if (step4Ind) step4Ind.textContent = 'Step 3';
        if (step5Arrow) step5Arrow.style.display = 'inline';
        if (step5Ind) {
          step5Ind.style.display = 'inline-block';
          step5Ind.textContent = 'Confirmation';
        }
        updateStep1NextButtonState();
      }
    }

    // ==========================================
    // MULTI-STEP DELEGATE REGISTRATION WIZARD
    // ==========================================
    let currentStep = 1;

    function goToStep(targetStep) {
      closeAllCustomSelects();

      // If moving forward, validate current step
      if (targetStep > currentStep) {
        if (!validateStep(currentStep)) {
          const regCard = document.getElementById('registration-modal-card');
          if (window.gsap && regCard) {
            gsap.fromTo(regCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(regCard, { x: 0 }) });
          }
          return;
        }
      }

      // Update Step Panels and Indicator (supports up to step 5)
      for (let s = 1; s <= 5; s++) {
        const panel = document.getElementById(`wizard-step-${s}`);
        const indicator = document.getElementById(`step-indicator-${s}`);
        if (panel) {
          if (s === targetStep) {
            panel.classList.add('is-active');
            panel.style.display = 'block';
          } else {
            panel.classList.remove('is-active');
            panel.style.display = 'none';
          }
        }
        if (indicator) {
          if (s === targetStep) {
            indicator.classList.add('is-active');
            indicator.classList.remove('is-completed');
          } else if (s < targetStep) {
            indicator.classList.remove('is-active');
            indicator.classList.add('is-completed');
          } else {
            indicator.classList.remove('is-active');
            indicator.classList.remove('is-completed');
          }
        }
      }

      // If entering Step 4, show corresponding panel
      if (targetStep === 4) {
        const internalPanel = document.getElementById('internal-payment-panel');
        const externalPanel = document.getElementById('external-payment-panel');
        if (currentDelegateType === 'internal') {
          if (internalPanel) internalPanel.style.display = 'block';
          if (externalPanel) externalPanel.style.display = 'none';
          const internalSubmitBtn = document.getElementById('internal-submit-btn');
          if (internalSubmitBtn) {
            internalSubmitBtn.disabled = false;
            internalSubmitBtn.removeAttribute('disabled');
            internalSubmitBtn.style.opacity = '1';
            internalSubmitBtn.style.cursor = 'pointer';
          }
        } else {
          if (internalPanel) internalPanel.style.display = 'none';
          if (externalPanel) externalPanel.style.display = 'block';
          updateExternalPaymentQR();
        }
      }

      if (targetStep === 5 && currentDelegateType === 'external') {
        updateExternalPaymentQR();
      }

      currentStep = targetStep;

      // Scroll modal to top on step transition
      const regCard = document.getElementById('registration-modal-card');
      if (regCard) regCard.scrollTop = 0;
    }

    // ─── Shared Canvas Image Compressor ───────────────────────────────────────
    // Compresses any image File to WebP (or JPEG fallback) in-browser using HTML5
    // Canvas. Target output: ≤ 250 KB, max dimension 1920px, quality adaptive.
    // Returns a Promise<{ dataUrl, blob, originalKB, compressedKB, format }>.
    function compressScreenshot(file) {
      return new Promise((resolve, reject) => {
        const MAX_SIDE = 1920;           // max width or height in px
        const TARGET_KB = 250;          // target compressed size
        const MIN_QUALITY = 0.45;       // lowest quality floor
        const WEBP_SUPPORTED = (() => {
          try {
            return document.createElement('canvas')
              .toDataURL('image/webp').startsWith('data:image/webp');
          } catch { return false; }
        })();
        const FORMAT = WEBP_SUPPORTED ? 'image/webp' : 'image/jpeg';
        const EXT = WEBP_SUPPORTED ? 'webp' : 'jpg';

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);

          // Scale down if either dimension exceeds MAX_SIDE
          let { naturalWidth: w, naturalHeight: h } = img;
          if (w > MAX_SIDE || h > MAX_SIDE) {
            const ratio = Math.min(MAX_SIDE / w, MAX_SIDE / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);

          // Adaptive quality: start at 0.82, walk down until ≤ TARGET_KB
          let quality = 0.82;
          let dataUrl = canvas.toDataURL(FORMAT, quality);
          const base64Overhead = `data:${FORMAT};base64,`.length;

          while (quality > MIN_QUALITY) {
            const sizeKB = Math.ceil((dataUrl.length - base64Overhead) * 0.75 / 1024);
            if (sizeKB <= TARGET_KB) break;
            quality = Math.max(MIN_QUALITY, quality - 0.08);
            dataUrl = canvas.toDataURL(FORMAT, quality);
          }

          // Convert dataUrl → Blob so submission code can use it like a File
          const byteString = atob(dataUrl.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: FORMAT });

          resolve({
            dataUrl,
            blob,
            format: EXT,
            originalKB: Math.round(file.size / 1024),
            compressedKB: Math.round(blob.size / 1024),
            width: w,
            height: h
          });
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Image failed to load'));
        };

        img.src = objectUrl;
      });
    }

    // Stores compressed dataURLs keyed by flow ('internal' | 'external')
    // so the submit handler can reference them without re-reading the file.
    const _compressedScreenshots = {};

    function resetPaymentScreenshotState() {
      delete _compressedScreenshots['internal'];
      delete _compressedScreenshots['external'];
      _compressedScreenshots['internal'] = null;
      _compressedScreenshots['external'] = null;

      // 1. Internal screenshot inputs & UI
      const internalInput = document.getElementById('reg-payment-screenshot');
      if (internalInput) internalInput.value = '';
      const internalEmptyState = document.getElementById('dropzone-empty-state');
      if (internalEmptyState) internalEmptyState.style.display = 'block';
      const internalFileState = document.getElementById('dropzone-file-state');
      if (internalFileState) internalFileState.style.display = 'none';
      const internalFileName = document.getElementById('screenshot-file-name');
      if (internalFileName) internalFileName.textContent = '';
      const internalFileSize = document.getElementById('screenshot-file-size');
      if (internalFileSize) internalFileSize.textContent = '';
      const internalThumb = document.getElementById('screenshot-preview-thumb');
      if (internalThumb) internalThumb.src = '';
      const internalErr = document.getElementById('reg-payment-screenshot-error');
      if (internalErr) internalErr.style.display = 'none';
      const internalSubmitBtn = document.getElementById('internal-submit-btn');
      if (internalSubmitBtn) {
        internalSubmitBtn.disabled = false;
        internalSubmitBtn.removeAttribute('disabled');
        internalSubmitBtn.style.opacity = '1';
        internalSubmitBtn.style.cursor = 'pointer';
      }

      // 2. External screenshot inputs & UI
      const externalInput = document.getElementById('reg-external-payment-screenshot');
      if (externalInput) externalInput.value = '';
      const externalEmptyState = document.getElementById('external-dropzone-empty-state');
      if (externalEmptyState) externalEmptyState.style.display = 'block';
      const externalFileState = document.getElementById('external-dropzone-file-state');
      if (externalFileState) externalFileState.style.display = 'none';
      const externalFileName = document.getElementById('external-screenshot-file-name');
      if (externalFileName) externalFileName.textContent = '';
      const externalFileSize = document.getElementById('external-screenshot-file-size');
      if (externalFileSize) externalFileSize.textContent = '';
      const externalThumb = document.getElementById('external-screenshot-preview-thumb');
      if (externalThumb) externalThumb.src = '';
      const externalErr = document.getElementById('reg-external-payment-screenshot-error');
      if (externalErr) externalErr.style.display = 'none';
      const externalSubmitBtn = document.getElementById('external-submit-btn');
      if (externalSubmitBtn) {
        externalSubmitBtn.disabled = true;
        externalSubmitBtn.setAttribute('disabled', 'true');
        externalSubmitBtn.style.opacity = '0.45';
        externalSubmitBtn.style.cursor = 'not-allowed';
      }
    }

    function handlePaymentScreenshotSelected(input) {
      const file = input.files && input.files[0];
      const submitBtn = document.getElementById('internal-submit-btn');
      const emptyState = document.getElementById('dropzone-empty-state');
      const fileState = document.getElementById('dropzone-file-state');
      const fileNameEl = document.getElementById('screenshot-file-name');
      const fileSizeEl = document.getElementById('screenshot-file-size');
      const previewThumb = document.getElementById('screenshot-preview-thumb');
      const err = document.getElementById('reg-payment-screenshot-error');

      if (file) {
        if (fileNameEl) fileNameEl.textContent = file.name;
        // Show a "compressing…" indicator while canvas does its work
        if (fileSizeEl) {
          fileSizeEl.textContent = 'Compressing…';
          fileSizeEl.style.color = '#888';
        }
        if (emptyState) emptyState.style.display = 'none';
        if (fileState) fileState.style.display = 'flex';
        if (err) err.style.display = 'none';

        // Disable submit until compression is done
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.55';
          submitBtn.style.cursor = 'not-allowed';
        }

        compressScreenshot(file).then(result => {
          _compressedScreenshots['internal'] = result.dataUrl;

          if (previewThumb) previewThumb.src = result.dataUrl;
          if (fileSizeEl) {
            const savedPct = result.originalKB > 0
              ? Math.round((1 - result.compressedKB / result.originalKB) * 100)
              : 0;
            fileSizeEl.textContent =
              `${result.compressedKB} KB · saved ${savedPct}% (was ${result.originalKB} KB)`;
            fileSizeEl.style.color = '#0F9D58';
          }

          if (submitBtn) {
            submitBtn.style.display = 'inline-flex';
            submitBtn.disabled = false;
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.textContent = 'Submit Registration';
          }
        }).catch(() => {
          // Compression failed — fall back to raw FileReader preview
          const reader = new FileReader();
          reader.onload = e => {
            if (previewThumb) previewThumb.src = e.target.result;
            _compressedScreenshots['internal'] = e.target.result;
          };
          reader.readAsDataURL(file);
          if (fileSizeEl) {
            fileSizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB (raw)`;
            fileSizeEl.style.color = '';
          }
          if (submitBtn) {
            submitBtn.style.display = 'inline-flex';
            submitBtn.disabled = false;
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.textContent = 'Submit Registration';
          }
        });
      } else {
        removePaymentScreenshot();
      }
    }

    function removePaymentScreenshot() {
      delete _compressedScreenshots['internal'];
      _compressedScreenshots['internal'] = null;

      const input = document.getElementById('reg-payment-screenshot');
      const submitBtn = document.getElementById('internal-submit-btn');
      const emptyState = document.getElementById('dropzone-empty-state');
      const fileState = document.getElementById('dropzone-file-state');
      const fileNameEl = document.getElementById('screenshot-file-name');
      const fileSizeEl = document.getElementById('screenshot-file-size');
      const previewThumb = document.getElementById('screenshot-preview-thumb');
      const err = document.getElementById('reg-payment-screenshot-error');

      if (input) input.value = '';
      if (emptyState) emptyState.style.display = 'block';
      if (fileState) fileState.style.display = 'none';
      if (fileNameEl) fileNameEl.textContent = '';
      if (fileSizeEl) fileSizeEl.textContent = '';
      if (previewThumb) previewThumb.src = '';
      if (err) err.style.display = 'none';

      if (submitBtn) {
        submitBtn.style.display = 'inline-flex';
        submitBtn.disabled = true;
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.style.opacity = '0.45';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.textContent = 'Submit Registration';
      }
    }

    // Tactile Neo-Brutalist Toast Controller
    let toastTimeout = null;

    function showTactileToast(message = 'mun@rnsit.ac.in copied to clipboard!') {
      const toast = document.getElementById('tactile-copy-toast');
      const textEl = document.getElementById('tactile-toast-text');
      if (!toast) return;

      if (textEl) textEl.textContent = message;

      // Haptic tactile vibration feedback on supporting mobile devices
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch (e) {}
      }

      if (toastTimeout) clearTimeout(toastTimeout);

      toast.classList.add('show');

      toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
      }, 2600);
    }

    function fallbackCopyText(text, callback) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        if (callback) callback();
      } catch (err) {
        if (callback) callback();
      }
    }

    function copyInternalUPI() {
      const upiText = 'mun@rnsit.ac.in';
      const copyBtn = document.getElementById('copy-upi-btn');

      const onCopied = () => {
        showTactileToast('mun@rnsit.ac.in copied to clipboard!');
        if (copyBtn) {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '✓ Copied!';
          copyBtn.style.background = '#0F9D58';
          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = 'var(--accent-color)';
          }, 2000);
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(upiText).then(onCopied).catch(() => {
          fallbackCopyText(upiText, onCopied);
        });
      } else {
        fallbackCopyText(upiText, onCopied);
      }
    }

    // External Delegate Payment Screenshot & Copy Handlers
    function handleExternalPaymentScreenshotSelected(input) {
      const file = input.files && input.files[0];
      const submitBtn = document.getElementById('external-submit-btn');
      const emptyState = document.getElementById('external-dropzone-empty-state');
      const fileState = document.getElementById('external-dropzone-file-state');
      const fileNameEl = document.getElementById('external-screenshot-file-name');
      const fileSizeEl = document.getElementById('external-screenshot-file-size');
      const previewThumb = document.getElementById('external-screenshot-preview-thumb');
      const err = document.getElementById('reg-external-payment-screenshot-error');

      if (file) {
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) {
          fileSizeEl.textContent = 'Compressing…';
          fileSizeEl.style.color = '#888';
        }
        if (emptyState) emptyState.style.display = 'none';
        if (fileState) fileState.style.display = 'flex';
        if (err) err.style.display = 'none';

        // Disable submit until compression is done
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.55';
          submitBtn.style.cursor = 'not-allowed';
        }

        compressScreenshot(file).then(result => {
          _compressedScreenshots['external'] = result.dataUrl;

          if (previewThumb) previewThumb.src = result.dataUrl;
          if (fileSizeEl) {
            const savedPct = result.originalKB > 0
              ? Math.round((1 - result.compressedKB / result.originalKB) * 100)
              : 0;
            fileSizeEl.textContent =
              `${result.compressedKB} KB · saved ${savedPct}% (was ${result.originalKB} KB)`;
            fileSizeEl.style.color = '#0F9D58';
          }

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
          }
        }).catch(() => {
          // Compression fallback
          const reader = new FileReader();
          reader.onload = e => {
            if (previewThumb) previewThumb.src = e.target.result;
            _compressedScreenshots['external'] = e.target.result;
          };
          reader.readAsDataURL(file);
          if (fileSizeEl) {
            fileSizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB (raw)`;
            fileSizeEl.style.color = '';
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
          }
        });
      } else {
        removeExternalPaymentScreenshot();
      }
    }

    function removeExternalPaymentScreenshot() {
      delete _compressedScreenshots['external'];
      _compressedScreenshots['external'] = null;

      const input = document.getElementById('reg-external-payment-screenshot');
      const submitBtn = document.getElementById('external-submit-btn');
      const emptyState = document.getElementById('external-dropzone-empty-state');
      const fileState = document.getElementById('external-dropzone-file-state');
      const fileNameEl = document.getElementById('external-screenshot-file-name');
      const fileSizeEl = document.getElementById('external-screenshot-file-size');
      const previewThumb = document.getElementById('external-screenshot-preview-thumb');
      const err = document.getElementById('reg-external-payment-screenshot-error');

      if (input) input.value = '';
      if (emptyState) emptyState.style.display = 'block';
      if (fileState) fileState.style.display = 'none';
      if (fileNameEl) fileNameEl.textContent = '';
      if (fileSizeEl) fileSizeEl.textContent = '';
      if (previewThumb) previewThumb.src = '';
      if (err) err.style.display = 'none';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.style.opacity = '0.45';
        submitBtn.style.cursor = 'not-allowed';
      }
    }

// (Old redundant copyExternalUPI removed - rotation-aware version active below)

    function handleExperienceToggle(value) {
      const countSection = document.getElementById('exp-count-section');
      const detailsSection = document.getElementById('exp-details-section');
      const expCountSelect = document.getElementById('reg-exp-count');
      const expDetailsInput = document.getElementById('reg-experience-details');
      const hiddenExp = document.getElementById('reg-experience');
      const hasExpErr = document.getElementById('reg-has-exp-error');

      if (hasExpErr) hasExpErr.style.display = 'none';

      if (value === 'no') {
        if (countSection) countSection.style.display = 'none';
        if (detailsSection) detailsSection.style.display = 'none';
        if (expCountSelect) {
          expCountSelect.value = '';
          const customWrap = document.getElementById('custom-select-wrap-reg-exp-count');
          if (customWrap) {
            const textSpan = customWrap.querySelector('.custom-select-text');
            if (textSpan) textSpan.textContent = 'Select number of conferences';
            customWrap.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('is-selected'));
            customWrap.classList.remove('has-error');
          }
        }
        if (expDetailsInput) {
          expDetailsInput.value = '';
          expDetailsInput.classList.remove('has-error');
        }
        if (hiddenExp) hiddenExp.value = '0';
        const countErr = document.getElementById('reg-exp-count-error');
        const detailsErr = document.getElementById('reg-experience-details-error');
        if (countErr) countErr.style.display = 'none';
        if (detailsErr) detailsErr.style.display = 'none';
      } else if (value === 'yes') {
        if (countSection) countSection.style.display = 'block';
        if (hiddenExp) hiddenExp.value = '';
        if (expCountSelect && expCountSelect.value) {
          if (detailsSection) detailsSection.style.display = 'block';
        } else {
          if (detailsSection) detailsSection.style.display = 'none';
        }
      }
    }

    function handleConferenceCountChange(selectEl) {
      const detailsSection = document.getElementById('exp-details-section');
      const countErr = document.getElementById('reg-exp-count-error');
      const countWrap = document.getElementById('custom-select-wrap-reg-exp-count') || selectEl;
      if (countErr) countErr.style.display = 'none';
      if (countWrap) countWrap.classList.remove('has-error');

      if (selectEl && selectEl.value) {
        if (detailsSection) detailsSection.style.display = 'block';
      } else {
        if (detailsSection) detailsSection.style.display = 'none';
      }
    }

    function validateStep(step) {
      let isValid = true;

      if (step === 1) {
        const name = document.getElementById('reg-name');
        const age = document.getElementById('reg-age');
        const institution = document.getElementById('reg-institution');
        const usn = document.getElementById('reg-usn');
        const city = document.getElementById('reg-city');
        const phone = document.getElementById('reg-phone');
        const email = document.getElementById('reg-email');

        const simpleRequired = [
          { el: name, errId: 'reg-name-error' },
          { el: institution, errId: 'reg-institution-error' },
          { el: city, errId: 'reg-city-error' }
        ];

        simpleRequired.forEach(({ el, errId }) => {
          if (!el) return;
          const errorEl = document.getElementById(errId);
          if (!el.value.trim()) {
            el.classList.add('has-error');
            if (errorEl) errorEl.style.display = 'block';
            isValid = false;
          } else {
            el.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        });

        // Mandatory USN Validation for Internal Delegates
        if (currentDelegateType === 'internal') {
          const usnInput = document.getElementById('reg-usn');
          const errorEl = document.getElementById('reg-usn-error');
          const usnVal = usnInput ? usnInput.value.trim() : '';

          if (!isValidInternalUSN(usnVal)) {
            if (usnInput) usnInput.classList.add('has-error');
            if (errorEl) {
              errorEl.textContent = getInternalUSNErrorMessage();
              errorEl.style.display = 'block';
            }
            isValid = false;
          } else {
            if (usnInput) usnInput.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }

        // Phone validation (strictly 10 digits)
        if (phone) {
          const errorEl = document.getElementById('reg-phone-error');
          const digits = phone.value.replace(/[^0-9]/g, '');
          if (!phone.value.trim() || digits.length !== 10) {
            phone.classList.add('has-error');
            if (errorEl) {
              errorEl.textContent = 'Please enter a valid 10-digit WhatsApp number';
              errorEl.style.display = 'block';
            }
            isValid = false;
          } else {
            phone.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }

        // Age validation
        if (age) {
          const errorEl = document.getElementById('reg-age-error');
          const ageVal = parseInt(age.value, 10);
          if (!age.value.trim() || isNaN(ageVal) || ageVal < 18 || ageVal > 28) {
            age.classList.add('has-error');
            if (errorEl) {
              errorEl.textContent = 'Please enter a valid age (18–28)';
              errorEl.style.display = 'block';
            }
            isValid = false;
          } else {
            age.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }

        // Email validation
        if (email) {
          const errorEl = document.getElementById('reg-email-error');
          const existsMsg = document.getElementById('reg-email-exists-msg');
          const emailVal = email.value.trim().toLowerCase();

          if (!emailVal || !/^\S+@\S+\.\S+$/.test(emailVal)) {
            email.classList.add('has-error');
            if (existsMsg) existsMsg.style.display = 'none';
            if (errorEl) {
              errorEl.textContent = 'Please enter a valid email address';
              errorEl.style.display = 'block';
            }
            isValid = false;
          } else if (isEmailRegisteredLocal(emailVal)) {
            email.classList.add('has-error');
            if (errorEl) errorEl.style.display = 'none';
            if (existsMsg) {
              existsMsg.textContent = "This email address has already been registered for RNS MUN '26. Each delegate may only register once.";
              existsMsg.style.display = 'block';
            }
            isValid = false;
          } else {
            email.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
            if (existsMsg) existsMsg.style.display = 'none';
          }
        }

        // MUN Experience validation
        const expYes = document.getElementById('reg-exp-yes');
        const expNo = document.getElementById('reg-exp-no');
        const hasExpErr = document.getElementById('reg-has-exp-error');
        const hiddenExp = document.getElementById('reg-experience');

        if (!expYes || !expNo || (!expYes.checked && !expNo.checked)) {
          if (hasExpErr) hasExpErr.style.display = 'block';
          isValid = false;
        } else if (expNo.checked) {
          if (hasExpErr) hasExpErr.style.display = 'none';
          if (hiddenExp) hiddenExp.value = '0';
        } else if (expYes.checked) {
          if (hasExpErr) hasExpErr.style.display = 'none';
          const expCount = document.getElementById('reg-exp-count');
          const countErr = document.getElementById('reg-exp-count-error');
          const expDetails = document.getElementById('reg-experience-details');
          const detailsErr = document.getElementById('reg-experience-details-error');
          const countWrap = document.getElementById('custom-select-wrap-reg-exp-count') || expCount;

          if (!expCount || !expCount.value) {
            if (countErr) countErr.style.display = 'block';
            if (countWrap) countWrap.classList.add('has-error');
            isValid = false;
          } else {
            if (countErr) countErr.style.display = 'none';
            if (countWrap) countWrap.classList.remove('has-error');

            if (!expDetails || !expDetails.value.trim()) {
              if (detailsErr) detailsErr.style.display = 'block';
              if (expDetails) expDetails.classList.add('has-error');
              isValid = false;
            } else {
              if (detailsErr) detailsErr.style.display = 'none';
              if (expDetails) expDetails.classList.remove('has-error');
              if (hiddenExp) {
                hiddenExp.value = `${expCount.value} Conferences | ${expDetails.value.trim()}`;
              }
            }
          }
        }
      } else if (step === 2) {
        const committee1 = document.getElementById('reg-committee-1');
        const portfolio1 = document.getElementById('reg-portfolio-1');

        if (committee1) {
          const errorEl = document.getElementById('reg-committee-1-error');
          const trigger = committee1.parentElement?.querySelector('.custom-select-trigger');
          if (!committee1.value.trim()) {
            committee1.classList.add('has-error');
            if (trigger) trigger.classList.add('has-error');
            if (errorEl) errorEl.style.display = 'block';
            isValid = false;
          } else {
            committee1.classList.remove('has-error');
            if (trigger) trigger.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }

        if (portfolio1) {
          const errorEl = document.getElementById('reg-portfolio-1-error');
          const trigger = portfolio1.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger, .combobox-input');
          if (!portfolio1.value.trim()) {
            portfolio1.classList.add('has-error');
            if (trigger) trigger.classList.add('has-error');
            if (errorEl) errorEl.style.display = 'block';
            isValid = false;
          } else {
            portfolio1.classList.remove('has-error');
            if (trigger) trigger.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }

        const portfolio2 = document.getElementById('reg-portfolio-2');
        if (portfolio2) {
          const errorEl = document.getElementById('reg-portfolio-2-error');
          const trigger = portfolio2.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger, .combobox-input');
          if (!portfolio2.value.trim()) {
            portfolio2.classList.add('has-error');
            if (trigger) trigger.classList.add('has-error');
            if (errorEl) errorEl.style.display = 'block';
            isValid = false;
          } else {
            portfolio2.classList.remove('has-error');
            if (trigger) trigger.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }
      } else if (step === 3) {
        const committee2 = document.getElementById('reg-committee-2');

        if (committee2) {
          const errorEl = document.getElementById('reg-committee-2-error');
          const trigger = committee2.parentElement?.querySelector('.custom-select-trigger');
          if (!committee2.value.trim()) {
            committee2.classList.add('has-error');
            if (trigger) trigger.classList.add('has-error');
            if (errorEl) errorEl.style.display = 'block';
            isValid = false;
          } else {
            committee2.classList.remove('has-error');
            if (trigger) trigger.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }

        const comm2Portfolio1 = document.getElementById('reg-comm2-portfolio-1');
        if (comm2Portfolio1) {
          const errorEl = document.getElementById('reg-comm2-portfolio-1-error');
          const trigger = comm2Portfolio1.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger, .combobox-input');
          if (!comm2Portfolio1.value.trim()) {
            comm2Portfolio1.classList.add('has-error');
            if (trigger) trigger.classList.add('has-error');
            if (errorEl) errorEl.style.display = 'block';
            isValid = false;
          } else {
            comm2Portfolio1.classList.remove('has-error');
            if (trigger) trigger.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }

        const comm2Portfolio2 = document.getElementById('reg-comm2-portfolio-2');
        if (comm2Portfolio2) {
          const errorEl = document.getElementById('reg-comm2-portfolio-2-error');
          const trigger = comm2Portfolio2.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger, .combobox-input');
          if (!comm2Portfolio2.value.trim()) {
            comm2Portfolio2.classList.add('has-error');
            if (trigger) trigger.classList.add('has-error');
            if (errorEl) errorEl.style.display = 'block';
            isValid = false;
          } else {
            comm2Portfolio2.classList.remove('has-error');
            if (trigger) trigger.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        }
      }

      return isValid;
    }

    // ==========================================
    // STEP 3 → STEP 4 PROCEED (External) or SUBMIT (Internal)
    // ==========================================
    function handleStep3Proceed() {
      if (currentDelegateType === 'internal') {
        // Trigger form submit for internal delegate
        const form = document.getElementById('delegate-registration-form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      } else {
        // External: go to Step 4 (payment)
        goToStep(4);
        selectExternalCategory('standard');
      }
    }

    // ==========================================
    // EXTERNAL DELEGATE PRICING & PASS (Step 4)
    // ==========================================
    let isIEEEMember = false;
    let externalCategory = 'standard';

    function selectExternalCategory(category) {
      externalCategory = 'standard';
      isIEEEMember = false;

      const orderDesc = document.getElementById('external-order-desc');
      const orderPrice = document.getElementById('external-order-price');
      const totalPayable = document.getElementById('external-total-payable');
      const payBtn = document.getElementById('reg-proceed-to-pay-btn') || document.getElementById('reg-pay-now-btn');

      if (orderDesc) orderDesc.textContent = 'External Delegate Pass (Standard)';
      if (orderPrice) orderPrice.textContent = '₹1,350';
      if (totalPayable) totalPayable.textContent = '₹1,350';
      if (payBtn) payBtn.textContent = 'Proceed to Payment (₹1,350) →';
    }

    // ==========================================
    // EXTERNAL DELEGATE PROCEED TO PAYMENT (Step 4 → Step 5)
    // ==========================================
    function handleProceedToExternalPayment() {
      // Duplicate Email Safety Guard
      const emailVal = document.getElementById('reg-email')?.value.trim().toLowerCase();
      if (isEmailRegisteredLocal(emailVal)) {
        goToStep(1);
        const emailInput = document.getElementById('reg-email');
        if (emailInput) {
          emailInput.classList.add('has-error');
          emailInput.focus();
        }
        const existsMsg = document.getElementById('reg-email-exists-msg');
        if (existsMsg) {
          existsMsg.textContent = "This email address has already been registered for RNS MUN '26. Each delegate may only register once.";
          existsMsg.style.display = 'block';
        }
        const regCard = document.getElementById('registration-modal-card');
        if (window.gsap && regCard) {
          gsap.fromTo(regCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(regCard, { x: 0 }) });
        }
        return;
      }

      // Update Step 5 Tier Badge & Pricing Info
      const tierBadge = document.getElementById('step5-tier-badge');
      if (tierBadge) tierBadge.textContent = '[ EXTERNAL DELEGATE PASS ]';
      const step5Original = document.getElementById('step5-original-price');
      if (step5Original) step5Original.style.display = 'none';
      const step5Amount = document.getElementById('step5-amount-display');
      if (step5Amount) step5Amount.textContent = '₹1,350';
      const step5Desc = document.getElementById('step5-payment-desc');
      if (step5Desc) step5Desc.innerHTML = 'Scan the QR code or use the UPI ID below to complete your payment of <strong>₹1,350</strong>. Upload the transaction screenshot below to complete your registration.';
      const step5Proof = document.getElementById('step5-proof-text');
      if (step5Proof) step5Proof.textContent = '[ PROOF OF ₹1,350 TRANSFER ]';

      updateExternalPaymentQR();
      goToStep(5);
    }


    function openRegistrationModal(preferredCommitteeId = 'unsc', forceType = null) {
      if (forceType) {
        currentDelegateType = forceType;
      }
      const regBackdrop = document.getElementById('registration-modal-backdrop');
      const regCard = document.getElementById('registration-modal-card');

      // Clear any transient screenshot state
      resetPaymentScreenshotState();

      // Check if a saved draft exists in sessionStorage
      const restored = restoreDraft(forceType || currentDelegateType);
      if (!restored) {
        setCommittee1Selection(preferredCommitteeId);
      } else {
        const step1Panel = document.getElementById('wizard-step-1');
        if (step1Panel) showDraftRestoredBanner(step1Panel);
        const emailInput = document.getElementById('reg-email');
        if (emailInput && emailInput.value.trim()) {
          checkIndividualEmailRegistration(emailInput);
        }
      }

      // Re-apply delegate type UI strictly
      applyDelegateTypeUI(currentDelegateType);

      goToStep(1);

      if (!regBackdrop || !regCard) return;

      pushModalHistoryState('registration');
      regBackdrop.classList.add('active');
      regBackdrop.style.display = 'flex';
      lockBackgroundScroll();

      if (window.gsap) {
        gsap.fromTo(regCard,
          { scale: 0.92, y: 30, opacity: 0 },
          { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: 'power4.out' }
        );
        const closeBtn = document.getElementById('reg-modal-close');
        if (closeBtn) {
          gsap.fromTo(closeBtn,
            { scale: 0.5, rotation: -90, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.4, delay: 0.12, ease: 'back.out(2.5)' }
          );
        }
      }
    }

    // Close Registration Modal
    function closeRegistrationModal(fromPopState = false) {
      if (!fromPopState) {
        popModalHistoryState();
      }
      const regBackdrop = document.getElementById('registration-modal-backdrop');
      const regCard = document.getElementById('registration-modal-card');
      const closeBtn = document.getElementById('reg-modal-close');
      closeAllCustomSelects();
      if (!regBackdrop || !regCard) return;

      if (window.gsap) {
        if (closeBtn) {
          gsap.to(closeBtn, {
            rotation: 180,
            scale: 0.72,
            duration: 0.22,
            ease: 'power2.in'
          });
        }
        gsap.to(regCard, {
          scale: 0.93,
          y: 22,
          opacity: 0,
          duration: 0.26,
          ease: 'power3.in',
          onComplete: () => {
            regBackdrop.classList.remove('active');
            regBackdrop.style.display = 'none';
            unlockBackgroundScroll();
            gsap.set(regCard, { clearProps: 'all' });
            if (closeBtn) gsap.set(closeBtn, { clearProps: 'all' });
            regCard.classList.remove('in-success-state');
            regCard.style.overflowY = '';
            regCard.style.maxHeight = '';
            const successOverlay = document.getElementById('success-overlay');
            if (successOverlay) {
              successOverlay.classList.remove('show');
              if (successOverlay.parentNode) successOverlay.remove();
            }
          }
        });
      } else {
        regBackdrop.classList.remove('active');
        regBackdrop.style.display = 'none';
        unlockBackgroundScroll();
        regCard.classList.remove('in-success-state');
        regCard.style.overflowY = '';
        regCard.style.maxHeight = '';
        const successOverlay = document.getElementById('success-overlay');
        if (successOverlay) {
          successOverlay.classList.remove('show');
          if (successOverlay.parentNode) successOverlay.remove();
        }
      }
    }

    let _isGeneratingDelegationSheet = false;
    let _generatingEmail = '';

    function openDelegationRegistrationModal() {
      const dlgBackdrop = document.getElementById('delegation-modal-backdrop');
      const dlgCard = document.getElementById('delegation-modal-card');
      if (!dlgBackdrop || !dlgCard) return;

      pushModalHistoryState('delegation');
      dlgBackdrop.classList.add('active');
      dlgBackdrop.style.display = 'flex';
      lockBackgroundScroll();
      stepDelegateCount(0);
      goToDelegationStep(1);

      // Only restore email if generation was actively in-flight
      if (_isGeneratingDelegationSheet && _generatingEmail) {
        const emailInput = document.getElementById('dlg-email');
        if (emailInput && !emailInput.value) {
          emailInput.value = _generatingEmail;
          checkEmailRegistration(emailInput);
        }
        const btn = document.getElementById('dlg-create-sheet-btn');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span>⏳ Creating in Google Drive...</span>';
        }
      }

      if (window.gsap) {
        gsap.fromTo(dlgCard,
          { scale: 0.92, y: 30, opacity: 0 },
          { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: 'power4.out' }
        );
        const closeBtn = document.getElementById('dlg-modal-close');
        if (closeBtn) {
          gsap.fromTo(closeBtn,
            { scale: 0.5, rotation: -90, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.4, delay: 0.12, ease: 'back.out(2.5)' }
          );
        }
      }
    }

    function closeDelegationRegistrationModal(fromPopState = false) {
      if (!fromPopState) {
        popModalHistoryState();
      }
      const dlgBackdrop = document.getElementById('delegation-modal-backdrop');
      const dlgCard = document.getElementById('delegation-modal-card');
      const closeBtn = document.getElementById('dlg-modal-close');
      closeAllCustomSelects();
      if (!dlgBackdrop || !dlgCard) return;

      if (window.gsap) {
        if (closeBtn) {
          gsap.to(closeBtn, {
            rotation: 180,
            scale: 0.72,
            duration: 0.22,
            ease: 'power2.in'
          });
        }
        gsap.to(dlgCard, {
          scale: 0.93,
          y: 22,
          opacity: 0,
          duration: 0.26,
          ease: 'power3.in',
          onComplete: () => {
            dlgBackdrop.classList.remove('active');
            dlgBackdrop.style.display = 'none';
            unlockBackgroundScroll();
            clearDelegationForm();
            gsap.set(dlgCard, { clearProps: 'all' });
            if (closeBtn) gsap.set(closeBtn, { clearProps: 'all' });
            dlgCard.classList.remove('in-dlg-success-state');
            dlgCard.style.overflowY = '';
            dlgCard.style.maxHeight = '';
            const successOverlay = document.getElementById('dlg-success-overlay');
            if (successOverlay) {
              successOverlay.classList.remove('show');
              if (successOverlay.parentNode) successOverlay.remove();
            }
          }
        });
      } else {
        dlgBackdrop.classList.remove('active');
        dlgBackdrop.style.display = 'none';
        unlockBackgroundScroll();
        clearDelegationForm();
        dlgCard.classList.remove('in-dlg-success-state');
        dlgCard.style.overflowY = '';
        dlgCard.style.maxHeight = '';
        const successOverlay = document.getElementById('dlg-success-overlay');
        if (successOverlay) {
          successOverlay.classList.remove('show');
          if (successOverlay.parentNode) successOverlay.remove();
        }
      }
    }

    // ─── Centralized Registered Email Tracker ──────────────────────
    const REG_EMAILS_KEY = 'mun26_registered_emails';

    function getRegisteredEmailsMap() {
      try {
        const raw = localStorage.getItem(REG_EMAILS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return {};
    }

    function isEmailRegisteredLocal(email) {
      if (!email) return false;
      const clean = String(email).trim().toLowerCase();
      if (!clean) return false;

      // 1. Direct registry lookup
      const regMap = getRegisteredEmailsMap();
      if (regMap[clean]) return true;

      // 2. Direct keys lookup
      if (localStorage.getItem(`submitted_ind_email_${clean}`)) return true;
      if (localStorage.getItem(`submitted_dlg_email_${clean}`)) return true;

      // 3. Scan all localStorage keys for submitted_
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('submitted_dlg_email_') || k.startsWith('submitted_ind_email_'))) {
          if (k.slice(k.lastIndexOf('_') + 1).toLowerCase() === clean) {
            return true;
          }
        }
      }
      return false;
    }

    function markEmailAsRegistered(email, type = 'individual', meta = {}) {
      if (!email) return;
      const clean = String(email).trim().toLowerCase();
      if (!clean) return;

      // Set specific key
      if (type === 'delegation') {
        localStorage.setItem(`submitted_dlg_email_${clean}`, meta.sheetUrl || 'registered');
      } else {
        localStorage.setItem(`submitted_ind_email_${clean}`, JSON.stringify({ timestamp: new Date().toISOString(), ...meta }));
      }

      // Update centralized map
      const regMap = getRegisteredEmailsMap();
      regMap[clean] = { type, timestamp: new Date().toISOString(), ...meta };
      try {
        localStorage.setItem(REG_EMAILS_KEY, JSON.stringify(regMap));
      } catch (e) {}
    }

        function clearRegisteredEmailLocal(email) {
      if (!email) return;
      const clean = String(email).trim().toLowerCase();
      try {
        localStorage.removeItem(`submitted_ind_email_${clean}`);
        localStorage.removeItem(`submitted_dlg_email_${clean}`);
        const regMap = getRegisteredEmailsMap();
        if (regMap[clean]) {
          delete regMap[clean];
          localStorage.setItem(REG_EMAILS_KEY, JSON.stringify(regMap));
        }
      } catch (e) {}
    }

    // Background asynchronous remote check (cached, non-blocking)
    const _emailRemoteCheckCache = new Map();
    async function checkEmailRemote(email) {
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return false;
      const clean = String(email).trim().toLowerCase();
      if (_emailRemoteCheckCache.has(clean)) {
        return _emailRemoteCheckCache.get(clean);
      }
      try {
        const res = await fetch(`/api/check-email?email=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.exists) {
            _emailRemoteCheckCache.set(clean, true);
            markEmailAsRegistered(clean, 'remote_sync');
            return true;
          } else if (data && !data.exists) {
            // Database confirmed email is free & available! Clear any stale test cache
            _emailRemoteCheckCache.set(clean, false);
            clearRegisteredEmailLocal(clean);
            return false;
          }
        }
      } catch (e) {}
      _emailRemoteCheckCache.set(clean, false);
      return false;
    }

    // ─── Individual Delegate Email Real-Time Check ────────────────
    let _indEmailDebounceTimer = null;
    function checkIndividualEmailRegistration(inputEl) {
      if (!inputEl) inputEl = document.getElementById('reg-email');
      if (!inputEl) return;

      const email = inputEl.value.trim().toLowerCase();
      const errEl = document.getElementById('reg-email-error');
      const existsMsg = document.getElementById('reg-email-exists-msg');

      if (!email) {
        inputEl.classList.remove('has-error');
        if (errEl) errEl.style.display = 'none';
        if (existsMsg) existsMsg.style.display = 'none';
        return;
      }

      // Instant 0ms local check
      if (isEmailRegisteredLocal(email)) {
        inputEl.classList.add('has-error');
        if (errEl) errEl.style.display = 'none';
        if (existsMsg) {
          existsMsg.textContent = "This email address has already been registered for RNS MUN '26. Each delegate may only register once.";
          existsMsg.style.display = 'block';
        }
        return true;
      } else {
        if (existsMsg) existsMsg.style.display = 'none';
      }

      // Non-blocking background remote check if valid format
      if (/^\S+@\S+\.\S+$/.test(email)) {
        clearTimeout(_indEmailDebounceTimer);
        _indEmailDebounceTimer = setTimeout(async () => {
          const exists = await checkEmailRemote(email);
          if (inputEl.value.trim().toLowerCase() === email) {
            if (exists) {
              inputEl.classList.add('has-error');
              if (errEl) errEl.style.display = 'none';
              if (existsMsg) {
                existsMsg.textContent = "This email address has already been registered for RNS MUN '26. Each delegate may only register once.";
                existsMsg.style.display = 'block';
              }
            } else {
              // Database confirms email is available: dismiss error and clear highlight!
              inputEl.classList.remove('has-error');
              if (existsMsg) existsMsg.style.display = 'none';
            }
          }
        }, 300);
      }
      return false;
    }

    // ─── Delegation Email & Sheet Helpers (Live Google Drive & Server First) ───
    function getDelegationSheetForEmail(email) {
      if (!email) return null;
      const clean = String(email).trim().toLowerCase();
      if (!clean) return null;

      // Only return if explicitly set in current session
      const direct = localStorage.getItem(`active_dlg_sheet_email_${clean}`) ||
                     localStorage.getItem(`dlg_sheet_email_${clean}`);
      if (direct && direct.includes('docs.google.com/spreadsheets')) {
        return direct;
      }
      return null;
    }

    function isDelegationEmailSubmitted(email) {
      if (!email) return false;
      const clean = String(email).trim().toLowerCase();
      if (!clean) return false;
      return !!localStorage.getItem(`submitted_dlg_email_${clean}`);
    }

    // ─── Delegation Email Check (Live Drive Verification & State Restoration) ───
    let _dlgEmailDebounceTimer = null;

    // Shared helper — render and lock an existing roster sheet in the UI.
    // Declared here (outside checkEmailRegistration) so both checkEmailRegistration()
    // and generateDelegationGoogleSheet() can call it without a ReferenceError.
    function displayExistingSheet(sheetUrl, isSubmitted) {
      if (!sheetUrl || !sheetUrl.includes('http')) return;
      const hiddenLinkInput = document.getElementById('dlg-sheet-link');
      const sheetAnchor    = document.getElementById('dlg-sheet-anchor');
      const sheetResult    = document.getElementById('dlg-sheet-result');
      const sheetErr       = document.getElementById('dlg-sheet-error');
      const existsMsg      = document.getElementById('dlg-email-exists-msg');
      const errEl          = document.getElementById('dlg-email-error');
      const createSheetBtn = document.getElementById('dlg-create-sheet-btn');
      const exitBtn        = document.getElementById('dlg-exit-btn');

      if (hiddenLinkInput) hiddenLinkInput.value = sheetUrl;
      if (sheetAnchor) {
        sheetAnchor.href = sheetUrl;
        const dlgName = document.getElementById('dlg-delegation-name')?.value.trim();
        sheetAnchor.textContent = dlgName ? `Open Google Sheet: ${dlgName}` : 'Open Google Sheet';
      }
      if (sheetResult) sheetResult.classList.add('is-generated');
      if (sheetErr) sheetErr.style.display = 'none';

      if (isSubmitted) {
        if (existsMsg) {
          existsMsg.textContent = 'This email has already registered a delegation.';
          existsMsg.style.display = 'block';
        }
        if (errEl) errEl.style.display = 'none';
        if (createSheetBtn) createSheetBtn.style.display = 'none';
        if (exitBtn) exitBtn.style.display = 'block';
      } else {
        if (existsMsg) existsMsg.style.display = 'none';
        if (createSheetBtn) createSheetBtn.style.display = 'none';
        const statusPill = document.getElementById('dlg-roster-status-pill');
        if (statusPill) {
          statusPill.innerHTML = '<span class="roster-status-dot"></span> Live Sheet Active';
          statusPill.style.display = 'inline-flex';
        }
        const nextBtn = document.getElementById('dlg-step1-next-btn');
        if (nextBtn) {
          nextBtn.disabled = false;
          nextBtn.removeAttribute('disabled');
          nextBtn.style.opacity = '1';
          nextBtn.style.cursor = 'pointer';
        }
        if (exitBtn) exitBtn.style.display = 'none';
      }
    }

    function checkEmailRegistration(inputEl) {
      if (!inputEl) inputEl = document.getElementById('dlg-email');
      if (!inputEl) return;

      const email = inputEl.value.trim().toLowerCase();
      const existsMsg = document.getElementById('dlg-email-exists-msg');
      const createSheetBtn = document.getElementById('dlg-create-sheet-btn');
      const submitBtn = document.getElementById('dlg-submit-btn');
      const exitBtn = document.getElementById('dlg-exit-btn');
      const errEl = document.getElementById('dlg-email-error');

      const sheetResult = document.getElementById('dlg-sheet-result');
      const hiddenLinkInput = document.getElementById('dlg-sheet-link');
      const sheetAnchor = document.getElementById('dlg-sheet-anchor');
      const sheetErr = document.getElementById('dlg-sheet-error');

      // Helper to restore the default clean state of "Create Delegation Sheet" button & form
      const restoreDefaultState = () => {
        if (createSheetBtn) {
          createSheetBtn.style.display = 'flex';
          createSheetBtn.disabled = false;
          createSheetBtn.innerHTML = '<span>Create Delegation Sheet</span>';
          const statusPill = document.getElementById('dlg-roster-status-pill');
          if (statusPill) statusPill.style.display = 'none';
        }
        if (submitBtn) submitBtn.style.display = 'block';
        if (exitBtn) exitBtn.style.display = 'none';
        if (existsMsg) existsMsg.style.display = 'none';
        if (sheetResult) sheetResult.classList.remove('is-generated');
        if (hiddenLinkInput) hiddenLinkInput.value = '';
        if (sheetAnchor) {
          sheetAnchor.href = '#';
          sheetAnchor.textContent = 'Open Google Sheet';
        }
        if (sheetErr) sheetErr.style.display = 'none';
      };


      // 1. If email field is cleared or modified to empty, immediately restore default button state
      if (!email) {
        restoreDefaultState();
        return;
      }

      // Check if local cache already has a sheet for this email
      const localSheet = localStorage.getItem(`dlg_sheet_email_${email}`) ||
                         localStorage.getItem(`active_dlg_sheet_email_${email}`);
      if (localSheet && localSheet.includes('docs.google.com/spreadsheets')) {
        displayExistingSheet(localSheet, false);
        const statusPill = document.getElementById('dlg-roster-status-pill');
        if (statusPill) {
          statusPill.innerHTML = '<span class="roster-status-dot"></span> Restored Sheet';
          statusPill.style.display = 'inline-flex';
        }
      } else {
        restoreDefaultState();
      }

      // 3. Live remote verification against Google Drive & Google Apps Script
      if (/^\S+@\S+\.\S+$/.test(email)) {
        clearTimeout(_dlgEmailDebounceTimer);
        _dlgEmailDebounceTimer = setTimeout(async () => {
          try {
            const res = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`);
            if (res.ok) {
              const data = await res.json().catch(() => null);
              if (inputEl.value.trim().toLowerCase() !== email) return;

              if (data && data.sheetUrl) {
                // Roster sheet found for this email! (Either draft or submitted)
                localStorage.setItem(`dlg_sheet_email_${email}`, data.sheetUrl);
                localStorage.setItem(`active_dlg_sheet_email_${email}`, data.sheetUrl);
                const isFullySubmitted = !!(data.exists && !data.isDraft);
                if (isFullySubmitted) {
                  localStorage.setItem(`submitted_dlg_email_${email}`, data.sheetUrl);
                }
                displayExistingSheet(data.sheetUrl, isFullySubmitted);
                if (!isFullySubmitted) {
                  const statusPill = document.getElementById('dlg-roster-status-pill');
                  if (statusPill) {
                    statusPill.innerHTML = '<span class="roster-status-dot"></span> Restored Sheet';
                    statusPill.style.display = 'inline-flex';
                  }
                }
              } else if (data && data.exists && data.type === 'individual') {
                if (existsMsg) {
                  existsMsg.textContent = 'This email is already registered as an Individual Delegate. Please use a different email for your delegation.';
                  existsMsg.style.display = 'block';
                }
                if (createSheetBtn) createSheetBtn.style.display = 'none';
                if (exitBtn) exitBtn.style.display = 'block';
              } else if (!localSheet) {
                // Only restore default state if no local sheet was already found
                restoreDefaultState();
              }
            }
          } catch (e) {}
        }, 200);
      }
    }

    function toggleDelegationClearBtn(e) {
      const form = document.getElementById('delegation-registration-form');
      const clearBtn = document.getElementById('dlg-clear-data-btn');

      // Clear error message dynamically as user types & validate without aggressive errors
      if (e && e.target) {
        const el = e.target;
        let isValid = true;
        let errMsg = '';

        if (el.id === 'dlg-email') {
          const val = el.value.trim();
          // Only show format error if string looks like an attempt at email but is invalid (e.g. contains @ but invalid domain)
          if (val.includes('@') && val.length > 5) {
            isValid = /^\S+@\S+\.\S+$/.test(val);
            errMsg = 'Please enter a valid email address';
          } else {
            isValid = true; // don't scream at partial typing
          }
        } else if (el.id === 'dlg-count') {
          const val = parseInt(el.value, 10);
          isValid = !isNaN(val) && val >= 9 && val <= 33;
          errMsg = 'Number of delegates must be between 9 and 33';
        } else if (el.type === 'tel' || el.id === 'dlg-phone') {
          const digits = el.value.replace(/[^0-9]/g, '');
          isValid = digits.length === 10;
          errMsg = 'Please enter a valid 10-digit mobile number';
        } else if (el.type === 'text') {
          isValid = el.value.trim().length > 0;
          if (el.id === 'dlg-delegation-name') {
            errMsg = 'Delegation Name is required';
            const anchor = document.getElementById('dlg-sheet-anchor');
            if (anchor && anchor.href && anchor.href !== '#') {
              const val = el.value.trim();
              anchor.textContent = val ? `Open Google Sheet: ${val}` : 'Open Google Sheet';
            }
          }
          if (el.id === 'dlg-head-name') errMsg = 'Head Delegate Name is required';
        }

        const errEl = document.getElementById(el.id + '-error');
        const existsEl = document.getElementById('dlg-email-exists-msg');
        const isExistsShown = el.id === 'dlg-email' && existsEl && existsEl.style.display === 'block';

        if (!isValid && el.value.trim().length > 0 && !isExistsShown) {
          el.classList.add('has-error');
          if (errEl) {
            errEl.textContent = errMsg;
            errEl.style.display = 'block';
          }
        } else if (isValid) {
          if (!isExistsShown) el.classList.remove('has-error');
          if (errEl) errEl.style.display = 'none';
        } else if (el.value.trim().length === 0) {
          el.classList.remove('has-error');
          if (errEl) errEl.style.display = 'none';
        }
      }

      if (!form || !clearBtn) return;

      const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
      let hasData = false;
      for (let i = 0; i < inputs.length; i++) {
        if (inputs[i].value.trim() !== '') {
          hasData = true;
          break;
        }
      }

      clearBtn.style.display = hasData ? 'block' : 'none';
    }

    function goToDelegationStep(step) {
      if (step === 2) {
        if (!validateDelegationFields()) {
          const dlgCard = document.getElementById('delegation-modal-card');
          if (window.gsap && dlgCard) {
            gsap.fromTo(dlgCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(dlgCard, { x: 0 }) });
          }
          return;
        }

        const sheetLink = document.getElementById('dlg-sheet-link');
        const sheetErr = document.getElementById('dlg-sheet-error');
        if (!sheetLink || !sheetLink.value.trim()) {
          if (sheetErr) sheetErr.style.display = 'block';
          const dlgCard = document.getElementById('delegation-modal-card');
          if (window.gsap && dlgCard) {
            gsap.fromTo(dlgCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(dlgCard, { x: 0 }) });
          }
          return;
        } else {
          if (sheetErr) sheetErr.style.display = 'none';
        }

        updateDelegationPaymentQR();

        const step1Panel = document.getElementById('dlg-wizard-step-1');
        const step2Panel = document.getElementById('dlg-wizard-step-2');
        const ind1 = document.getElementById('dlg-step-indicator-1');
        const ind2 = document.getElementById('dlg-step-indicator-2');

        if (step1Panel) step1Panel.style.display = 'none';
        if (step2Panel) step2Panel.style.display = 'block';
        const submitBtn = document.getElementById('dlg-submit-btn');
        if (submitBtn) {
          submitBtn.style.display = 'inline-flex';
          submitBtn.textContent = 'Submit Registration';
          const hasScreenshot = !!_compressedScreenshots['delegation'];
          submitBtn.disabled = !hasScreenshot;
          if (hasScreenshot) {
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
          } else {
            submitBtn.setAttribute('disabled', 'true');
            submitBtn.style.opacity = '0.45';
            submitBtn.style.cursor = 'not-allowed';
          }
        }
        if (ind1) {
          ind1.classList.remove('is-active');
          ind1.classList.add('is-completed');
        }
        if (ind2) {
          ind2.classList.add('is-active');
        }
      } else {
        const step1Panel = document.getElementById('dlg-wizard-step-1');
        const step2Panel = document.getElementById('dlg-wizard-step-2');
        const ind1 = document.getElementById('dlg-step-indicator-1');
        const ind2 = document.getElementById('dlg-step-indicator-2');

        if (step1Panel) step1Panel.style.display = 'block';
        if (step2Panel) step2Panel.style.display = 'none';
        if (ind1) {
          ind1.classList.add('is-active');
          ind1.classList.remove('is-completed');
        }
        if (ind2) {
          ind2.classList.remove('is-active');
        }
      }

      const dlgCard = document.getElementById('delegation-modal-card');
      if (dlgCard) dlgCard.scrollTop = 0;
    }
    function handleDelegationStep1Proceed() {
      if (!validateDelegationFields()) {
        const dlgCard = document.getElementById('delegation-modal-card');
        if (window.gsap && dlgCard) {
          gsap.fromTo(dlgCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(dlgCard, { x: 0 }) });
        }
        return;
      }
      goToDelegationStep(2);
    }

    function handleDelegationPaymentScreenshotSelected(input) {
      const file = input.files && input.files[0];
      const submitBtn = document.getElementById('dlg-submit-btn');
      const emptyState = document.getElementById('dlg-dropzone-empty-state');
      const fileState = document.getElementById('dlg-dropzone-file-state');
      const fileNameEl = document.getElementById('dlg-screenshot-file-name');
      const fileSizeEl = document.getElementById('dlg-screenshot-file-size');
      const previewThumb = document.getElementById('dlg-screenshot-preview-thumb');
      const err = document.getElementById('dlg-payment-screenshot-error');

      if (file) {
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) {
          fileSizeEl.textContent = 'Compressing…';
          fileSizeEl.style.color = '#888';
        }
        if (emptyState) emptyState.style.display = 'none';
        if (fileState) fileState.style.display = 'flex';
        if (err) err.style.display = 'none';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute('disabled', 'true');
          submitBtn.style.opacity = '0.55';
          submitBtn.style.cursor = 'not-allowed';
        }

        compressScreenshot(file).then(result => {
          _compressedScreenshots['delegation'] = result.dataUrl;
          if (previewThumb) previewThumb.src = result.dataUrl;
          if (fileSizeEl) {
            const savedPct = result.originalKB > 0
              ? Math.round((1 - result.compressedKB / result.originalKB) * 100)
              : 0;
            fileSizeEl.textContent = `${result.compressedKB} KB · saved ${savedPct}% (was ${result.originalKB} KB)`;
            fileSizeEl.style.color = '#0F9D58';
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
          }
        }).catch(() => {
          const reader = new FileReader();
          reader.onload = e => {
            if (previewThumb) previewThumb.src = e.target.result;
            _compressedScreenshots['delegation'] = e.target.result;
          };
          reader.readAsDataURL(file);
          if (fileSizeEl) {
            fileSizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB (raw)`;
            fileSizeEl.style.color = '';
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
          }
        });
      } else {
        removeDelegationPaymentScreenshot();
      }
    }

    function removeDelegationPaymentScreenshot() {
      delete _compressedScreenshots['delegation'];
      _compressedScreenshots['delegation'] = null;

      const input = document.getElementById('dlg-payment-screenshot');
      const submitBtn = document.getElementById('dlg-submit-btn');
      const emptyState = document.getElementById('dlg-dropzone-empty-state');
      const fileState = document.getElementById('dlg-dropzone-file-state');
      const fileNameEl = document.getElementById('dlg-screenshot-file-name');
      const fileSizeEl = document.getElementById('dlg-screenshot-file-size');
      const previewThumb = document.getElementById('dlg-screenshot-preview-thumb');
      const err = document.getElementById('dlg-payment-screenshot-error');

      if (input) input.value = '';
      if (emptyState) emptyState.style.display = 'block';
      if (fileState) fileState.style.display = 'none';
      if (fileNameEl) fileNameEl.textContent = '';
      if (fileSizeEl) fileSizeEl.textContent = '';
      if (previewThumb) previewThumb.src = '';
      if (err) err.style.display = 'none';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.style.opacity = '0.45';
        submitBtn.style.cursor = 'not-allowed';
      }
    }

    function clearDelegationForm() {
      _isGeneratingDelegationSheet = false;
      _generatingEmail = '';
      const form = document.getElementById('delegation-registration-form');
      if (form) {
        form.reset();
        const errClasses = form.querySelectorAll('.has-error');
        errClasses.forEach(el => el.classList.remove('has-error'));
        const errContainers = form.querySelectorAll('.error-container');
        errContainers.forEach(el => {
          el.style.display = 'none';
        });

        // Reset text/tel/email inputs explicitly
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        inputs.forEach(i => { i.value = ''; });

        const countInput = document.getElementById('dlg-count');
        if (countInput) countInput.value = '9';

        const typeExternal = document.getElementById('dlg-type-external');
        if (typeExternal) typeExternal.checked = true;

        // Reset sheet generator UI & buttons
        const sheetResult = document.getElementById('dlg-sheet-result');
        if (sheetResult) sheetResult.classList.remove('is-generated');
        const sheetLink = document.getElementById('dlg-sheet-link');
        if (sheetLink) sheetLink.value = '';
        const sheetAnchor = document.getElementById('dlg-sheet-anchor');
        if (sheetAnchor) {
          sheetAnchor.href = '#';
          sheetAnchor.textContent = 'Open Google Sheet';
        }

        const createSheetBtn = document.getElementById('dlg-create-sheet-btn');
        if (createSheetBtn) {
          createSheetBtn.style.display = 'inline-flex';
          createSheetBtn.disabled = false;
          createSheetBtn.innerHTML = '<span>Create Delegation Sheet</span>';
        }

        const nextBtn = document.getElementById('dlg-step1-next-btn');
        if (nextBtn) {
          nextBtn.disabled = true;
          nextBtn.setAttribute('disabled', 'true');
          nextBtn.style.opacity = '0.5';
          nextBtn.style.cursor = 'not-allowed';
        }

        removeDelegationPaymentScreenshot();

        const exitBtn = document.getElementById('dlg-exit-btn');
        if (exitBtn) exitBtn.style.display = 'none';
        const existsMsg = document.getElementById('dlg-email-exists-msg');
        if (existsMsg) existsMsg.style.display = 'none';

        toggleDelegationClearBtn();
        updateDelegationPaymentQR();
        goToDelegationStep(1);
      }
    }

    function exitDelegationForm() {
      clearDelegationForm();
      closeDelegationRegistrationModal();
    }

    const DELEGATION_QR_MAP = {
      9: '/Payment_delegation/del 9.png',
      10: '/Payment_delegation/del 10.png',
      11: '/Payment_delegation/del 11.png',
      12: '/Payment_delegation/del 12.png',
      13: '/Payment_delegation/del 13.png',
      14: '/Payment_delegation/del 14.png',
      15: '/Payment_delegation/del 15.png',
      16: '/Payment_delegation/del 16.png',
      17: '/Payment_delegation/del 17.png',
      18: '/Payment_delegation/del 18.png',
      19: '/Payment_delegation/del 19.png',
      20: '/Payment_delegation/del 20.png',
      21: '/Payment_delegation/del 21.png',
      22: '/Payment_delegation/del 22.png',
      23: '/Payment_delegation/del 23.png',
      24: '/Payment_delegation/del 24.png',
      25: '/Payment_delegation/del 25.png',
      26: '/Payment_delegation/del 26.png',
      27: '/Payment_delegation/del 27.png',
      28: '/Payment_delegation/del 28.png',
      29: '/Payment_delegation/del 29.png',
      30: '/Payment_delegation/del 30.png',
      31: '/Payment_delegation/del 31.png',
      32: '/Payment_delegation/del 32.png',
      33: '/Payment_delegation/del 33.png'
    };

    function updateDelegationPaymentQR() {
      const countInput = document.getElementById('dlg-count');
      let count = parseInt(countInput ? countInput.value : '9', 10);
      if (isNaN(count) || count < 9) count = 9;
      if (count > 33) count = 33;

      const qrImg = document.getElementById('dlg-payment-qr-img');
      const countLabel = document.getElementById('dlg-payment-count-label');
      if (qrImg) {
        qrImg.src = DELEGATION_QR_MAP[count] || DELEGATION_QR_MAP[33] || '/Payment_delegation/del 9.png';
      }
      if (countLabel) {
        countLabel.textContent = count;
      }
    }

    function copyDelegationUPI() {
      const upiText = 'koushikr955@okhdfcbank';
      const markCopied = () => {
        const btn = document.getElementById('dlg-copy-upi-btn');
        if (btn) {
          btn.textContent = 'COPIED!';
          btn.style.background = '#0F9D58';
          setTimeout(() => {
            btn.textContent = 'COPY';
            btn.style.background = 'var(--accent-color)';
          }, 2000);
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(upiText).then(markCopied).catch(() => {
          fallbackCopyText(upiText);
          markCopied();
        });
      } else {
        fallbackCopyText(upiText);
        markCopied();
      }
    }

// (Duplicate fallbackCopyText removed)

    // ==========================================
    // EXTERNAL DELEGATE QR & UPI ROTATION ENGINE
    // Strictly caps presentations to <= 17 per 24h
    // ==========================================
    const EXTERNAL_QR_POOL = [
      { upiId: 'nikhilnayak2005@okicici',    file: 'nikhilnayak2005@okicici.png' },
      { upiId: 'koushikr955@okhdfcbank',     file: 'koushikr955@okhdfcbank.png' },
      { upiId: 'vamshiganesh274@oksbi',      file: 'vamshiganesh274@oksbi.png' },
      { upiId: 'wingspawn28-1@okaxis',       file: 'wingspawn28-1@okaxis.png' }
    ];

    let _currentExternalAssignedUPI = 'nikhilnayak2005@okicici';

    async function updateExternalPaymentQR() {
      // 1. Session Pinning: If an account was already assigned during this registration flow, reuse it immediately
      try {
        const cached = sessionStorage.getItem('mun26_assigned_ext_qr');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.upiId && parsed.qrUrl) {
            applyExternalQRUI(parsed.upiId, parsed.qrUrl);
            return;
          }
        }
      } catch (e) {}

      // 2. Instant Zero-Flicker Synchronous Rotation: Apply client rotation immediately so the UI is NEVER blank or stale
      applyClientExternalQRRotation();

      // 3. Background Sync with Server Rotation Engine (enforces <= 17 appearances per 24h rolling window globally)
      try {
        const resp = await fetch('/api/get-external-qr');
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.success && data.upiId && data.qrUrl) {
            sessionStorage.setItem('mun26_assigned_ext_qr', JSON.stringify({ upiId: data.upiId, qrUrl: data.qrUrl }));
            applyExternalQRUI(data.upiId, data.qrUrl);
          }
        }
      } catch (err) {
        console.warn('[External QR] Remote rotation notice:', err);
      }
    }

    function applyExternalQRUI(upiId, qrUrl) {
      _currentExternalAssignedUPI = upiId;
      const qrImg = document.getElementById('external-upi-qr');
      const upiText = document.getElementById('external-upi-id-text');
      if (qrImg) {
        qrImg.src = qrUrl;
        qrImg.alt = 'UPI QR: ' + upiId;
        qrImg.style.objectFit = 'contain';
      }
      if (upiText) {
        upiText.textContent = upiId;
      }
    }

    function applyClientExternalQRRotation() {
      const LOCAL_KEY = 'mun26_ext_qr_impressions';
      const MAX_PER_24H = 17;
      const WINDOW_MS = 24 * 60 * 60 * 1000;
      const now = Date.now();

      let impressions = [];
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) impressions = JSON.parse(raw);
        impressions = impressions.filter(item => item && (now - item.time) < WINDOW_MS);
      } catch (e) {
        impressions = [];
      }

      const counts = {};
      EXTERNAL_QR_POOL.forEach(acc => { counts[acc.upiId] = 0; });
      impressions.forEach(item => {
        if (item && counts[item.upiId] !== undefined) counts[item.upiId]++;
      });

      let eligible = EXTERNAL_QR_POOL.filter(acc => counts[acc.upiId] < MAX_PER_24H);
      let selected;
      if (eligible.length > 0) {
        const minCount = Math.min(...eligible.map(acc => counts[acc.upiId]));
        const candidates = eligible.filter(acc => counts[acc.upiId] === minCount);
        selected = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        const minCount = Math.min(...EXTERNAL_QR_POOL.map(acc => counts[acc.upiId]));
        const candidates = EXTERNAL_QR_POOL.filter(acc => counts[acc.upiId] === minCount);
        selected = candidates[Math.floor(Math.random() * candidates.length)];
      }

      impressions.push({ upiId: selected.upiId, time: now });
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(impressions));
      } catch (e) {}

      const qrUrl = '/Payment_external/' + selected.file;
      try {
        sessionStorage.setItem('mun26_assigned_ext_qr', JSON.stringify({ upiId: selected.upiId, qrUrl }));
      } catch (e) {}

      applyExternalQRUI(selected.upiId, qrUrl);
    }

    function copyExternalUPI() {
      const upiText = _currentExternalAssignedUPI || (document.getElementById('external-upi-id-text')?.textContent.trim()) || 'nikhilnayak2005@okicici';
      const markCopied = () => {
        const btn = document.getElementById('copy-external-upi-btn');
        if (btn) {
          btn.textContent = 'COPIED!';
          btn.style.background = '#0F9D58';
          setTimeout(() => {
            btn.textContent = 'COPY';
            btn.style.background = 'var(--accent-color)';
          }, 2000);
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(upiText).then(markCopied).catch(() => {
          fallbackCopyText(upiText);
          markCopied();
        });
      } else {
        fallbackCopyText(upiText);
        markCopied();
      }
    }

    function stepDelegateCount(delta) {
      const input = document.getElementById('dlg-count');
      if (!input) return;
      let val = parseInt(input.value, 10);
      if (isNaN(val)) val = 9;
      val += delta;
      if (val < 9) val = 9;
      if (val > 33) val = 33;
      input.value = val;

      const err = document.getElementById('dlg-count-error');
      if (err) err.style.display = 'none';
      input.classList.remove('has-error');

      updateDelegationPaymentQR();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function handleDelegateCountInput(input) {
      if (!input) return;
      const err = document.getElementById('dlg-count-error');
      const val = parseInt(input.value, 10);
      if (input.value.trim() && (isNaN(val) || val < 9 || val > 33)) {
        if (err) {
          err.textContent = 'Number of delegates must be between 9 and 33';
          err.style.display = 'block';
        }
        input.classList.add('has-error');
      } else {
        if (err) err.style.display = 'none';
        input.classList.remove('has-error');
      }
      updateDelegationPaymentQR();
    }

    function validateDelegateCountBlur(input) {
      if (!input) return;
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < 9) {
        input.value = 9;
      } else if (val > 33) {
        input.value = 33;
      }
      const err = document.getElementById('dlg-count-error');
      if (err) err.style.display = 'none';
      input.classList.remove('has-error');
      updateDelegationPaymentQR();
    }

    function getDelegationHeaders() {
      const typeInternal = document.getElementById('dlg-type-internal');
      const isInternal = typeInternal && typeInternal.checked;
      return isInternal
        ? [
          'Sl No',
          'Delegate Name',
          'Email Address',
          'WhatsApp / Mobile Number',
          'USN / Roll No',
          'Prior MUN Experience? (Yes/No)',
          'Number of Conferences Participated',
          'MUN Conferences Participated / Accolades',
          'Committee Preference 1',
          'Portfolio Preference 1',
          'Portfolio Preference 2',
          'Portfolio Preference 3',
          'Committee Preference 2',
          'Comm 2 - Portfolio Preference 1',
          'Comm 2 - Portfolio Preference 2',
          'Comm 2 - Portfolio Preference 3'
        ]
        : [
          'Sl No',
          'Delegate Name',
          'Email Address',
          'WhatsApp / Mobile Number',
          'Institution / College Name',
          'USN / Roll No',
          'Prior MUN Experience? (Yes/No)',
          'Number of Conferences Participated',
          'MUN Conferences Participated / Accolades',
          'Committee Preference 1',
          'Portfolio Preference 1',
          'Portfolio Preference 2',
          'Portfolio Preference 3',
          'Committee Preference 2',
          'Comm 2 - Portfolio Preference 1',
          'Comm 2 - Portfolio Preference 2',
          'Comm 2 - Portfolio Preference 3'
        ];
    }

    function updateRosterPreview() {
      const previewEl = document.getElementById('dlg-columns-preview');
      if (!previewEl) return;
      const headers = getDelegationHeaders();
      previewEl.textContent = 'Auto-filled Headers: ' + headers.join(' | ');
    }

    function getHeadRowData() {
      const typeInternal = document.getElementById('dlg-type-internal');
      const isInternal = typeInternal && typeInternal.checked;
      const headName = document.getElementById('dlg-head-name')?.value.trim() || 'Head of Delegation';
      const email = document.getElementById('dlg-email')?.value.trim() || '';
      const phone = document.getElementById('dlg-phone')?.value.trim() || '';
      const delegationName = document.getElementById('dlg-delegation-name')?.value.trim() || '';

      return isInternal
        ? [
          '1',
          headName ? `${headName} (Head of Delegation)` : 'Head of Delegation',
          email,
          phone,
          '', // USN / Roll No (blank for user to fill)
          '', // Prior MUN Experience? (Yes/No)
          '', // Number of Conferences Participated
          '', // MUN Conferences Participated / Accolades
          '', // Committee Preference 1
          '', // Portfolio Preference 1
          '', // Portfolio Preference 2
          '', // Portfolio Preference 3
          '', // Committee Preference 2
          '', // Comm 2 - Portfolio Preference 1
          '', // Comm 2 - Portfolio Preference 2
          ''  // Comm 2 - Portfolio Preference 3
        ]
        : [
          '1',
          headName ? `${headName} (Head of Delegation)` : 'Head of Delegation',
          email,
          phone,
          delegationName,
          '', // USN / Roll No (blank for user to fill)
          '', // Prior MUN Experience? (Yes/No)
          '', // Number of Conferences Participated
          '', // MUN Conferences Participated / Accolades
          '', // Committee Preference 1
          '', // Portfolio Preference 1
          '', // Portfolio Preference 2
          '', // Portfolio Preference 3
          '', // Committee Preference 2
          '', // Comm 2 - Portfolio Preference 1
          '', // Comm 2 - Portfolio Preference 2
          ''  // Comm 2 - Portfolio Preference 3
        ];
    }


    // Direct Excel (.xlsx) Export Handler
    function downloadDelegationRosterExcel() {
      const delegationNameInput = document.getElementById('dlg-delegation-name');
      const delegationName = delegationNameInput ? delegationNameInput.value.trim() : 'Delegation';
      const sheetLink = document.getElementById('dlg-sheet-link')?.value || '';

      // Direct Google Sheets .xlsx export URL preserves all colors, column widths, and cell borders!
      const match = sheetLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const sheetId = match[1];
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
        const a = document.createElement('a');
        a.href = exportUrl;
        a.download = `RNS_MUN_26_${delegationName.replace(/\s+/g, '_')}_Roster.xlsx`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // If sheet link is not ready, fall back to CSV generator
      downloadDelegationRosterCSV();
    }

    function downloadDelegationRosterCSV() {
      const delegationNameInput = document.getElementById('dlg-delegation-name');
      const delegationName = delegationNameInput ? delegationNameInput.value.trim() : 'Delegation';
      const sheetLink = document.getElementById('dlg-sheet-link')?.value || '';

      // If a Google Sheet was generated, download the real-time live filled CSV directly from Google Sheets!
      const match = sheetLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const sheetId = match[1];
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        const a = document.createElement('a');
        a.href = exportUrl;
        a.download = `RNS_MUN_26_${delegationName.replace(/\s+/g, '_')}_Roster.csv`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Local fallback CSV generator
      const countInput = document.getElementById('dlg-count');
      const count = Math.min(33, Math.max(9, parseInt(countInput?.value, 10) || 9));

      const headers = getDelegationHeaders();
      const headRow = getHeadRowData();

      let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';
      csvContent += headRow.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\r\n';

      // Pre-fill sample row numbers 2 to count
      for (let i = 2; i <= count; i++) {
        csvContent += `${i}` + ','.repeat(headers.length - 1) + '\r\n';
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `RNS_MUN_26_${(delegationName || 'Delegation').replace(/\s+/g, '_')}_Roster.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    // WhatsApp Sharing for Delegation Roster
    function shareDelegationRosterWhatsApp() {
      const delegationNameInput = document.getElementById('dlg-delegation-name');
      const delegationName = delegationNameInput ? delegationNameInput.value.trim() : 'Delegation';
      const sheetLink = document.getElementById('dlg-sheet-link')?.value || '';
      const anchor = document.getElementById('dlg-sheet-anchor');
      const actualLink = sheetLink || (anchor && anchor.href && anchor.href !== '#' ? anchor.href : '');

      if (!actualLink || actualLink === '#' || actualLink.includes('undefined')) {
        const errorEl = document.getElementById('dlg-sheet-error');
        if (errorEl) {
          errorEl.textContent = 'Please click "Create Delegation Sheet" first before sharing.';
          errorEl.style.display = 'block';
        }
        return;
      }

      const text = `Hey team! Here is our official RNSMUN 2026 roster sheet for ${delegationName}.\nPlease fill in your details and portfolio preferences:\n${actualLink}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    // 1-Click Copy Share Link Handler with Tactile Toast Notification
    function copyDelegationRosterLink() {
      const sheetLink = document.getElementById('dlg-sheet-link')?.value || '';
      const anchor = document.getElementById('dlg-sheet-anchor');
      const actualLink = sheetLink || (anchor && anchor.href && anchor.href !== '#' ? anchor.href : '');

      if (!actualLink || actualLink === '#' || actualLink.includes('undefined')) {
        const errorEl = document.getElementById('dlg-sheet-error');
        if (errorEl) {
          errorEl.textContent = 'Please click "Create Delegation Sheet" first before copying the link.';
          errorEl.style.display = 'block';
        }
        return;
      }

      const onCopied = () => {
        showTactileToast('Roster sheet link copied to clipboard!');
        const copyBtnText = document.getElementById('dlg-copy-btn-text');
        if (copyBtnText) {
          const orig = copyBtnText.textContent;
          copyBtnText.textContent = '✓ Copied!';
          setTimeout(() => { copyBtnText.textContent = orig; }, 2000);
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(actualLink).then(onCopied).catch(() => {
          fallbackCopyText(actualLink, onCopied);
        });
      } else {
        fallbackCopyText(actualLink, onCopied);
      }
    }

    async function generateDelegationGoogleSheet() {
      const delegationNameInput = document.getElementById('dlg-delegation-name');
      const delegationName = delegationNameInput ? delegationNameInput.value.trim() : '';
      const headName = document.getElementById('dlg-head-name')?.value.trim() || '';
      const phone = document.getElementById('dlg-phone')?.value.trim() || '';
      const email = document.getElementById('dlg-email')?.value.trim() || '';
      const typeInternal = document.getElementById('dlg-type-internal');
      const delegationType = typeInternal && typeInternal.checked ? 'internal' : 'external';

      if (!validateDelegationFields()) {
        const dlgCard = document.getElementById('delegation-modal-card');
        if (window.gsap && dlgCard) {
          gsap.fromTo(dlgCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(dlgCard, { x: 0 }) });
        }
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanName = delegationName.toLowerCase().trim().replace(/\s+/g, '_');
      const btn = document.getElementById('dlg-create-sheet-btn');

      const gasUrl = "https://script.google.com/macros/s/AKfycbzSNYn2geHn9BCcx0e4lHTGN7As8a2WSbRD1rZL5UrUiPXlXE5KMWqyqcf7c3p7icyU/exec";
      const headers = getDelegationHeaders();
      const headRow = getHeadRowData();

      // Auto copy formatted headers into user clipboard
      try {
        const clipboardText = headers.join('\t') + '\n' + headRow.join('\t');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(clipboardText);
        }
      } catch (e) {}

      // STRICT ENFORCEMENT: Exactly 1 Google Sheet per email!
      // Check local storage first
      let existingSheet = localStorage.getItem(`dlg_sheet_email_${cleanEmail}`) ||
                          localStorage.getItem(`active_dlg_sheet_email_${cleanEmail}`) ||
                          localStorage.getItem(`submitted_dlg_email_${cleanEmail}`);

      // Check server database if not in local cache
      if (!existingSheet) {
        try {
          const chk = await fetch(`/api/check-email?email=${encodeURIComponent(cleanEmail)}`);
          if (chk.ok) {
            const chkData = await chk.json().catch(() => null);
            if (chkData && chkData.sheetUrl) {
              existingSheet = chkData.sheetUrl;
            }
          }
        } catch (e) {}
      }

      // If sheet already exists: RESTORE IT AND NEVER CREATE A DUPLICATE!
      if (existingSheet && existingSheet.includes('docs.google.com/spreadsheets')) {
        console.log('[Delegation] Existing sheet detected for email:', cleanEmail, existingSheet);
        localStorage.setItem(`dlg_sheet_email_${cleanEmail}`, existingSheet);
        localStorage.setItem(`active_dlg_sheet_email_${cleanEmail}`, existingSheet);
        const hiddenLinkInput = document.getElementById('dlg-sheet-link');
        if (hiddenLinkInput) hiddenLinkInput.value = existingSheet;

        displayExistingSheet(existingSheet, false);
        const statusPill = document.getElementById('dlg-roster-status-pill');
        if (statusPill) {
          statusPill.innerHTML = '<span class="roster-status-dot"></span> Restored Sheet';
          statusPill.style.display = 'inline-flex';
        }
        showTactileToast('Found your existing roster sheet for this email!');
        const nextBtn = document.getElementById('dlg-step1-next-btn');
        if (nextBtn) {
          nextBtn.disabled = false;
          nextBtn.removeAttribute('disabled');
          nextBtn.style.opacity = '1';
          nextBtn.style.cursor = 'pointer';
        }
        return;
      }

      _isGeneratingDelegationSheet = true;
      _generatingEmail = cleanEmail;

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Creating in Google Drive...</span>';
      }

      const errorEl = document.getElementById('dlg-sheet-error');
      if (errorEl) errorEl.style.display = 'none';

      let sheetUrl = null;
      let isExistingRemote = false;

      try {
        // Try backend API endpoint
        try {
          const response = await fetch('/api/create-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              delegationName,
              delegationType,
              headName,
              email: cleanEmail,
              phone
            })
          });

          const data = await response.json();
          if (data && data.sheetUrl && !data.isFallback) {
            sheetUrl = data.sheetUrl;
            isExistingRemote = !!(data.isExisting || data.duplicate);
          }
        } catch (apiErr) {
          console.log('API notice:', apiErr);
        }

        // Fallback to Google Apps Script Web App
        if (!sheetUrl) {
          try {
            const payload = JSON.stringify({
              delegationName,
              delegationType,
              headName,
              email: cleanEmail,
              phone,
              headers,
              headRow
            });

            const response = await fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: payload
            });

            const data = await response.json();
            if (data && data.sheetUrl) {
              sheetUrl = data.sheetUrl;
              isExistingRemote = !!(data.isExisting || data.duplicate);
            }
          } catch (gasErr) {
            console.log('Direct Apps Script notice:', gasErr);
          }
        }

        // Display sheet ready result
        const hiddenLinkInput = document.getElementById('dlg-sheet-link');
        const finalUrl = sheetUrl || `https://docs.google.com/spreadsheets/d/1jel7NFjYw78sDX4P8Bsia0HpozcRcs1SzjpLgY2tw24/copy?title=${encodeURIComponent('RNS MUN 26 - ' + delegationName + ' Roster')}`;
        if (hiddenLinkInput) hiddenLinkInput.value = finalUrl;

        // Save strictly by EMAIL so this email will always reuse this sheet across devices/sessions!
        localStorage.setItem(`active_dlg_sheet_email_${cleanEmail}`, finalUrl);
        localStorage.setItem(`dlg_sheet_email_${cleanEmail}`, finalUrl);
        if (cleanName) localStorage.setItem(`active_dlg_sheet_${cleanName}`, finalUrl);

        // Permanently bind this email to this sheet in Supabase
        try {
          fetch('/api/save-draft-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              sheetUrl: finalUrl,
              delegationName,
              headName,
              phone,
              delegationType
            })
          }).catch(() => {});
        } catch (e) {}

        const resultBox = document.getElementById('dlg-sheet-result');
        const anchor = document.getElementById('dlg-sheet-anchor');
        if (resultBox && anchor) {
          anchor.href = finalUrl;
          // Anchor href set without breaking structured button HTML
          resultBox.classList.add('is-generated');
        }

        if (isExistingRemote) {
          localStorage.setItem(`submitted_dlg_email_${cleanEmail}`, finalUrl);
          markEmailAsRegistered(cleanEmail, 'delegation', { delegationName: cleanName, sheetUrl: finalUrl });
          const existsMsg = document.getElementById('dlg-email-exists-msg');
          if (existsMsg) {
            existsMsg.textContent = 'This email has already registered a delegation.';
            existsMsg.style.display = 'block';
          }
          if (btn) {
            btn.innerHTML = '<span>⚠️ Already Submitted</span>';
            btn.disabled = true;
          }
          const nextBtn = document.getElementById('dlg-step1-next-btn');
          const exitBtn = document.getElementById('dlg-exit-btn');
          if (nextBtn) nextBtn.style.display = 'none';
          if (exitBtn) exitBtn.style.display = 'block';
        } else if (btn) {
          btn.style.display = 'none';
          const statusPill = document.getElementById('dlg-roster-status-pill');
          if (statusPill) statusPill.style.display = 'inline-flex';
          const nextBtn = document.getElementById('dlg-step1-next-btn');
          if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.removeAttribute('disabled');
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
          }
        }
      } finally {
        _isGeneratingDelegationSheet = false;
      }
    }

    function copyDelegationSheetLink() {
      const link = document.getElementById('dlg-sheet-link')?.value;
      if (link) {
        const onCopied = () => {
          showTactileToast('Google Sheet link copied to clipboard!');
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(onCopied).catch(() => {
            fallbackCopyText(link, onCopied);
          });
        } else {
          fallbackCopyText(link, onCopied);
        }
      }
    }

    function validateDelegationFields() {
      let hasError = false;
      const delegationName = document.getElementById('dlg-delegation-name');
      const headName = document.getElementById('dlg-head-name');
      const phone = document.getElementById('dlg-phone');
      const email = document.getElementById('dlg-email');
      const count = document.getElementById('dlg-count');
      const typeInternal = document.getElementById('dlg-type-internal');
      const typeExternal = document.getElementById('dlg-type-external');

      // Validate Text Fields
      [
        { el: delegationName, errId: 'dlg-delegation-name-error' },
        { el: headName, errId: 'dlg-head-name-error' }
      ].forEach(({ el, errId }) => {
        if (!el) return;
        const err = document.getElementById(errId);
        if (!el.value.trim()) {
          el.classList.add('has-error');
          if (err) err.style.display = 'block';
          hasError = true;
        } else {
          el.classList.remove('has-error');
          if (err) err.style.display = 'none';
        }
      });

      // Validate Count (9 - 33 delegates limit)
      if (count) {
        const err = document.getElementById('dlg-count-error');
        const countVal = parseInt(count.value, 10);
        if (!count.value.trim() || isNaN(countVal) || countVal < 9 || countVal > 33) {
          count.classList.add('has-error');
          if (err) {
            err.textContent = 'Number of delegates must be between 9 and 33';
            err.style.display = 'block';
          }
          hasError = true;
        } else {
          count.classList.remove('has-error');
          if (err) err.style.display = 'none';
        }
      }

      // Validate Phone
      if (phone) {
        const err = document.getElementById('dlg-phone-error');
        if (!phone.value.trim() || !/^\d{10,15}$/.test(phone.value.replace(/[\s\-\+]/g, ''))) {
          phone.classList.add('has-error');
          if (err) {
            err.textContent = 'Please enter a valid 10-digit mobile number';
            err.style.display = 'block';
          }
          hasError = true;
        } else {
          phone.classList.remove('has-error');
          if (err) err.style.display = 'none';
        }
      }

      // Email Validation
      if (email) {
        const err = document.getElementById('dlg-email-error');
        if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value)) {
          email.classList.add('has-error');
          if (err) {
            err.textContent = 'Please enter a valid email address';
            err.style.display = 'block';
          }
          hasError = true;
        } else {
          email.classList.remove('has-error');
          if (err) err.style.display = 'none';
        }
      }

      // Type Radio Validation
      const isTypeSelected = (typeInternal && typeInternal.checked) || (typeExternal && typeExternal.checked);
      const typeErr = document.getElementById('dlg-type-error');
      if (!isTypeSelected) {
        if (typeErr) typeErr.style.display = 'block';
        hasError = true;
      } else {
        if (typeErr) typeErr.style.display = 'none';
      }

      return !hasError;
    }

    function handleDelegationSubmit(e) {
      e.preventDefault();

      let hasError = !validateDelegationFields();
      const delegationName = document.getElementById('dlg-delegation-name');
      const headName = document.getElementById('dlg-head-name');
      const phone = document.getElementById('dlg-phone');
      const email = document.getElementById('dlg-email');
      const count = document.getElementById('dlg-count');
      const typeInternal = document.getElementById('dlg-type-internal');
      const typeExternal = document.getElementById('dlg-type-external');
      const sheetLink = document.getElementById('dlg-sheet-link');

      // Google Sheet Validation
      const sheetErr = document.getElementById('dlg-sheet-error');
      if (!sheetLink || !sheetLink.value.trim()) {
        if (sheetErr) sheetErr.style.display = 'block';
        hasError = true;
      } else {
        if (sheetErr) sheetErr.style.display = 'none';
      }

      // Payment Screenshot Validation
      const screenshotErr = document.getElementById('dlg-payment-screenshot-error');
      if (!_compressedScreenshots['delegation']) {
        if (screenshotErr) screenshotErr.style.display = 'block';
        hasError = true;
      } else {
        if (screenshotErr) screenshotErr.style.display = 'none';
      }

      if (hasError) {
        const dlgCard = document.getElementById('delegation-modal-card');
        if (window.gsap && dlgCard) {
          gsap.fromTo(dlgCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(dlgCard, { x: 0 }) });
        }
        return;
      }

      // Helper: parse CSV lines taking quotes into account
      function parseCSVLines(text) {
        const lines = [];
        let row = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          const next = text[i + 1];
          if (c === '"') {
            if (inQuotes && next === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (c === ',' && !inQuotes) {
            row.push(current.trim());
            current = '';
          } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') {
              i++;
            }
            row.push(current.trim());
            current = '';
            if (row.some(val => val.length > 0)) {
              lines.push(row);
            }
            row = [];
          } else {
            current += c;
          }
        }
        if (current.length > 0 || row.length > 0) {
          row.push(current.trim());
          if (row.some(val => val.length > 0)) {
            lines.push(row);
          }
        }
        return lines;
      }

      function parseCsvToRosterObjects(csvText, sheetLink) {
        const rows = parseCSVLines(csvText);
        if (!rows || rows.length < 2) return [];

        const rawHeaders = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
        const dataRows = rows.slice(1);
        const roster = [];

        dataRows.forEach((row, rIdx) => {
          const rowObj = {
            sheetUrl: sheetLink || '',
            googleSheetLink: sheetLink || ''
          };
          let hasData = false;

          rawHeaders.forEach((header, cIdx) => {
            const cellVal = (row[cIdx] || '').trim();
            if (cellVal) hasData = true;
            rowObj[header] = cellVal;

            const norm = header.toLowerCase();
            if (norm.includes('sl') || norm.includes('no') || norm === '#') {
              rowObj.slNo = cellVal || String(rIdx + 1);
            } else if (norm.includes('delegate name') || norm === 'name') {
              rowObj.name = cellVal;
              rowObj.delegateName = cellVal;
            } else if (norm.includes('email')) {
              rowObj.email = cellVal;
              rowObj.emailAddress = cellVal;
            } else if (norm.includes('whatsapp') || norm.includes('mobile') || norm.includes('phone')) {
              rowObj.phone = cellVal;
              rowObj.mobileNumber = cellVal;
            } else if (norm.includes('institution') || norm.includes('college')) {
              rowObj.institution = cellVal;
            } else if (norm.includes('usn') || norm.includes('roll')) {
              rowObj.usn = cellVal;
            } else if (norm.includes('prior mun') || norm.includes('experience?')) {
              rowObj.munExperience = cellVal;
            } else if (norm.includes('number of conferences') || norm.includes('conferences participated')) {
              rowObj.experienceCount = cellVal;
            } else if (norm.includes('accolades') || norm.includes('conferences participated /')) {
              rowObj.experienceDetails = cellVal;
            } else if (norm.includes('comm 2') || norm.includes('preference 2') || norm.includes('committee 2') || norm.includes('committee preference 2')) {
              if (norm.includes('preference 1') || norm.includes('portfolio preference 1')) {
                rowObj.portfolio2_1 = cellVal;
              } else if (norm.includes('preference 2') || norm.includes('portfolio preference 2')) {
                rowObj.portfolio2_2 = cellVal;
              } else if (norm.includes('preference 3') || norm.includes('portfolio preference 3')) {
                rowObj.portfolio2_3 = cellVal;
              } else if (!rowObj.committee2) {
                rowObj.committee2 = cellVal;
              }
            } else if (norm.includes('committee preference 1') || norm.includes('committee 1') || norm === 'committee') {
              rowObj.committee = cellVal;
              rowObj.committee1 = cellVal;
            } else if (norm.includes('portfolio preference 1')) {
              rowObj.portfolio = cellVal;
              rowObj.portfolio1_1 = cellVal;
            } else if (norm.includes('portfolio preference 2')) {
              rowObj.portfolio1_2 = cellVal;
            } else if (norm.includes('portfolio preference 3')) {
              rowObj.portfolio1_3 = cellVal;
            }
          });

          if (!rowObj.name && !rowObj.email) {
            if (!hasData) return;
          }

          if (!rowObj.slNo) rowObj.slNo = String(rIdx + 1);
          if (!rowObj.name) rowObj.name = `Delegate ${rIdx + 1}`;
          if (!rowObj.delegateName) rowObj.delegateName = rowObj.name;
          if (!rowObj.committee) rowObj.committee = rowObj.committee1 || rowObj.portfolio || 'Assigned Matrix';

          roster.push(rowObj);
        });

        return roster;
      }

      function parseGvizTableToRosterObjects(table, sheetLink) {
        if (!table || !table.cols || !table.rows) return [];
        const rawHeaders = table.cols.map(c => (c && (c.label || c.id) ? (c.label || c.id).trim() : ''));
        const roster = [];
        table.rows.forEach((r, rIdx) => {
          if (!r || !r.c) return;
          const rowObj = {
            sheetUrl: sheetLink || '',
            googleSheetLink: sheetLink || ''
          };
          let hasData = false;
          r.c.forEach((cell, cIdx) => {
            const cellVal = (cell && (cell.v !== null && cell.v !== undefined ? String(cell.f || cell.v) : '')).trim();
            if (cellVal) hasData = true;
            const header = rawHeaders[cIdx] || `Col_${cIdx + 1}`;
            rowObj[header] = cellVal;

            const norm = header.toLowerCase();
            if (norm.includes('sl') || norm.includes('no') || norm === '#') {
              rowObj.slNo = cellVal || String(rIdx + 1);
            } else if (norm.includes('delegate name') || norm === 'name') {
              rowObj.name = cellVal;
              rowObj.delegateName = cellVal;
            } else if (norm.includes('email')) {
              rowObj.email = cellVal;
              rowObj.emailAddress = cellVal;
            } else if (norm.includes('whatsapp') || norm.includes('mobile') || norm.includes('phone')) {
              rowObj.phone = cellVal;
              rowObj.mobileNumber = cellVal;
            } else if (norm.includes('institution') || norm.includes('college')) {
              rowObj.institution = cellVal;
            } else if (norm.includes('usn') || norm.includes('roll')) {
              rowObj.usn = cellVal;
            } else if (norm.includes('prior mun') || norm.includes('experience?')) {
              rowObj.munExperience = cellVal;
            } else if (norm.includes('number of conferences') || norm.includes('conferences participated')) {
              rowObj.experienceCount = cellVal;
            } else if (norm.includes('accolades') || norm.includes('conferences participated /')) {
              rowObj.experienceDetails = cellVal;
            } else if (norm.includes('committee preference 1') || norm.includes('committee 1') || norm === 'committee') {
              rowObj.committee = cellVal;
              rowObj.committee1 = cellVal;
            } else if (norm.includes('portfolio preference 1')) {
              rowObj.portfolio = cellVal;
              rowObj.portfolio1_1 = cellVal;
            } else if (norm.includes('portfolio preference 2')) {
              rowObj.portfolio1_2 = cellVal;
            } else if (norm.includes('portfolio preference 3')) {
              rowObj.portfolio1_3 = cellVal;
            } else if (norm.includes('committee preference 2') || norm.includes('committee 2')) {
              rowObj.committee2 = cellVal;
            } else if (norm.includes('comm 2 - portfolio preference 1')) {
              rowObj.portfolio2_1 = cellVal;
            } else if (norm.includes('comm 2 - portfolio preference 2')) {
              rowObj.portfolio2_2 = cellVal;
            } else if (norm.includes('comm 2 - portfolio preference 3')) {
              rowObj.portfolio2_3 = cellVal;
            }
          });

          if (hasData) {
            if (!rowObj.slNo) rowObj.slNo = String(rIdx + 1);
            if (!rowObj.name) rowObj.name = `Delegate ${rIdx + 1}`;
            if (!rowObj.delegateName) rowObj.delegateName = rowObj.name;
            if (!rowObj.committee) rowObj.committee = rowObj.committee1 || rowObj.portfolio || 'Assigned Matrix';
            roster.push(rowObj);
          }
        });
        return roster;
      }

      function createFallbackRosterMember(fallbackInfo = {}, sheetLink = '') {
        return {
          slNo: '1',
          name: (fallbackInfo.headName || 'Head of Delegation').trim(),
          delegateName: (fallbackInfo.headName || 'Head of Delegation').trim(),
          email: (fallbackInfo.email || '').trim(),
          phone: (fallbackInfo.phone || '').trim(),
          institution: (fallbackInfo.delegationName || '').trim(),
          committee: 'Delegation Head',
          portfolio: 'Delegation Head',
          sheetUrl: sheetLink || '',
          googleSheetLink: sheetLink || ''
        };
      }

      async function fetchDelegationRosterRows(sheetLink, fallbackInfo = {}) {
        const match = (sheetLink || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match || !match[1]) {
          return [createFallbackRosterMember(fallbackInfo, sheetLink)];
        }

        const sheetId = match[1];
        const gidMatch = (sheetLink || '').match(/[#&?]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';

        let rawCsvText = null;

        // Attempt 1: Fetch direct CSV export from Google Sheets
        try {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
          const res = await fetch(csvUrl, { method: 'GET', cache: 'no-cache' });
          if (res.ok) {
            const text = await res.text();
            if (text && !text.includes('<!DOCTYPE html>') && text.includes(',')) {
              rawCsvText = text;
            }
          }
        } catch (e) {
          console.warn('[Delegation] CSV export fetch notice:', e);
        }

        // Attempt 2: Google Visualization API CSV query
        if (!rawCsvText) {
          try {
            const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
            const res = await fetch(gvizUrl, { method: 'GET', cache: 'no-cache' });
            if (res.ok) {
              const text = await res.text();
              if (text && !text.includes('<!DOCTYPE html>') && text.includes(',')) {
                rawCsvText = text;
              }
            }
          } catch (e) {
            console.warn('[Delegation] gviz CSV fetch notice:', e);
          }
        }

        // Attempt 3: Google Visualization API JSON format
        if (!rawCsvText) {
          try {
            const gvizJsonUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
            const res = await fetch(gvizJsonUrl, { method: 'GET', cache: 'no-cache' });
            if (res.ok) {
              const jsonpText = await res.text();
              const jsonMatch = jsonpText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
              if (jsonMatch && jsonMatch[1]) {
                const gvizData = JSON.parse(jsonMatch[1]);
                if (gvizData && gvizData.table) {
                  const parsed = parseGvizTableToRosterObjects(gvizData.table, sheetLink);
                  if (parsed.length > 0) return parsed;
                }
              }
            }
          } catch (e) {
            console.warn('[Delegation] gviz JSON fetch notice:', e);
          }
        }

        if (rawCsvText) {
          const parsedRows = parseCsvToRosterObjects(rawCsvText, sheetLink);
          if (parsedRows.length > 0) {
            return parsedRows;
          }
        }

        return [createFallbackRosterMember(fallbackInfo, sheetLink)];
      }

      // Construct Payload with Screenshot
      const formPayload = {
        registrationType: "delegation",
        delegationName: delegationName.value.trim(),
        headName: headName.value.trim(),
        phone: phone.value.trim(),
        email: email.value.trim(),
        delegateCount: count.value.trim(),
        delegateType: typeInternal && typeInternal.checked ? "internal" : "external",
        googleSheetLink: sheetLink ? sheetLink.value.trim() : '',
        screenshotBase64: _compressedScreenshots['delegation'] || '',
        screenshotFormat: (_compressedScreenshots['delegation'] || '').includes('image/webp') ? 'webp' : 'jpeg',
        paymentAmount: `₹${(parseInt(count.value.trim(), 10) || 9) * 1200}`
      };

      const submitBtn = document.getElementById('dlg-submit-btn');
      let originalBtnHTML = '';
      if (submitBtn) {
        originalBtnHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.75';
        submitBtn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation:spin 0.8s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/></svg>Submitting\u2026</span>`;
      }

      // Step: Fetch filled delegate rows from Google Sheet before final submission
      fetchDelegationRosterRows(formPayload.googleSheetLink, {
        headName: formPayload.headName,
        email: formPayload.email,
        phone: formPayload.phone,
        delegationName: formPayload.delegationName
      })
      .then(parsedRoster => {
        // Send to Supabase Database via API endpoint with parsed row objects
        return fetch('/api/submit-delegation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            delegationName: formPayload.delegationName,
            delegationType: formPayload.delegateType === 'internal' ? 'Internal (RNSIT)' : 'External',
            headName: formPayload.headName,
            email: formPayload.email,
            phone: formPayload.phone,
            memberCount: formPayload.delegateCount,
            rosterData: parsedRoster,
            googleSheetLink: formPayload.googleSheetLink,
            paymentAmount: formPayload.paymentAmount,
            screenshotBase64: formPayload.screenshotBase64,
            screenshotFormat: formPayload.screenshotFormat
          })
        });
      })
      .then(async res => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.success) {
          const errMsg = data?.error || `Server returned error (${res.status}).`;
          throw new Error(errMsg);
        }
        return data;
      })
      .then(data => {
        // ONLY mark as submitted and show success overlay on true database success!
        const cleanEmail = email.value.trim().toLowerCase();
        const cleanName = delegationName.value.trim().toLowerCase().replace(/\s+/g, '_');
        localStorage.setItem(`submitted_dlg_email_${cleanEmail}`, 'true');
        markEmailAsRegistered(cleanEmail, 'delegation', { delegationName: cleanName });

        showDelegationSuccessOverlay(formPayload.delegationName, formPayload.googleSheetLink);
      })
      .catch(err => {
        console.error('[Delegation] Submission failed:', err);
        const dlgCard = document.getElementById('delegation-modal-card');
        if (window.gsap && dlgCard) {
          gsap.fromTo(dlgCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(dlgCard, { x: 0 }) });
        }
        alert(err.message || 'Delegation submission failed. Please check your connection and try again.');
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.innerHTML = originalBtnHTML;
        }
      });
    }

    function showDelegationSuccessOverlay(delegationName, googleSheetLink) {
      const dlgCard = document.getElementById('delegation-modal-card');
      const stepper = document.getElementById('dlg-wizard-stepper');
      if (stepper) stepper.style.display = 'none';

      let successOverlay = document.getElementById('dlg-success-overlay');
      if (!successOverlay) {
        const tmpl = document.getElementById('dlg-success-template');
        if (tmpl && dlgCard) {
          dlgCard.appendChild(tmpl.content.cloneNode(true));
          successOverlay = document.getElementById('dlg-success-overlay');
        }
      }
      if (dlgCard) {
        dlgCard.scrollTop = 0;
        dlgCard.classList.add('in-dlg-success-state');
        dlgCard.style.overflowY = 'auto';
        dlgCard.style.webkitOverflowScrolling = 'touch';
      }
      if (successOverlay) {
        const successName = document.getElementById('dlg-success-name');
        if (successName) successName.textContent = delegationName || 'your delegation';
        const successSheetLink = document.getElementById('dlg-success-sheet-link');
        if (successSheetLink && googleSheetLink) successSheetLink.href = googleSheetLink;
        successOverlay.scrollTop = 0;
        successOverlay.classList.add('show');
      }
    }

    function handleDelegationSuccessDone() {
      const dlgCard = document.getElementById('delegation-modal-card');
      const stepper = document.getElementById('dlg-wizard-stepper');
      if (stepper) stepper.style.display = '';

      if (dlgCard) {
        dlgCard.classList.remove('in-dlg-success-state');
        dlgCard.style.overflowY = '';
        dlgCard.style.maxHeight = '';
      }
      const successOverlay = document.getElementById('dlg-success-overlay');
      if (successOverlay) {
        successOverlay.classList.remove('show');
        if (successOverlay.parentNode) successOverlay.remove();
      }
      clearDelegationForm();
      closeDelegationRegistrationModal();
    }

    // Delegate Registration Form Submission
    async function handleRegistrationSubmit(e) {
      e.preventDefault();

      if (!validateStep(1)) {
        goToStep(1);
        return;
      }
      if (!validateStep(2)) {
        goToStep(2);
        return;
      }
      if (!validateStep(3)) {
        const regCard = document.getElementById('registration-modal-card');
        if (window.gsap && regCard) {
          gsap.fromTo(regCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(regCard, { x: 0 }) });
        }
        return;
      }

      // Duplicate Email Safety Guard
      const reqEmail = document.getElementById('reg-email')?.value.trim().toLowerCase() || '';
      if (isEmailRegisteredLocal(reqEmail)) {
        goToStep(1);
        const emailInput = document.getElementById('reg-email');
        if (emailInput) {
          emailInput.classList.add('has-error');
          emailInput.focus();
        }
        const existsMsg = document.getElementById('reg-email-exists-msg');
        if (existsMsg) {
          existsMsg.textContent = "This email address has already been registered for RNS MUN '26. Each delegate may only register once.";
          existsMsg.style.display = 'block';
        }
        const regCard = document.getElementById('registration-modal-card');
        if (window.gsap && regCard) {
          gsap.fromTo(regCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(regCard, { x: 0 }) });
        }
        return;
      }

      function sanitize(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      const committee1 = document.getElementById('reg-committee-1');
      const selectedCommName = sanitize(committee1 ? committee1.options[committee1.selectedIndex]?.text : 'Selected Committee');
      const nameInput = document.getElementById('reg-name');
      const delegateName = sanitize(nameInput ? nameInput.value.trim() : 'Delegate');

      if (currentDelegateType === 'external') {
        const screenshotInput = document.getElementById('reg-external-payment-screenshot');
        const screenshotErr = document.getElementById('reg-external-payment-screenshot-error');
        if (!screenshotInput || !screenshotInput.files || screenshotInput.files.length === 0 || !_compressedScreenshots['external']) {
          if (screenshotErr) screenshotErr.style.display = 'block';
          return;
        }
        if (screenshotErr) screenshotErr.style.display = 'none';
      }

      // ─── Collect all form field values ──────────────────────
      const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
      const getRadioVal = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ''; };
      const getSelectText = (id) => { const el = document.getElementById(id); return el && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : ''; };

      const paymentAmount = currentDelegateType === 'internal'
        ? '₹999'
        : '₹1,350 (External)';

      const displayedUpi = (document.getElementById('external-upi-id-text')?.textContent || '').trim();
      const resolvedExternalUpi = _currentExternalAssignedUPI || (displayedUpi && displayedUpi !== 'mun@rnsit.ac.in' ? displayedUpi : 'nikhilnayak2005@okicici');

      const formPayload = {
        delegateType:      currentDelegateType === 'internal' ? 'Internal (RNSIT)' : 'External',
        name:              getVal('reg-name'),
        institution:       currentDelegateType === 'internal' ? (getVal('reg-institution') || 'RNS Institute of Technology (RNSIT)') : (getVal('reg-institution') || 'Not Specified'),
        usn:               getVal('reg-usn') || 'N/A',
        city:              currentDelegateType === 'internal' ? (getVal('reg-city') || 'Bengaluru') : (getVal('reg-city') || 'Bengaluru'),
        phone:             getVal('reg-phone'),
        email:             getVal('reg-email'),
        munExperience:     getRadioVal('reg-has-experience') === 'yes' ? 'Yes' : 'No',
        experienceCount:   getVal('reg-exp-count') || (getRadioVal('reg-has-experience') === 'yes' ? '1+' : '0'),
        experienceDetails: getVal('reg-experience-details') || (getRadioVal('reg-has-experience') === 'yes' ? 'Experienced Delegate' : 'First-time delegate'),
        committee1:        getSelectText('reg-committee-1'),
        portfolio1_1:      getSelectText('reg-portfolio-1'),
        portfolio1_2:      getSelectText('reg-portfolio-2'),
        committee2:        getSelectText('reg-committee-2'),
        portfolio2_1:      getSelectText('reg-comm2-portfolio-1'),
        portfolio2_2:      getSelectText('reg-comm2-portfolio-2'),
        ieeeId:            '',
        paymentAmount,
        assignedUpiId:     currentDelegateType === 'external' ? resolvedExternalUpi : '',
        screenshotBase64:  _compressedScreenshots[currentDelegateType] || '',
        screenshotFormat:  (_compressedScreenshots[currentDelegateType] || '').includes('image/webp') ? 'webp' : 'jpeg'
      };

      // ─── Show spinner on submit button ──────────────────────
      const submitBtnId = currentDelegateType === 'internal' ? 'internal-submit-btn' : 'external-submit-btn';
      const submitBtn = document.getElementById(submitBtnId);
      let originalBtnHTML = '';
      if (submitBtn) {
        originalBtnHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.75';
        submitBtn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation:spin 0.8s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/></svg>Submitting\u2026</span>`;
      }
      if (!document.getElementById('spin-kf')) {
        const kf = document.createElement('style');
        kf.id = 'spin-kf';
        kf.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(kf);
      }

      // ─── Success message ────
      const typeLabel = currentDelegateType === 'internal' ? 'internal' : 'external';
      const successMsgHTML = currentDelegateType === 'internal'
        ? `Thank you for registering, <strong>${delegateName}</strong>!<br>Your internal delegate registration for<br><span id="success-committee-name" class="success-committee-badge">${selectedCommName}</span><br>has been recorded in our system.<br><br><span style="color:#6C0D2C;font-weight:800;font-size:0.9rem;">You will be redirected to the official RNSIT BillDesk portal to complete your ₹999 payment.</span>`
        : `Thank you for registering, <strong>${delegateName}</strong>!<br>Your external delegate registration and payment screenshot for<br><span id="success-committee-name" class="success-committee-badge">${selectedCommName}</span><br>have been successfully submitted.<br>Our team will verify the payment and reach out via email/WhatsApp with your official registration confirmation and portfolio allotment.`;

      // ─── Direct Supabase Submission ─────────────────────────
      async function fetchWithRetry(url, options, retries = 3) {
        let attempt = 0;
        const delays = [1000, 2000, 4000];
        while (attempt < retries) {
          try {
            const res = await fetch(url, options);
            if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
            return res;
          } catch (err) {
            attempt++;
            if (attempt >= retries) throw err;
            console.warn(`[Registration] Fetch attempt ${attempt} failed, retrying in ${delays[attempt - 1]}ms...`);
            await new Promise(r => setTimeout(r, delays[attempt - 1]));
          }
        }
      }

      async function dispatchSubmission(payload) {
        try {
          const res = await fetchWithRetry('/api/submit-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json().catch(() => null);
          if (res.status === 409 || (data && data.duplicate)) {
            return { success: false, duplicate: true, error: data?.error || 'This email address is already registered.' };
          }
          if (res.ok && data && data.success) {
            return { success: true, method: 'supabase', screenshotUrl: data.screenshotUrl };
          }
          if (data && !data.success) {
            return { success: false, error: data.error || 'Submission failed.' };
          }
          if (!res.ok) {
            return { success: false, error: data?.error || `Server returned error (${res.status}).` };
          }
        } catch (apiErr) {
          console.error('[Registration] Submission error:', apiErr);
          return { success: false, error: apiErr?.message ? `Network/submission error: ${apiErr.message}` : 'Network error or unable to reach server. Please check your connection and try again.' };
        }
        return { success: false, error: 'Submission failed. Please check your connection and try again.' };
      }

      dispatchSubmission(formPayload)
        .then((result) => {
          // STRICT ERROR CHECK: If not successful, NEVER show success screen, NEVER redirect to BillDesk!
          if (!result || !result.success) {
            // Restore submit button state so user can retry
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.style.opacity = '1';
              if (originalBtnHTML) submitBtn.innerHTML = originalBtnHTML;
            }

            if (result && result.duplicate) {
              // Handle duplicate email attempt
              if (formPayload.email) markEmailAsRegistered(formPayload.email, 'individual');
              goToStep(1);
              const emailInput = document.getElementById('reg-email');
              if (emailInput) {
                emailInput.classList.add('has-error');
                emailInput.focus();
              }
              const existsMsg = document.getElementById('reg-email-exists-msg');
              if (existsMsg) {
                existsMsg.textContent = "This email address has already been registered for RNS MUN '26. Each delegate may only register once.";
                existsMsg.style.display = 'block';
              }
              const regCard = document.getElementById('registration-modal-card');
              if (window.gsap && regCard) {
                gsap.fromTo(regCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(regCard, { x: 0 }) });
              }
              return;
            }

            // General failure (database error, network drop, etc.)
            const regCard = document.getElementById('registration-modal-card');
            if (window.gsap && regCard) {
              gsap.fromTo(regCard, { x: -8 }, { x: 8, duration: 0.08, repeat: 3, yoyo: true, ease: 'power2.inOut', onComplete: () => gsap.set(regCard, { x: 0 }) });
            }
            alert(result?.error || 'Registration submission failed. Please check your connection and try again.');
            return;
          }

          // ONLY ON CONFIRMED DATABASE SUCCESS:
          // Immediately mark email as registered in local cache
          if (formPayload.email) {
            markEmailAsRegistered(formPayload.email, 'individual', {
              name: formPayload.name,
              delegateType: formPayload.delegateType,
              committee1: formPayload.committee1
            });
          }

          // Dynamically mount and display success screen
          // Auto-launch BillDesk portal for internal delegate payment ONLY after confirmed database record!
          if (currentDelegateType === 'internal') {
            const billdeskUrl = 'https://payments.billdesk.com/bdcollect/bd/rnsiotec/7232';
            let openedInNewTab = false;
            try {
              const newTab = window.open(billdeskUrl, '_blank');
              if (newTab && !newTab.closed && typeof newTab.closed !== 'undefined') {
                openedInNewTab = true;
              }
            } catch (err) {
              console.warn('[BillDesk] New tab blocked, redirecting directly:', err);
            }

            // If popup was blocked or prevented by browser security policy, redirect the current window directly!
            if (!openedInNewTab) {
              setTimeout(() => {
                window.location.href = billdeskUrl;
              }, 400);
            }
          }
          showSuccessOverlay('Registration Submitted!', successMsgHTML);
        })
        .catch((err) => {
          console.error('[Registration] Unexpected error in submission flow:', err);
          alert('An unexpected error occurred during submission. Please try again.');
        })
        .finally(() => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.innerHTML = originalBtnHTML;
          }
        });
    }

    // Scroll modal to top, mount success template dynamically, and adapt card height
    function showSuccessOverlay(customTitle, customMessageHTML) {
      clearDraft();
      resetPaymentScreenshotState();
      const banner = document.getElementById('draft-restored-banner');
      if (banner) banner.remove();

      const regCard = document.getElementById('registration-modal-card');
      let successOverlay = document.getElementById('success-overlay');
      if (!successOverlay) {
        const tmpl = document.getElementById('individual-success-template');
        if (tmpl && regCard) {
          regCard.appendChild(tmpl.content.cloneNode(true));
          successOverlay = document.getElementById('success-overlay');
        }
      }

      if (successOverlay) {
        if (customTitle) {
          const titleEl = document.getElementById('success-title');
          if (titleEl) titleEl.textContent = customTitle;
        }
        if (customMessageHTML) {
          const msgEl = document.getElementById('success-message-text');
          if (msgEl) msgEl.innerHTML = customMessageHTML;
        }
      }

      if (regCard) {
        regCard.scrollTop = 0;
        regCard.classList.add('in-success-state');
        regCard.style.overflowY = 'auto';
        regCard.style.webkitOverflowScrolling = 'touch';
      }
      if (successOverlay) {
        successOverlay.scrollTop = 0;
        successOverlay.classList.add('show');
      }
    }

    function handleSuccessDone() {
      popModalHistoryState();
      sessionStorage.removeItem('pending_internal_payment');
      clearDraft();
      resetPaymentScreenshotState();

      const regBackdrop = document.getElementById('registration-modal-backdrop');
      const regCard = document.getElementById('registration-modal-card');
      closeAllCustomSelects();
      if (!regBackdrop || !regCard) return;

      // Animate modal OUT with overlay still visible — form never shown
      if (window.gsap) {
        gsap.to(regCard, {
          scale: 0.94, y: 20, opacity: 0, duration: 0.28, ease: 'power3.in',
          onComplete: () => {
            regBackdrop.classList.remove('active');
            regBackdrop.style.display = 'none';
            unlockBackgroundScroll();
            gsap.set(regCard, { clearProps: 'all' });
            // Now hidden — reset everything silently
            const successOverlay = document.getElementById('success-overlay');
            if (successOverlay) {
              successOverlay.classList.remove('show');
              if (successOverlay.parentNode) successOverlay.remove();
            }
            regCard.classList.remove('in-success-state');
            regCard.style.overflow = '';
            regCard.style.overflowY = '';
            regCard.style.maxHeight = '';
            const form = document.getElementById('delegate-registration-form');
            if (form) {
              form.reset();
              const institution = document.getElementById('reg-institution');
              if (institution) institution.readOnly = false;
              handleExperienceToggle('no');
              form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
              form.querySelectorAll('.error-container').forEach(el => { el.style.display = 'none'; });
            }
            setCommittee1Selection('unsc');
            goToStep(1);
          }
        });
      } else {
        regBackdrop.classList.remove('active');
        regBackdrop.style.display = 'none';
        unlockBackgroundScroll();
        const successOverlay = document.getElementById('success-overlay');
        if (successOverlay) {
          successOverlay.classList.remove('show');
          if (successOverlay.parentNode) successOverlay.remove();
        }
        regCard.classList.remove('in-success-state');
        regCard.style.overflow = '';
        regCard.style.overflowY = '';
        regCard.style.maxHeight = '';
        const form = document.getElementById('delegate-registration-form');
        if (form) {
          form.reset();
          const institution = document.getElementById('reg-institution');
          if (institution) institution.readOnly = false;
          handleExperienceToggle('no');
          form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
          form.querySelectorAll('.error-container').forEach(el => { el.style.display = 'none'; });
        }
        setCommittee1Selection('unsc');
        goToStep(1);
      }
    }

    // Keyboard and Backdrop Click Listeners
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllCustomSelects();
        const dlgBackdrop = document.getElementById('delegation-modal-backdrop');
        const typeBackdrop = document.getElementById('delegate-type-modal-backdrop');
        const regBackdrop = document.getElementById('registration-modal-backdrop');
        const commBackdrop = document.getElementById('committee-modal-backdrop');
        if (dlgBackdrop && dlgBackdrop.classList.contains('active')) {
          closeDelegationRegistrationModal();
        } else if (typeBackdrop && typeBackdrop.classList.contains('active')) {
          closeDelegateTypeModal();
        } else if (regBackdrop && regBackdrop.classList.contains('active')) {
          closeRegistrationModal();
        } else if (commBackdrop && commBackdrop.classList.contains('active')) {
          closeCommitteeModal();
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-select-wrapper')) {
        closeAllCustomSelects();
      }
      const dlgBackdrop = document.getElementById('delegation-modal-backdrop');
      const typeBackdrop = document.getElementById('delegate-type-modal-backdrop');
      const commBackdrop = document.getElementById('committee-modal-backdrop');
      const regBackdrop = document.getElementById('registration-modal-backdrop');
      if (e.target === dlgBackdrop) {
        closeDelegationRegistrationModal();
      } else if (e.target === typeBackdrop) {
        closeDelegateTypeModal();
      } else if (e.target === commBackdrop) {
        closeCommitteeModal();
      } else if (e.target === regBackdrop) {
        // Prevent form from closing when clicking outside; provide subtle feedback
        const regCard = document.getElementById('registration-modal-card');
        if (window.gsap && regCard) {
          gsap.fromTo(regCard,
            { scale: 1 },
            { scale: 1.01, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.out' }
          );
        }
      }
    });

    // Check for post-reload internal payment confirmation
    function checkInternalPaymentState() {
      const savedStateStr = sessionStorage.getItem('pending_internal_payment');
      if (!savedStateStr) return;

      try {
        const state = JSON.parse(savedStateStr);
        if (state && state.isInternal) {
          const regBackdrop = document.getElementById('registration-modal-backdrop');
          const regCard = document.getElementById('registration-modal-card');
          const successOverlay = document.getElementById('success-overlay');
          if (regBackdrop) {
            regBackdrop.classList.add('active');
            regBackdrop.style.display = 'flex';
            lockBackgroundScroll();
            // Use helper so modal scrolls to top and scroll is locked
            showSuccessOverlay('Complete Your Payment', `
              <span>Thank you for registering, <strong>${state.delegateName || 'Delegate'}</strong>!</span><br>
              <span>Please complete your delegate fee payment of <strong style="color: var(--gold-accent);">₹999</strong> on the payment portal tab that just opened. Once your payment is verified, you will receive your official registration confirmation and portfolio allotment from our team on your registered email address.</span><br>
              <em style="font-size: 0.8rem; color: rgba(0,0,0,0.5); display: inline-block; margin-top: 4px;">Thank you for registering with RNSMUN 2026.</em>
            `);
          }
        }
      } catch (err) {
        console.log('Payment state parsing notice:', err);
      }
    }

    // Top-Level Registration Path Navigation
    function showRegistrationChoice(updateUrl = true) {
      const choiceView = document.getElementById('registration-choice-view');
      const indView = document.getElementById('individual-delegate-view');
      const dlgView = document.getElementById('delegation-reg-view');

      if (choiceView) choiceView.style.display = 'flex';
      if (indView) indView.style.display = 'none';
      if (dlgView) dlgView.style.display = 'none';

      // Close any open modals when navigating back to choice
      if (typeof closeDelegationRegistrationModal === 'function') closeDelegationRegistrationModal(true);
      if (typeof closeCommitteeModal === 'function') closeCommitteeModal(true);
      if (typeof closeRegistrationModal === 'function') closeRegistrationModal(true);
      if (typeof closeDelegateTypeModal === 'function') closeDelegateTypeModal(true);

      if (updateUrl) {
        try {
          history.pushState({ view: 'choice' }, '', window.location.pathname);
        } catch (e) {}
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function selectRegistrationPath(path, updateUrl = true, autoOpenModal = false) {
      const choiceView = document.getElementById('registration-choice-view');
      const indView = document.getElementById('individual-delegate-view');
      const dlgView = document.getElementById('delegation-reg-view');

      if (path === 'individual') {
        if (choiceView) choiceView.style.display = 'none';
        if (indView) indView.style.display = 'flex';
        if (dlgView) dlgView.style.display = 'none';

        if (updateUrl) {
          try {
            history.pushState({ view: 'individual' }, '', window.location.pathname + '?type=individual');
          } catch (e) {}
        }
      } else if (path === 'delegation') {
        if (choiceView) choiceView.style.display = 'none';
        if (indView) indView.style.display = 'none';
        if (dlgView) dlgView.style.display = 'flex';

        if (updateUrl) {
          try {
            history.pushState({ view: 'delegation' }, '', window.location.pathname + '?type=delegation');
          } catch (e) {}
        }
        if (autoOpenModal && typeof openDelegationRegistrationModal === 'function') {
          setTimeout(openDelegationRegistrationModal, 150);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('popstate', (e) => {
      const urlParams = new URLSearchParams(window.location.search);
      const type = urlParams.get('type');
      if (type === 'delegation' || window.location.hash === '#delegation') {
        selectRegistrationPath('delegation', false, false);
      } else if (type === 'individual' || urlParams.get('committee')) {
        selectRegistrationPath('individual', false, false);
      } else {
        showRegistrationChoice(false);
      }
    });

    // Initialize custom select on page load and check for direct modal links
    function handleInitialPageLoad() {
      resetPaymentScreenshotState();
      initCustomSelects();
      const comm1Select = document.getElementById('reg-committee-1');
      if (comm1Select) {
        comm1Select.addEventListener('change', () => {
          updateCommittee2Options();
        });
      }
      updateCommittee2Options();

      // Check if user just redirected from internal payment
      checkInternalPaymentState();

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('type') === 'delegation' || window.location.hash === '#delegation') {
        selectRegistrationPath('delegation', false, false);
        if (window.location.hash) {
          try {
            history.replaceState(null, '', window.location.pathname + (window.location.search || ''));
          } catch (e) {}
        }
      } else if (urlParams.get('type') === 'individual' || urlParams.get('committee')) {
        selectRegistrationPath('individual', false, false);
        const committeeParam = urlParams.get('committee');
        if (committeeParam) {
          const cId = committeeParam.toLowerCase().replace(/[\s-_]/g, '');
          if (COMMITTEES && COMMITTEES[cId]) {
            const cardEl = document.querySelector(`.committee-card[data-committee-id="${cId}"]`);
            setTimeout(() => {
              handleCardClick(cId, cardEl);
            }, 150);
          }
        }
      } else {
        showRegistrationChoice(false);
      }
    }

    function printRegistrationReceipt() {
      const timestamp = Date.now().toString().slice(-6);
      const receiptId = `RNSMUN26-${timestamp}`;

      const name = document.getElementById('reg-name')?.value.trim() || 'Delegate';
      const institution = document.getElementById('reg-institution')?.value.trim() || 'RNS Institute of Technology';
      const usn = document.getElementById('reg-usn')?.value.trim() || 'N/A';
      const phone = document.getElementById('reg-phone')?.value.trim() || 'N/A';
      const email = document.getElementById('reg-email')?.value.trim() || 'N/A';

      const comm1Select = document.getElementById('reg-committee-1');
      const comm1 = (comm1Select && comm1Select.selectedIndex >= 0) ? comm1Select.options[comm1Select.selectedIndex]?.text : 'UNSC';

      const port1 = document.getElementById('reg-portfolio-1')?.value.trim() || '';
      const port2 = document.getElementById('reg-portfolio-2')?.value.trim() || '';
      const portfolios1 = [port1, port2].filter(Boolean).join(' / ') || 'Open Allocation';

      const comm2Select = document.getElementById('reg-committee-2');
      const comm2 = (comm2Select && comm2Select.selectedIndex > 0) ? comm2Select.options[comm2Select.selectedIndex]?.text : 'None Specified';

      const comm2Port1 = document.getElementById('reg-comm2-portfolio-1')?.value.trim() || '';
      const comm2Port2 = document.getElementById('reg-comm2-portfolio-2')?.value.trim() || '';
      const portfolios2 = [comm2Port1, comm2Port2].filter(Boolean).join(' / ') || (comm2 !== 'None Specified' ? 'Open Allocation' : 'N/A');

      const category = currentDelegateType === 'internal' ? 'Internal RNSIT Delegate' : 'External Delegate';
      const fee = currentDelegateType === 'internal' ? '₹999 (Internal All-Inclusive Delegate Pass)' : '₹1,350 (Standard Delegate Pass)';

      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      // Remove any existing receipt element
      const existing = document.getElementById('printable-receipt');
      if (existing) existing.remove();

      // Dynamically construct printable receipt on runtime action only
      const receiptEl = document.createElement('div');
      receiptEl.id = 'printable-receipt';
      receiptEl.className = 'printable-receipt';
      receiptEl.setAttribute('aria-hidden', 'true');
      receiptEl.innerHTML = `
        <div class="receipt-header">
          <div class="receipt-brand-left">
            <img src="./assets/Logos/RNS_MUN_2026_dark.webp" onerror="this.onerror=null;this.src='./assets/Logos/RNS_MUN_2026.webp'" alt="RNS MUN 2026" class="receipt-header-logo-img">
            <div class="receipt-titles">
              <h2 class="receipt-org-title">RNS MUN'26</h2>
              <div class="receipt-doc-subtitle">OFFICIAL DELEGATE CONFIRMATION</div>
              <p class="receipt-society-text">Model United Nations Society &bull; RNS Institute of Technology</p>
              <p class="receipt-date-text">06–07 OCTOBER 2026 &bull; Bengaluru, India</p>
            </div>
          </div>
          <div class="receipt-header-right">
            <div class="receipt-status-badge">PAYMENT PENDING VERIFICATION</div>
            <div class="receipt-id-tag">${receiptId}</div>
          </div>
        </div>

        <div class="receipt-meta-grid">
          <div class="receipt-meta-item">
            <label>Receipt No.</label>
            <span id="pr-receipt-id">${receiptId}</span>
          </div>
          <div class="receipt-meta-item">
            <label>Submission Date</label>
            <span id="pr-receipt-date">${dateStr}</span>
          </div>
          <div class="receipt-meta-item">
            <label>Verification Status</label>
            <span id="pr-receipt-status" style="color: #6C0D2C;">Payment Pending Verification</span>
          </div>
        </div>

        <div class="receipt-section-title">Delegate Information</div>
        <table class="receipt-table">
          <tr><th>Full Name</th><td id="pr-name">${name}</td></tr>
          <tr><th>Institution / College</th><td id="pr-institution">${institution}</td></tr>
          <tr><th>USN / Roll Number</th><td id="pr-usn">${usn}</td></tr>
          <tr><th>WhatsApp / Mobile</th><td id="pr-phone">${phone}</td></tr>
          <tr><th>Email Address</th><td id="pr-email">${email}</td></tr>
          <tr><th>Delegate Category</th><td id="pr-category">${category}</td></tr>
        </table>

        <div class="receipt-section-title">Committee Preferences & Allocation Status</div>
        <table class="receipt-table">
          <tr><th>Primary Committee Preference</th><td id="pr-committee-1">${comm1}</td></tr>
          <tr><th>Primary Portfolio Preferences</th><td id="pr-portfolios-1">${portfolios1}</td></tr>
          <tr><th>Secondary Committee Preference</th><td id="pr-committee-2">${comm2}</td></tr>
          <tr><th>Secondary Portfolio Preferences</th><td id="pr-portfolios-2">${portfolios2}</td></tr>
          <tr><th>Applicable Delegate Fee</th><td id="pr-fee-tier">${fee}</td></tr>
        </table>

        <div class="receipt-notice-box">
          <strong>Official Delegate Registration Confirmation:</strong><br>
          This document certifies that the candidate above has successfully submitted registration for the <strong>RNSIT Model United Nations Conference 2026</strong> scheduled for <strong>06–07 OCTOBER 2026</strong> at RNS Institute of Technology, Channasandra, Bengaluru. Background guides, rules of procedure, and portfolio allotments will be communicated through official delegate channels. Delegates must carry this confirmation slip and valid institutional identification to the conference accreditation desk on Day 1.
        </div>

        <div class="receipt-contacts-section">
          <div class="receipt-contacts-header">Secretariat & Delegate Affairs Inquiries</div>
          <div class="receipt-contacts-grid">
            <div class="receipt-contact-card">
              <span class="contact-name">Zeyan</span>
              <span class="contact-role">Head &bull; Delegate Affairs</span>
              <span class="contact-phone">+91 91559 73955</span>
            </div>
            <div class="receipt-contact-card">
              <span class="contact-name">Adith</span>
              <span class="contact-role">Head &bull; Delegate Affairs</span>
              <span class="contact-phone">+91 89702 62490</span>
            </div>
            <div class="receipt-contact-card">
              <span class="contact-name">Dhatri</span>
              <span class="contact-role">Charge d'Affaires</span>
              <span class="contact-phone">+91 90351 20294</span>
            </div>
          </div>
        </div>

        <div class="receipt-footer-row">
          <div class="receipt-footer-left">
            RNS Institute of Technology, Dr. Vishnuvardhan Road, RR Nagar Post, Bengaluru 560098<br>
            Inquiries: <strong>mun@rnsit.ac.in</strong> &bull; Official Portal: <strong>mun.rnsit.ac.in</strong>
          </div>
          <div class="receipt-footer-right">
            <div class="receipt-stamp-placeholder">
              <span class="stamp-line-1">Core Secretariat,</span>
              <span class="stamp-line-2">RNSMUN 2026</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(receiptEl);

      // Print Individual Delegate Receipt
      document.body.classList.add('printing-individual');
      document.body.classList.remove('printing-delegation');

      // Set document.title to RNSMUN26_[Name] so browser defaults "Save as PDF" filename
      const cleanName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const originalTitle = document.title;
      document.title = `RNSMUN26_${cleanName || 'Delegate'}`;

      window.print();

      // Restore document title and cleanup after print dialogue finishes
      setTimeout(() => {
        document.title = originalTitle;
        document.body.classList.remove('printing-individual');
        if (receiptEl && receiptEl.parentNode) {
          receiptEl.remove();
        }
      }, 1500);
    }

    function printDelegationReceipt() {
      const timestamp = Date.now().toString().slice(-6);
      const receiptId = `RNSMUN26-DLG-${timestamp}`;

      const dlgName = document.getElementById('dlg-delegation-name')?.value.trim() || 'Institutional Delegation';
      const headName = document.getElementById('dlg-head-name')?.value.trim() || 'Head of Delegation';
      const phone = document.getElementById('dlg-phone')?.value.trim() || 'N/A';
      const email = document.getElementById('dlg-email')?.value.trim() || 'N/A';
      const count = document.getElementById('dlg-count')?.value.trim() || '9+';
      const isInternal = document.getElementById('dlg-type-internal')?.checked;
      const category = isInternal ? 'Internal Institutional Delegation (RNSIT)' : 'External Institutional Delegation';

      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      // Remove any existing delegation receipt element
      const existing = document.getElementById('printable-delegation-receipt');
      if (existing) existing.remove();

      // Dynamically construct printable delegation receipt on runtime action only
      const dlgReceiptEl = document.createElement('div');
      dlgReceiptEl.id = 'printable-delegation-receipt';
      dlgReceiptEl.className = 'printable-receipt';
      dlgReceiptEl.setAttribute('aria-hidden', 'true');
      dlgReceiptEl.innerHTML = `
        <div class="receipt-header">
          <div class="receipt-brand-left">
            <img src="./assets/Logos/RNS_MUN_2026_dark.webp" onerror="this.onerror=null;this.src='./assets/Logos/RNS_MUN_2026.webp'" alt="RNS MUN 2026" class="receipt-header-logo-img">
            <div class="receipt-titles">
              <h2 class="receipt-org-title">RNS MUN'26</h2>
              <div class="receipt-doc-subtitle">OFFICIAL DELEGATION ACCREDITATION CONFIRMATION</div>
              <p class="receipt-society-text">Model United Nations Society &bull; RNS Institute of Technology</p>
              <p class="receipt-date-text">06–07 OCTOBER 2026 &bull; Bengaluru, India</p>
            </div>
          </div>
          <div class="receipt-header-right">
            <div class="receipt-status-badge">ROSTER UNDER VERIFICATION</div>
            <div class="receipt-id-tag">${receiptId}</div>
          </div>
        </div>

        <div class="receipt-meta-grid">
          <div class="receipt-meta-item">
            <label>Delegation Receipt No.</label>
            <span id="pr-dlg-receipt-id">${receiptId}</span>
          </div>
          <div class="receipt-meta-item">
            <label>Registration Date</label>
            <span id="pr-dlg-receipt-date">${dateStr}</span>
          </div>
          <div class="receipt-meta-item">
            <label>Roster Status</label>
            <span id="pr-dlg-receipt-status" style="color: #6C0D2C;">Roster Under Verification</span>
          </div>
        </div>

        <div class="receipt-section-title">Institution & Head of Delegation Details</div>
        <table class="receipt-table">
          <tr><th>Institution / College / School</th><td id="pr-dlg-inst-name">${dlgName}</td></tr>
          <tr><th>Head of Delegation / Faculty Lead</th><td id="pr-dlg-head-fullname">${headName}</td></tr>
          <tr><th>Official Contact Mobile</th><td id="pr-dlg-inst-phone">${phone}</td></tr>
          <tr><th>Official Contact Email</th><td id="pr-dlg-inst-email">${email}</td></tr>
          <tr><th>Delegation Classification</th><td id="pr-dlg-inst-category">${category}</td></tr>
        </table>

        <div class="receipt-section-title">Delegation Participation & Roster Specifications</div>
        <table class="receipt-table">
          <tr><th>Confirmed Delegation Strength</th><td id="pr-dlg-inst-size">${count} Confirmed Delegates</td></tr>
          <tr><th>Roster Submission Method</th><td>Official Linked Google Sheet / CSV Roster Records</td></tr>
          <tr><th>Cross-Committee Distribution</th><td>UNSC, Lok Sabha, DISEC, UNHRC, UNODC, International Press (IP)</td></tr>
          <tr><th>Best Delegation Award</th><td>Flagship Best Delegation Trophy + Cash Prize</td></tr>
          <tr><th>Applicable Registration Fee</th><td>Institutional Delegation Tier (Consolidated Invoicing)</td></tr>
        </table>

        <div class="receipt-notice-box">
          <strong>Official Institutional Delegation Accreditation Notice:</strong><br>
          This document certifies that the institution named above has successfully registered an official delegation for the <strong>RNSIT Model United Nations Conference 2026</strong> scheduled for <strong>06–07 OCTOBER 2026</strong> at RNS Institute of Technology, Channasandra, Bengaluru. Delegation committee portfolios and country allotments are being processed by the Delegate Affairs Secretariat in coordination with the Head of Delegation. The Head of Delegation or authorized representative must present this confirmation slip at the Secretariat Accreditation Desk on Day 1 to collect all delegate kits, placards, and identity credentials.
        </div>

        <div class="receipt-contacts-section">
          <div class="receipt-contacts-header">Secretariat & Delegate Affairs Inquiries</div>
          <div class="receipt-contacts-grid">
            <div class="receipt-contact-card">
              <span class="contact-name">Zeyan</span>
              <span class="contact-role">Head &bull; Delegate Affairs</span>
              <span class="contact-phone">+91 91559 73955</span>
            </div>
            <div class="receipt-contact-card">
              <span class="contact-name">Adith</span>
              <span class="contact-role">Head &bull; Delegate Affairs</span>
              <span class="contact-phone">+91 89702 62490</span>
            </div>
            <div class="receipt-contact-card">
              <span class="contact-name">Dhatri</span>
              <span class="contact-role">Charge d'Affaires</span>
              <span class="contact-phone">+91 90351 20294</span>
            </div>
          </div>
        </div>

        <div class="receipt-footer-row">
          <div class="receipt-footer-left">
            RNS Institute of Technology, Dr. Vishnuvardhan Road, RR Nagar Post, Bengaluru 560098<br>
            Inquiries: <strong>mun@rnsit.ac.in</strong> &bull; Official Portal: <strong>mun.rnsit.ac.in</strong>
          </div>
          <div class="receipt-footer-right">
            <div class="receipt-stamp-placeholder">
              <span class="stamp-line-1">Core Secretariat,</span>
              <span class="stamp-line-2">RNSMUN 2026</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(dlgReceiptEl);

      // Print Institutional Delegation Receipt
      document.body.classList.add('printing-delegation');
      document.body.classList.remove('printing-individual');

      // Set document.title to RNSMUN26_Delegation_[Name] so browser defaults "Save as PDF" filename
      const cleanDlgName = (headName || dlgName).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const originalTitle = document.title;
      document.title = `RNSMUN26_Delegation_${cleanDlgName || 'Roster'}`;

      window.print();

      setTimeout(() => {
        document.title = originalTitle;
        document.body.classList.remove('printing-delegation');
        if (dlgReceiptEl && dlgReceiptEl.parentNode) {
          dlgReceiptEl.remove();
        }
      }, 1500);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleInitialPageLoad);
    } else {
      handleInitialPageLoad();
    }

    // ==========================================
    // FORM DRAFT AUTO-SAVE (sessionStorage)
    // Protects Step 1–3 inputs from phone-call
    // interruptions, accidental reloads, or app
    // backgrounding on mobile.
    // ==========================================
    const DRAFT_KEY = 'mun_reg_draft_v1';

    // Fields to persist — text/email/tel/select/textarea (no file inputs, no payment data)
    const DRAFT_FIELDS = [
      // Step 1 — Personal Details
      'reg-name', 'reg-age', 'reg-institution', 'reg-usn', 'reg-city',
      'reg-phone', 'reg-email',
      // Step 1 — Experience
      'reg-exp-yes', 'reg-exp-no',
      'reg-exp-count',
      'reg-experience-details',
      // Step 2 — Committee 1
      'reg-committee-1', 'reg-portfolio-1', 'reg-portfolio-2',
      // Step 3 — Committee 2
      'reg-committee-2', 'reg-comm2-portfolio-1', 'reg-comm2-portfolio-2'
    ];

    function saveDraft() {
      const data = {};
      DRAFT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'radio') {
          if (el.checked) data[id] = el.value;
        } else {
          data[id] = el.value;
        }
      });
      // Also save delegate type
      data['_delegateType'] = currentDelegateType || 'internal';
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      } catch (e) { /* storage quota or private mode */ }
    }

    function clearDraft() {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
    }

    function restoreDraft(explicitType = null) {
      let raw;
      try { raw = sessionStorage.getItem(DRAFT_KEY); } catch (e) {}
      if (!raw) return false;

      let data;
      try { data = JSON.parse(raw); } catch (e) { clearDraft(); return false; }
      if (!data || typeof data !== 'object') { clearDraft(); return false; }

      // Check that at least some actual user value has been entered
      const hasValue = Object.keys(data).some(k => k !== '_delegateType' && typeof data[k] === 'string' && data[k].trim() !== '');
      if (!hasValue) return false;

      // 1. Restore delegate type (giving priority to explicitly chosen type)
      if (explicitType) {
        currentDelegateType = explicitType;
      } else if (data['_delegateType']) {
        currentDelegateType = data['_delegateType'];
      }
      applyDelegateTypeUI(currentDelegateType);

      // 2. Step 1: Text & simple fields
      const step1TextFields = ['reg-name', 'reg-age', 'reg-institution', 'reg-usn', 'reg-city', 'reg-phone', 'reg-email', 'reg-experience-details'];
      step1TextFields.forEach(id => {
        const el = document.getElementById(id);
        if (el && id in data && data[id] !== undefined) {
          el.value = data[id];
        }
      });

      if (currentDelegateType === 'internal') {
        const institutionSelect = document.getElementById('reg-institution-select');
        if (institutionSelect) {
          if (data['reg-institution'] === 'RNS First Grade College' || data['reg-institution'] === 'RNS Institute of Technology') {
            institutionSelect.value = data['reg-institution'];
          } else {
            institutionSelect.value = 'RNS Institute of Technology';
          }
          institutionSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        updateInternalUSNFieldState();
      }

      // Step 1: Experience Radio
      if (data['reg-exp-yes'] === 'yes') {
        const yesRadio = document.getElementById('reg-exp-yes');
        if (yesRadio) {
          yesRadio.checked = true;
          handleExperienceToggle('yes');
        }
      } else if (data['reg-exp-no'] === 'no') {
        const noRadio = document.getElementById('reg-exp-no');
        if (noRadio) {
          noRadio.checked = true;
          handleExperienceToggle('no');
        }
      }

      // Step 1: Experience Count
      if (data['reg-exp-count']) {
        const expCount = document.getElementById('reg-exp-count');
        if (expCount) {
          expCount.value = data['reg-exp-count'];
          rebuildCustomSelect('reg-exp-count');
          const detailsSection = document.getElementById('exp-details-section');
          if (detailsSection && data['reg-exp-yes'] === 'yes') {
            detailsSection.style.display = 'block';
          }
        }
      }

      // 3. Committee 1 in exact dependency order:
      // a. Restore reg-committee-1
      const comm1Val = data['reg-committee-1'] || 'unsc';
      setCommittee1Selection(comm1Val);

      // b. Restore reg-portfolio-1
      const p1Select = document.getElementById('reg-portfolio-1');
      if (p1Select && data['reg-portfolio-1']) {
        const p1Val = data['reg-portfolio-1'];
        if (Array.from(p1Select.options).some(o => o.value === p1Val)) {
          p1Select.value = p1Val;
          rebuildCustomSelect('reg-portfolio-1');
        }
      }

      // c. Rebuild Portfolio 2 options and restore reg-portfolio-2
      const p2Val = data['reg-portfolio-2'] || '';
      updatePortfolio2Options(comm1Val, 'reg-portfolio-1', 'reg-portfolio-2', p2Val);

      // 4. Committee 2 in exact dependency order:
      // a. Update Committee 2 options (excludes Committee 1)
      updateCommittee2Options();
      const comm2Select = document.getElementById('reg-committee-2');
      if (comm2Select && data['reg-committee-2']) {
        const desiredComm2 = data['reg-committee-2'].toLowerCase();
        if (desiredComm2 !== comm1Val.toLowerCase() && Array.from(comm2Select.options).some(o => o.value === desiredComm2)) {
          comm2Select.value = desiredComm2;
          rebuildCustomSelect('reg-committee-2');
          // Update Committee 2 Matrix link
          const comm2MatrixLink = document.getElementById('reg-comm2-matrix-link');
          const comm2MatrixText = document.getElementById('comm2-matrix-btn-text');
          if (comm2MatrixLink) comm2MatrixLink.href = COMMITTEE_MATRIX_LINKS[desiredComm2] || COMMITTEE_MATRIX_LINKS.all;
          if (comm2MatrixText) comm2MatrixText.textContent = desiredComm2.toUpperCase();
          // Populate portfolios for Committee 2
          updatePortfoliosForCommittee(desiredComm2, 'reg-comm2-portfolio-1', 'reg-comm2-portfolio-2');
        }
      }

      const activeComm2 = comm2Select ? comm2Select.value : '';

      // b. Restore reg-comm2-portfolio-1
      const comm2P1Select = document.getElementById('reg-comm2-portfolio-1');
      if (comm2P1Select && data['reg-comm2-portfolio-1']) {
        const comm2P1Val = data['reg-comm2-portfolio-1'];
        if (Array.from(comm2P1Select.options).some(o => o.value === comm2P1Val)) {
          comm2P1Select.value = comm2P1Val;
          rebuildCustomSelect('reg-comm2-portfolio-1');
        }
      }

      // c. Rebuild Comm 2 Portfolio 2 options and restore reg-comm2-portfolio-2
      const comm2P2Val = data['reg-comm2-portfolio-2'] || '';
      updatePortfolio2Options(activeComm2, 'reg-comm2-portfolio-1', 'reg-comm2-portfolio-2', comm2P2Val);

      return true;
    }

    function showDraftRestoredBanner(step1Panel) {
      // Avoid duplicates
      if (document.getElementById('draft-restored-banner')) return;

      const banner = document.createElement('div');
      banner.id = 'draft-restored-banner';
      banner.className = 'draft-restored-banner';
      banner.setAttribute('role', 'status');
      banner.innerHTML = `
        <span class="draft-dot"></span>
        <span>Draft restored &mdash; your entries are back!</span>
        <button type="button" class="draft-dismiss" onclick="clearDraftAndDismissBanner(event)" aria-label="Clear draft">Clear</button>
      `;

      // Insert at top of Step 1 panel content
      const firstFormGroup = step1Panel.querySelector('.form-group');
      if (firstFormGroup) {
        step1Panel.insertBefore(banner, firstFormGroup);
      } else {
        step1Panel.prepend(banner);
      }

      // Auto-dismiss after 6s
      setTimeout(() => {
        if (banner.parentNode) {
          banner.style.transition = 'opacity 0.4s ease';
          banner.style.opacity = '0';
          setTimeout(() => banner.remove(), 400);
        }
      }, 6000);
    }

    function clearDraftAndDismissBanner(e) {
      if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
      }
      clearDraft();
      resetPaymentScreenshotState();

      const banner = document.getElementById('draft-restored-banner');
      if (banner) {
        banner.style.transition = 'opacity 0.2s ease';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 200);
      }

      // Explicitly wipe individual inputs to guarantee blank state
      const form = document.getElementById('delegate-registration-form');
      if (form) {
        const idsToClear = ['reg-name', 'reg-age', 'reg-usn', 'reg-phone', 'reg-email', 'reg-experience-details', 'reg-exp-count'];
        idsToClear.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });

        const city = document.getElementById('reg-city');
        if (city) city.value = currentDelegateType === 'internal' ? 'Bengaluru' : '';

        const institution = document.getElementById('reg-institution');
        const institutionSelect = document.getElementById('reg-institution-select');
        const institutionSelectWrap = document.getElementById('custom-select-wrap-reg-institution-select');
        if (institution) {
          if (currentDelegateType === 'internal') {
            if (institutionSelect) {
              institutionSelect.value = 'RNS Institute of Technology';
              institutionSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            institution.value = 'RNS Institute of Technology';
            institution.readOnly = true;
            institution.style.display = 'none';
            if (institutionSelectWrap) institutionSelectWrap.style.display = '';
            updateInternalUSNFieldState();
          } else {
            institution.value = '';
            institution.readOnly = false;
            institution.style.display = '';
            if (institutionSelectWrap) institutionSelectWrap.style.display = 'none';
          }
        }

        handleExperienceToggle('no');
        const noRadio = document.getElementById('reg-exp-no');
        if (noRadio) noRadio.checked = true;

        const existsMsg = document.getElementById('reg-email-exists-msg');
        if (existsMsg) existsMsg.style.display = 'none';

        form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
        form.querySelectorAll('.error-container').forEach(el => { el.style.display = 'none'; });

        setCommittee1Selection('unsc');
        goToStep(1);

        // Focus Full Name so user can start typing cleanly
        const nameInput = document.getElementById('reg-name');
        if (nameInput) nameInput.focus();
      }
    }

    // Attach debounced input/change listeners to all draft fields
    function initUSNInputListener() {
      const usnInput = document.getElementById('reg-usn');
      if (!usnInput) return;
      usnInput.addEventListener('input', () => {
        if (usnInput.value.length > 10) {
          usnInput.value = usnInput.value.slice(0, 10);
        }
        updateStep1NextButtonState();
      });
      usnInput.addEventListener('blur', () => {
        if (currentDelegateType === 'internal') {
          const errEl = document.getElementById('reg-usn-error');
          if (!isValidInternalUSN(usnInput.value.trim())) {
            usnInput.classList.add('has-error');
            if (errEl) {
              errEl.textContent = getInternalUSNErrorMessage();
              errEl.style.display = 'block';
            }
          } else {
            usnInput.classList.remove('has-error');
            if (errEl) errEl.style.display = 'none';
          }
        }
      });
    }

    function attachDraftListeners() {
      let saveTimer = null;
      const debouncedSave = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveDraft, 400); // 400ms debounce
      };

      const form = document.getElementById('delegate-registration-form');
      if (form) {
        form.addEventListener('input', debouncedSave, { passive: true });
        form.addEventListener('change', debouncedSave, { passive: true });
      }

      DRAFT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const events = el.type === 'radio' || el.tagName === 'SELECT' ? ['change'] : ['input', 'change'];
        events.forEach(evt => el.addEventListener(evt, debouncedSave, { passive: true }));
      });
    }

    
    // Native Drag and Drop support for payment screenshot dropzones
    function initDropzoneDragAndDrop() {
      const dropzones = [
        { dropId: 'external-payment-dropzone', inputId: 'reg-external-payment-screenshot', handler: handleExternalPaymentScreenshotSelected },
        { dropId: 'dlg-payment-dropzone', inputId: 'dlg-payment-screenshot', handler: handleDelegationPaymentScreenshotSelected }
      ];

      dropzones.forEach(({ dropId, inputId, handler }) => {
        const dropzone = document.getElementById(dropId);
        const input = document.getElementById(inputId);
        if (!dropzone || !input) return;

        ['dragenter', 'dragover'].forEach(evt => {
          dropzone.addEventListener(evt, e => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'var(--accent-color)';
            dropzone.style.backgroundColor = '#FFF5F7';
          }, false);
        });

        ['dragleave', 'drop'].forEach(evt => {
          dropzone.addEventListener(evt, e => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'var(--text-primary)';
            dropzone.style.backgroundColor = '#FFFDF9';
          }, false);
        });

        dropzone.addEventListener('drop', e => {
          const files = e.dataTransfer && e.dataTransfer.files;
          if (files && files.length > 0) {
            try {
              input.files = files;
            } catch (_) {}
            handler(input);
          }
        }, false);
      });
    }
  

    // Initialize listeners once DOM is ready
    const initDraftAutoSave = () => { attachDraftListeners(); initDropzoneDragAndDrop(); initUSNInputListener(); };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDraftAutoSave);
    } else {
      initDraftAutoSave();
    }
    // End Form Draft Auto-Save

    function openQRPreview(imgElementOrId, titleText) {
      let imgSrc = '';
      let altText = 'Enlarged Payment QR Code';

      if (typeof imgElementOrId === 'string') {
        const el = document.getElementById(imgElementOrId);
        if (el) {
          imgSrc = el.currentSrc || el.src;
          altText = el.alt || altText;
        }
      } else if (imgElementOrId && imgElementOrId.src) {
        imgSrc = imgElementOrId.currentSrc || imgElementOrId.src;
        altText = imgElementOrId.alt || altText;
      }

      if (!imgSrc) return;

      const backdrop = document.getElementById('qr-preview-backdrop');
      const previewImg = document.getElementById('qr-preview-img');
      const titleEl = document.getElementById('qr-preview-title');

      if (previewImg) {
        previewImg.src = imgSrc;
        previewImg.alt = altText;
      }
      if (titleEl && titleText) {
        titleEl.textContent = titleText;
      }

      if (backdrop) {
        backdrop.style.display = 'flex';
        requestAnimationFrame(() => {
          backdrop.classList.add('is-open');
        });
      }
    }

    function closeQRPreview() {
      const backdrop = document.getElementById('qr-preview-backdrop');
      if (backdrop) {
        backdrop.classList.remove('is-open');
        setTimeout(() => {
          if (!backdrop.classList.contains('is-open')) {
            backdrop.style.display = 'none';
          }
        }, 200);
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const qrBackdrop = document.getElementById('qr-preview-backdrop');
        if (qrBackdrop && qrBackdrop.classList.contains('is-open')) {
          e.preventDefault();
          e.stopPropagation();
          closeQRPreview();
        }
      }
    });

// Expose all inline-callable functions to global window scope
Object.assign(window, {
  selectRegistrationPath,
  showRegistrationChoice,
  handleCardClick,
  openDelegationRegistrationModal,
  closeCommitteeModal,
  handleRegisterFromModal,
  closeDelegationRegistrationModal,
  clearDelegationForm,
  stepDelegateCount,
  generateDelegationGoogleSheet,
  downloadDelegationRosterExcel,
  downloadDelegationRosterCSV,
  shareDelegationRosterWhatsApp,
  copyDelegationRosterLink,
  exitDelegationForm,
  handleDelegationStep1Proceed,
  copyDelegationUPI,
  goToDelegationStep,
  handleDelegationSuccessDone,
  printDelegationReceipt,
  closeDelegateTypeModal,
  selectDelegateType,
  closeRegistrationModal,
  goToStep,
  isValidInternalUSN,
  updateStep1NextButtonState,
  selectExternalCategory,
  handleProceedToExternalPayment,
  copyExternalUPI,
  handleSuccessDone,
  printRegistrationReceipt,
  clearDraftAndDismissBanner,
  handleDelegationSubmit,
  toggleDelegationClearBtn,
  checkEmailRegistration,
  handleDelegateCountInput,
  validateDelegateCountBlur,
  updateRosterPreview,
  handleDelegationPaymentScreenshotSelected,
  handleRegistrationSubmit,
  handleInternalInstitutionChange,
  checkIndividualEmailRegistration,
  handleExperienceToggle,
  handleConferenceCountChange,
  handlePortfolio1Change,
  handlePortfolio2Change,
  handleCommittee2Change,
  handleExternalPaymentScreenshotSelected,
  removeExternalPaymentScreenshot,
  removeDelegationPaymentScreenshot,
  openQRPreview,
  closeQRPreview
});

