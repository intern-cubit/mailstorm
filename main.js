const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// --- Global Variables ---
let backendProcess;
let mainWindow;
const BACKEND_PORT = 8000;
const BACKEND_HEALTH_URL = `http://localhost:${BACKEND_PORT}/health`;

// --- Auto-Updater Configuration & Logic ---
log.transports.file.level = "info";
autoUpdater.logger = log;
// --- IMPORTANT CHANGE: Disable automatic download
autoUpdater.autoDownload = false;

autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
    if (mainWindow) {
        mainWindow.webContents.send("update-status", "Checking for update...");
    }
});

autoUpdater.on("update-available", (info) => {
    log.info(`Update available: v${info.version}`);
    if (mainWindow) {
        mainWindow.webContents.send(
            "update-status",
            `Update available: v${info.version}. Click 'Download & Install' to proceed.` // Updated status message
        );
        mainWindow.webContents.send("update-available", info.version);
    }
});

autoUpdater.on("update-not-available", () => {
    log.info("Update not available.");
    if (mainWindow) {
        mainWindow.webContents.send(
            "update-status",
            "No new update available."
        );
    }
});

autoUpdater.on("download-progress", (progressObj) => {
    let log_message = `Download speed: ${progressObj.bytesPerSecond} B/s`;
    log_message += ` - Downloaded ${progressObj.percent.toFixed(2)}%`;
    log_message += ` (${progressObj.transferred} / ${progressObj.total} bytes)`;
    log.info(log_message);
    if (mainWindow) {
        mainWindow.webContents.send("update-progress", progressObj.percent);
    }
});

autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded.");
    if (mainWindow) {
        mainWindow.webContents.send(
            "update-status",
            `Update downloaded: v${info.version}. Click 'Restart & Install' to apply.`
        );
        mainWindow.webContents.send("update-downloaded");
    }
});

autoUpdater.on("error", (err) => {
    log.error("Error in auto-updater:", err);
    if (mainWindow) {
        mainWindow.webContents.send(
            "update-status",
            `Error during update: ${err.message}`
        );
    }
});

ipcMain.on("restart_app", () => {
    log.info("Restarting app to install update...");
    autoUpdater.quitAndInstall();
});

// --- NEW: IPC handler to trigger update download ---
ipcMain.on("download_update", () => {
    log.info("User initiated update download.");
    autoUpdater.downloadUpdate();
});

// --- Backend Management Functions (rest of your backend functions remain the same) ---

/**
 * Determines the correct path to the backend executable.
 * In a packaged app, it's directly in the 'resources' folder due to 'extraResources' config.
 * In development, it's in the 'backend/dist' relative to main.js.
 */
function getBackendExecutablePath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "fastapibackend.exe");
    } else {
        return path.join(__dirname, "backend", "dist", "fastapibackend.exe");
    }
}

function startBackend() {
    const backendExePath = getBackendExecutablePath();

    console.log(`[BACKEND] Backend executable path: ${backendExePath}`);

    if (!fs.existsSync(backendExePath)) {
        dialog.showErrorBox(
            "Backend Error",
            `Backend executable not found at: ${backendExePath}\nPlease ensure you have built your Python backend with PyInstaller and that it's correctly placed by Electron Builder (check 'extraResources' in package.json).`
        );
        app.quit();
        return;
    }

    console.log(
        `[BACKEND] Attempting to spawn backend from: ${backendExePath}`
    );
    backendProcess = spawn(backendExePath);

    backendProcess.stdout.on("data", (data) => {
        console.log(`[BACKEND] stdout: ${data.toString().trim()}`);
    });

    backendProcess.stderr.on("data", (data) => {
        console.error(`[BACKEND] stderr: ${data.toString().trim()}`);
    });

    backendProcess.on("close", (code) => {
        console.log(`[BACKEND] process exited with code ${code}`);
        if (code !== 0 && code !== null) {
            dialog.showErrorBox(
                "Backend Crashed",
                `The backend application exited unexpectedly with code ${code}. Please check console for errors.`
            );
        }
    });

    backendProcess.on("error", (err) => {
        console.error(
            `[BACKEND] Failed to start backend process: ${err.message}`
        );
        dialog.showErrorBox(
            "Backend Launch Error",
            `Could not start the backend application. Error: ${err.message}`
        );
        app.quit();
    });
    console.log("[BACKEND] Backend process spawned.");
}

// Function to poll backend readiness
function pollBackendReady(callback, retries = 30, delay = 1000) {
    let attempts = 0;

    const check = () => {
        attempts++;
        console.log(
            `[BACKEND] Checking backend readiness... Attempt ${attempts}/${retries}`
        );
        const request = http.get(BACKEND_HEALTH_URL, (res) => {
            if (res.statusCode === 200) {
                console.log("[BACKEND] Backend is ready!");
                callback();
            } else {
                console.warn(
                    `[BACKEND] Backend responded with status ${res.statusCode}. Retrying...`
                );
                if (attempts < retries) {
                    setTimeout(check, delay);
                } else {
                    dialog.showErrorBox(
                        "Backend Timeout",
                        `Backend did not become ready within the expected time. Please check backend logs. URL: ${BACKEND_HEALTH_URL}`
                    );
                    app.quit();
                }
            }
        });

        request.on("error", (err) => {
            console.warn(
                `[BACKEND] Connection to backend failed: ${err.message}. Retrying...`
            );
            if (attempts < retries) {
                setTimeout(check, delay);
            } else {
                dialog.showErrorBox(
                    "Backend Timeout",
                    `Could not connect to backend within the expected time. Please ensure the backend is running and accessible at ${BACKEND_HEALTH_URL}. Error: ${err.message}`
                );
                app.quit();
            }
        });

        request.end();
    };
    check();
}

// --- Main Window Creation Function ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const frontendPath = path.join(__dirname, "frontend", "dist", "index.html");
    console.log(`[FRONTEND] Loading frontend from: ${frontendPath}`);

    if (fs.existsSync(frontendPath)) {
        mainWindow.loadFile(frontendPath);
    } else {
        dialog.showErrorBox(
            "Frontend Build Missing",
            `Frontend build not found at ${frontendPath}. Please run 'npm run build' in your 'frontend/' directory.`
        );
        app.quit();
    }

    mainWindow.webContents.openDevTools();
}

// --- Electron App Lifecycle Events ---
app.on("ready", () => {
    startBackend();

    pollBackendReady(() => {
        createWindow();
        setTimeout(() => {
            autoUpdater.checkForUpdatesAndNotify();
        }, 5000);
    });

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("will-quit", () => {
    if (backendProcess) {
        console.log("Terminating backend process...");

        let killTimeout;
        const checkAndKill = () => {
            // Check if the process is still running
            // process.kill(pid, 0) attempts to send a signal of 0, which only checks for the existence of the process.
            // It will throw an error if the process does not exist.
            try {
                process.kill(backendProcess.pid, 0);
                // If no error, process is still running, send SIGKILL
                console.log(
                    "Backend process still running, sending SIGKILL..."
                );
                backendProcess.kill("SIGKILL");
            } catch (e) {
                // Process does not exist (already terminated)
                console.log("Backend process already terminated.");
            } finally {
                clearTimeout(killTimeout); // Clear any pending timeout
            }
        };

        // Attempt to gracefully terminate first
        backendProcess.kill("SIGTERM");
        console.log("Sent SIGTERM to backend process.");

        // Set a timeout to forcefully kill if it doesn't exit gracefully
        killTimeout = setTimeout(checkAndKill, 5000); // Give it 5 seconds to respond to SIGTERM

        // Listen for the 'close' event to know when it has actually exited
        backendProcess.on("close", (code) => {
            console.log(`Backend process closed with code ${code}`);
            clearTimeout(killTimeout); // Clear the forceful kill timeout if it closes gracefully
        });

        backendProcess.on("error", (err) => {
            console.error(
                `Error with backend process during termination: ${err.message}`
            );
            clearTimeout(killTimeout);
        });
    }
});
