// ==UserScript==
// @name         ST ID To Student Overview
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Capture a 7-digit ID on double-click and create a Student Overview URL
// @author       Zac Scott
// @match        *://*/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/ST_ID_to_Overview.user.js
// @downloadURL  https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/ST_ID_to_Overview.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Function to handle the double-click event
    function handleDoubleClick(e) {
        const selectedText = window.getSelection().toString().trim();
        const match = selectedText.match(/\b\D*(\d{7})\b/);

        if (match) {
            const id = match[1];
            const url = `https://www.connexus.com/webuser/overview.aspx?idWebuser=${id}`;

            // Open the constructed URL in a new tab
            window.open(url, '_blank');
        }
    }

    // Add the event listener for double-click
    document.addEventListener('dblclick', handleDoubleClick);

})();
