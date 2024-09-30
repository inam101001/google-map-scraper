import { app, BrowserWindow } from 'electron';
import { ChildProcess } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import log from 'electron-log/main';
import { AppModule } from 'src/app.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        cors: {
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            allowedHeaders: '*',
            credentials: true,
        },
    });
    await app.listen(3001);
}


let mainWindow: BrowserWindow | null = null;
const nestProcess: ChildProcess | null = null; 

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
    log.info('Creating main window...');
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Important for accessing Node.js in the renderer
        },
    });

    // Load your local index.html file
    mainWindow.loadFile(path.join(__dirname, 'assets', 'index.html'));

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

        // Check if the server is ready
        log.info('Checking if PORT 3001 is taken...');
        const port = 3001;
        const checkInterval = setInterval(async () => {
            const isTaken = await isPortTaken(port);
            if (!isTaken) {
                log.info('PORT 3001 is free, starting the server...');
                clearInterval(checkInterval); // Stop checking
                bootstrap();
                createWindow();
            }
            if (isTaken) {
                log.info('PORT 3001 is taken');
            }
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
