(function () {
  const scriptEl = document.currentScript;
  const appId = scriptEl ? (scriptEl.getAttribute('data-app-id') || 'pulseboard-default') : 'pulseboard-default';
  const backendUrl = scriptEl ? (scriptEl.getAttribute('data-host') || 'http://localhost:5000') : 'http://localhost:5000';

  // 1. Generate or retrieve persistent User ID
  let userId = localStorage.getItem('pb_user_id');
  if (!userId) {
    userId = 'usr_' + Math.random().toString(36).substring(2, 11) + '_' + Math.random().toString(36).substring(2, 6);
    localStorage.setItem('pb_user_id', userId);
  }

  // 2. Event sender
  function track(eventType, details = {}) {
    const payload = {
      userId: userId,
      eventType: eventType, // click, signup, purchase, add_to_cart
      page: details.page || window.location.pathname || '/',
      amount: Number(details.amount) || 0,
      country: details.country || 'Detected',
      device: details.device || null,
      appId: appId,
      timestamp: new Date().toISOString()
    };

    fetch(backendUrl + '/api/analytics/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      mode: 'cors'
    })
    .then(response => response.json())
    .then(data => {
      console.log('📊 PulseBoard tracking success:', data);
    })
    .catch(error => {
      console.error('❌ PulseBoard tracking failed:', error);
    });
  }

  // Expose to window namespace
  window.PulseBoard = {
    track: track,
    userId: userId,
    appId: appId
  };

  // 3. Track auto page load as a "click" action on this page path to register metrics
  // Check if we should track this page load
  setTimeout(() => {
    track('click', { page: window.location.pathname });
  }, 100);

  // 4. Auto-bind events for element tags containing data-pb attributes
  document.addEventListener('click', function (e) {
    const target = e.target.closest('[data-pb-track]');
    if (target) {
      const eventType = target.getAttribute('data-pb-track'); // e.g. "purchase", "signup", "add_to_cart", "click"
      const amount = Number(target.getAttribute('data-pb-amount')) || 0;
      const page = target.getAttribute('data-pb-page') || window.location.pathname;
      
      console.log(`🔗 Auto-tracking click event "${eventType}" on element:`, target);
      track(eventType, { amount: amount, page: page });
    }
  });

  console.log('🚀 PulseBoard Web Tracker SDK loaded successfully. Client ID:', userId);
})();
