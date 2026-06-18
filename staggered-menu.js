/* Premium Staggered Menu for 611 Detailing (Mobile Only) */
const gsap = window.gsap;

export function initStaggeredMenu(lenisInstance) {
  // Only execute on mobile screens <= 768px
  const checkMobile = () => window.innerWidth <= 768;
  
  if (!checkMobile()) {
    // If not mobile, exit. We will also monitor resize events.
    setupResizeListener();
    return;
  }

  // Prevent double initialization
  if (document.querySelector('.staggered-menu-wrapper')) return;

  setupMenu();

  function setupMenu() {
    const header = document.querySelector('header');
    if (!header) return;

    // 1. DYNAMIC DOM INJECTION
    
    // Inject the toggle button into the header
    const toggleBtnHTML = `
      <button class="sm-toggle" aria-label="Открыть меню" aria-expanded="false" aria-controls="staggered-menu-panel" type="button">
        <span class="sm-toggle-textWrap" aria-hidden="true">
          <span class="sm-toggle-textInner">
            <span class="sm-toggle-line">Menu</span>
          </span>
        </span>
        <span class="sm-icon" aria-hidden="true">
          <span class="sm-icon-line"></span>
          <span class="sm-icon-line sm-icon-line-v"></span>
        </span>
      </button>
    `;
    header.insertAdjacentHTML('beforeend', toggleBtnHTML);

    // Inject the panel overlay & prelayers into the body
    const menuWrapperHTML = `
      <div class="staggered-menu-wrapper" data-position="right" aria-hidden="true">
        <div class="sm-prelayers" aria-hidden="true">
          <div class="sm-prelayer" style="background: #111115;"></div>
        </div>
        <aside id="staggered-menu-panel" class="staggered-menu-panel">
          <div class="sm-panel-inner">
            <ul class="sm-panel-list" role="list" data-numbering="true">
              <li class="sm-panel-itemWrap">
                <a class="sm-panel-item" href="/#hero" data-index="01">
                  <span class="sm-panel-itemLabel">Главная</span>
                </a>
              </li>
              <li class="sm-panel-itemWrap sm-has-submenu">
                <button class="sm-panel-item sm-submenu-toggle" data-index="02" type="button">
                  <span class="sm-panel-itemLabel">Услуги</span>
                  <span class="sm-submenu-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </button>
                <ul class="sm-submenu-list" style="height: 0; opacity: 0; overflow: hidden; margin-top: 0;">
                  <li><a href="/wash.html" class="sm-submenu-item">Детейлинг-мойка</a></li>
                  <li><a href="/polish.html" class="sm-submenu-item">Полировка кузова</a></li>
                  <li><a href="/ceramic.html" class="sm-submenu-item">Керамика кузова</a></li>
                  <li><a href="/wrap.html" class="sm-submenu-item">Защита пленкой</a></li>
                  <li><a href="/dry-clean.html" class="sm-submenu-item">Химчистка салона</a></li>
                  <li><a href="/leather.html" class="sm-submenu-item">Уход за кожей</a></li>
                  <li><a href="/prep.html" class="sm-submenu-item">Антидождь & Подготовка</a></li>
                </ul>
              </li>
              <li class="sm-panel-itemWrap">
                <a class="sm-panel-item" href="/#about" data-index="03">
                  <span class="sm-panel-itemLabel">О студии</span>
                </a>
              </li>
              <li class="sm-panel-itemWrap">
                <a class="sm-panel-item" href="/#works" data-index="04">
                  <span class="sm-panel-itemLabel">Работы</span>
                </a>
              </li>
              <li class="sm-panel-itemWrap">
                <a class="sm-panel-item" href="/#book" data-index="05">
                  <span class="sm-panel-itemLabel">Запись</span>
                </a>
              </li>
            </ul>
            <div class="sm-socials" aria-label="Контакты">
              <h3 class="sm-socials-title">Контакты</h3>
              <ul class="sm-socials-list" role="list">
                <li class="sm-socials-item">
                  <a href="tel:+78126111212" class="sm-socials-link">+7 (812) 611-12-12</a>
                </li>
                <li class="sm-socials-item">
                  <a href="https://wa.me/78126111212" class="sm-socials-link" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </li>
                <li class="sm-socials-item">
                  <a href="https://t.me/detailing611" class="sm-socials-link" target="_blank" rel="noopener noreferrer">Telegram</a>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', menuWrapperHTML);

    // 2. REFERENCES
    const wrapper = document.querySelector('.staggered-menu-wrapper');
    const panel = document.getElementById('staggered-menu-panel');
    const preLayersContainer = wrapper.querySelector('.sm-prelayers');
    const preLayers = Array.from(wrapper.querySelectorAll('.sm-prelayer'));
    const toggleBtn = header.querySelector('.sm-toggle');
    const icon = toggleBtn.querySelector('.sm-icon');
    const textInner = toggleBtn.querySelector('.sm-toggle-textInner');
    
    let isOpen = false;
    let isAnimating = false;
    let openTimeline = null;
    let isSubmenuOpen = false;

    // 3. INITIAL GSAP STATE SETTING
    gsap.set([panel, ...preLayers], { xPercent: 100, opacity: 1 });
    gsap.set(preLayersContainer, { xPercent: 0, opacity: 1 });
    gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
    gsap.set(textInner, { yPercent: 0 });

    // 4. ANIMATION TIMELINE BUILDERS
    const buildOpenTimeline = () => {
      const itemLabels = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
      const numberEls = Array.from(panel.querySelectorAll('.sm-panel-item'));
      const socialTitle = panel.querySelector('.sm-socials-title');
      const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

      // Set items to offscreen starting states
      gsap.set(itemLabels, { yPercent: 140, rotate: 10 });
      gsap.set(numberEls, { '--sm-num-opacity': 0 });
      gsap.set(socialTitle, { opacity: 0 });
      gsap.set(socialLinks, { y: 25, opacity: 0 });

      const tl = gsap.timeline({ paused: true });

      // Slide in decorative background prelayers
      preLayers.forEach((layer, i) => {
        tl.fromTo(layer, { xPercent: 100 }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
      });

      const lastTime = preLayers.length ? (preLayers.length - 1) * 0.07 : 0;
      const panelInsertTime = lastTime + (preLayers.length ? 0.08 : 0);
      const panelDuration = 0.65;

      // Slide in the main panel
      tl.fromTo(
        panel,
        { xPercent: 100 },
        { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
        panelInsertTime
      );

      // Reveal menu items staggered
      if (itemLabels.length) {
        const itemsStart = panelInsertTime + panelDuration * 0.15;
        tl.to(
          itemLabels,
          {
            yPercent: 0,
            rotate: 0,
            duration: 1,
            ease: 'power4.out',
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart
        );
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: 'power2.out',
            '--sm-num-opacity': 1,
            stagger: { each: 0.06, from: 'start' }
          },
          itemsStart + 0.1
        );
      }

      // Reveal socials staggered
      if (socialTitle || socialLinks.length) {
        const socialsStart = panelInsertTime + panelDuration * 0.4;
        if (socialTitle) {
          tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
        }
        if (socialLinks.length) {
          tl.to(
            socialLinks,
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              ease: 'power3.out',
              stagger: { each: 0.08, from: 'start' }
            },
            socialsStart + 0.04
          );
        }
      }

      return tl;
    };

    // 5. ACTIONS
    const openMenu = () => {
      if (isAnimating) return;
      isAnimating = true;
      isOpen = true;

      // Update ARIA & DOM attributes
      wrapper.setAttribute('aria-hidden', 'false');
      wrapper.setAttribute('data-open', 'true');
      toggleBtn.setAttribute('aria-expanded', 'true');
      header.classList.add('sm-menu-open');

      // Stop scrolling
      if (lenisInstance) lenisInstance.stop();

      // Trigger animations
      openTimeline = buildOpenTimeline();
      openTimeline.eventCallback('onComplete', () => {
        isAnimating = false;
      });
      openTimeline.play(0);

      animateIcon(true);
      animateText(true);
    };

    const closeMenu = () => {
      if (isAnimating) return;
      isAnimating = true;
      isOpen = false;

      // Update ARIA & DOM attributes
      toggleBtn.setAttribute('aria-expanded', 'false');
      header.classList.remove('sm-menu-open');

      // Start scrolling
      if (lenisInstance) lenisInstance.start();

      animateIcon(false);
      animateText(false);

      // Play close tween
      const allPanels = [...preLayers, panel];
      gsap.to(allPanels, {
        xPercent: 100,
        duration: 0.35,
        ease: 'power3.in',
        overwrite: 'auto',
        onComplete: () => {
          wrapper.setAttribute('aria-hidden', 'true');
          wrapper.removeAttribute('data-open');
          
          // Reset starting values
          const itemLabels = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
          const numberEls = Array.from(panel.querySelectorAll('.sm-panel-item'));
          const socialTitle = panel.querySelector('.sm-socials-title');
          const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
          
          if (itemLabels.length) gsap.set(itemLabels, { yPercent: 140, rotate: 10 });
          if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
          if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
          if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

          // Reset submenu
          const submenuToggle = panel.querySelector('.sm-submenu-toggle');
          const submenuList = panel.querySelector('.sm-submenu-list');
          const submenuArrow = panel.querySelector('.sm-submenu-arrow');
          if (submenuToggle && submenuList) {
            isSubmenuOpen = false;
            submenuToggle.setAttribute('aria-expanded', 'false');
            gsap.set(submenuList, { height: 0, opacity: 0, marginTop: 0 });
            gsap.set(submenuArrow, { rotate: 0 });
          }

          isAnimating = false;
        }
      });
    };

    const animateIcon = (opening) => {
      gsap.to(icon, {
        rotate: opening ? 225 : 0,
        duration: opening ? 0.8 : 0.35,
        ease: opening ? 'power4.out' : 'power3.inOut',
        overwrite: 'auto'
      });
    };

    const animateText = (opening) => {
      const currentLabel = opening ? 'Menu' : 'Close';
      const targetLabel = opening ? 'Close' : 'Menu';
      const cycles = 3;
      const seq = [currentLabel];
      let last = currentLabel;
      for (let i = 0; i < cycles; i++) {
        last = last === 'Menu' ? 'Close' : 'Menu';
        seq.push(last);
      }
      if (last !== targetLabel) seq.push(targetLabel);
      seq.push(targetLabel);

      textInner.innerHTML = seq.map(line => `<span class="sm-toggle-line">${line}</span>`).join('');

      gsap.set(textInner, { yPercent: 0 });
      const lineCount = seq.length;
      const finalShift = ((lineCount - 1) / lineCount) * 100;

      gsap.to(textInner, {
        yPercent: -finalShift,
        duration: 0.5 + lineCount * 0.07,
        ease: 'power4.out',
        overwrite: 'auto'
      });
    };

    // 6. EVENT LISTENERS
    toggleBtn.addEventListener('click', () => {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close on click outside
    document.addEventListener('mousedown', (e) => {
      if (isOpen && !isAnimating) {
        if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
          closeMenu();
        }
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen && !isAnimating) {
        closeMenu();
      }
    });

    // Click handler for menu links (smooth scrolling & close)
    const menuLinks = panel.querySelectorAll('a.sm-panel-item');
    menuLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        let href = link.getAttribute('href');
        if (href) {
          const isHomepage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '';
          if (href.startsWith('/#') && isHomepage) {
            href = href.substring(1); // Get direct anchor like "#services"
          }

          if (href.startsWith('#')) {
            e.preventDefault();
            const targetElement = document.querySelector(href);

            closeMenu();

            if (targetElement && lenisInstance) {
              // Scroll after the closing animation starts to look natural
              setTimeout(() => {
                lenisInstance.scrollTo(targetElement, {
                  offset: -40,
                  duration: 1.5,
                  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                });
              }, 350);
            }
          } else {
            // Let the browser navigate to the subpage, but close menu first
            closeMenu();
          }
        }
      });
    });

    // Submenu Toggle logic
    const submenuToggle = panel.querySelector('.sm-submenu-toggle');
    const submenuList = panel.querySelector('.sm-submenu-list');
    const submenuArrow = panel.querySelector('.sm-submenu-arrow');

    if (submenuToggle && submenuList) {
      submenuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        isSubmenuOpen = !isSubmenuOpen;
        submenuToggle.setAttribute('aria-expanded', isSubmenuOpen ? 'true' : 'false');
        
        if (isSubmenuOpen) {
          gsap.to(submenuList, {
            height: 'auto',
            opacity: 1,
            marginTop: 12,
            duration: 0.4,
            ease: 'power3.out'
          });
          gsap.to(submenuArrow, {
            rotate: 180,
            duration: 0.4,
            ease: 'power3.out'
          });
        } else {
          gsap.to(submenuList, {
            height: 0,
            opacity: 0,
            marginTop: 0,
            duration: 0.3,
            ease: 'power3.in'
          });
          gsap.to(submenuArrow, {
            rotate: 0,
            duration: 0.3,
            ease: 'power3.in'
          });
        }
      });
      
      // Close mobile menu when a submenu link is clicked
      const submenuLinks = submenuList.querySelectorAll('.sm-submenu-item');
      submenuLinks.forEach(sublink => {
        sublink.addEventListener('click', () => {
          closeMenu();
        });
      });
    }

    // Close on clicking header logo (if on homepage, smooth scroll to top)
    const logo = header.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', (e) => {
        if (isOpen) {
          const isHomepage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '';
          if (isHomepage) {
            e.preventDefault();
            closeMenu();
            const hero = document.getElementById('hero');
            if (hero && lenisInstance) {
              setTimeout(() => {
                lenisInstance.scrollTo(hero, {
                  offset: -40,
                  duration: 1.5,
                  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                });
              }, 350);
            }
          } else {
            closeMenu();
          }
        }
      });
    }
  }

  function setupResizeListener() {
    const handleResize = () => {
      if (checkMobile()) {
        window.removeEventListener('resize', handleResize);
        setupMenu();
      }
    };
    window.addEventListener('resize', handleResize);
  }
}
