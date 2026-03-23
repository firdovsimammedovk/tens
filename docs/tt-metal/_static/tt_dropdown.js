// Dropdown menu functionality for all navigation dropdowns
(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    // Find all dropdown containers (both primary and secondary nav)
    const dropdowns = document.querySelectorAll('.tt-topnav__dropdown, .tt-topnav__dropdown--primary');

    dropdowns.forEach(function(dropdown) {
      // Try both trigger selectors (for primary and secondary nav)
      const trigger = dropdown.querySelector('.tt-topnav__sublink--dropdown, .tt-topnav__link--dropdown');
      const menu = dropdown.querySelector('.tt-topnav__dropdown-menu, .tt-topnav__dropdown-menu--primary');

      if (!trigger || !menu) return;

      // Add hover handlers for additional reliability
      dropdown.addEventListener('mouseenter', function() {
        menu.style.visibility = 'visible';
        menu.style.opacity = '1';
        menu.style.pointerEvents = 'auto';
      });

      dropdown.addEventListener('mouseleave', function() {
        menu.style.visibility = 'hidden';
        menu.style.opacity = '0';
        menu.style.pointerEvents = 'none';
      });

      // Optional: Click to toggle on mobile
      trigger.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          const isVisible = menu.style.visibility === 'visible';
          menu.style.visibility = isVisible ? 'hidden' : 'visible';
          menu.style.opacity = isVisible ? '0' : '1';
          menu.style.pointerEvents = isVisible ? 'none' : 'auto';
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.tt-topnav__dropdown') && !e.target.closest('.tt-topnav__dropdown--primary')) {
        document.querySelectorAll('.tt-topnav__dropdown-menu, .tt-topnav__dropdown-menu--primary').forEach(function(menu) {
          menu.style.visibility = 'hidden';
          menu.style.opacity = '0';
          menu.style.pointerEvents = 'none';
        });
      }
    });
  });
})();
