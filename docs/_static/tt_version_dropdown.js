// Version dropdown functionality for TT documentation
(function() {
  'use strict';

  // Default versions (fallback if versions.json is not available)
  var defaultVersions = [
    { version: 'v2.10.0', url: 'tens/ttnn/get_started.html', label: 'v2.10.0 (stable)' },
    { version: 'v0.59.0', url: 'tens/ttnn/get_started.html', label: 'v0.59.0' },
    { version: 'v0.58.0', url: 'tens/ttnn/get_started.html', label: 'v0.58.0' },
    { version: 'v0.57.0', url: 'tens/ttnn/get_started.html', label: 'v0.57.0' },
    { version: 'v0.56.0', url: 'tens/ttnn/get_started.html', label: 'v0.56.0' },
    { version: 'v0.55.0', url: 'tens/ttnn/get_started.html', label: 'v0.55.0' },
    { version: 'v0.54.0', url: 'tens/ttnn/get_started.html', label: 'v0.54.0' }
  ];

  function getCurrentVersion() {
    var path = window.location.pathname;
    var match = path.match(/\/tt-metal\/([\w.-]+)\//);
    return match ? match[1] : 'v2.10.0'; // Default to v2.10.0 instead of 'latest'
  }

  function getCurrentSection() {
    var path = window.location.pathname;
    var match = path.match(/\/tt-metal\/[\w.-]+\/([a-z-]+)\//);
    return match ? match[1] : '';
  }

  function getCurrentPage() {
    var path = window.location.pathname;
    var match = path.match(/\/tt-metal\/[\w.-]+\/[a-z-]*\/(.*)/);
    return match ? match[1] : '';
  }

  function buildVersionUrl(version, section, currentPage) {
    // Always redirect to tens/ttnn/get_started.html when switching versions
    return 'tens/ttnn/get_started.html';
  }

  function populateVersionMenu(versions) {
    var menu = document.getElementById('tt-version-menu');
    if (!menu) return;

    var currentVersion = getCurrentVersion();
    var versionButton = document.querySelector('.tt-topnav__version-text');

    // Clear existing menu items
    menu.innerHTML = '';

    // Set default button text first (v2.10.0 (stable))
    if (versionButton) {
      versionButton.textContent = 'v2.10.0 (stable)';
    }

    // Populate menu with version links
    versions.forEach(function(v) {
      var link = document.createElement('a');
      link.className = 'tt-topnav__dropdown-item';
      link.href = v.url; // Use URL directly from versions.json
      link.textContent = v.label;

      // Mark current version and update button text
      if (v.version === currentVersion) {
        link.style.fontWeight = '600';
        link.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';

        // Update the button text to show the current version label
        if (versionButton) {
          versionButton.textContent = v.label;
        }
      }

      menu.appendChild(link);
    });
  }

  function loadVersions() {
    // Try to fetch versions.json from the static directory
    // Try multiple paths as it might be in different locations depending on build config
    var paths = [
      '/_static/versions.json',
      '../_static/versions.json',
      './_static/versions.json'
    ];

    function tryNextPath(index) {
      if (index >= paths.length) {
        // All paths failed, use defaults
        populateVersionMenu(defaultVersions);
        return;
      }

      fetch(paths[index])
        .then(function(response) {
          if (!response.ok) throw new Error('Not found');
          return response.json();
        })
        .then(function(versions) {
          populateVersionMenu(versions);
        })
        .catch(function() {
          // Try next path
          tryNextPath(index + 1);
        });
    }

    tryNextPath(0);
  }

  function setupVersionDropdown() {
    var btn = document.getElementById('tt-version-toggle');
    var menu = document.getElementById('tt-version-menu');

    if (!btn || !menu) return;

    // Toggle dropdown on button click
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      var isVisible = menu.style.display === 'block';
      menu.style.display = isVisible ? 'none' : 'block';
      btn.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.tt-topnav__version-dropdown')) {
        menu.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Prevent menu from closing when clicking inside it
    menu.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadVersions();
      setupVersionDropdown();
    });
  } else {
    // Page already loaded
    loadVersions();
    setupVersionDropdown();
  }
})();

