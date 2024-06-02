"use strict";

/* global document */

const electron = require("electron");
const { app, process } = require("@electron/remote");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const { createCanvas, loadImage } = require('@napi-rs/canvas')
const csv = require('csv-parser');

const nightMode = require("./js/standard/nightMode.js");

const buttonElement = document.getElementById("process-image");
const fileListElement = document.getElementById("file-list");

const inputDir = path.join(__dirname, "input");
const outputDirData = path.join(__dirname, "output", "video_results", "data");
const outputDirImage = path.join(__dirname, "output", "video_results", "image");

const currentDateTime = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, ""); // Format: yyyy-mm-ddTHH-MM-SS

const batFilePath = path.join(__dirname, "batnet.bat");

let batProcess;

electron.ipcRenderer.on("night-mode", (e, nm) => {
  if (nm !== undefined) {
    nightMode.setNightMode(true);
  } else {
    nightMode.toggle();
  }
});

// Call listInputFiles function when the page loads
window.addEventListener("DOMContentLoaded", () => {
  listInputFiles();
});

buttonElement.addEventListener("click", () => {
  buttonElement.disabled = true;
  buttonElement.textContent = "LOADING..."; // Change button text to "LOADING" while executing bat file
  executeBatFile();
});

function listInputFiles() {
  const inputDir = path.join(__dirname, "input");

  // Read the contents of the input directory
  fs.readdir(inputDir, (err, files) => {
    if (err) {
      console.error("Error reading input directory:", err);
      return;
    }

    // Clear previous listing
    fileListElement.innerHTML = "";

    // Display the list of files found
    if (files.length === 0) {
      const listItem = document.createElement("li");
      listItem.textContent = "No files found";
      listItem.classList.add("list-group-item");
      fileListElement.appendChild(listItem);
    } else {
      files.forEach((file) => {
        const listItem = document.createElement("li");
        listItem.classList.add("list-group-item");
        listItem.textContent = file;
        fileListElement.appendChild(listItem);
      });
    }
  });
}

function executeBatFile() {

  // Files found, proceed to execute the bat file
  const input = "--input=" + `"${path.join(inputDir, "*.jpg")}"`;
  const output = "--output=" + `"${path.join(outputDirData, `video_data_${currentDateTime}.csv`)}"`;

  const args = [input, output, "--saveboxes"];

  batProcess = spawn(`"${batFilePath}"`, args, {
    encoding: "utf-8",
    shell: true,
  });

  batProcess.stdout.on("data", (data) => {
    let consoleMessage = `${data}`;
    console.log(consoleMessage);

    if (consoleMessage.includes("Press any key to continue . . .")) {
      batProcess.kill("SIGTERM");
    }
  });

  batProcess.stderr.on("data", (error) => {
    console.error(error);
  });

  batProcess.on("close", (code) => {
    console.log(`child process exited with code ${code}`);

    fs.createReadStream(`output/video_results/data/video_data_${currentDateTime}.csv`)
    .pipe(csv())
    .on('data', processRow)
    .on('end', () => {
        console.log('Processing complete');

        buttonElement.disabled = false;
        buttonElement.textContent = "PROCESS IMAGE"; // Change button text back to "PROCESS IMAGE" after executing bat file
    });


  });
}

async function processRow(row) {
  const filename = row.Filename;
  const code = row.Code;
  const boxCoordinates = row.Box.split(' ').map(Number);

  try {
      // Load image
      const image = await loadImage(path.join(inputDir, filename));
      
      // Create canvas
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');

      // Draw image
      ctx.drawImage(image, 0, 0, image.width, image.height);

      // Draw box
      ctx.strokeStyle = 'red'; // Customize as needed
      ctx.lineWidth = 20; // Customize as needed
      ctx.beginPath();
      ctx.moveTo(boxCoordinates[0], boxCoordinates[1]);
      ctx.lineTo(boxCoordinates[2], boxCoordinates[1]);
      ctx.lineTo(boxCoordinates[2], boxCoordinates[3]);
      ctx.lineTo(boxCoordinates[0], boxCoordinates[3]);
      ctx.closePath();
      ctx.stroke();

      // Write text above the box
      ctx.fillStyle = 'red'; 
      ctx.font = '120px Arial'; 
      ctx.fillText(code, boxCoordinates[0], boxCoordinates[1] - 20);

      // Save image
      const pngData = await canvas.encode('png');
      fs.writeFileSync(path.join(outputDirImage, filename), pngData);

      console.log(`Processed ${filename}`);
  } catch (err) {
      console.error(`Error processing ${filename}: ${err}`);
  }
}
