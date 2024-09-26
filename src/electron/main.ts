import { app, BrowserWindow } from 'electron';
import { exec, ChildProcess } from 'child_process';
import * as net from 'net';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let nestProcess: ChildProcess | null = null; // Reference for NestJS process

// Function to check if the server is up
function isPortTaken(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const tester = net.createServer().listen(port);
        tester.on('listening', () => {
            tester.close();
            resolve(false); // Port is free
        });
        tester.on('error', () => {
            resolve(true); // Port is taken
        });
    });
}

// Create the main window
async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Important for accessing Node.js in the renderer
        },
    });

    // Load your local index.html file
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Log when the page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Page loaded successfully');
    });

    // Log if the page fails to load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorDescription);
    });
}

// Initialize Electron app with single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit(); // If another instance is running, quit the new instance
} else {
    app.on('second-instance', () => {
        // If another instance is opened, focus the main window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        // Start the NestJS application
        nestProcess = exec('npm run start:prod');

        // Check if the server is ready
        const port = 3001;
        const checkInterval = setInterval(async () => {
            const isTaken = await isPortTaken(port);
            if (!isTaken) {
                clearInterval(checkInterval); // Stop checking
                createWindow();
            }
        });

        // Handle NestJS output
        nestProcess.stdout.on('data', (data) => {
            console.log(data);
        });
        nestProcess.stderr.on('data', (data) => {
            console.error(data);
        });

        // Handle application exit
        app.on('before-quit', () => {
            if (nestProcess) {
                nestProcess.kill(); // Kill the NestJS process
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (nestProcess) {
            nestProcess.kill(); // Kill the NestJS process if still running
        }
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
