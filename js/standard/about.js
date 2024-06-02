'use strict';

/* global document */

const electron = require('electron');
const {app, process} = require('@electron/remote');

const nightMode = require('./js/standard/nightMode.js');

const versionDisplay = document.getElementById('version-display');
const websiteLink = document.getElementById('website-link');

versionDisplay.textContent = 'Version ' + app.getVersion();

electron.ipcRenderer.on('night-mode', (e, nm) => {

    if (nm !== undefined) {

        nightMode.setNightMode(true);

    } else {

        nightMode.toggle();

    }

});

websiteLink.addEventListener('click', () => {

    electron.shell.openExternal('https://openacousticdevices.info');
    electron.shell.openExternal('https://www.hogeschoolrotterdam.nl');

});
