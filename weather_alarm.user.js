// ==UserScript==
// @name         Vremenski Alarm
// @namespace    http://tampergorilla.dev/
// @version      1.0.0
// @description  Prati promjene vremena i šalje obavijesti za značajne događaje
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ─── Constants ───────────────────────────────────────────────────────────

    var CHECK_INTERVAL_MS  = 1 * 60 * 1000;  // 1 minute
    var TEMP_THRESHOLD     = 5;               // °C
    var WIND_THRESHOLD     = 50;              // km/h
    var PRECIP_THRESHOLD   = 0.5;            // mm

    // ─── Weathercode helpers ─────────────────────────────────────────────────

    function getEmoji(code) {
        if (code === 0)                        return '☀️';
        if (code >= 1  && code <= 3)           return '⛅';
        if (code >= 45 && code <= 48)          return '🌫️';
        if (code >= 51 && code <= 67)          return '🌧️';
        if (code >= 71 && code <= 77)          return '❄️';
        if (code >= 80 && code <= 82)          return '🌦️';
        if (code >= 95 && code <= 99)          return '⛈️';
        return '🌡️';
    }

    function getLabel(code) {
        if (code === 0)                        return 'Vedro';
        if (code >= 1  && code <= 3)           return 'Oblačno';
        if (code >= 45 && code <= 48)          return 'Magla';
        if (code >= 51 && code <= 67)          return 'Kiša';
        if (code >= 71 && code <= 77)          return 'Snijeg';
        if (code >= 80 && code <= 82)          return 'Pljuskovi';
        if (code >= 95 && code <= 99)          return 'Grmljavina';
        return 'Nepoznato';
    }

    function isThunderstorm(code) {
        return code >= 95 && code <= 99;
    }

    // ─── API fetch ───────────────────────────────────────────────────────────

    function fetchWeather(lat, lon, callback) {
        var url =
            'https://api.open-meteo.com/v1/forecast' +
            '?latitude='  + lat +
            '&longitude=' + lon +
            '&current=temperature_2m,windspeed_10m,precipitation,weathercode' +
            '&wind_speed_unit=kmh';

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function (response) {
                try {
                    var json    = JSON.parse(response.responseText);
                    var current = json.current;
                    callback(null, {
                        temperature:  current.temperature_2m,
                        windspeed:    current.windspeed_10m,
                        precipitation: current.precipitation,
                        weathercode:  current.weathercode,
                        timestamp:    Date.now()
                    });
                } catch (e) {
                    callback(e, null);
                }
            },
            onerror: function (err) {
                callback(err, null);
            }
        });
    }

    // ─── Notification logic ───────────────────────────────────────────────────

    function openForecast(lat, lon) {
        var url = 'https://www.windy.com/?rain,' + lat.toFixed(4) + ',' + lon.toFixed(4) + ',10';
        GM_openInTab(url, { active: true });
    }

    function checkAndNotify(newData, oldData, lat, lon) {
        if (!oldData) return; // First run — no baseline to compare against.

        var triggered = false;

        // Temperature shift
        var tempDiff = newData.temperature - oldData.temperature;
        if (Math.abs(tempDiff) > TEMP_THRESHOLD) {
            var dir = tempDiff > 0 ? 'porasla' : 'pala';
            GM_notification({
                title: 'Vremenski Alarm — Temperatura',
                text: 'Temperatura je ' + dir + ' za ' +
                      Math.abs(tempDiff).toFixed(1) + '°C ' +
                      '(sada ' + newData.temperature + '°C)',
                timeout: 8000
            });
            triggered = true;
        }

        // Wind crossing threshold
        if (oldData.windspeed <= WIND_THRESHOLD && newData.windspeed > WIND_THRESHOLD) {
            GM_notification({
                title: 'Vremenski Alarm — Jak vjetar',
                text: 'Brzina vjetra: ' + newData.windspeed + ' km/h',
                timeout: 8000
            });
            triggered = true;
        }

        // Precipitation onset
        if (oldData.precipitation <= 0 && newData.precipitation > PRECIP_THRESHOLD) {
            GM_notification({
                title: 'Vremenski Alarm — Počela kiša',
                text: 'Padavine: ' + newData.precipitation + ' mm',
                timeout: 8000
            });
            triggered = true;
        }

        // Thunderstorm onset
        if (!isThunderstorm(oldData.weathercode) && isThunderstorm(newData.weathercode)) {
            GM_notification({
                title: 'Vremenski Alarm — ⛈️ Grmljavinska oluja!',
                text: 'Upozorenje: Oluja s grmljavinom je u toku.',
                timeout: 12000
            });
            triggered = true;
        }

        if (triggered) {
            openForecast(lat, lon);
        }
    }

    // ─── Widget ───────────────────────────────────────────────────────────────

    var widget   = null;
    var expanded = false;

    function injectStyles() {
        var s = document.createElement('style');
        s.textContent = [
            '#va-widget {',
            '  position: fixed;',
            '  bottom: 18px;',
            '  right: 18px;',
            '  z-index: 2147483647;',
            '  background: rgba(14, 14, 18, 0.93);',
            '  color: #e8e8ec;',
            '  border-radius: 999px;',
            '  padding: 6px 13px;',
            '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;',
            '  font-size: 13px;',
            '  line-height: 1.4;',
            '  cursor: pointer;',
            '  box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07);',
            '  backdrop-filter: blur(8px);',
            '  -webkit-backdrop-filter: blur(8px);',
            '  transition: border-radius 0.18s ease, padding 0.18s ease;',
            '  user-select: none;',
            '  -webkit-user-select: none;',
            '  max-width: 240px;',
            '}',
            '#va-widget.va-expanded {',
            '  border-radius: 14px;',
            '  padding: 10px 13px;',
            '}',
            '#va-pill {',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 5px;',
            '  white-space: nowrap;',
            '  font-weight: 500;',
            '  letter-spacing: 0.01em;',
            '}',
            '#va-pill .va-caret {',
            '  margin-left: auto;',
            '  font-size: 9px;',
            '  opacity: 0.45;',
            '  padding-left: 4px;',
            '}',
            '#va-details {',
            '  margin-top: 8px;',
            '  padding-top: 8px;',
            '  border-top: 1px solid rgba(255,255,255,0.09);',
            '  display: flex;',
            '  flex-direction: column;',
            '  gap: 4px;',
            '}',
            '#va-details .va-row {',
            '  display: flex;',
            '  justify-content: space-between;',
            '  align-items: baseline;',
            '  gap: 10px;',
            '  font-size: 12px;',
            '}',
            '#va-details .va-row .va-label {',
            '  color: rgba(255,255,255,0.42);',
            '  font-size: 11px;',
            '  letter-spacing: 0.03em;',
            '}',
            '#va-details .va-row .va-value {',
            '  color: #e8e8ec;',
            '  font-weight: 500;',
            '  font-variant-numeric: tabular-nums;',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function createWidget() {
        injectStyles();

        widget = document.createElement('div');
        widget.id = 'va-widget';
        widget.setAttribute('role', 'status');
        widget.setAttribute('aria-label', 'Vremenski Alarm');
        widget.setAttribute('tabindex', '0');

        widget.innerHTML =
            '<div id="va-pill">' +
              '<span id="va-emoji">⏳</span>' +
              '<span id="va-temp">Učitavanje…</span>' +
              '<span class="va-caret" id="va-caret">▼</span>' +
            '</div>' +
            '<div id="va-details" hidden>' +
              '<div class="va-row"><span class="va-label">Vjetar</span><span class="va-value" id="va-wind">—</span></div>' +
              '<div class="va-row"><span class="va-label">Padavine</span><span class="va-value" id="va-precip">—</span></div>' +
              '<div class="va-row"><span class="va-label">Stanje</span><span class="va-value" id="va-cond">—</span></div>' +
              '<div class="va-row"><span class="va-label">Provjera</span><span class="va-value" id="va-time">—</span></div>' +
            '</div>';

        widget.addEventListener('click', toggleExpand);
        widget.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpand();
            }
        });

        document.body.appendChild(widget);
    }

    function toggleExpand() {
        expanded = !expanded;
        var details = document.getElementById('va-details');
        var caret   = document.getElementById('va-caret');
        if (expanded) {
            details.removeAttribute('hidden');
            widget.classList.add('va-expanded');
            if (caret) caret.textContent = '▲';
        } else {
            details.setAttribute('hidden', '');
            widget.classList.remove('va-expanded');
            if (caret) caret.textContent = '▼';
        }
    }

    function updateWidget(data) {
        if (!widget) return;

        var emoji = getEmoji(data.weathercode);
        var label = getLabel(data.weathercode);
        var time  = new Date(data.timestamp);
        var hhmm  = time.getHours().toString().padStart(2, '0') + ':' +
                    time.getMinutes().toString().padStart(2, '0');

        var elEmoji  = document.getElementById('va-emoji');
        var elTemp   = document.getElementById('va-temp');
        var elWind   = document.getElementById('va-wind');
        var elPrecip = document.getElementById('va-precip');
        var elCond   = document.getElementById('va-cond');
        var elTime   = document.getElementById('va-time');

        if (elEmoji)  elEmoji.textContent  = emoji;
        if (elTemp)   elTemp.textContent   = data.temperature + '°C';
        if (elWind)   elWind.textContent   = data.windspeed + ' km/h';
        if (elPrecip) elPrecip.textContent = data.precipitation + ' mm';
        if (elCond)   elCond.textContent   = label;
        if (elTime)   elTime.textContent   = hhmm;
    }

    function setWidgetError(msg) {
        var elTemp = document.getElementById('va-temp');
        if (elTemp) elTemp.textContent = msg || 'Greška';
    }

    // ─── Core flow ────────────────────────────────────────────────────────────

    function proceed(lat, lon) {
        var now       = Date.now();
        var lastCheck = GM_getValue('va_last_check', 0);
        var lastData  = GM_getValue('va_last_data',  null);

        // Always render last known data immediately — keeps widget useful between checks.
        if (lastData) {
            updateWidget(lastData);
        }

        // Not yet time for a fresh check.
        if (now - lastCheck < CHECK_INTERVAL_MS) {
            return;
        }

        fetchWeather(lat, lon, function (err, data) {
            if (err || !data) {
                console.warn('[Vremenski Alarm] API error:', err);
                if (!lastData) setWidgetError('Greška API');
                return;
            }

            var previous = GM_getValue('va_last_data', null);
            checkAndNotify(data, previous, lat, lon);

            GM_setValue('va_last_data',  data);
            GM_setValue('va_last_check', now);

            updateWidget(data);
        });
    }

    function init() {
        // Only inject the widget once — guard against multi-frame pages.
        if (document.getElementById('va-widget')) return;

        createWidget();

        var cachedLat = GM_getValue('va_lat', null);
        var cachedLon = GM_getValue('va_lon', null);

        if (cachedLat !== null && cachedLon !== null) {
            proceed(cachedLat, cachedLon);
            return;
        }

        if (!navigator.geolocation) {
            console.warn('[Vremenski Alarm] Geolocation nije podržana.');
            setWidgetError('Nema GPS');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                var lat = pos.coords.latitude;
                var lon = pos.coords.longitude;
                GM_setValue('va_lat', lat);
                GM_setValue('va_lon', lon);
                proceed(lat, lon);
            },
            function (err) {
                console.warn('[Vremenski Alarm] Geolokacija odbijena:', err.message);
                setWidgetError('Nema lokacije');
            },
            { timeout: 10000, maximumAge: 60000 }
        );
    }

    // ─── Search intercept ─────────────────────────────────────────────────────
    // Kada korisnik ukuca "vrijeme" (ili varijante) u pretraživač i pritisne
    // Enter, browser otvori google.com/search?q=vrijeme — hvatamo taj query
    // i preusmjeravamo na Windy.com sa keširanim koordinatama.

    var WEATHER_KEYWORDS = ['vrijeme', 'prognoza', 'weather', 'forecast', 'vreme'];

    function getSearchQuery() {
        var host   = location.hostname;
        var params = new URLSearchParams(location.search);

        if (host === 'www.google.com' || host === 'google.com') return params.get('q');
        if (host === 'www.bing.com'   || host === 'bing.com')   return params.get('q');
        if (host === 'duckduckgo.com')                          return params.get('q');
        if (host === 'search.yahoo.com')                        return params.get('p');
        return null;
    }

    function checkSearchIntercept() {
        var query = getSearchQuery();
        if (!query) return false;

        var q = query.trim().toLowerCase();
        var isWeatherSearch = WEATHER_KEYWORDS.some(function (kw) { return q === kw; });
        if (!isWeatherSearch) return false;

        var lat = GM_getValue('va_lat', null);
        var lon = GM_getValue('va_lon', null);

        var url = (lat !== null && lon !== null)
            ? 'https://www.windy.com/?rain,' + lat.toFixed(4) + ',' + lon.toFixed(4) + ',10'
            : 'https://www.windy.com/';

        // Direktna navigacija — pouzdanija od GM_openInTab na search stranicama
        window.location.href = url;
        return true;
    }

    // ─── Entry point ──────────────────────────────────────────────────────────

    if (!checkSearchIntercept()) {
        // document-idle fires after DOMContentLoaded; body is guaranteed present.
        init();
    }

})();
