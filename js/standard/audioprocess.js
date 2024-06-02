'use strict';

/* global document */

const electron = require('electron');
const { app, process } = require('@electron/remote');
const { spawn } = require('child_process');
const path = require('path');

const nightMode = require('./js/standard/nightMode.js');

const button = document.getElementById('process-audio');

electron.ipcRenderer.on('night-mode', (e, nm) => {

    if (nm !== undefined) {

        nightMode.setNightMode(true);

    } else {

        nightMode.toggle();

    }

});

button.addEventListener('click', () => {

    button.disabled = true;
    button.textContent = "LOADING..."; // Change button text to "LOADING" while executing bat file

    // Path to Python script
    const pythonScript = path.join(__dirname, "batdetect2", "app.py");

    // Spawn a new shell to execute the command
    const shell = spawn(`py "${pythonScript}"`, { shell: true, cwd: path.join(__dirname, "batdetect2") });


    shell.stdout.on('data', (data) => {
        let consoleMessage = data.toString();
        console.log(consoleMessage);

        if (consoleMessage.includes("Press any key to continue . . .")) {
            shell.kill("SIGTERM");
        }
        
    });

    // Log any errors
    shell.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    shell.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
        button.disabled = false;
        button.textContent = "PROCESS AUDIO"; // Change button text back to "PROCESS IMAGE" after executing bat file
    });

    // Log the exit code


});
