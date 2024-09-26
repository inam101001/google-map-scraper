import { app, BrowserWindow } from 'electron';
import { exec } from 'child_process';
import * as net from 'net';

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
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Important for accessing Node.js in the renderer
        },
    });

    // Load the NestJS API
    mainWindow.loadURL('http://localhost:3001/api'); // Change to your NestJS app's URL

    // Log when the page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Page loaded successfully');
    });

    // Log if the page fails to load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorDescription);
    });
}

// Initialize Electron app
app.whenReady().then(() => {
    // Start the NestJS application
    const nestProcess = exec('npm run start:prod');

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

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
