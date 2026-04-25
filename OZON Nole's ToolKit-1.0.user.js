// ==UserScript==
// @name         OZON Nole's ToolKit
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  A tool for deep data collection from product pages (Desc, Chars, Reviews, Questions, Stats, Images) -> Markdown. Optimized for AI.
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

        #ozm-panel { position: absolute; bottom: calc(100% + 15px); right: 0; width: 310px; background-color: var(--bgPrimary, #ffffff); border: 1px solid var(--lineSeparator, #e2e4e8); padding: 20px; border-radius: 16px; color: var(--textPrimary, #1a1a1a); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); opacity: 0; transform: translateY(10px); visibility: hidden; transition: all 0.2s ease-out; }
        #ozm-panel.visible { opacity: 1; transform: translateY(0); visibility: visible; }

        .ozm-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .ozm-row span { font-weight: 500; font-size: 14px; color: var(--textPrimary, #1a1a1a); }
        .ozm-row-sub { margin-left: 15px; margin-bottom: 8px; margin-top: -6px; opacity: 0.85; }

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

        .ozm-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .ozm-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 15px; transition: filter 0.2s, background 0.2s; font-family: 'Onest', arial, sans-serif; }
        .ozm-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .ozm-btn-primary { background: var(--bgActionPrimary, #005bff); color: var(--textPrimaryInverse, #fff); }
        .ozm-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
        .ozm-btn-secondary { background: var(--bgSecondary, #f2f5f9); color: var(--textPrimary, #1a1a1a); border: 1px solid var(--lineSeparator, #e2e4e8); }
        .ozm-btn-secondary:hover:not(:disabled) { background: var(--lineSeparator, #e2e4e8); }

        /* Идеально плавная CSS Grid анимация для прогресс-бара */
        #ozm-progress-wrap {
            display: grid;
            grid-template-rows: 0fr;
            opacity: 0;
            transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
            margin-top: 0;
        }
        #ozm-progress-wrap.active {
            grid-template-rows: 1fr;
            opacity: 1;
            margin-top: 12px;
        }
        #ozm-progress-inner { overflow: hidden; padding-top: 2px; }
        #ozm-progress-bg { width: 100%; height: 6px; background-color: var(--lineSeparator, #e2e4e8); border-radius: 3px; overflow: hidden; }
        #ozm-progress-bar { width: 0%; height: 100%; background-color: var(--bgActionPrimary, #005bff); transition: width 0.3s ease, background-color 0.3s ease; }
        #ozm-progress-text { font-size: 12px; color: var(--textSecondary, #666); margin-top: 6px; text-align: center; font-weight: 500; }

        /* Анимация для бесконечного режима (Лимит 0) */
        @keyframes ozm-stripes {
            0% { background-position-x: 1rem; }
            100% { background-position-x: 0; }
        }
        .ozm-progress-indeterminate {
            background-image: linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent) !important;
            background-size: 1rem 1rem !important;
            animation: ozm-stripes 1s linear infinite !important;
            transition: background-color 0.3s ease !important;
        }

        @keyframes ozm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ozm-spinner { animation: ozm-spin 1s linear infinite; }
    `);

    // 3. HTML Интерфейс
    const container = document.createElement('div');
    container.id = 'ozm-container';
    container.innerHTML = `
        <div id="ozm-panel">
            <div class="ozm-row"><span>Описание</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-desc"><span class="ozm-slider"></span></label></div>
            <div class="ozm-row ozm-row-sub"><span>└ Картинки (ссылками)</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-images"><span class="ozm-slider"></span></label></div>
            <div class="ozm-row"><span>Характеристики</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-chars"><span class="ozm-slider"></span></label></div>
            <div class="ozm-row"><span>Аналитика рейтинга</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-stats"><span class="ozm-slider"></span></label></div>
            <div class="ozm-row"><span>Отзывы</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-reviews"><span class="ozm-slider"></span></label></div>
            <div class="ozm-row ozm-row-sub"><span>└ Только с текстом</span><label class="ozm-switch"><input type="checkbox" id="ozm-text-only"><span class="ozm-slider"></span></label></div>
            <div class="ozm-row"><span>Вопросы о товаре</span><label class="ozm-switch"><input type="checkbox" id="ozm-inc-questions"><span class="ozm-slider"></span></label></div>

            <hr style="border: 0; border-top: 1px solid var(--lineSeparator, #e2e4e8); margin: 12px 0;">

            <div class="ozm-row"><span>Лимит (0 = Все)</span><input type="number" id="ozm-limit" class="ozm-input ozm-input-num" min="0"></div>
            <div class="ozm-row"><span>Таймаут (мс)</span><input type="number" id="ozm-timeout" class="ozm-input ozm-input-num" min="0" step="50"></div>

            <div class="ozm-actions">
                <button id="ozm-btn-copy" class="ozm-btn ozm-btn-primary"><span>Скопировать Markdown</span></button>
                <button id="ozm-btn-download" class="ozm-btn ozm-btn-secondary"><span>Скачать Markdown</span></button>
            </div>

            <div id="ozm-progress-wrap">
                <div id="ozm-progress-inner">
                    <div id="ozm-progress-bg"><div id="ozm-progress-bar"></div></div>
                    <div id="ozm-progress-text">Подготовка...</div>
                </div>
            </div>
        </div>
        <button id="ozm-trigger-btn" aria-label="Скачать в Markdown" title="Экспорт данных товара">${triggerIcon}</button>
    `;
    document.body.appendChild(container);

    // 4. Логика UI
    const panel = document.getElementById('ozm-panel');
    container.addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('ozm-trigger-btn').onclick = () => panel.classList.toggle('visible');
    document.onclick = () => panel.classList.remove('visible');

    const els = {
        desc: document.getElementById('ozm-inc-desc'),
        images: document.getElementById('ozm-inc-images'),
        chars: document.getElementById('ozm-inc-chars'),
        stats: document.getElementById('ozm-inc-stats'),
        reviews: document.getElementById('ozm-inc-reviews'),
        textOnly: document.getElementById('ozm-text-only'),
        questions: document.getElementById('ozm-inc-questions'),
        limit: document.getElementById('ozm-limit'),
        timeout: document.getElementById('ozm-timeout')
    };

    const uiProgWrap = document.getElementById('ozm-progress-wrap');
    const uiProgBar = document.getElementById('ozm-progress-bar');
    const uiProgText = document.getElementById('ozm-progress-text');

    // Настройки по умолчанию
    els.desc.checked = localStorage.getItem('ozm_desc') !== 'false';
    els.images.checked = localStorage.getItem('ozm_images') !== 'false'; // Картинки ВКЛ по умолчанию
    els.chars.checked = localStorage.getItem('ozm_chars') !== 'false';
    els.stats.checked = localStorage.getItem('ozm_stats') !== 'false';
    els.reviews.checked = localStorage.getItem('ozm_reviews') !== 'false';
    els.textOnly.checked = localStorage.getItem('ozm_textOnly') !== 'false';
    els.questions.checked = localStorage.getItem('ozm_questions') !== 'false';
    els.limit.value = localStorage.getItem('ozm_limit') || 50;
    els.timeout.value = localStorage.getItem('ozm_timeout') || 100;

    Object.keys(els).forEach(key => {
        els[key].addEventListener('change', () => {
            const value = els[key].type === 'checkbox' ? els[key].checked : els[key].value;
            localStorage.setItem(`ozm_${key}`, value);
        });
    });

    // 5. Функции прогресса
    function setProgress(current, total, phaseName) {
        uiProgWrap.classList.add('active');

        if (total === 0) {
            uiProgBar.classList.add('ozm-progress-indeterminate');
            uiProgBar.style.width = '100%';
            uiProgText.innerText = `${phaseName}: выгружено ${current} ...`;
        } else {
            uiProgBar.classList.remove('ozm-progress-indeterminate');
            const percent = Math.min(Math.round((current / total) * 100), 100);
            uiProgBar.style.width = `${percent}%`;
            uiProgText.innerText = `${phaseName}: ${current} / ${total}`;
        }
    }

    function hideProgress() {
        uiProgWrap.classList.remove('active');
        setTimeout(() => {
            uiProgBar.style.width = '0%';
            uiProgBar.classList.remove('ozm-progress-indeterminate');
        }, 400);
    }

    // 6. Извлечение Статистики
    function extractRatingStats() {
        let stats = { score: '', total: 0, stars: {5: 0, 4: 0, 3: 0, 2: 0, 1: 0} };
        const allDivs = Array.from(document.querySelectorAll('div, span'));

        const scoreEl = allDivs.find(el => el.innerText && el.innerText.match(/^\d[\.,]\d \/ 5$/));
        if (scoreEl) {
            stats.score = scoreEl.innerText.trim();
        }

        const starLabels = [
            { key: 5, text: '5 звёзд' },
            { key: 4, text: '4 звезды' },
            { key: 3, text: '3 звезды' },
            { key: 2, text: '2 звезды' },
            { key: 1, text: '1 звезда' }
        ];

        let foundBreakdown = false;
        starLabels.forEach(s => {
            const labelEl = allDivs.find(el => el.innerText === s.text);
            if (labelEl && labelEl.parentElement) {
                const countEl = labelEl.parentElement.lastElementChild;
                if (countEl && /^\d+$/.test(countEl.innerText.replace(/\s/g, ''))) {
                    stats.stars[s.key] = parseInt(countEl.innerText.replace(/\s/g, ''), 10);
                    stats.total += stats.stars[s.key];
                    foundBreakdown = true;
                }
            }
        });

        return foundBreakdown ? stats : null;
    }

    function extractText(obj) {
        if (!obj) return '';
        if (typeof obj === 'string') return obj.trim();
        if (obj.content) {
            if (typeof obj.content === 'string') return obj.content.trim();
            if (obj.content.text) return obj.content.text.trim();
        }
        if (obj.text) return obj.text.trim();
        if (obj.value) return obj.value.trim();
        return '';
    }

    function extractAuthor(obj) {
        if (!obj) return 'Пользователь';
        if (typeof obj === 'string') return obj;
        if (obj.name) return obj.name;
        if (obj.firstName) return obj.firstName;
        if (obj.authorName) return obj.authorName;
        if (obj.author) {
            if (obj.author.name) return obj.author.name;
            if (obj.author.firstName) return obj.author.firstName;
        }
        return 'Пользователь';
    }

    function extractDate(obj) {
        if (!obj) return '';
        if (obj.createdAt && typeof obj.createdAt === 'string') return obj.createdAt;
        if (obj.publishedAt) return new Date(obj.publishedAt * 1000).toLocaleDateString('ru-RU');
        return '';
    }

    function reviewHasText(r) {
        const p = (r.content?.positive || '').trim();
        const n = (r.content?.negative || '').trim();
        const c = (r.content?.comment || '').trim();
        return (p.length > 0 || n.length > 0 || c.length > 0);
    }

    // 7. Универсальный парсер API Ozon
    async function fetchOzonData(limit, delayMs, dataType, searchKey, progressName) {
        let results = [];
        let baseUrl = window.location.pathname.replace(/\/questions\/?$/, '').replace(/\/reviews\/?$/, '');
        if (!baseUrl.endsWith('/')) baseUrl += '/';

        let currentPage = 1;
        let currentUrlParam;

        if (dataType === 'reviews') {
            currentUrlParam = `${baseUrl}?layout_container=reviewshelfpaginator&page=${currentPage}`;
        } else if (dataType === 'questions') {
            currentUrlParam = `${baseUrl}questions/?page=${currentPage}`;
        }

        setProgress(0, limit, progressName);

        while (limit === 0 || results.length < limit) {
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
                let pageItems = [];
                let totalPages = 1;
                let stateContext = null;

                if (data.widgetStates) {
                    for (const key in data.widgetStates) {
                        if (key.toLowerCase().includes(searchKey)) {
                            try {
                                const stateObj = JSON.parse(data.widgetStates[key]);
                                stateContext = stateObj.state || stateObj;

                                if (dataType === 'questions') {
                                    if (stateContext.questionsIds && stateContext.questions) {
                                        stateContext.questionsIds.forEach(qid => {
                                            let q = stateContext.questions[qid];
                                            if (q) {
                                                q.parsedAnswers = [];
                                                if (stateContext.questionAnswers && stateContext.questionAnswers[qid]) {
                                                    stateContext.questionAnswers[qid].forEach(aid => {
                                                        if (stateContext.answers && stateContext.answers[aid]) {
                                                            q.parsedAnswers.push(stateContext.answers[aid]);
                                                        }
                                                    });
                                                }
                                                pageItems.push(q);
                                            }
                                        });
                                    }
                                }
                                else if (dataType === 'reviews') {
                                    if (stateObj.reviews && Array.isArray(stateObj.reviews)) pageItems = stateObj.reviews;
                                    else if (stateContext.reviews && Array.isArray(stateContext.reviews)) pageItems = stateContext.reviews;
                                }

                                if (stateContext.paging && stateContext.paging.total) {
                                    totalPages = Math.ceil(stateContext.paging.total / stateContext.paging.perPage);
                                }

                                if (pageItems.length > 0) break;
                            } catch (e) {}
                        }
                    }
                }

                if (pageItems.length === 0) break;
                results.push(...pageItems);

                setProgress(results.length, limit, progressName);

                if (limit !== 0 && results.length >= limit) break;

                if (data.nextPage) {
                    currentUrlParam = data.nextPage;
                } else if (currentPage < totalPages) {
                    currentPage++;
                    if (dataType === 'reviews') {
                        currentUrlParam = `${baseUrl}?layout_container=reviewshelfpaginator&page=${currentPage}`;
                    } else {
                        currentUrlParam = `${baseUrl}questions/?page=${currentPage}`;
                    }
                } else {
                    break;
                }

                if (delayMs > 0) {
                    await new Promise(r => setTimeout(r, delayMs));
                }
            } catch (err) {
                console.error(`[Ozon Scraper] Ошибка сбора ${progressName}:`, err);
                break;
            }
        }

        return limit === 0 ? results : results.slice(0, limit);
    }

    // 8. Сборщик Markdown
    async function generateMarkdown() {
        let md = `# ${document.querySelector('h1')?.innerText.trim() || 'Товар Ozon'}\n\n`;

        // Добавляем главное фото (Обложку)
        if (els.images.checked) {
            const mainImg = document.querySelector('meta[property="og:image"]')?.content;
            if (mainImg) md += `![Обложка товара](${mainImg})\n\n`;
        }

        if (els.desc.checked) {
            const descEl = document.querySelector('[id="section-description"]');
            if (descEl) {
                const clone = descEl.cloneNode(true);

                // Извлекаем картинки из описания (рекламные баннеры Ozon)
                if (els.images.checked) {
                    clone.querySelectorAll('img').forEach(img => {
                        const src = img.src || img.dataset.src;
                        if (src && !src.includes('data:image')) {
                            // Заменяем тег img на текстовый узел Markdown
                            const mdImg = document.createTextNode(`\n![Иллюстрация описания](${src})\n`);
                            img.parentNode.replaceChild(mdImg, img);
                        }
                    });
                } else {
                    // Если галочка снята, просто удаляем картинки, чтобы не мусорить
                    clone.querySelectorAll('img').forEach(img => img.remove());
                }

                let descText = clone.innerText.replace(/^Описание\s*/i, '').trim();
                if (descText) md += `## Описание\n${descText}\n\n`;
            }
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

        if (els.stats.checked) {
            const stats = extractRatingStats();
            if (stats) {
                md += `## Аналитика рейтинга\n`;
                if (stats.score) md += `**Общая оценка:** ${stats.score}\n`;
                md += `**Всего оценок:** ${stats.total}\n\n`;

                md += `| Оценка | Количество | Процент |\n|---|---|---|\n`;
                for (let star = 5; star >= 1; star--) {
                    const count = stats.stars[star];
                    const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
                    const starsStr = '⭐'.repeat(star) + '☆'.repeat(5 - star);
                    md += `| ${starsStr} (${star}) | ${count} | ${pct}% |\n`;
                }
                md += `\n`;
            }
        }

        let limit = parseInt(els.limit.value, 10);
        if (isNaN(limit) || limit < 0) limit = 0;
        const delayMs = Math.max(parseInt(els.timeout.value) || 0, 0);

        if (els.reviews.checked) {
            let reviews = await fetchOzonData(limit, delayMs, 'reviews', 'reviews', 'Сбор отзывов');

            if (els.textOnly.checked) {
                reviews = reviews.filter(reviewHasText);
            }

            md += `## Отзывы (${reviews.length})\n\n`;

            if (reviews.length === 0) {
                md += `*Отзывов не найдено.*\n\n`;
            } else {
                reviews.forEach(r => {
                    const author = extractAuthor(r.author);
                    const score = r.content?.score || 0;
                    const dateStr = extractDate(r);

                    let textParts = [];
                    if (r.content?.positive) textParts.push(`**Достоинства:** ${r.content.positive}`);
                    if (r.content?.negative) textParts.push(`**Недостатки:** ${r.content.negative}`);
                    if (r.content?.comment) textParts.push(`**Комментарий:** ${r.content.comment}`);

                    // Извлекаем фото пользователей из отзывов
                    if (els.images.checked && r.content?.photos && r.content.photos.length > 0) {
                        const photosMd = r.content.photos.map(p => `![Фото покупателя](${p.url})`).join(' ');
                        textParts.push(`**Фотографии:**\n${photosMd}`);
                    }

                    const fullText = textParts.join('\n\n') || 'Нет текста';
                    md += `### ${author} | ${'⭐'.repeat(score)}${'☆'.repeat(5-score)} | ${dateStr}\n${fullText.split('\n').map(l => '> ' + l).join('\n')}\n\n`;
                });
            }
        }

        if (els.questions.checked) {
            const questions = await fetchOzonData(limit, delayMs, 'questions', 'weblistquestions', 'Сбор вопросов');
            md += `## Вопросы о товаре (${questions.length})\n\n`;

            if (questions.length === 0) {
                md += `*Вопросов не найдено.*\n\n`;
            } else {
                questions.forEach(q => {
                    const qAuthor = extractAuthor(q);
                    const qText = extractText(q) || 'Без текста вопроса';
                    const qDate = extractDate(q);

                    md += `**Вопрос:** ${qText}\n*— ${qAuthor}* ${qDate ? `(${qDate})` : ''}\n\n`;

                    if (q.parsedAnswers && q.parsedAnswers.length > 0) {
                        q.parsedAnswers.forEach(ans => {
                            const ansAuthor = extractAuthor(ans);
                            const ansText = extractText(ans) || 'Без текста ответа';
                            md += `> **Ответ:** ${ansText}\n> *— ${ansAuthor}*\n\n`;
                        });
                    } else {
                         md += `> *На этот вопрос пока нет ответов.*\n\n`;
                    }
                    md += `---\n\n`;
                });
            }
        }

        return md;
    }

    // 9. Главный обработчик
    async function handleAction(btn, actionType) {
        const span = btn.querySelector('span');
        const originalText = span.innerText;

        const btnCopy = document.getElementById('ozm-btn-copy');
        const btnDownload = document.getElementById('ozm-btn-download');
        btnCopy.disabled = true;
        btnDownload.disabled = true;

        btn.innerHTML = loadingSpinner + `<span>В процессе...</span>`;

        try {
            const md = await generateMarkdown();

            uiProgWrap.classList.add('active');
            uiProgBar.classList.remove('ozm-progress-indeterminate');
            uiProgBar.style.width = '100%';
            uiProgText.innerText = 'Формирование файла...';

            if (actionType === 'copy') {
                GM_setClipboard(md);
            } else if (actionType === 'download') {
                const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const skuMatch = window.location.pathname.match(/-(\d+)\/?$/);
                const sku = skuMatch ? skuMatch[1] : 'export';
                a.download = `Ozon_${sku}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            btn.innerHTML = `<span>Успешно!</span>`;
            uiProgBar.style.backgroundColor = '#00b341';
            uiProgText.innerText = 'Готово!';
        } catch (e) {
            console.error(e);
            btn.innerHTML = `<span>Ошибка!</span>`;
            uiProgWrap.classList.add('active');
            uiProgBar.classList.remove('ozm-progress-indeterminate');
            uiProgBar.style.width = '100%';
            uiProgBar.style.backgroundColor = '#ff3333';
            uiProgText.innerText = 'Произошла ошибка при сборе';
        }

        setTimeout(() => {
            btnCopy.disabled = false;
            btnDownload.disabled = false;
            btn.innerHTML = `<span>${originalText}</span>`;
            hideProgress();
            setTimeout(() => { uiProgBar.style.backgroundColor = 'var(--bgActionPrimary, #005bff)'; }, 400);
        }, 2500);
    }

    document.getElementById('ozm-btn-copy').onclick = function() { handleAction(this, 'copy'); };
    document.getElementById('ozm-btn-download').onclick = function() { handleAction(this, 'download'); };

})();
