'use strict';

const {app} = require('@electron/remote');

var nightMode = true;

exports.isEnabled = () => {

    return nightMode;

};

function setNightMode (nm) {

    nightMode = nm;

    const oldLink = document.getElementById('uiCSS');
    const newLink = document.createElement('link');

    newLink.setAttribute('id', 'uiCSS');
    newLink.setAttribute('rel', 'stylesheet');
    newLink.setAttribute('type', 'text/css');

    if (nightMode) {

        newLink.setAttribute('href', app.getAppPath() + '/css/uiNight.css');

    } else {

        newLink.setAttribute('href', app.getAppPath() + '/css/ui.css');

    }

    document.getElementsByTagName('head').item(0).replaceChild(newLink, oldLink);

}

exports.setNightMode = setNightMode;

exports.toggle = () => {

    setNightMode(!nightMode);

};
