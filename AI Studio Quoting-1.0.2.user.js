// ==UserScript==
// @name         AI Studio Quoting
// @namespace    https://tampermonkey.net/
// @icon         https://www.gstatic.com/aistudio/ai_studio_favicon_2_64x64.png
// @version      1.0.2
// @description  Adds ChatGPT-like quote selection and centered quote chip UX to Google AI Studio.
// @match        https://aistudio.google.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SELECTORS = {
    chatTurn: 'ms-chat-turn, ms-bidi-turn',
    footer: 'footer',
    promptBox: 'footer ms-prompt-box',
    textarea: 'footer textarea, textarea[formcontrolname="promptText"], textarea.textarea',
    runButton:
      'footer ms-run-button button, footer ms-run-button, ms-run-button button, ms-run-button',
  };

  const IDS = {
    floatingButton: 'tm-quote-floating-button',
    chipHost: 'tm-quote-chip-host',
    chip: 'tm-quote-chip',
    style: 'tm-quote-style',
  };

  const ZERO_WIDTH = '\u200B';

  const state = {
    currentQuote: null,
    selectionData: null,
    suppressNextInputCleanup: false,
  };

  let floatingButton = null;
  let chipHostEl = null;
  let chipEl = null;
  let chipTextEl = null;
  let observer = null;

  function injectStyles() {
    if (document.getElementById(IDS.style)) return;

    const style = document.createElement('style');
    style.id = IDS.style;
    style.textContent = `
      #${IDS.floatingButton} {
        position: fixed;
        z-index: 2147483647;
        display: none;
        padding: 6px 10px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 999px;
        background: #202123;
        color: #fff;
        font: 500 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        cursor: pointer;
        box-shadow: 0 8px 30px rgba(0,0,0,0.25);
        user-select: none;
        -webkit-user-select: none;
      }

      #${IDS.floatingButton}:hover {
        background: #2b2d31;
      }

      #${IDS.chipHost} {
        display: none;
        width: 100%;
        box-sizing: border-box;
        margin: 0 0 8px 0;
        padding: 0 12px;
        justify-content: center;
        align-items: center;
      }

      #${IDS.chipHost}[data-visible="true"] {
        display: flex;
      }

      #${IDS.chip} {
        display: none;
        align-items: center;
        gap: 8px;
        max-width: min(720px, calc(100vw - 32px));
        margin: 0;
        padding: 8px 12px;
        border: 1px solid rgba(127,127,127,0.22);
        border-radius: 16px;
        background: rgba(32,33,35,0.92);
        color: #f5f5f5;
        font: 400 13px/1.3 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-sizing: border-box;
      }

      #${IDS.chip}[data-visible="true"] {
        display: inline-flex;
      }

      #${IDS.chip} .tm-quote-chip-icon {
        display: inline-flex;
        flex: 0 0 auto;
        opacity: 0.9;
      }

      #${IDS.chip} .tm-quote-chip-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${IDS.chip} .tm-quote-chip-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 22px;
        height: 22px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      #${IDS.chip} .tm-quote-chip-close:hover {
        background: rgba(255,255,255,0.1);
      }
    `;
    document.head.appendChild(style);
  }

  function createSvgIcon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    if (type === 'quote') {
      path.setAttribute(
        'd',
        'M9.5 6C6.9 7.2 5.5 9.4 5.5 12.2c0 2.9 1.8 5 4.4 5 2.1 0 3.7-1.5 3.7-3.6 0-2-1.5-3.4-3.3-3.4-.4 0-.8.1-1.1.2.4-1.3 1.5-2.4 3.1-3.2L9.5 6zm8 0c-2.6 1.2-4 3.4-4 6.2 0 2.9 1.8 5 4.4 5 2.1 0 3.7-1.5 3.7-3.6 0-2-1.5-3.4-3.3-3.4-.4 0-.8.1-1.1.2.4-1.3 1.5-2.4 3.1-3.2L17.5 6z'
      );
    } else {
      path.setAttribute(
        'd',
        'M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z'
      );
    }

    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
    return svg;
  }

  function withObserverPaused(fn) {
    const hasObserver = !!observer;
    if (hasObserver) {
      observer.disconnect();
    }

    try {
      fn();
    } finally {
      if (hasObserver) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    }
  }

  function createFloatingButton() {
    if (floatingButton) return floatingButton;

    const btn = document.createElement('button');
    btn.id = IDS.floatingButton;
    btn.type = 'button';
    btn.textContent = 'Quote';

    btn.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const selection = window.getSelection();
      const quoteText = state.selectionData?.text || selection?.toString()?.trim() || '';

      if (!quoteText) {
        hideFloatingButton();
        return;
      }

      setCurrentQuote(quoteText);
      hideFloatingButton();

      if (selection) {
        selection.removeAllRanges();
      }
    });

    document.body.appendChild(btn);
    floatingButton = btn;
    return btn;
  }

  function createChipHost() {
    if (chipHostEl) return chipHostEl;

    const host = document.createElement('div');
    host.id = IDS.chipHost;
    host.setAttribute('data-visible', 'false');

    chipHostEl = host;
    return host;
  }

  function createChip() {
    if (chipEl) return chipEl;

    const chip = document.createElement('div');
    chip.id = IDS.chip;
    chip.setAttribute('data-visible', 'false');

    const iconWrap = document.createElement('span');
    iconWrap.className = 'tm-quote-chip-icon';
    iconWrap.appendChild(createSvgIcon('quote'));

    const text = document.createElement('span');
    text.className = 'tm-quote-chip-text';
    text.textContent = '';

    const close = document.createElement('button');
    close.className = 'tm-quote-chip-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Remove quote');
    close.appendChild(createSvgIcon('close'));
    close.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearQuote();
    });

    chip.appendChild(iconWrap);
    chip.appendChild(text);
    chip.appendChild(close);

    chipEl = chip;
    chipTextEl = text;

    return chip;
  }

  function getFooter() {
    return document.querySelector(SELECTORS.footer);
  }

  function getPromptBox() {
    return document.querySelector(SELECTORS.promptBox);
  }

  function getTextarea() {
    return document.querySelector(SELECTORS.textarea);
  }

  function isRunButtonElement(el) {
    if (!(el instanceof Element)) return false;
    return !!el.closest(SELECTORS.runButton);
  }

  function ensureChipMounted() {
    const footer = getFooter();
    if (!footer) return;

    const host = createChipHost();
    const chip = createChip();
    const promptBox = getPromptBox();

    if (chip.parentNode !== host) {
      host.appendChild(chip);
    }

    if (promptBox) {
      if (host.parentNode !== footer || host.nextSibling !== promptBox) {
        footer.insertBefore(host, promptBox);
      }
      return;
    }

    if (host.parentNode !== footer) {
      footer.appendChild(host);
    }
  }

  function compressText(text, maxLen) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLen) return normalized;
    return normalized.slice(0, maxLen - 1).trimEnd() + '…';
  }

  function updateChipUI() {
    withObserverPaused(() => {
      ensureChipMounted();
      if (!chipEl || !chipTextEl || !chipHostEl) return;

      const nextText = state.currentQuote ? compressText(state.currentQuote, 140) : '';
      const nextVisible = state.currentQuote ? 'true' : 'false';

      if (chipTextEl.textContent !== nextText) {
        chipTextEl.textContent = nextText;
      }

      if (chipEl.getAttribute('data-visible') !== nextVisible) {
        chipEl.setAttribute('data-visible', nextVisible);
      }

      if (chipHostEl.getAttribute('data-visible') !== nextVisible) {
        chipHostEl.setAttribute('data-visible', nextVisible);
      }
    });
  }

  function showFloatingButton(x, y) {
    const btn = createFloatingButton();
    btn.style.display = 'block';

    const rect = btn.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, x - rect.width / 2));
    const top = Math.max(8, y - rect.height - 10);

    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
  }

  function hideFloatingButton() {
    if (!floatingButton) return;
    floatingButton.style.display = 'none';
  }

  function selectionInsideChatTurn(range) {
    if (!range) return false;
    const commonAncestor = range.commonAncestorContainer;
    const node = commonAncestor.nodeType === Node.ELEMENT_NODE
      ? commonAncestor
      : commonAncestor.parentElement;
    if (!node) return false;
    return !!node.closest(SELECTORS.chatTurn);
  }

  function handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      state.selectionData = null;
      hideFloatingButton();
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    if (!text || !selectionInsideChatTurn(range)) {
      state.selectionData = null;
      hideFloatingButton();
      return;
    }

    const rects = range.getClientRects();
    const rect = rects.length ? rects[0] : range.getBoundingClientRect();

    if (!rect || (!rect.width && !rect.height)) {
      state.selectionData = null;
      hideFloatingButton();
      return;
    }

    state.selectionData = {
      text,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    };

    const centerX = rect.left + rect.width / 2;
    const topY = rect.top;

    showFloatingButton(centerX, topY);
  }

  function setNativeTextareaValue(textarea, value) {
    const proto = Object.getPrototypeOf(textarea);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && typeof descriptor.set === 'function') {
      descriptor.set.call(textarea, value);
    } else {
      textarea.value = value;
    }
  }

  function dispatchInput(textarea) {
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function dispatchChange(textarea) {
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function getVisibleTextareaValue(textarea) {
    const value = textarea.value || '';
    return value.replace(/\u200B/g, '');
  }

  function ensureRunEnabledWithZeroWidth() {
    const textarea = getTextarea();
    if (!textarea) return;

    const value = textarea.value || '';
    const cleaned = value.replace(/\u200B/g, '');

    if (!state.currentQuote) {
      if (value.includes(ZERO_WIDTH)) {
        state.suppressNextInputCleanup = true;
        setNativeTextareaValue(textarea, cleaned);
        dispatchInput(textarea);
        dispatchChange(textarea);
      }
      return;
    }

    if (cleaned === '') {
      state.suppressNextInputCleanup = true;
      setNativeTextareaValue(textarea, ZERO_WIDTH);
      dispatchInput(textarea);
      dispatchChange(textarea);
    }
  }

  function setCurrentQuote(text) {
    state.currentQuote = text;
    updateChipUI();
    ensureRunEnabledWithZeroWidth();
  }

  function clearQuote() {
    state.currentQuote = null;
    updateChipUI();
    ensureRunEnabledWithZeroWidth();
  }

  function formatQuoteBlock(quote, userText) {
    const quotedLines = quote
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => `> ${line}`);

    const body = quotedLines.join('\n');
    return `[Quote]:\n${body}\n\n${userText}`;
  }

  function withQuoteInjected(callback) {
    const textarea = getTextarea();
    if (!textarea || !state.currentQuote) return;

    const userText = getVisibleTextareaValue(textarea);
    const finalText = formatQuoteBlock(state.currentQuote, userText);

    state.suppressNextInputCleanup = true;
    setNativeTextareaValue(textarea, finalText);
    dispatchInput(textarea);
    dispatchChange(textarea);

    callback?.();
    clearQuote();
  }

  function handleKeyDownCapture(event) {
    if (!state.currentQuote) return;
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;

    withQuoteInjected();
  }

  function handleMouseDownCapture(event) {
    if (!state.currentQuote) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!isRunButtonElement(target)) return;

    withQuoteInjected();
  }

  function handleDocumentMouseDown(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      hideFloatingButton();
      return;
    }

    if (floatingButton && target.closest(`#${IDS.floatingButton}`)) return;
    hideFloatingButton();
  }

  function handleInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;

    if (state.suppressNextInputCleanup) {
      state.suppressNextInputCleanup = false;
      return;
    }

    const raw = target.value || '';
    if (!raw.includes(ZERO_WIDTH)) return;

    const cleaned = raw.replace(/\u200B/g, '');

    if (state.currentQuote && cleaned === '') {
      return;
    }

    if (cleaned !== raw) {
      state.suppressNextInputCleanup = true;
      setNativeTextareaValue(target, cleaned);
      dispatchInput(target);
    }
  }

  function mountSelfHealingObserver() {
    if (observer) return;

    observer = new MutationObserver(() => {
      if (!state.currentQuote) return;

      const footer = getFooter();
      const promptBox = getPromptBox();
      const host = chipHostEl;

      if (!footer || !host || !chipEl) return;

      const hostMissing = !footer.contains(host);
      const hostWrongParent = host.parentNode !== footer;
      const hostWrongPosition = !!promptBox && host.nextSibling !== promptBox;
      const chipMissing = !host.contains(chipEl);

      if (hostMissing || hostWrongParent || hostWrongPosition || chipMissing) {
        updateChipUI();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function init() {
    injectStyles();
    createFloatingButton();
    createChipHost();
    createChip();
    updateChipUI();
    ensureRunEnabledWithZeroWidth();
    mountSelfHealingObserver();

    document.addEventListener('selectionchange', handleSelectionChange, true);
    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    document.addEventListener('input', handleInput, true);

    window.addEventListener('keydown', handleKeyDownCapture, { capture: true });
    window.addEventListener('mousedown', handleMouseDownCapture, { capture: true });

    window.addEventListener('resize', () => {
      if (state.selectionData) {
        handleSelectionChange();
      } else {
        hideFloatingButton();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();