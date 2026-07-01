// Theme Toggle controller for GlassFinance DS (Light & Dark modes)

(function () {
  // Check local storage or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
  
  function updateToggleIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    toggleButtons.forEach(btn => {
      // Find iconify-icon or general icon inside the button and swap its attributes
      const iconEl = btn.querySelector('iconify-icon') || btn.querySelector('i');
      if (iconEl) {
        if (isDark) {
          // If it's dark mode, show sun icon
          if (iconEl.tagName.toLowerCase() === 'iconify-icon') {
            iconEl.setAttribute('icon', 'lucide:sun');
          } else {
            iconEl.className = 'lucide-sun w-5 h-5';
            if (window.lucide) window.lucide.createIcons();
          }
        } else {
          // If it's light mode, show moon icon
          if (iconEl.tagName.toLowerCase() === 'iconify-icon') {
            iconEl.setAttribute('icon', 'lucide:moon');
          } else {
            iconEl.className = 'lucide-moon w-5 h-5';
            if (window.lucide) window.lucide.createIcons();
          }
        }
      }
    });
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    updateToggleIcons();
    
    // Disparar evento customizado de troca de tema para recriar gráficos se necessário
    const event = new CustomEvent('themeChanged', { detail: { theme: isDark ? 'light' : 'dark' } });
    window.dispatchEvent(event);
  }

  // Bind click event to all theme toggle buttons
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });

  // Initial icon state setup
  updateToggleIcons();
  
  // Listen for storage changes in other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      if (e.newValue === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      updateToggleIcons();
    }
  });
});
