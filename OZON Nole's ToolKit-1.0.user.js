// ==UserScript==
// @name         OZON Nole's ToolKit
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A tool for deep data collection (Data Mining) from product pages and converting them into pure Markdown format. Optimized for subsequent feeding of data to AI Tools.
// @icon         https://st.ozone.ru/assets/favicon.ico
// @match        https://www.ozon.ru/product/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 1. Иконки
    const triggerIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/><path fill="currentColor" d="M8 14h8v-2H8v2zm0 4h8v-2H8v2z"/></svg>`;
    const loadingSpinner = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ozm-spinner"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
    const warningIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

    // 2. Стили
    GM_addStyle(`
        @font-face {
            font-family: 'Onest';
            font-weight: 100 900;
            font-display: swap;
            src: url(https://st.ozone.ru/s3/ozon-fonts/onest.woff2) format('woff2');
        }

        #ozm-container { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: 'Onest', arial, sans-serif; }

        #ozm-trigger-btn { position: relative; width: 56px; height: 56px; background: var(--bgActionSecondary, rgba(0, 26, 52, 0.4)); color: var(--graphicActionPrimary, #1a1a1a); border-radius: 16px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease-in; padding: 0; margin: 0; }
        #ozm-trigger-btn::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background-color: var(--graphicActionPrimary, #000); opacity: 0; transition: opacity 0.15s ease-in; z-index: 1; pointer-events: none; }
        #ozm-trigger-btn:hover::after { opacity: 0.08; }
        #ozm-trigger-btn svg { position: relative; z-index: 2; }

        #ozm-panel { position: absolute; bottom: calc(100% + 15px); right: 0; width: 300px; background-color: var(--bgPrimary, #ffffff); border: 1px solid var(--lineSeparator, #e2e4e8); padding: 20px; border-radius: 16px; color: var(--textPrimary, #1a1a1a); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); opacity: 0; transform: translateY(10px); visibility: hidden; transition: all 0.2s ease-out; }
        #ozm-panel.visible { opacity: 1; transform: translateY(0); visibility: visible; }

        .ozm-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .ozm-row span { font-weight: 500; font-size: 14px; color: var(--textPrimary, #1a1a1a); }

        .ozm-input { background: var(--bgSecondary, #f2f5f9); border: 1px solid var(--lineSeparator, #e2e4e8); color: var(--textPrimary, #1a1a1a); border-radius: 8px; padding: 6px 10px; font-size: 14px; outline: none; transition: border 0.2s; font-family: 'Onest', arial, sans-serif; }
        .ozm-input:focus { border-color: var(--graphicActionPrimary, #005bff); background: var(--bgPrimary, #fff); }
        .ozm-input-num { width: 70px; text-align: center; }

        .ozm-hint { display: flex; align-items: flex-start; gap: 8px; margin: -4px 0 16px 0; padding: 10px 12px; background: var(--ozCtrlWarningPale, rgba(255, 213, 64, 0.15)); border-radius: 10px; }
        .ozm-hint svg { width: 16px; height: 16px; color: var(--ozCtrlWarning, #e6a600); flex-shrink: 0; margin-top: 1px; }
        .ozm-hint span { font-size: 12px; color: var(--textPrimary, #1a1a1a); line-height: 1.4; }

        .ozm-switch { position: relative; display: inline-block; width: 40px; height: 24px; }
        .ozm-switch input { opacity: 0; width: 0; height: 0; }
        .ozm-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--graphicSecondary, #cdd1d9); transition: .3s; border-radius: 34px; }
        .ozm-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: var(--bgPrimary, #ffffff); transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        input:checked + .ozm-slider { background-color: var(--bgActionPrimary, #005bff); }
        input:checked + .ozm-slider:before { transform: translateX(16px); }

        /* Блок кнопок */
        .ozm-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .ozm-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 15px; transition: filter 0.2s, background 0.2s; font-family: 'Onest', arial, sans-serif; }
        .ozm-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Главная кнопка (Копировать) */
        .ozm-btn-primary { background: var(--bgActionPrimary, #005bff); color: var(--textPrimaryInverse, #fff); }
        .ozm-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }

        /* Второстепенная кнопка (Скачать) */
        .ozm-btn-secondary { background: var(--bgSecondary, #f2f5f9); color: var(--textPrimary, #1a1a1a); border: 1px solid var(--lineSeparator, #e2e4e8); }
        .ozm-btn-secondary:hover:not(:disabled) { background: var(--lineSeparator, #e2e4e8); }

        @keyframes ozm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ozm-spinner { animation: ozm-spin 1s linear infinite; }
    `);

    // 3. HTML Интерфейс
    const container = document.createElement('div');
    container.id = 'ozm-container';
    container.innerHTML = `
        <div id="ozm-panel">
            <div class="ozm-row"><span>Описание</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-desc"><span class="ozm-slider"></span></label></div>
            <div class="ozm-row"><span>Характеристики</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-chars"><span class="ozm-slider"></span></label></div>
            <div class="ozm-row"><span>Отзывы</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-reviews"><span class="ozm-slider"></span></label></div>

            <hr style="border: 0; border-top: 1px solid var(--lineSeparator, #e2e4e8); margin: 12px 0;">

            <div class="ozm-row"><span>Лимит отзывов</span><input type="number" id="ozm-limit" class="ozm-input ozm-input-num" min="1"></div>
            <div class="ozm-row"><span>Таймаут (мс)</span><input type="number" id="ozm-timeout" class="ozm-input ozm-input-num" min="50" step="50"></div>

            <div class="ozm-hint">
                ${warningIcon}
                <span>
                    <b>300мс</b> для 50-100 отзывов<br>
                    <b>800мс</b> для 500+<br><br>
                    Значения ниже <b>50мс</b> могут вызвать капчу!
                </span>
            </div>

            <div class="ozm-actions">
                <button id="ozm-btn-copy" class="ozm-btn ozm-btn-primary"><span>Скопировать в Markdown</span></button>
                <button id="ozm-btn-download" class="ozm-btn ozm-btn-secondary"><span>Скачать в Markdown</span></button>
            </div>
        </div>
        <button id="ozm-trigger-btn" aria-label="Скачать в Markdown" title="Экспорт данных товара">${triggerIcon}</button>
    `;
    document.body.appendChild(container);

    // 4. Логика UI
    const panel = document.getElementById('ozm-panel');

    // ВАЖНО: Останавливаем клики внутри всего контейнера, чтобы панель не закрывалась при нажатии кнопок
    container.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('ozm-trigger-btn').onclick = () => panel.classList.toggle('visible');
    document.onclick = () => panel.classList.remove('visible');

    const els = {
        desc: document.getElementById('ozm-inc-desc'),
        chars: document.getElementById('ozm-inc-chars'),
        reviews: document.getElementById('ozm-inc-reviews'),
        limit: document.getElementById('ozm-limit'),
        timeout: document.getElementById('ozm-timeout')
    };

    els.desc.checked = localStorage.getItem('ozm_desc') !== 'false';
    els.chars.checked = localStorage.getItem('ozm_chars') !== 'false';
    els.reviews.checked = localStorage.getItem('ozm_reviews') !== 'false';
    els.limit.value = localStorage.getItem('ozm_limit') || 50;
    els.timeout.value = localStorage.getItem('ozm_timeout') || 300;

    Object.keys(els).forEach(key => {
        els[key].addEventListener('change', () => {
            const value = els[key].type === 'checkbox' ? els[key].checked : els[key].value;
            localStorage.setItem(`ozm_${key}`, value);
        });
    });

    // 5. Парсер данных
    async function fetchReviews(limit, delayMs) {
        let results = [];
        let baseUrl = window.location.pathname;
        if (!baseUrl.endsWith('/')) baseUrl += '/';

        let currentUrlParam = `${baseUrl}?layout_container=reviewshelfpaginator&page=1`;

        while (results.length < limit) {
            const fullApiUrl = `https://www.ozon.ru/api/entrypoint-api.bx/page/json/v2?url=${encodeURIComponent(currentUrlParam)}`;

            try {
                const response = await fetch(fullApiUrl, {
                    method: 'GET',
                    credentials: 'include',
                    mode: 'cors',
                    headers: { 'accept': 'application/json', 'x-o3-app-name': 'dweb_client', 'x-o3-page-type': 'pdp' }
                });

                if (!response.ok) break;
                const data = await response.json();
                let pageReviews = [];

                if (data.widgetStates) {
                    for (const key in data.widgetStates) {
                        if (key.includes('webListReviews') || key.includes('reviews')) {
                            try {
                                const stateObj = JSON.parse(data.widgetStates[key]);
                                if (stateObj.reviews && Array.isArray(stateObj.reviews)) {
                                    pageReviews = stateObj.reviews;
                                    break;
                                }
                            } catch (e) {}
                        }
                    }
                }

                if (pageReviews.length === 0) break;
                results.push(...pageReviews);

                if (data.nextPage && results.length < limit) {
                    currentUrlParam = data.nextPage;
                    await new Promise(r => setTimeout(r, delayMs));
                } else {
                    break;
                }
            } catch (err) {
                console.error("[Ozon Scraper] Fetch error:", err);
                break;
            }
        }
        return results.slice(0, limit);
    }

    async function generateMarkdown() {
        let md = `# ${document.querySelector('h1')?.innerText.trim() || 'Товар Ozon'}\n\n`;

        if (els.desc.checked) {
            const desc = document.querySelector('[id="section-description"]')?.innerText.replace('Описание\n', '').trim();
            if (desc) md += `## Описание\n${desc}\n\n`;
        }

        if (els.chars.checked) {
            md += `## Характеристики\n`;
            document.querySelectorAll('[id="section-characteristics"] dl').forEach(dl => {
                const k = dl.querySelector('dt')?.innerText.trim();
                const v = dl.querySelector('dd')?.innerText.trim();
                if (k && v) md += `- **${k}:** ${v}\n`;
            });
            md += '\n';
        }

        if (els.reviews.checked) {
            const limit = parseInt(els.limit.value) || 50;
            const delayMs = Math.max(parseInt(els.timeout.value) || 300, 50);

            const reviews = await fetchReviews(limit, delayMs);
            md += `## Отзывы (${reviews.length})\n\n`;

            if (reviews.length === 0) {
                md += `*Не удалось загрузить отзывы.*\n\n`;
            } else {
                reviews.forEach(r => {
                    const author = r.author?.firstName || 'Аноним';
                    const score = r.content?.score || 0;

                    let dateStr = '';
                    if (r.publishedAt) {
                        dateStr = new Date(r.publishedAt * 1000).toLocaleDateString('ru-RU');
                    }

                    let textParts = [];
                    if (r.content?.positive) textParts.push(`**Достоинства:** ${r.content.positive}`);
                    if (r.content?.negative) textParts.push(`**Недостатки:** ${r.content.negative}`);
                    if (r.content?.comment) textParts.push(`**Комментарий:** ${r.content.comment}`);

                    const fullText = textParts.join('\n\n') || 'Нет текста';

                    md += `### ${author} | ${'⭐'.repeat(score)}${'☆'.repeat(5-score)} | ${dateStr}\n${fullText.split('\n').map(l => '> ' + l).join('\n')}\n\n`;
                });
            }
        }
        return md;
    }

    // 6. Единый обработчик действий (Копировать / Скачать)
    async function handleAction(btn, actionType) {
        const span = btn.querySelector('span');
        const originalText = span.innerText;

        // Блокируем обе кнопки на время работы
        const btnCopy = document.getElementById('ozm-btn-copy');
        const btnDownload = document.getElementById('ozm-btn-download');
        btnCopy.disabled = true;
        btnDownload.disabled = true;

        btn.innerHTML = loadingSpinner + `<span>Собираю...</span>`;

        try {
            const md = await generateMarkdown();

            if (actionType === 'copy') {
                GM_setClipboard(md);
            } else if (actionType === 'download') {
                const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Пытаемся вытащить ID товара из ссылки, чтобы файл имел уникальное имя
                const skuMatch = window.location.pathname.match(/-(\d+)\/?$/);
                const sku = skuMatch ? skuMatch[1] : 'export';
                a.download = `Ozon_${sku}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            btn.innerHTML = `<span>Успешно!</span>`;
        } catch (e) {
            console.error(e);
            btn.innerHTML = `<span>Ошибка!</span>`;
        }

        // Возвращаем исходный вид через 2 секунды
        setTimeout(() => {
            btnCopy.disabled = false;
            btnDownload.disabled = false;
            btn.innerHTML = `<span>${originalText}</span>`;
        }, 2000);
    }

    // Привязываем события
    document.getElementById('ozm-btn-copy').onclick = function() { handleAction(this, 'copy'); };
    document.getElementById('ozm-btn-download').onclick = function() { handleAction(this, 'download'); };

})();