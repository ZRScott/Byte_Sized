// ==UserScript==
// @name         RCA Points
// @namespace    http://tampermonkey.net/
// @version      5.4.5
// @match        *://*/*
// @grant        GM_openInTab
// @icon         https://www.svgrepo.com/show/165233/coin.svg
// @updateURL    https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/RCA-Points.user.js
// @downloadURL  https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/RCA-Points.user.js
// ==/UserScript==

(function() {
    'use strict';

    let iconContainer;
    let selectedText = '';
    let hoveredIcon = null;

    const categories = [
        { name: 'Academics',      icon: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExejgxb2Y0dzQ0ZHBjZHBvZ3I0N2VpMmJlYThqMHAzeGlvaTYxaHNjYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9dHM/srJTsYwToaIg5rTT8T/giphy.gif' },
        { name: 'Communication',  icon: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExanVremF3ajhsMTBueGVvaGhhN3B6ZzRpbDFvajB6enJuZTl4cTd2NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Q5eCrf8a77NCerbmdf/giphy.gif' },
        { name: 'Participation',  icon: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXJ0YjFrbzNnMGhtcnFtMHdqeDhzeW9xOW52Zm9yc2R0enNjNjI3bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3ohhwJPSL00H2r6Rhe/giphy.gif' },
        { name: 'Effort',         icon: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjVwc3ZxcnJoOGs1ZG53cm94ZjgzZmlrMGxjeW9ydGpqNWltMW5jMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/FuYkStU1jDOMFLR2Pc/giphy.gif' },
        { name: 'Good Character', icon: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzN3dm05anZxbjV6cWxveXR4ZXJpcWI2Z2M3c2U2OW9pdjdtZzlldCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L4TtYKVImi8MYzpJnL/giphy.gif' },
        { name: 'Attended Live Lesson',  icon: 'https://www.svgrepo.com/show/530257/figure.svg' },
        { name: 'School Spirit',  icon: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExajFnM3l4YmgzemhrODlvczJhbHJ6NjRncGF1cmVodzY2aWIxa29nYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/TihQpMaVrcBgqfGuVx/giphy.gif' },
        { name: 'Other',          icon: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHU3b2I5enJobnliZXBqam93a3EzN2thYmZkZjEwajYxM255YXlsOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/oyeC4P4ckSF3i/giphy.gif' }
    ];

    const style = document.createElement('style');
    style.textContent = `
        @keyframes popIn {
            0% { opacity: 0; transform: scale(0.3) translateY(10px); }
            50% { transform: scale(1.1) translateY(0); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .icon-container { animation: popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .category-icon { transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .category-tooltip {
            position: absolute;
            background: #333;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
        }
        .category-tooltip::before {
            content: '';
            position: absolute;
            top: -4px;
            left: 50%;
            transform: translateX(-50%);
            width: 0; height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-bottom: 4px solid #333;
        }
        .category-icon:hover .category-tooltip { opacity: 1; }
    `;
    document.head.appendChild(style);

    // ── Notes filler ─────────────────────────────────────────────────────────────
    function fillNotesTextarea(text) {
        const textarea =
            document.querySelector('textarea[name="note"]') ||
            document.querySelector('textarea[placeholder*="optional explanation"]') ||
            document.querySelector('textarea[placeholder*="notes are visible"]');

        if (!textarea) return false;

        textarea.focus();
        textarea.click();

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(textarea, text);

        ['focus', 'input', 'change'].forEach(evt =>
            textarea.dispatchEvent(new Event(evt, { bubbles: true }))
        );
        ['keydown', 'keyup'].forEach(evt =>
            textarea.dispatchEvent(new KeyboardEvent(evt, { bubbles: true }))
        );

        console.log('[RCA] Notes filled:', textarea.value);
        return true;
    }

    // Poll until textarea exists, fill it, then call onFilled()
    function pollFillThenContinue(text, onFilled, intervalMs = 300, maxAttempts = 25) {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            if (fillNotesTextarea(text)) {
                clearInterval(timer);
                console.log('[RCA] Notes filled on attempt', attempts, '— continuing');
                onFilled();
            } else if (attempts >= maxAttempts) {
                clearInterval(timer);
                console.warn('[RCA] Notes textarea never found — clicking Next anyway');
                onFilled();
            }
        }, intervalMs);
    }

    // ── Icon container ───────────────────────────────────────────────────────────
    function createIconContainer() {
        iconContainer = document.createElement('div');
        iconContainer.className = 'icon-container';
        iconContainer.style.cssText = `
            position: absolute;
            display: none;
            z-index: 10000;
            width: 320px;
            height: 50px;
        `;
        document.body.appendChild(iconContainer);

        const totalIcons  = categories.length;
        const iconSpacing = 45;
        const archHeight  = 15;

        categories.forEach((category, index) => {
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'category-icon';
            iconWrapper.style.cssText = `
                position: absolute;
                background: white;
                padding: 4px;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
            `;
            iconWrapper.style.animationDelay = `${index * 0.05}s`;

            const xPos = index * iconSpacing;
            const centerIndex = (totalIcons - 1) / 2;
            const distanceFromCenter = index - centerIndex;
            const yOffset = -archHeight * Math.pow(distanceFromCenter / centerIndex, 2) + archHeight;

            iconWrapper.style.left = `${xPos}px`;
            iconWrapper.style.top  = `${10 - yOffset}px`;
            iconWrapper.dataset.baseX = xPos;
            iconWrapper.dataset.baseY = 10 - yOffset;

            const img = document.createElement('img');
            img.src = category.icon;
            img.width = 32;
            img.height = 32;
            img.style.cssText = 'display: block; pointer-events: none;';

            const tooltip = document.createElement('div');
            tooltip.className = 'category-tooltip';
            tooltip.textContent = category.name;

            iconWrapper.appendChild(img);
            iconWrapper.appendChild(tooltip);

            iconWrapper.addEventListener('mouseenter', () => { hoveredIcon = iconWrapper; updateIconPositions(iconWrapper); });
            iconWrapper.addEventListener('mouseleave', () => { hoveredIcon = null; updateIconPositions(null); });
            iconWrapper.addEventListener('mousedown', (e) => e.preventDefault());
            iconWrapper.addEventListener('click', (e) => {
                e.preventDefault();
                const url = `https://app.rcahousepoints.com/staff/dashboard/award-points#autofill=${encodeURIComponent(selectedText)}&category=${encodeURIComponent(category.name)}`;
                GM_openInTab(url, { active: false }); // Opens in background tab
                iconContainer.style.display = 'none';
            });

            iconContainer.appendChild(iconWrapper);
        });
    }

    function updateIconPositions(hoveredElement) {
        const icons = iconContainer.querySelectorAll('.category-icon');
        const pushDistance = 8;
        icons.forEach((icon, index) => {
            const baseX = parseFloat(icon.dataset.baseX);
            const baseY = parseFloat(icon.dataset.baseY);
            if (icon === hoveredElement) {
                icon.style.transform = 'scale(1.4)';
                icon.style.left = `${baseX}px`;
                icon.style.top  = `${baseY}px`;
            } else if (hoveredElement) {
                const hoveredIndex = Array.from(icons).indexOf(hoveredElement);
                let xOffset = 0;
                if (index < hoveredIndex) xOffset = -pushDistance / (hoveredIndex - index);
                else if (index > hoveredIndex) xOffset = pushDistance / (index - hoveredIndex);
                icon.style.transform = 'scale(1)';
                icon.style.left = `${baseX + xOffset}px`;
                icon.style.top  = `${baseY}px`;
            } else {
                icon.style.transform = 'scale(1)';
                icon.style.left = `${baseX}px`;
                icon.style.top  = `${baseY}px`;
            }
        });
    }

    function looksLikeName(word) { return /^[A-Z][a-z]+/.test(word); }

    function isValidNameSelection(selection) {
        const selectedWord = selection.toString().trim();
        if (!selectedWord) return false;
        const node = selection.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            const fullText = node.textContent.trim();
            if (fullText.includes(',')) {
                const parts = fullText.split(',').map(p => p.trim());
                if (parts.length >= 2) return looksLikeName(parts[0].split(/\s+/)[0]) && looksLikeName(parts[1].split(/\s+/)[0]);
            }
            const words = fullText.split(/\s+/);
            const si = words.findIndex(w => w.includes(selectedWord));
            if (si !== -1 && looksLikeName(words[si])) {
                if (si + 1 < words.length && looksLikeName(words[si + 1])) return true;
                if (si > 0 && looksLikeName(words[si - 1])) return true;
            }
        }
        return false;
    }

    function getFullName(selection) {
        const selectedWord = selection.toString().trim();
        if (!selectedWord) return '';
        const node = selection.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            const fullText = node.textContent.trim();
            if (fullText.includes(',')) {
                const parts = fullText.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    return `${parts[1].split(/\s+/)[0].replace(/'s$/i,'')} ${parts[0].split(/\s+/)[0].replace(/'s$/i,'')}`;
                }
            }
            const words = fullText.split(/\s+/);
            const si = words.findIndex(w => w.includes(selectedWord));
            if (si !== -1 && looksLikeName(words[si])) {
                let first = '', last = '';
                if (si + 1 < words.length && looksLikeName(words[si + 1])) { first = words[si]; last = words[si + 1]; }
                else if (si > 0 && looksLikeName(words[si - 1])) { first = words[si - 1]; last = words[si]; }
                if (first && last) return `${first.replace(/'s$/i,'')} ${last.replace(/'s$/i,'')}`;
            }
        }
        return selectedWord.replace(/'s$/i, '');
    }

    document.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const word = selection.toString().trim();
        if (word && isValidNameSelection(selection)) {
            selectedText = getFullName(selection);
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            const containerWidth = 320;
            let idealLeft = rect.left + window.scrollX + (rect.width / 2) - (containerWidth / 2);
            let idealTop  = rect.top + window.scrollY - 50;
            if (idealLeft < window.scrollX + 10) idealLeft = window.scrollX + 10;
            else if (idealLeft + containerWidth > window.scrollX + window.innerWidth - 10) idealLeft = window.scrollX + window.innerWidth - containerWidth - 10;
            if (idealTop < window.scrollY + 10) idealTop = window.scrollY + 10;
            iconContainer.style.left = `${idealLeft}px`;
            iconContainer.style.top  = `${idealTop}px`;
            iconContainer.querySelectorAll('.category-icon').forEach(icon => {
                icon.style.left      = `${parseFloat(icon.dataset.baseX)}px`;
                icon.style.top       = `${parseFloat(icon.dataset.baseY)}px`;
                icon.style.transform = 'scale(1)';
            });
            iconContainer.style.display = 'none';
            setTimeout(() => { iconContainer.style.display = 'block'; }, 10);
        } else {
            iconContainer.style.display = 'none';
        }
    });

    // ── Auto-fill on RCA page ─────────────────────────────────────────────────────
    if (window.location.href.includes('app.rcahousepoints.com/staff/dashboard/award-points')) {
        const hash          = window.location.hash;
        const nameMatch     = hash.match(/#autofill=([^&]*)/);
        const categoryMatch = hash.match(/[&?]category=([^&]*)/);
        const commentMatch  = hash.match(/[&?]comment=([^&]*)/);

        if (nameMatch) {
            const text       = decodeURIComponent(nameMatch[1]);
            const category   = categoryMatch ? decodeURIComponent(categoryMatch[1]) : 'Communication';
            const noteToFill = commentMatch ? decodeURIComponent(commentMatch[1]).trim() : '';

            console.log('[RCA] Auto-filling:', text, '| Category:', category, '| Note:', noteToFill || '(none)');

            const tryFill = () => {
                const input = document.querySelector('input[placeholder="Search..."]');
                if (!input) return false;

                input.focus();
                input.value = '';
                document.execCommand('insertText', false, text);

                setTimeout(() => {
                    let studentCard = null;
                    document.querySelectorAll('div[role="button"]').forEach(div => {
                        if (div.textContent.includes(text)) studentCard = div;
                    });

                    if (studentCard) {
                        studentCard.click();

                        setTimeout(() => {
                            const nextBtn1 = document.querySelector('button:has(.lucide-arrow-right)');
                            if (nextBtn1?.textContent.includes('Next')) {
                                nextBtn1.click();

                                setTimeout(() => {
                                    let categoryOption = null;
                                    document.querySelectorAll('div[role="button"].cursor-pointer').forEach(opt => {
                                        if (opt.textContent.includes(category)) categoryOption = opt;
                                    });

                                    if (categoryOption) {
                                        categoryOption.click();

                                        setTimeout(() => {
                                            if (noteToFill) {
                                                console.log('[RCA] Filling notes before Next');
                                                pollFillThenContinue(noteToFill, () => {
                                                    setTimeout(() => {
                                                        const nextBtn2 = document.querySelector('button:has(.lucide-arrow-right)');
                                                        if (nextBtn2?.textContent.includes('Next')) {
                                                            console.log('[RCA] Clicking Next after notes filled');
                                                            nextBtn2.click();
                                                        }
                                                    }, 200);
                                                });
                                            } else {
                                                const nextBtn2 = document.querySelector('button:has(.lucide-arrow-right)');
                                                if (nextBtn2?.textContent.includes('Next')) nextBtn2.click();
                                            }
                                        }, 500);
                                    }
                                }, 500);
                            }
                        }, 500);
                    }
                }, 800);

                window.location.hash = '';
                return true;
            };

            setTimeout(() => tryFill(), 1000);
            setTimeout(() => tryFill(), 2000);
        }
    }

    createIconContainer();
})();
