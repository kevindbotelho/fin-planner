// Dashboard controllers, scroll reveal, and counter animations for GlassFinance DS

document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================
     1. Scroll Reveal (Intersection Observer)
     ========================================== */
  const scrollItems = document.querySelectorAll('.scroll-item');
  
  if (scrollItems.length > 0) {
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-reveal-active');
          // Once animated, we can stop observing it
          scrollObserver.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px" // triggers slightly before entering viewport
    });

    scrollItems.forEach(item => {
      scrollObserver.observe(item);
    });
  }

  /* ==========================================
     2. Dashboard Loop & Counter Animations
     ========================================== */
  const dashboardContainer = document.getElementById('dashboard-showcase');
  const counters = document.querySelectorAll('[data-counter-target]');
  const LOOP_DURATION = 6000; // matching CSS animation duration
  let counterInterval;

  // Format numbers to BRL currency or default layout
  const formatNumber = (value, type, prefix = '', suffix = '') => {
    if (type === 'currency') {
      return prefix + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
    }
    if (type === 'percentage') {
      return prefix + value.toFixed(1).replace('.', ',') + '%' + suffix;
    }
    return prefix + Math.ceil(value).toString() + suffix;
  };

  const runCounterAnimation = () => {
    counters.forEach(counter => {
      const target = parseFloat(counter.getAttribute('data-counter-target'));
      const format = counter.getAttribute('data-counter-format') || 'number'; // number, currency, percentage
      const prefix = counter.getAttribute('data-counter-prefix') || '';
      const suffix = counter.getAttribute('data-counter-suffix') || '';

      let current = 0;
      const duration = 1500; // animation duration in ms
      const intervalTime = 20; // step intervals in ms
      const steps = duration / intervalTime;
      const increment = target / steps;

      counter.innerText = formatNumber(0, format, prefix, suffix);

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        counter.innerText = formatNumber(current, format, prefix, suffix);
      }, intervalTime);
    });
  };

  if (dashboardContainer) {
    const dashboardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          dashboardContainer.classList.add('in-view');
          runCounterAnimation();
          
          if (!counterInterval) {
            counterInterval = setInterval(() => {
              if (dashboardContainer.classList.contains('in-view')) {
                runCounterAnimation();
              }
            }, LOOP_DURATION);
          }
        } else {
          dashboardContainer.classList.remove('in-view');
        }
      });
    }, { threshold: 0.15 });

    dashboardObserver.observe(dashboardContainer);
  }

  // Global replay helper (bound to window so it can be called by buttons)
  window.replayGlobalDashboardAnimations = function() {
    if (dashboardContainer) {
      dashboardContainer.classList.remove('in-view');
      // Force Reflow
      void dashboardContainer.offsetWidth;
      dashboardContainer.classList.add('in-view');
      runCounterAnimation();
    }
  };

  /* ==========================================
     3. Lucide Icons Initialization
     ========================================== */
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Re-run Lucide icons when theme changes (in case icons need color swaps)
  window.addEventListener('themeChanged', () => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });
});
