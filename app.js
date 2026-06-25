// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

import { initStaggeredMenu } from './staggered-menu.js';

// =============================================
// 0. DYNAMIC PRELOADER INJECTION
// =============================================
const injectPreloader = () => {
  const preloaderHTML = `
    <div class="preloader" id="preloader">
      <div class="preloader-content">
        <div class="preloader-logo">611<span>detailing</span></div>
        <div class="preloader-progress-container">
          <div class="preloader-progress-bar" id="preloader-progress-bar"></div>
        </div>
        <div class="preloader-percentage" id="preloader-percentage">0%</div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('afterbegin', preloaderHTML);
};
injectPreloader();

// =============================================
// 1. SMOOTH SCROLLING (Lenis)
// =============================================
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1.05,
});

// Lock scroll immediately during preloading
lenis.stop();

// Update ScrollTrigger on Lenis scroll
lenis.on('scroll', ScrollTrigger.update);

// Integrate Lenis RAF loop with GSAP ticker
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

// Disable GSAP lag smoothing to keep ScrollTrigger synced with Lenis
gsap.ticker.lagSmoothing(0);


// =============================================
// 2. CANVAS IMAGE SEQUENCE SCRUBBER
// =============================================
const canvas = document.getElementById('hero-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const isMobile = window.innerWidth <= 768;
const FRAME_COUNT = isMobile ? 165 : 220;
const FRAME_PATH = (index) => {
  const folder = isMobile ? 'formob' : 'forpc';
  const ext = isMobile ? 'jpg' : 'webp';
  return `/${folder}/frame_${String(index).padStart(4, '0')}.${ext}`;
};

const frames = new Array(FRAME_COUNT).fill(null);
const loadingStates = new Array(FRAME_COUNT).fill(null);
let loadedFramesCount = 0;

// Resize canvas dynamically keeping aspect ratio
function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  
  canvas.width = parent.clientWidth * dpr;
  canvas.height = parent.clientHeight * dpr;
  
  ctx.scale(dpr, dpr);
  
  // Re-draw current frame after resize
  if (ScrollTrigger.getById('hero-trigger')) {
    const progress = ScrollTrigger.getById('hero-trigger').progress;
    const currentFrameIndex = Math.floor(progress * (FRAME_COUNT - 1));
    drawFrame(currentFrameIndex);
  } else {
    drawFrame(0);
  }
}

// Draw specific frame onto canvas with cover fit
function drawFrame(index) {
  if (!canvas || !ctx) return;
  const clampedIndex = Math.max(0, Math.min(index, FRAME_COUNT - 1));
  const img = frames[clampedIndex];
  
  if (img && img.complete) {
    const parentWidth = canvas.width / (window.devicePixelRatio || 1);
    const parentHeight = canvas.height / (window.devicePixelRatio || 1);
    
    const imgRatio = img.width / img.height;
    const parentRatio = parentWidth / parentHeight;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgRatio > parentRatio) {
      drawHeight = parentHeight;
      drawWidth = parentHeight * imgRatio;
      drawX = (parentWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = parentWidth;
      drawHeight = parentWidth / imgRatio;
      drawX = 0;
      drawY = (parentHeight - drawHeight) / 2;
    }
    
    ctx.clearRect(0, 0, parentWidth, parentHeight);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  } else {
    // High-priority load of the frame the user is currently scrolled on
    loadFrame(clampedIndex).then(() => {
      const trigger = ScrollTrigger.getById('hero-trigger');
      if (trigger) {
        const currentIdx = Math.floor(trigger.progress * (FRAME_COUNT - 1));
        // Only draw if user is still within 3 frames of this one
        if (Math.abs(currentIdx - clampedIndex) <= 3) {
          drawFrame(clampedIndex);
        }
      }
    });
  }
}

// Single frame loader helper with duplicate request prevention and GPU pre-decoding
const loadFrame = (index) => {
  if (frames[index]) return Promise.resolve();
  if (loadingStates[index]) return loadingStates[index];
  
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      frames[index] = img;
      loadedFramesCount++;
      
      // Force hardware decoding before resolving, preventing main-thread layout jank on first draw
      if (typeof img.decode === 'function') {
        img.decode()
          .then(() => resolve())
          .catch(() => resolve()); // Fallback on decode failure
      } else {
        resolve();
      }
    };
    img.onerror = () => {
      // Resolve silently to prevent blocking progress
      resolve();
    };
    img.src = FRAME_PATH(index + 1);
  });
  
  loadingStates[index] = promise;
  return promise;
};

// Batch loader helper
const loadInBatches = async (indices, batchSize) => {
  for (let i = 0; i < indices.length; i += batchSize) {
    const batch = indices.slice(i, i + batchSize);
    await Promise.all(batch.map(index => loadFrame(index)));
  }
};

// Progressive Preloading Strategy
const preloadProgressively = async () => {
  const isHomepage = !!document.getElementById('hero');
  
  if (!isHomepage) {
    // We are on a service page: there is no hero canvas sequence.
    // Run a quick, sleek simulated progress bar transition.
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('preloader-progress-bar');
    const percentageText = document.getElementById('preloader-percentage');
    
    if (preloader && progressBar && percentageText) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 4;
        if (progress > 100) progress = 100;
        
        progressBar.style.width = `${progress}%`;
        percentageText.textContent = `${progress}%`;
        
        if (progress === 100) {
          clearInterval(interval);
          setTimeout(() => {
            preloader.classList.add('fade-out');
            if (typeof lenis !== 'undefined') lenis.start();
          }, 300);
        }
      }, 15); // ~375ms loading time for sleek page entrance
    } else {
      if (typeof lenis !== 'undefined') lenis.start();
    }
    return;
  }

  // We are on the homepage:
  if (!canvas || !ctx) {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.add('fade-out');
    if (typeof lenis !== 'undefined') lenis.start();
    return;
  }
  
  // Critical Preload Count: 8 frames for mobile, 12 frames for desktop
  const CRITICAL_PRELOAD_COUNT = isMobile ? 8 : 12;
  let loadedCriticalCount = 0;
  
  const updateProgress = () => {
    loadedCriticalCount++;
    const progress = Math.min(100, Math.floor((loadedCriticalCount / CRITICAL_PRELOAD_COUNT) * 100));
    
    const progressBar = document.getElementById('preloader-progress-bar');
    const percentageText = document.getElementById('preloader-percentage');
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (percentageText) percentageText.textContent = `${progress}%`;
  };

  // 1. Load the very first frame immediately and render it
  await loadFrame(0).then(() => {
    resizeCanvas();
    updateProgress();
  });
  
  // 2. Load the remaining critical frames in parallel
  const criticalIndices = Array.from({ length: CRITICAL_PRELOAD_COUNT - 1 }, (_, i) => i + 1);
  await Promise.all(criticalIndices.map(index => {
    return loadFrame(index).then(() => {
      updateProgress();
    });
  }));
  
  // 3. Initialize ScrollTrigger for scrubbing now that the segment is ready
  initScrollTrigger();
  
  // 4. Smoothly fade out preloader and enable scroll
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('fade-out');
    }
    
    // Check if there is a hash in the URL on load (e.g. /#about)
    const hash = window.location.hash;
    if (hash) {
      const targetElement = document.querySelector(hash);
      if (targetElement) {
        // Reset scroll position to 0 first to ensure ScrollTrigger syncs correctly
        window.scrollTo(0, 0);
        if (typeof lenis !== 'undefined') {
          lenis.scrollTo(0, { immediate: true });
          lenis.start();
          
          // Smooth scroll to the target section after a small timeout to allow layout to settle
          setTimeout(() => {
            lenis.scrollTo(targetElement, {
              offset: -40,
              duration: 1.5,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
            });
          }, 100);
        }
        return;
      }
    }
    
    // Standard behavior (no hash)
    window.scrollTo(0, 0);
    if (typeof lenis !== 'undefined') {
      lenis.scrollTo(0, { immediate: true });
      lenis.start();
    }

    // 5. Load the remaining frames in the background in batches of 4
    const remainingIndices = Array.from({ length: FRAME_COUNT - CRITICAL_PRELOAD_COUNT }, (_, i) => i + CRITICAL_PRELOAD_COUNT);
    loadInBatches(remainingIndices, 4);
  }, 400); // Small visual buffer for progress bar 100% completion state
};

const initScrollTrigger = () => {
  if (!canvas || !ctx || !document.getElementById('hero')) return;
  ScrollTrigger.create({
    id: 'hero-trigger',
    trigger: '#hero',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.4, // smooth lag following
    onUpdate: (self) => {
      const frameIndex = Math.floor(self.progress * (FRAME_COUNT - 1));
      drawFrame(frameIndex);
    }
  });
};

// =============================================
// 3. TEXT LAYER PARALLAX & ANIMATIONS
// =============================================
const initTextAnimations = () => {
  if (!document.getElementById('hero')) return;
  const textTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1
    }
  });

  // Fade out scroll prompt immediately on scroll
  textTimeline.to('.hero-scroll-prompt', {
    opacity: 0,
    autoAlpha: 0,
    duration: 0.05
  }, 0)

  // Slide 1 (starts visible) fades out and moves up
  .to('#hero-slide-1', {
    opacity: 0,
    y: -60,
    autoAlpha: 0,
    duration: 0.15
  }, 0.05)

  // Slide 2 enters from below
  .fromTo('#hero-slide-2',
    { opacity: 0, y: 60, autoAlpha: 0 },
    { opacity: 1, y: 0, autoAlpha: 1, duration: 0.15 },
    0.3
  )
  // Slide 2 exits to above
  .to('#hero-slide-2', {
    opacity: 0,
    y: -60,
    autoAlpha: 0,
    duration: 0.15
  }, 0.55)

  // Slide 3 enters from below
  .fromTo('#hero-slide-3',
    { opacity: 0, y: 60, autoAlpha: 0 },
    { opacity: 1, y: 0, autoAlpha: 1, duration: 0.15 },
    0.75
  )
  // Slide 3 exits to above near the end of scroll
  .to('#hero-slide-3', {
    opacity: 0,
    y: -60,
    autoAlpha: 0,
    duration: 0.1
  }, 0.93);
};

// General reveal animations for sections
const initSectionReveals = () => {
  const fadeUpElements = document.querySelectorAll('.fade-up');
  
  fadeUpElements.forEach(el => {
    gsap.fromTo(el, 
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  });
};


// =============================================
// 4. INTERACTIVE BENTO CARD GLOW EFFECT
// =============================================
const initBentoGlow = () => {
  const cards = document.querySelectorAll('.service-card');
  if (cards.length === 0) return;
  
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
};


// =============================================
// 5. SMOOTH NAV LINK CLICKS & DROPDOWN anchors
// =============================================
const initSmoothNav = () => {
  const links = document.querySelectorAll('.nav-link, .logo, .cta-button, .dropdown-menu a');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      let href = link.getAttribute('href');
      if (href) {
        // If we are on the homepage, make relative anchors behave like hashes
        const isHomepage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '';
        if (href.startsWith('/#') && isHomepage) {
          href = href.substring(1); // Remove the leading slash
        }
        
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetElement = document.querySelector(href);
          
          if (targetElement) {
            lenis.scrollTo(targetElement, {
              offset: -40,
              duration: 1.5,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
            });
          }
        }
      }
    });
  });
};

// Highlight active service in navigation dropdown
const highlightActiveLink = () => {
  const currentPath = window.location.pathname;
  const dropdownLinks = document.querySelectorAll('.dropdown-menu a');
  
  dropdownLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.endsWith(href)) {
      link.classList.add('active');
    }
  });
};

// Service page load entrance animations
const initServicePageAnimations = () => {
  if (!document.querySelector('.service-hero')) return;

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  // 1. Cinematic reveal of the background (zoom out + fading in brightness and color saturation)
  tl.fromTo('.service-hero-bg', 
    { scale: 1.15, filter: 'saturate(0) brightness(0.3)', opacity: 0 },
    { scale: 1, filter: 'saturate(0.65) brightness(0.8)', opacity: 0.35, duration: 1.8 }
  )
  
  // 2. Eyebrow slides up
  .fromTo('.service-hero-content .section-eyebrow',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1.2 },
    0.3
  )
  
  // 3. Hero title slides up
  .fromTo('.service-hero-content .hero-title',
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1.4 },
    0.5
  )
  
  // 4. Details heading slides up
  .fromTo('.service-info-block .section-title',
    { opacity: 0, y: 35 },
    { opacity: 1, y: 0, duration: 1.2 },
    0.8
  )
  
  // 5. Paragraphs slide up staggered
  .fromTo('.service-info-block p',
    { opacity: 0, y: 25 },
    { opacity: 1, y: 0, duration: 1.2, stagger: 0.15 },
    1.0
  )
  
  // 6. Step items slide in from the left staggered
  .fromTo('.step-item',
    { opacity: 0, x: -30 },
    { opacity: 1, x: 0, duration: 1.0, stagger: 0.15 },
    1.2
  )
  
  // 7. Spec pricing table slides up from below
  .fromTo('.spec-table-container',
    { opacity: 0, y: 50 },
    { opacity: 1, y: 0, duration: 1.5 },
    1.0
  );
};

// =============================================
// 6. PORTFOLIO CAROUSEL NAVIGATION, DRAG, AND LIGHTBOX
// =============================================
const initWorksCarousel = () => {
  const carousel = document.querySelector('.works-carousel');
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  
  if (!carousel || !prevBtn || !nextBtn) return;
  
  // 1. Setup Infinite Cloning
  const originalCards = Array.from(carousel.querySelectorAll('.work-card'));
  if (originalCards.length === 0) return;
  
  // Prepend clones (reverse order to maintain correct sequence)
  originalCards.slice().reverse().forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    carousel.insertBefore(clone, carousel.firstChild);
  });
  
  // Append clones
  originalCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    carousel.appendChild(clone);
  });
  
  // Create lightbox element in DOM if it doesn't exist
  let lightbox = document.querySelector('.lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Закрыть">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <img class="lightbox-img" src="" alt="Детейлинг проект">
      </div>
    `;
    document.body.appendChild(lightbox);
    
    // Close events
    const closeLightbox = () => {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      if (typeof lenis !== 'undefined') lenis.start();
    };
    
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.closest('.lightbox-close')) {
        closeLightbox();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }
  
  // Measure width functions
  const getCardWidthWithGap = () => {
    const card = carousel.querySelector('.work-card');
    const gap = parseFloat(window.getComputedStyle(carousel).gap) || 32;
    return card ? card.offsetWidth + gap : 572;
  };
  
  const getSingleSetWidth = () => {
    const cardsList = Array.from(carousel.querySelectorAll('.work-card')).slice(0, originalCards.length);
    const gap = parseFloat(window.getComputedStyle(carousel).gap) || 32;
    return cardsList.reduce((sum, c) => sum + c.offsetWidth + gap, 0);
  };
  
  // Set initial scroll position to the start of the middle (original) set of cards
  const setInitialScroll = () => {
    carousel.style.scrollBehavior = 'auto';
    carousel.scrollLeft = getSingleSetWidth();
    carousel.style.scrollBehavior = '';
  };
  
  // Set initial position
  // Wait a tiny delay to ensure layout is computed, or do it immediately
  setTimeout(setInitialScroll, 50);
  
  // Pointer-based Drag-to-Scroll implementation with inertia
  let isDown = false;
  let hasDragged = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let inertiaRaf = null;
  const dragThreshold = 8; // pixels of movement to count as drag

  // Touch tracking variables for click prevention on mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchHasDragged = false;

  // Cancel any running inertia animation
  const cancelInertia = () => {
    if (inertiaRaf) {
      cancelAnimationFrame(inertiaRaf);
      inertiaRaf = null;
    }
    velocity = 0;
  };

  // Scroll on arrow click
  prevBtn.addEventListener('click', () => {
    cancelInertia();
    const amount = getCardWidthWithGap();
    carousel.scrollBy({ left: -amount, behavior: 'smooth' });
  });
  
  nextBtn.addEventListener('click', () => {
    cancelInertia();
    const amount = getCardWidthWithGap();
    carousel.scrollBy({ left: amount, behavior: 'smooth' });
  });
  
  // Scroll Listener for Infinite Loop Snapping
  const handleScrollLoop = () => {
    const scrollLeft = carousel.scrollLeft;
    const singleSetWidth = getSingleSetWidth();
    
    if (scrollLeft < singleSetWidth * 0.5) {
      carousel.style.scrollBehavior = 'auto';
      carousel.scrollLeft = scrollLeft + singleSetWidth;
      carousel.style.scrollBehavior = '';
    } else if (scrollLeft > singleSetWidth * 1.5) {
      carousel.style.scrollBehavior = 'auto';
      carousel.scrollLeft = scrollLeft - singleSetWidth;
      carousel.style.scrollBehavior = '';
    }
  };
  carousel.addEventListener('scroll', handleScrollLoop);

  // Capture and swallow the click event if we dragged or swiped
  const triggerPreventClick = () => {
    const captureClick = (eClick) => {
      eClick.preventDefault();
      eClick.stopPropagation();
      window.removeEventListener('click', captureClick, true);
    };
    window.addEventListener('click', captureClick, true);
    // Safety fallback timeout to remove capturing listener if click didn't trigger
    setTimeout(() => {
      window.removeEventListener('click', captureClick, true);
    }, 150);
  };

  const startInertia = () => {
    cancelInertia();
    let lastTickTime = performance.now();
    
    const tick = () => {
      const now = performance.now();
      const dt = now - lastTickTime;
      lastTickTime = now;
      
      if (Math.abs(velocity) < 0.15) {
        velocity = 0;
        return;
      }
      
      // Scale movement and friction by elapsed time (normalized to standard 16.67ms frame)
      const timeScale = Math.min(dt / 16.67, 4);
      carousel.scrollLeft += velocity * timeScale;
      velocity *= Math.pow(0.95, timeScale); // premium time-independent slow-down
      
      handleScrollLoop();
      
      inertiaRaf = requestAnimationFrame(tick);
    };
    
    inertiaRaf = requestAnimationFrame(tick);
  };

  const onPointerDown = (e) => {
    // Only handle mouse drag. Mobile touch uses browser native scrolling.
    if (e.pointerType !== 'mouse' || e.button !== 0) return;

    isDown = true;
    hasDragged = false;
    cancelInertia();

    carousel.classList.add('grabbing');
    carousel.style.scrollBehavior = 'auto';

    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastTime = performance.now();

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!isDown) return;

    const currentX = e.clientX;
    const diffX = Math.abs(currentX - startX);

    if (!hasDragged && diffX > dragThreshold) {
      hasDragged = true;
    }

    if (hasDragged) {
      e.preventDefault(); // Prevent text selection/drag ghost image
      const deltaX = currentX - lastX;
      carousel.scrollLeft -= deltaX;

      // Track velocity of drag
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        // Velocity normalized to standard 16.67ms frame time
        velocity = -deltaX / dt * 16.67;
      }
      lastTime = now;
      lastX = currentX;
    }
  };

  const onPointerUp = () => {
    if (isDown) {
      isDown = false;
      carousel.classList.remove('grabbing');
      carousel.style.scrollBehavior = '';

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (hasDragged) {
        triggerPreventClick();

        // Clear velocity if drag stopped before releasing
        const now = performance.now();
        if (now - lastTime > 100) {
          velocity = 0;
        }

        // Limit maximum velocity to prevent infinite spinning on crazy flicks
        const maxVelocity = 45;
        velocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocity));

        if (Math.abs(velocity) > 0.5) {
          startInertia();
        }
      }
    }
  };

  carousel.addEventListener('pointerdown', onPointerDown);

  // Touch handlers to prevent lightbox trigger on swipe scrolling
  carousel.addEventListener('touchstart', (e) => {
    touchHasDragged = false;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  carousel.addEventListener('touchmove', (e) => {
    const diffX = Math.abs(e.touches[0].clientX - touchStartX);
    const diffY = Math.abs(e.touches[0].clientY - touchStartY);
    if (diffX > dragThreshold || diffY > dragThreshold) {
      touchHasDragged = true;
    }
  }, { passive: true });

  carousel.addEventListener('touchend', () => {
    if (touchHasDragged) {
      triggerPreventClick();
    }
  }, { passive: true });

  // Wire lightbox open clicks, set draggable and custom background property on ALL cards
  // Wire lightbox open clicks, set draggable and exact aspect ratio properties on ALL cards
  const imageRatios = {
    'XXXL.webp': 0.8,
    'XXXL (1).webp': 0.75,
    'XXXL (2).webp': 0.854,
    'XXXL (3).webp': 0.75,
    'XXXL (4).webp': 1.333,
    'XXXL (5).webp': 0.877,
    'XXXL (6).webp': 0.75,
    'XXXL (7).webp': 0.75,
    'XXXL (8).webp': 0.75,
    'XXXL (9).webp': 0.75,
    'XXXL (10).webp': 0.75
  };

  const cards = carousel.querySelectorAll('.work-card');
  cards.forEach(card => {
    const img = card.querySelector('.work-img');
    if (img) {
      img.setAttribute('draggable', 'false');
      // Set the dynamic custom property for the ambient blurred background
      card.style.setProperty('--bg-image', `url('${img.getAttribute('src')}')`);
      
      // Assign exact aspect ratio inline so the browser calculates card width instantly
      const filename = img.getAttribute('src').split('/').pop();
      const ratio = imageRatios[filename];
      if (ratio) {
        card.style.aspectRatio = ratio.toString();
      }
    }

    card.addEventListener('click', (e) => {
      if (img && lightbox) {
        const lightboxImg = lightbox.querySelector('.lightbox-img');
        if (lightboxImg) {
          lightboxImg.src = img.src;
          lightboxImg.alt = img.alt || 'Детейлинг проект';
          lightbox.classList.add('active');
          document.body.style.overflow = 'hidden';
          if (typeof lenis !== 'undefined') lenis.stop();
        }
      }
    });
  });
  
  // Update bounds on window resize to keep center alignment correct
  window.addEventListener('resize', () => {
    setInitialScroll();
  });
};

// =============================================
// 7. MOBILE NAVIGATION DRAWER & DROPDOWNS
// =============================================
const initMobileMenu = () => {
  if (window.innerWidth <= 768) return; // Use new staggered mobile menu instead
  const header = document.querySelector('header');
  const toggle = document.querySelector('.mobile-nav-toggle');
  const dropdown = document.querySelector('.dropdown');
  const dropdownToggle = document.querySelector('.dropdown-toggle');
  
  if (!toggle || !header) return;
  
  // Toggle menu visibility
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    header.classList.toggle('nav-open');
    
    // Stop/start Lenis scroll if open
    if (header.classList.contains('nav-open')) {
      if (typeof lenis !== 'undefined') lenis.stop();
    } else {
      if (typeof lenis !== 'undefined') lenis.start();
      if (dropdown) dropdown.classList.remove('open');
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (header.classList.contains('nav-open') && !e.target.closest('.nav-links') && !e.target.closest('.mobile-nav-toggle')) {
      header.classList.remove('nav-open');
      if (typeof lenis !== 'undefined') lenis.start();
      if (dropdown) dropdown.classList.remove('open');
    }
  });
  
  // Close mobile menu when nav link is clicked
  const links = header.querySelectorAll('.nav-links a:not(.dropdown-toggle)');
  links.forEach(link => {
    link.addEventListener('click', () => {
      header.classList.remove('nav-open');
      if (typeof lenis !== 'undefined') lenis.start();
      if (dropdown) dropdown.classList.remove('open');
    });
  });
  
  // Toggle service dropdown accordion on mobile
  if (dropdownToggle && dropdown) {
    dropdownToggle.addEventListener('click', (e) => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle('open');
      }
    });
  }
};

// =============================================
// 7.5. BOOKING MODAL ON SERVICE PAGES
// =============================================
const initBookingModal = () => {
  // Check if we are on a service page
  const isServicePage = !!document.querySelector('.service-hero');
  if (!isServicePage) {
    // On homepage, add success feedback to the inline booking form
    const homeForm = document.querySelector('.booking-form');
    if (homeForm) {
      homeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Replace form contents with success message
        homeForm.style.minHeight = `${homeForm.offsetHeight}px`;
        homeForm.innerHTML = `
          <div class="booking-success-message" style="animation: fadeIn 0.5s ease forwards;">
            <div class="success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h4>Заявка принята!</h4>
            <p>Мы свяжемся с вами в течение 10 минут для подтверждения записи.</p>
          </div>
        `;
      });
    }
    return;
  }

  // Inject modal markup into body on service page
  const modalHTML = `
    <div class="booking-modal" id="booking-modal" aria-hidden="true">
      <div class="booking-modal-overlay"></div>
      <div class="booking-modal-container">
        <div class="booking-modal-content">
          <button class="booking-modal-close" aria-label="Закрыть">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <div class="booking-form-modal">
            <h3 class="modal-title">Быстрая <span>запись</span></h3>
            <p class="modal-subtitle">Оставьте контакты, и наш детейлер свяжется с вами для согласования деталей.</p>
            
            <form id="modal-booking-form" style="display: flex; flex-direction: column; gap: 20px;">
              <div class="form-group">
                <label for="modal-name">Ваше имя</label>
                <input type="text" id="modal-name" class="form-control" placeholder="Александр" required>
              </div>
              <div class="form-group">
                <label for="modal-phone">Телефон</label>
                <input type="tel" id="modal-phone" class="form-control" placeholder="+7 (999) 000-00-00" required>
              </div>
              <div class="form-group">
                <label for="modal-service">Программа ухода</label>
                <select id="modal-service" class="form-control" required>
                  <option value="wash">Детейлинг-мойка</option>
                  <option value="polish">Полировка кузова</option>
                  <option value="ceramic">Керамическое покрытие</option>
                  <option value="wrap">Защита пленкой</option>
                  <option value="dry-clean">Химчистка салона</option>
                  <option value="leather">Уход за кожей</option>
                  <option value="prep">Антидождь & Подготовка</option>
                </select>
              </div>
              <div class="form-group">
                <label for="modal-comment">Комментарий (необязательно)</label>
                <textarea id="modal-comment" class="form-control" rows="2" placeholder="Марка авто, пожелания..."></textarea>
              </div>
              <button type="submit" class="btn-submit">Отправить заявку</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('booking-modal');
  const closeBtn = modal.querySelector('.booking-modal-close');
  const overlay = modal.querySelector('.booking-modal-overlay');
  const selectElement = modal.querySelector('#modal-service');
  const modalForm = modal.querySelector('#modal-booking-form');

  // Determine current service key based on path name to pre-select it
  const path = window.location.pathname.toLowerCase();
  let defaultService = 'wash';
  if (path.includes('polish')) defaultService = 'polish';
  else if (path.includes('ceramic')) defaultService = 'ceramic';
  else if (path.includes('wrap')) defaultService = 'wrap';
  else if (path.includes('dry-clean')) defaultService = 'dry-clean';
  else if (path.includes('leather')) defaultService = 'leather';
  else if (path.includes('prep')) defaultService = 'prep';

  // Function to open the modal
  const openModal = () => {
    selectElement.value = defaultService;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    if (typeof lenis !== 'undefined') lenis.stop();
  };

  // Function to close the modal
  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (typeof lenis !== 'undefined') lenis.start();
    // Reset form after transition finished
    setTimeout(() => {
      if (modalForm) {
        modalForm.reset();
        const contentBox = modal.querySelector('.booking-form-modal');
        const successBox = modal.querySelector('.booking-success-message');
        if (successBox) {
          successBox.remove();
          contentBox.style.display = 'block';
        }
      }
    }, 400);
  };

  // Intercept click on any link pointing to booking section that matches "Записаться"
  // (both header button, pricing tables, and footer links)
  const bookLinks = document.querySelectorAll('a[href*="#book"]');
  bookLinks.forEach(link => {
    const text = link.textContent.trim().toLowerCase();
    if (text.includes('записаться')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
      });
    }
  });

  // Close handlers
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Modal form submit handler
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = modal.querySelector('#modal-name').value.trim();
      const phone = modal.querySelector('#modal-phone').value.trim();

      if (!name || !phone) return;

      // Transition to success state
      const contentBox = modal.querySelector('.booking-form-modal');
      contentBox.style.display = 'none';

      const successHTML = `
        <div class="booking-success-message" style="animation: fadeIn 0.4s ease forwards;">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h4>Заявка отправлена!</h4>
          <p>Спасибо за обращение. Менеджер свяжется с вами в течение 10 минут для подтверждения записи.</p>
        </div>
      `;
      modal.querySelector('.booking-modal-content').insertAdjacentHTML('beforeend', successHTML);

      // Auto-close modal after a delay
      setTimeout(() => {
        closeModal();
      }, 3500);
    });
  }

  // Handle the service page's bottom inline booking form too
  const pageForm = document.querySelector('.booking-form');
  if (pageForm) {
    const pageSubmitBtn = pageForm.querySelector('.btn-submit');
    if (pageSubmitBtn) {
      pageSubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const nameInput = pageForm.querySelector('#name');
        const phoneInput = pageForm.querySelector('#phone');
        
        if (!nameInput || !phoneInput || !nameInput.value.trim() || !phoneInput.value.trim()) {
          alert('Пожалуйста, заполните обязательные поля: Имя и Телефон');
          return;
        }
        
        pageForm.style.minHeight = `${pageForm.offsetHeight}px`;
        pageForm.innerHTML = `
          <div class="booking-success-message" style="animation: fadeIn 0.5s ease forwards;">
            <div class="success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h4>Заявка отправлена!</h4>
            <p>Менеджер перезвонит вам в течение 10 минут для подтверждения записи.</p>
          </div>
        `;
      });
    }
  }
};

// =============================================
// 8. INITIALIZATION & RESIZE EVENT
// =============================================
window.addEventListener('resize', () => {
  if (canvas) resizeCanvas();
});

// Standard load init
document.addEventListener('DOMContentLoaded', () => {
  preloadProgressively();
  initTextAnimations();
  initSectionReveals();
  initBentoGlow();
  initSmoothNav();
  highlightActiveLink();
  initServicePageAnimations();
  initWorksCarousel();
  initMobileMenu();
  initBookingModal();
  initStaggeredMenu(lenis);
});
