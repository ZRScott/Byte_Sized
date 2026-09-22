// ==UserScript==
// @name         🚨Alarm: Contact
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Displays "🚨Alarm: Contact" on My Students Page.
// @author       Zac Scott
// @match        https://www.connexus.com/sectionsandstudents*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/Alarm_Contact.user.js
// @downloadURL  https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/Alarm_Contact.user.js
// ==/UserScript==

(function() {
    'use strict';

    // === CONFIGURATION ===
    const CONTACT_ALARM_KEYWORD = 'Contacts (Alarm)';     // The keyword in student.whyEscalated to identify this type of alarm
    const PERFORMANCE_ALARM_KEYWORD = 'Performance (Alarm)'; // Keyword for regular Performance alarms
    const INTERNAL_SORT_VALUE = '🚨Alarm: Contact';                   // The value used in Angular's data model for sorting
    const VISIBLE_TEXT_DISPLAY = '🚨Alarm: Contact';           // The visible text displayed in the column for '🚨Alarm: Contact' alarms
    const DEFAULT_ALARM_TEXT = 'Alarm';                  // The default visible text for regular alarms
    // =====================

    // Helper to safely execute Angular operations
    function safelyApplyAngular(element, callback) {
        const scope = angular.element(element).scope();
        if (scope && !scope.$$phase) {
            scope.$apply(callback);
        } else if (scope) {
            callback();
        }
    }

    // Function to update the visual text
    function updateVisualText() {
        const attendanceCells = document.querySelectorAll('td.attendanceStatusAutomated');

        attendanceCells.forEach(cell => {
            const alarmLink = cell.querySelector('a.ng-binding.ng-scope'); // Target the link itself
            const iconSpan = alarmLink ? alarmLink.querySelector('.cxIcon.escalation-alarm-icon') : null;

            if (alarmLink && iconSpan) {
                const titleText = alarmLink.getAttribute('title');
                let desiredText = DEFAULT_ALARM_TEXT;

                // Determine desired text based on priority
                if (titleText && typeof titleText === 'string') {
                    if (titleText.includes(CONTACT_ALARM_KEYWORD)) {
                        desiredText = VISIBLE_TEXT_DISPLAY;
                    }
                    // Add other conditions here if you have more types and their priorities
                    // else if (titleText.includes('Other Alarm Type')) {
                    //     desiredText = 'Alarm: Other';
                    // }
                }

                // Check and replace the text content directly after the icon
                let currentTextNode = iconSpan.nextSibling;
                let actualText = '';

                // Capture current text content right after the icon
                if (currentTextNode && currentTextNode.nodeType === Node.TEXT_NODE) {
                    actualText = currentTextNode.textContent.trim();
                }

                if (actualText === desiredText) {
                    return; // Text is already correct, do nothing
                }

                // If existing text node is not correct, or doesn't exist, remove and recreate
                if (currentTextNode && currentTextNode.nodeType === Node.TEXT_NODE) {
                    alarmLink.removeChild(currentTextNode); // Remove old text node
                }

                const newTextNode = document.createTextNode(desiredText);
                alarmLink.appendChild(newTextNode); // Append new text node
            }
        });
    }

    // Function to modify the Angular data model for sorting
    function modifyAngularData() {
        const tbody = document.querySelector('tbody');
        if (!tbody) {
            console.log('Tampermonkey: Tbody not found, cannot modify Angular data.');
            return false;
        }

        let dataChanged = false;
        safelyApplyAngular(tbody, () => {
            const scope = angular.element(tbody).scope();

            if (scope && scope.students && Array.isArray(scope.students)) {
                scope.students.forEach(student => {
                    const currentStatus = student.attendanceStatusAutomated;
                    let targetStatus = currentStatus;

                    if (student.whyEscalated && typeof student.whyEscalated === 'string') {
                        if (student.whyEscalated.includes(CONTACT_ALARM_KEYWORD)) {
                            targetStatus = INTERNAL_SORT_VALUE;
                        } else if (student.whyEscalated.includes(PERFORMANCE_ALARM_KEYWORD)) {
                            targetStatus = DEFAULT_ALARM_TEXT; // Revert to "Alarm" if it's explicitly a performance alarm
                        } else {
                            // If it was our custom value but now isn't any known specific alarm, revert to default
                            if (currentStatus === INTERNAL_SORT_VALUE) {
                                targetStatus = DEFAULT_ALARM_TEXT;
                            }
                        }
                    } else {
                        // If no whyEscalated, and it was our custom value, revert to default
                        if (currentStatus === INTERNAL_SORT_VALUE) {
                            targetStatus = DEFAULT_ALARM_TEXT;
                        }
                    }


                    if (currentStatus !== targetStatus) {
                        student.attendanceStatusAutomated = targetStatus;
                        dataChanged = true;
                    }
                });
            }
        });
        return dataChanged;
    }

    // Function to trigger sorting
    function triggerSort() {
        const headerLink = document.querySelector('th.attendanceStatusAutomated a');
        if (headerLink) {
            headerLink.click();
        } else {
            console.log('Tampermonkey: Could not find attendanceStatusAutomated sort header.');
        }
    }

    // --- Main Execution Loop ---
    function runScriptLogic() {
        // console.log('Tampermonkey: Running script logic...');
        updateVisualText();
        const dataWasChanged = modifyAngularData();
        if (dataWasChanged) {
            triggerSort();
        }
    }

    // Use a MutationObserver to react to DOM changes
    const observer = new MutationObserver(mutations => {
        let relevantChange = false;
        for (let mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const addedElements = Array.from(mutation.addedNodes);
                if (addedElements.some(node => node.nodeType === 1 && (node.matches('td.attendanceStatusAutomated') || node.querySelector('td.attendanceStatusAutomated')))) {
                    relevantChange = true;
                    break;
                }
            }
        }

        if (relevantChange) {
            clearTimeout(window._tampermonkeyTimeoutId);
            window._tampermonkeyTimeoutId = setTimeout(runScriptLogic, 100); // Debounce
        }
    });

    // Initial run after document is ready
    window.addEventListener('load', () => {
        setTimeout(() => {
            runScriptLogic();
            observer.observe(document.body, { childList: true, subtree: true });
        }, 1000); // Increased initial delay to 1 second for full Angular load
    });

})();

