// ==UserScript==
// @name         Refresh Contacts (Alarm) button in Log
// @namespace    https://www.connexus.com/
// @version      4.0
// @description  Adds a "Save" button with a 'Clear Alarm' icon to the top toolbar on the Log page.
// @match        https://www.connexus.com/log*
// @run-at       document-end
// @grant        none
// @icon         https://icons.iconarchive.com/icons/hopstarter/soft-scraps/256/Button-Refresh-icon.png
// @updateURL    https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/Refresh_Contacts.user.js
// @downloadURL  https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/Refresh_Contacts.user.js
// ==/UserScript==

(function () {
    'use strict';

    // --- CONFIGURATION ---
    const DATAVIEW_ID = 789;

    // --- ICONS & STYLES ---
    // We inject a custom style for the "Clear Alarm" icon to match the site's look.
    const style = document.createElement('style');
style.innerHTML = `
    .cxIcon.customClearAlarmIcon {
        background-image: url("https://icons.iconarchive.com/icons/hopstarter/soft-scraps/256/Button-Refresh-icon.png") !important;
        background-repeat: no-repeat;
        background-position: left center;
        background-size: 16px 16px;
        padding-left: 20px;
    }
    .saving-active {
        opacity: 0.5;
        cursor: wait !important;
    }
`;
    document.head.appendChild(style);

    // --- HELPERS ---
    function getStudentId() {
        try {
            return new URL(window.location.href).searchParams.get('idWebuser');
        } catch {
            return null;
        }
    }

    function setBusy(linkElement, isBusy, text) {
        const span = linkElement.querySelector('span');
        if (isBusy) {
            linkElement.classList.add('saving-active');
            if (span) span.innerText = text || "Saving...";
            linkElement.style.pointerEvents = "none"; // Prevent double clicks
        } else {
            linkElement.classList.remove('saving-active');
            if (span) span.innerText = "Save";
            linkElement.style.pointerEvents = "auto";
        }
    }

    // --- CORE LOGIC (IFRAME) ---
    function triggerRealSave(idWebuser, linkElement) {
        // Remove old iframe if any
        const old = document.getElementById('tmSaveFrame');
        if (old) old.remove();

        const frame = document.createElement('iframe');
        frame.id = 'tmSaveFrame';
        frame.style.position = 'fixed';
        frame.style.left = '-9999px';
        frame.style.top = '0';
        frame.style.width = '1px';
        frame.style.height = '1px';
        frame.style.opacity = '0';

        const url = `https://www.connexus.com/dataview/${DATAVIEW_ID}?idWebuser=${encodeURIComponent(idWebuser)}`;
        frame.src = url;

        frame.onload = () => {
            try {
                const w = frame.contentWindow;
                const d = frame.contentDocument;

                if (!d) throw new Error('No iframe document');

                // Prevent redirect
                if (w.dataview && typeof w.dataview.setAllowRedirects === 'function') {
                    w.dataview.setAllowRedirects(false);
                }

                // Click the real button
                const realBtn = d.querySelector('#save');
                if (!realBtn) {
                    setBusy(linkElement, false);
                    alert('Could not find #save button on DataView page.');
                    return;
                }

                realBtn.click();

                // Wait 2 seconds then reset UI
                setTimeout(() => {
                    setBusy(linkElement, false);
                    // Optional: alert('Saved!');
                }, 2000);

            } catch (err) {
                setBusy(linkElement, false);
                console.error(err);
                alert('Save failed. See console.');
            }
        };

        document.body.appendChild(frame);
    }

    // --- INJECTION ---
    function injectToolbarButton() {
        if (document.getElementById('tmToolbarSave')) return;

        const idWebuser = getStudentId();
        if (!idWebuser) return;

        const toolbar = document.querySelector('ul.new-info-toolbar');
        if (!toolbar) return; // If toolbar isn't there, we can't add it

        // 1. Create List Item
        const li = document.createElement('li');
        li.id = 'tmToolbarSave';

        // 2. Create Link (The click target)
        const a = document.createElement('a');
        a.href = "#";
        a.title = "Refresh Contacts (Alarm), use after logging Phone call - successful";
        a.target = "_self"; // Keep it internal

        // 3. Create Span (The Icon and Text)
        const span = document.createElement('span');
        // 'cxIcon' is their class, 'customClearAlarmIcon' is ours
        span.className = "cxIcon customClearAlarmIcon";
        span.innerText = "Save";

        // 4. Assemble
        a.appendChild(span);
        li.appendChild(a);

        // 5. Add Click Event
        a.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setBusy(a, true, "Saving...");
            triggerRealSave(idWebuser, a);
        });

        // 6. Insert into Toolbar (at the end)
        toolbar.appendChild(li);
    }

    injectToolbarButton();
})();
