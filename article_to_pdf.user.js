// ==UserScript==
// @name         Article to PDF
// @namespace    https://github.com/Miroslav-savic/tampergorilla
// @version      1.0.0
// @description  Extract clean article content and export as PDF
// @author       TamperGorilla
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ── Inject floating button ────────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById('tg-pdf-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'tg-pdf-btn';
    btn.title = 'Save article as PDF';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg><span>PDF</span>`;

    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '9px 16px',
      background: '#C0392B',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
      fontFamily: 'system-ui, sans-serif',
      cursor: 'pointer',
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      transition: 'background .12s',
    });

    btn.addEventListener('mouseenter', () => { btn.style.background = '#E74C3C'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#C0392B'; });
    btn.addEventListener('click', exportPdf);

    document.body.appendChild(btn);
  }

  // ── Extract article content ───────────────────────────────────────────────
  function extractArticle() {
    // Selectors for known content containers, best-first
    const CONTENT_SELECTORS = [
      'article',
      '[role="article"]',
      'main article',
      '.article-body',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.story-body',
      '.content-body',
      '.single-content',
      '[itemprop="articleBody"]',
      'main',
      '[role="main"]',
      '.container article',
    ];

    // Tags/classes to strip from extracted content
    const STRIP_SELECTORS = [
      'script', 'style', 'noscript', 'iframe', 'object', 'embed',
      'nav', 'header', 'footer', 'aside',
      '.ad', '.ads', '.advertisement', '.promo',
      '.social-share', '.share-buttons', '.related-posts',
      '.newsletter', '.subscription', '.paywall',
      '[data-ad]', '[class*="advert"]', '[class*="banner"]',
      '.comments', '#comments',
    ];

    let contentEl = null;

    for (const sel of CONTENT_SELECTORS) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 200) {
        contentEl = el;
        break;
      }
    }

    // Fallback: find element with most text
    if (!contentEl) {
      let best = null, bestLen = 0;
      document.querySelectorAll('div, section').forEach(el => {
        const len = el.innerText.trim().length;
        if (len > bestLen && len < 50000) {
          bestLen = len;
          best = el;
        }
      });
      contentEl = best || document.body;
    }

    // Clone to avoid modifying the live page
    const clone = contentEl.cloneNode(true);

    // Strip noise elements
    STRIP_SELECTORS.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Extract images (keep only those with reasonable size)
    clone.querySelectorAll('img').forEach(img => {
      if (!img.src || img.src.startsWith('data:')) {
        img.remove();
      } else {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.removeAttribute('loading');
      }
    });

    // Strip all inline onclick / event handlers
    clone.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
      });
      el.removeAttribute('id');
    });

    return {
      title:   document.title.replace(/\s*[|\-–—].*$/, '').trim() || document.location.hostname,
      byline:  getMeta('author') || getEl('[rel="author"]') || getEl('.author') || getEl('[class*="byline"]') || '',
      date:    getMeta('date') || getEl('time') || getEl('[class*="date"]') || getEl('[class*="time"]') || '',
      domain:  document.location.hostname,
      html:    clone.innerHTML,
    };
  }

  function getMeta(name) {
    return (
      document.querySelector(`meta[name="${name}"]`)?.content ||
      document.querySelector(`meta[property="article:${name}"]`)?.content ||
      document.querySelector(`meta[property="og:${name}"]`)?.content ||
      ''
    ).trim();
  }

  function getEl(sel) {
    return document.querySelector(sel)?.innerText?.trim() || '';
  }

  // ── Build print window and trigger PDF ────────────────────────────────────
  function exportPdf() {
    const art = extractArticle();

    const metaLine = [art.byline, art.date, art.domain].filter(Boolean).join(' · ');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escHtml(art.title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4;
    margin: 20mm 18mm 22mm;
  }

  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #111;
    background: #fff;
    max-width: 680px;
    margin: 0 auto;
    padding: 0 0 40px;
  }

  /* ── Header ── */
  .tg-header {
    border-bottom: 2px solid #111;
    padding-bottom: 14px;
    margin-bottom: 22px;
  }
  .tg-domain {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: #C0392B;
    margin-bottom: 6px;
  }
  .tg-title {
    font-size: 22pt;
    font-weight: 700;
    line-height: 1.2;
    color: #0a0a0a;
    margin-bottom: 8px;
  }
  .tg-meta {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 8.5pt;
    color: #555;
  }

  /* ── Content ── */
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 700;
    line-height: 1.25;
    margin: 1.4em 0 .45em;
    color: #0a0a0a;
    page-break-after: avoid;
  }
  h1 { font-size: 16pt; }
  h2 { font-size: 13pt; }
  h3 { font-size: 11.5pt; }
  h4, h5, h6 { font-size: 10.5pt; }

  p { margin: 0 0 .85em; orphans: 3; widows: 3; }

  a { color: #111; text-decoration: underline; word-break: break-all; }

  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
    page-break-inside: avoid;
  }

  figure { margin: 1.2em 0; page-break-inside: avoid; }
  figcaption {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 8.5pt;
    color: #666;
    text-align: center;
    margin-top: .3em;
  }

  blockquote {
    border-left: 3px solid #C0392B;
    margin: 1em 0;
    padding: .4em 0 .4em 1em;
    color: #333;
    font-style: italic;
  }

  pre, code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    background: #f5f5f5;
    border-radius: 3px;
  }
  pre { padding: .7em 1em; overflow: auto; margin: .8em 0; white-space: pre-wrap; }
  code { padding: .1em .3em; }

  ul, ol { margin: 0 0 .85em 1.4em; }
  li { margin-bottom: .2em; }

  table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 9.5pt; }
  th, td { border: 1px solid #ccc; padding: .35em .6em; text-align: left; }
  th { background: #f2f2f2; font-weight: 700; }

  hr { border: none; border-top: 1px solid #ddd; margin: 1.4em 0; }

  @media print {
    body { font-size: 10.5pt; }
    a[href]::after { content: " (" attr(href) ")"; font-size: 8pt; color: #666; }
    a[href^="#"]::after, a[href^="javascript"]::after { content: ""; }
  }
</style>
</head>
<body>
<div class="tg-header">
  <div class="tg-domain">${escHtml(art.domain)}</div>
  <h1 class="tg-title">${escHtml(art.title)}</h1>
  ${metaLine ? `<div class="tg-meta">${escHtml(metaLine)}</div>` : ''}
</div>
<div class="tg-content">
${art.html}
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('PDF: pop-up blocker is on. Allow pop-ups for this site and try again.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();

    // Wait for images to load, then print
    win.addEventListener('load', () => {
      setTimeout(() => {
        win.print();
        // Close after print dialog (slight delay to allow cancel too)
        win.addEventListener('afterprint', () => win.close());
      }, 400);
    });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Mount ────────────────────────────────────────────────────────────────
  if (document.body) {
    injectButton();
  } else {
    document.addEventListener('DOMContentLoaded', injectButton);
  }

})();
