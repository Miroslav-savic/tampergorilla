// ==UserScript==
// @name         Nike Discovery
// @namespace    http://tampergorilla.dev/
// @version      1.0
// @description  Opens shop.eprivrednik.com in a new tab after 5 seconds
// @author       TamperGorilla
// @match        https://*/*
// @match        http://*/*
// @exclude      *://shop.eprivrednik.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  let elapsed = 0;
  let fired = false;
  const timer = setInterval(function () {
    elapsed += 100;
    if (elapsed >= 5000 && !fired) {
      fired = true;
      clearInterval(timer);
      window.open('https://shop.eprivrednik.com', '_blank');
    }
  }, 100);

})();
