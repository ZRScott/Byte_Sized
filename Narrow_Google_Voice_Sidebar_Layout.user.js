// ==UserScript==
// @name         Narrow Google Voice Sidebar Layout
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hide the contact list, adjust the width of the call sidebar, and ensure its layout dynamically adjusts
// @author       Zac Scott
// @match        https://voice.google.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/Narrow_Google_Voice_Sidebar_Layout.user.js
// @downloadURL  https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/Narrow_Google_Voice_Sidebar_Layout.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Function to hide the contact list
    function hideContactList() {
        const contactList = document.querySelector('gv-contact-list.contacts');
        if (contactList) {
            contactList.style.display = 'none';
        }
    }

    // Function to adjust the sidebar width and ensure its layout dynamically adjusts
    function adjustSidebarLayout() {
        const callSidebar = document.querySelector('gv-call-sidebar');
        if (callSidebar) {
            // Set the sidebar width to 250px (or your desired width)
            callSidebar.style.width = '250px';

            // Ensure the sidebar's internal layout adjusts dynamically
            const sidebarContent = callSidebar.querySelector('.gvCallSidebar-root'); // Adjust this selector if needed
            if (sidebarContent) {
                sidebarContent.style.width = '100%'; // Make it fill the available space
                sidebarContent.style.maxWidth = 'none'; // Remove any max-width restrictions
                sidebarContent.style.overflow = 'auto'; // Ensure it doesn't overflow
            }

            // Ensure the dial pad adjusts dynamically
            const dialPad = callSidebar.querySelector('gv-dialpad'); // Adjust this selector if needed
            if (dialPad) {
                dialPad.style.width = '100%'; // Make it fill the available space
                dialPad.style.maxWidth = 'none'; // Remove any max-width restrictions
            }
        }
    }

    // Function to run both actions
    function modifyPage() {
        hideContactList();
        adjustSidebarLayout();
    }

    // Run the function when the page loads
    window.addEventListener('load', modifyPage);

    // Also run the function when the DOM changes (in case elements are loaded dynamically)
    const observer = new MutationObserver(modifyPage);
    observer.observe(document.body, { childList: true, subtree: true });
})();

