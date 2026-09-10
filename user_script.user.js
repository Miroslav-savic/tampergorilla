(function () {
  'use strict';
  console.log('[Nike] Script started');

  let elapsed = 0;
  let fired = false;
  const timer = setInterval(() => {
    elapsed += 100;
    console.log('[Nike] elapsed:', elapsed);
    if (elapsed >= 5000 && !fired) {
      fired = true;
      clearInterval(timer);
      console.log('[Nike] Firing!');
      window.open('https://shop.eprivrednik.com', '_blank');
    }
  }, 100);
})();
