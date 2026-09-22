// ==UserScript==
// @name         Profile Info on WM (Nickname & Pic)
// @namespace    http://tampermonkey.net/
// @version      3.4
// @description  Displays student nickname and image in the WM message header with nickname under the picture and 200px image size.
// @author       Zac Scott
// @match        https://www.connexus.com/webmail*
// @connect      connexus.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/WM_Pic_and_Nickname.user.js
// @downloadURL  https://raw.githubusercontent.com/ZRScott/Byte_Sized/main/WM_Pic_and_Nickname.user.js
// ==/UserScript==

(function() {
    'use strict';

    const PROFILE_INFO_CONTAINER_ID = 'tampermonkey-profile-info-container';
    const NICKNAME_DISPLAY_ID = 'tampermonkey-nickname-display';
    const IMAGE_DISPLAY_ID = 'tampermonkey-image-display';
    let currentStudentId = null;
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
    const SCRIPT_VERSION_TAG = '_v2.4_pic200_nickbelow';

    function getOrCreateProfileInfoContainer(parentContainer) {
        let container = document.getElementById(PROFILE_INFO_CONTAINER_ID);
        if (!parentContainer) {
            if (container) container.remove();
            return null;
        }

        if (container && container.parentElement === parentContainer) return container;
        if (container && container.parentElement !== parentContainer) {
            parentContainer.appendChild(container);
            return container;
        }

        container = document.createElement('div');
        container.id = PROFILE_INFO_CONTAINER_ID;
        container.style.display = 'flex';
        container.style.flexDirection = 'column'; // nickname below the picture
        container.style.alignItems = 'left'; // centered horizontally
        container.style.gap = '10px';
        container.style.marginLeft = '15px';
        container.style.padding = '10px';
        container.style.border = 'transparent';
        container.style.borderRadius = '5px';
        container.style.backgroundColor = 'transparent';
        container.style.boxSizing = 'border-box';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.color = '#333';

        const targetSibling = parentContainer.querySelector('.messageActions');
        if (targetSibling) parentContainer.insertBefore(container, targetSibling);
        else parentContainer.appendChild(container);
        return container;
    }

    function displayNickname(nickname, studentId, profileInfoContainer) {
        if (!profileInfoContainer) return;
        let nicknameDiv = document.getElementById(NICKNAME_DISPLAY_ID);

        const mainText = nickname ? nickname : "";
        const idPart = studentId ? ` (ID: ${studentId})` : '';
        const fullText = mainText ? mainText + idPart : "";

        if (!fullText) {
            if (nicknameDiv) nicknameDiv.remove();
            return;
        }

        if (!nicknameDiv) {
            nicknameDiv = document.createElement('div');
            nicknameDiv.id = NICKNAME_DISPLAY_ID;
            nicknameDiv.style.fontSize = '14px';
            nicknameDiv.style.fontWeight = 'bold';
            nicknameDiv.style.color = '#0066cc';
            nicknameDiv.style.textAlign = 'left';
            nicknameDiv.style.marginTop = '8px';
            profileInfoContainer.appendChild(nicknameDiv); // nickname BELOW image
        }

        nicknameDiv.textContent = fullText;
    }

    function displayImageLink(imageUrl, filename, studentId, profileInfoContainer) {
        if (!profileInfoContainer) return;
        let imageDiv = document.getElementById(IMAGE_DISPLAY_ID);

        if (!imageUrl) {
            if (imageDiv) imageDiv.remove();
            return;
        }

        if (!imageDiv) {
            imageDiv = document.createElement('div');
            imageDiv.id = IMAGE_DISPLAY_ID;
            imageDiv.style.flexShrink = '0';
            profileInfoContainer.appendChild(imageDiv);
        }

        imageDiv.innerHTML = '';
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.alt = filename || 'Student Image';
        imgElement.style.width = 'auto';
        imgElement.style.height = '200px';
        imgElement.style.objectFit = 'contain';
        imgElement.style.borderRadius = '10%';
        imgElement.style.border = '4px solid #722362';
        imgElement.style.display = '200px';
        imgElement.style.margin = 'auto';
        imageDiv.appendChild(imgElement);
    }

    async function fetchNickname(studentId, profileInfoContainer) {
        if (!studentId) return;

        const cacheKey = `connexus_nickname_${studentId}${SCRIPT_VERSION_TAG}`;
        const cachedData = await GM_getValue(cacheKey, null);
        const now = Date.now();

        if (cachedData && (now - cachedData.timestamp < CACHE_DURATION_MS)) {
            displayNickname(cachedData.nickname, studentId, profileInfoContainer);
            return;
        }

        const overviewUrl = `https://www.connexus.com/log/default.aspx?idWebuser=${studentId}&sendTo=%2fwebuser%2foverview.aspx%3fidWebuser%3d${studentId}`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: overviewUrl,
            timeout: 15000,
            onload: function(response) {
                if (studentId !== currentStudentId) return;

                if (response.status >= 200 && response.status < 300) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');
                        const nicknameElement = doc.querySelector('a#nickNameLink');
                        let finalNickname = null;

                        if (nicknameElement) {
                            const rawTitle = (nicknameElement.getAttribute('title') || '').trim();
                            const prefixRegex = /^\s*Nickname:\s*/i;
                            let processedText = rawTitle.replace(prefixRegex, '').trim();
                            if (processedText) finalNickname = processedText;
                        }

                        GM_setValue(cacheKey, { nickname: finalNickname, timestamp: Date.now() });
                        displayNickname(finalNickname, studentId, profileInfoContainer);
                    } catch (parseError) {
                        console.error(`Nickname fetch: parse error`, parseError);
                    }
                }
            }
        });
    }

    async function fetchImageLink(studentId, profileInfoContainer) {
        if (!studentId) return;

        const cacheKey = `connexus_image_${studentId}${SCRIPT_VERSION_TAG}`;
        const cachedData = await GM_getValue(cacheKey, null);
        const now = Date.now();

        if (cachedData && (now - cachedData.timestamp < CACHE_DURATION_MS)) {
            displayImageLink(cachedData.imageUrl, cachedData.filename, studentId, profileInfoContainer);
            return;
        }

        const imageSearchUrl = `https://www.connexus.com/dataview/16631?idWebuser=${studentId}`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: imageSearchUrl,
            timeout: 15000,
            onload: function(response) {
                if (studentId !== currentStudentId) return;

                if (response.status >= 200 && response.status < 300) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');

                        let imageUrl = null;
                        let filename = null;

                        let downloadLink = doc.querySelector(
                            'a.downloadFile[data-filename*=".JPG"], a.downloadFile[data-filename*=".jpg"], a.downloadFile[data-filename*=".PNG"], a.downloadFile[data-filename*=".png"], a.downloadFile[data-filename*=".JPEG"], a.downloadFile[data-filename*=".jpeg"]'
                        );

                        if (!downloadLink) {
                            downloadLink = doc.querySelector(
                                'li.file-uploaded .downloadFile[data-filename*=".jpg"], li.file-uploaded .downloadFile[data-filename*=".JPG"], li.file-uploaded .downloadFile[data-filename*=".png"], li.file-uploaded .downloadFile[data-filename*=".PNG"], li.file-uploaded .downloadFile[data-filename*=".jpeg"], li.file-uploaded .downloadFile[data-filename*=".JPEG"]'
                            );
                        }

                        if (downloadLink) {
                            let href = downloadLink.getAttribute('href');
                            imageUrl = href.startsWith('/') ? 'https://www.connexus.com' + href : href;
                            filename = downloadLink.getAttribute('data-filename') || downloadLink.textContent;
                            if (filename.includes('/')) filename = filename.split('/').pop();
                        }

                        GM_setValue(cacheKey, { imageUrl: imageUrl, filename: filename, timestamp: Date.now() });
                        displayImageLink(imageUrl, filename, studentId, profileInfoContainer);
                    } catch (parseError) {
                        console.error(`Image fetch: parse error`, parseError);
                    }
                }
            }
        });
    }

    function checkForStudentId() {
        const studentLinkElement = document.querySelector('.contextMenu > .ng-scope:nth-child(1) a[href*="idWebuser="]');
        const parentContainer = document.querySelector('.messageHeaderInfo');
        if (studentLinkElement && parentContainer) {
            const href = studentLinkElement.href;
            try {
                const url = new URL(href);
                const studentIdParam = url.searchParams.get('idWebuser');
                if (studentIdParam) {
                    if (studentIdParam !== currentStudentId) {
                        currentStudentId = studentIdParam;
                        const profileInfoContainer = getOrCreateProfileInfoContainer(parentContainer);
                        fetchNickname(studentIdParam, profileInfoContainer);
                        fetchImageLink(studentIdParam, profileInfoContainer);
                    }
                } else clearAllDisplays();
            } catch {
                clearAllDisplays();
            }
        } else clearAllDisplays();
    }

    function clearAllDisplays() {
        const container = document.getElementById(PROFILE_INFO_CONTAINER_ID);
        if (container) container.remove();
        currentStudentId = null;
    }

    const observer = new MutationObserver(() => checkForStudentId());
    setTimeout(() => {
        observer.observe(document.body, { childList: true, subtree: true });
        checkForStudentId();
    }, 1500);
})();
