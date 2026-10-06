// ==UserScript==
// @name         Google Chat — Copy message links
// @namespace    local.google-chat.copy-links
// @version      1.5.0
// @description  Adds a clipboard button at the end of messages containing links.
// @match        https://chat.google.com/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  const buttonClass = 'vm-chat-copy-links';
  const excluded = '[contenteditable="true"], [role="textbox"]';
  function showIcon(button) {
    const doc = button.ownerDocument;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = doc.createElementNS(ns, 'svg');
    for (const [name, value] of Object.entries({width:'16', height:'16', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'1.8', 'aria-hidden':'true'})) svg.setAttribute(name, value);
    const rect = doc.createElementNS(ns, 'rect');
    for (const [name, value] of Object.entries({x:'9', y:'9', width:'12', height:'12', rx:'2'})) rect.setAttribute(name, value);
    const path = doc.createElementNS(ns, 'path');
    path.setAttribute('d', 'M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4');
    svg.append(rect, path);
    button.replaceChildren(svg);
  }

  const style = document.createElement('style');
  style.textContent = `
    button.${buttonClass} {
      display:inline-flex !important; align-items:center !important;
      justify-content:center !important; vertical-align:middle !important;
      margin:0 0 0 8px !important; padding:4px !important;
      width:26px !important; height:26px !important;
      border:1px solid #9aa0a6 !important; border-radius:5px !important;
      background:#fff !important; color:#3c4043 !important;
      opacity:1 !important; visibility:visible !important;
      cursor:pointer !important; line-height:1 !important;
      position:relative !important; flex-shrink:0 !important;
    }
    button.${buttonClass}:hover { background:#e8f0fe !important; }
    button.${buttonClass}:focus-visible { outline:2px solid #4285f4 !important; }
    button.${buttonClass} svg { display:block !important; width:16px !important; height:16px !important; }
  `;
  (document.head || document.documentElement).append(style);
  const diagnostic = document.createElement('div');
  diagnostic.id = 'vm-chat-link-diagnostic';
  diagnostic.style.cssText = 'position:fixed!important;top:60px!important;right:12px!important;z-index:2147483647!important;display:block!important;visibility:visible!important;opacity:1!important;background:#fff3cd!important;color:#222!important;padding:9px 12px!important;border:2px solid #d39e00!important;border-radius:6px!important;font:13px sans-serif!important;';
  diagnostic.textContent = 'Copy links v1.5: running';
  document.documentElement.append(diagnostic);

  function urlFor(anchor) {
    try {
      const url = new URL(anchor.getAttribute('href'), location.href);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      // Google sometimes routes message links through its redirect page.
      if (/(^|\.)google\.com$/.test(url.hostname) && url.pathname === '/url') {
        const destination = url.searchParams.get('q') || url.searchParams.get('url');
        if (destination && /^https?:\/\//i.test(destination)) return destination;
      }
      return url.href;
    } catch { return null; }
  }

  function messageFor(anchor) {
    return anchor.closest('div[jsname="bgckF"], div.DTp27d');
  }

  function linksFor(message) {
    return [...new Set([...message.querySelectorAll('a[href]')]
      .filter(a => !a.closest(excluded) && messageFor(a) === message)
      .map(urlFor).filter(Boolean))];
  }

  function scan(doc) {
    const messages = new Set();
    for (const anchor of doc.querySelectorAll('div[jsname="bgckF"] a[href], div.DTp27d a[href]')) {
      if (anchor.closest(excluded)) continue;
      const message = messageFor(anchor);
      if (message && urlFor(anchor)) messages.add(message);
    }
    for (const button of doc.querySelectorAll(`.${buttonClass}`)) {
      if (!messages.has(button.parentElement)) button.remove();
    }
    for (const message of messages) {
      if ([...message.children].some(el => el.classList.contains(buttonClass))) continue;
      if (!linksFor(message).length) continue;
      const button = (doc.ownerDocument || doc).createElement('button');
      button.type = 'button';
      button.className = buttonClass;
      button.title = 'Copy message link(s)';
      button.setAttribute('aria-label', button.title);
      showIcon(button);
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const links = linksFor(message);
        if (!links.length) return;
        try {
          GM_setClipboard(links.join('\n'), 'text/plain');
          button.textContent = '✓';
          button.title = 'Copied!';
        } catch (error) {
          button.textContent = '!';
          button.title = 'Copy failed';
          console.error('Google Chat link copy failed:', error);
        }
        setTimeout(() => {
          showIcon(button);
          button.title = 'Copy message link(s)';
        }, 1400);
      });
      message.append(button);
    }
    return { blocks: doc.querySelectorAll('div[jsname="bgckF"], div.DTp27d').length,
      messages: messages.size, buttons: doc.querySelectorAll('.' + buttonClass).length };
  }

  const observed = new WeakSet();
  let timer;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(scanAll, 150);
  }
  function scanAll() {
    const totals = { blocks:0, messages:0, buttons:0, frames:0, blocked:0, shadows:0 };
    const visited = new Set();
    function visit(doc) {
      if (!doc || visited.has(doc)) return;
      visited.add(doc);
      if (!observed.has(doc)) {
        observed.add(doc);
        if (doc !== document) {
          const frameStyle = (doc.ownerDocument || doc).createElement('style');
          frameStyle.textContent = style.textContent;
          (doc.head || doc.documentElement || doc).append(frameStyle);
        }
        new MutationObserver(schedule).observe(doc.documentElement || doc, {
          childList:true, subtree:true, attributes:true, attributeFilter:['href','jsname']
        });
      }
      const result = scan(doc);
      for (const key of ['blocks','messages','buttons']) totals[key] += result[key];
      for (const element of doc.querySelectorAll('*')) {
        if (element.shadowRoot) { totals.shadows++; visit(element.shadowRoot); }
      }
      for (const frame of doc.querySelectorAll('iframe, frame')) {
        totals.frames++;
        try {
          const child = frame.contentDocument;
          if (child) visit(child); else totals.blocked++;
        } catch { totals.blocked++; }
      }
    }
    visit(document);
    const status = `Copy links v1.5: ${totals.blocks} text blocks, ${totals.messages} link messages, ${totals.buttons} buttons; ${totals.frames} frames (${totals.blocked} inaccessible), ${totals.shadows} shadow roots`;
    if (diagnostic.textContent !== status) diagnostic.textContent = status;
  }
  scanAll();
  // Detect frame navigation, which need not mutate the parent document.
  setInterval(scanAll, 2000);
})();

