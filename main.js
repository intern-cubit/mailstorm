const { app, BrowserWindow, dialog, ipcMain } = require("electron"); // Added ipcMain
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http"); // For polling backend readiness
const { autoUpdater } = require("electron-updater"); // For auto-updates
const log = require("electron-log"); // Recommended for better auto-updater logging

// --- Global Variables ---
let backendProcess;
let mainWindow;
const BACKEND_PORT = 8000;
const BACKEND_HEALTH_URL = `http://localhost:${BACKEND_PORT}/health`; // Backend health check endpoint

// --- Auto-Updater Configuration & Logic ---
// Configure electron-log for auto-updater
log.transports.file.level = "info";
autoUpdater.logger = log;

// Auto-download updates once available
autoUpdater.autoDownload = true;

// Event listeners for autoUpdater
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
            `Update available: v${info.version}`
        );
        mainWindow.webContents.send("update-available", info.version); // Send new version info
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
        mainWindow.webContents.send("update-progress", progressObj.percent); // Send progress to renderer
    }
});

autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded.");
    if (mainWindow) {
        mainWindow.webContents.send(
            "update-status",
            `Update downloaded: v${info.version}. Click 'Restart & Install' to apply.`
        );
        mainWindow.webContents.send("update-downloaded"); // Tell renderer to show restart button
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

// IPC handler to restart and install the update from renderer
ipcMain.on("restart_app", () => {
    log.info("Restarting app to install update...");
    autoUpdater.quitAndInstall();
});

// --- Backend Management Functions ---
function startBackend() {
    let isProd;
    (async () => {
        const electronIsDev = await import("electron-is-dev");
        isProd = electronIsDev.default ? false : true; 
    })();
    const backendPath = isProd
        ? path.join(process.resourcesPath, "fastapibackend.exe")
        : path.join(__dirname, "backend", "dist", "fastapibackend.exe");

    console.log(`[BACKEND] Backend path: ${backendPath}`);
    if (!fs.existsSync(backendPath)) {
        dialog.showErrorBox(
            "Backend Error",
            `Backend executable not found at: ${backendPath}\nPlease ensure you have built your Python backend with PyInstaller.`
        );
        app.quit();
        return; // Exit if backend not found
    }

    console.log(`[BACKEND] Attempting to spawn backend from: ${backendPath}`);
    backendProcess = spawn(backendPath);

    backendProcess.stdout.on("data", (data) => {
        console.log(`[BACKEND] stdout: ${data.toString().trim()}`);
    });

    backendProcess.stderr.on("data", (data) => {
        console.error(`[BACKEND] stderr: ${data.toString().trim()}`);
    });

    backendProcess.on("close", (code) => {
        console.log(`[BACKEND] process exited with code ${code}`);
        if (code !== 0 && code !== null) {
            // Non-zero exit code usually means an error
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
    // 30 retries * 1 sec = 30 seconds wait
    let attempts = 0;

    const check = () => {
        attempts++;
        console.log(
            `[BACKEND] Checking backend readiness... Attempt ${attempts}/${retries}`
        );
        const request = http.get(BACKEND_HEALTH_URL, (res) => {
            if (res.statusCode === 200) {
                console.log("[BACKEND] Backend is ready!");
                callback(); // Call the callback (createWindow) when ready
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

        request.end(); // Important to end the request
    };
    check(); // Start the first check
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

    // Open the DevTools to see any console errors from the frontend
    // Comment out for production release if you don't want users to access DevTools
    mainWindow.webContents.openDevTools();
}

// --- Electron App Lifecycle Events ---
app.on("ready", () => {
    startBackend(); // 1. Start the backend process

    // 2. Poll for backend readiness, then create the main window
    pollBackendReady(() => {
        createWindow();
        // 3. Check for updates a few seconds after the window is created
        // This gives the app a moment to render and ensures the auto-updater is ready.
        setTimeout(() => {
            autoUpdater.checkForUpdatesAndNotify(); // Or checkForUpdates() for manual UI
        }, 5000); // Wait 5 seconds before checking for updates
    });

    // Handle macOS specific behavior when app is activated (e.g., from dock)
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS (Cmd+Q)
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// Terminate backend process when Electron app is quitting
app.on("will-quit", () => {
    if (backendProcess) {
        console.log("Terminating backend process...");
        // SIGTERM is a graceful termination signal
        backendProcess.kill("SIGTERM");
        // You might add a timeout and then SIGKILL if it doesn't close fast enough
        setTimeout(() => {
            if (!backendProcess.killed) {
                console.log(
                    "Backend process did not terminate, sending SIGKILL..."
                );
                backendProcess.kill("SIGKILL");
            }
        }, 5000); // Give it 5 seconds to gracefully exit
    }
});
