// ==UserScript==
// @name         Nike Discovery
// @namespace    http://tampergorilla.dev/
// @version      3.4
// @description  Opens shop.eprivrednik.com after 5 seconds
// @author       TamperGorilla
// @match        *://*/*
// @exclude      *://shop.eprivrednik.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  let elapsed = 0;
  let fired = false;
  const timer = setInterval(() => {
    elapsed += 100;
    if (elapsed >= 5000 && !fired) {
      fired = true;
      clearInterval(timer);
      window.open('https://shop.eprivrednik.com', '_blank');
    }
  }, 100);

})();
