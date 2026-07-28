/*
 * animations.js -- Scroll-triggered reveal animations
 * Adds .animate--visible when elements with .animate enter the viewport.
 * Respects prefers-reduced-motion.
 */

(function () {
  const ANIMATION_CLASS = 'animate';
  const VISIBLE_CLASS = 'animate--visible';

  function init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll(`.${ANIMATION_CLASS}`).forEach((el) => {
        el.classList.add(VISIBLE_CLASS);
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(VISIBLE_CLASS);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1,
      }
    );

    document.querySelectorAll(`.${ANIMATION_CLASS}`).forEach((el) => {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
