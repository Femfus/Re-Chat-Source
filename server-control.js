#!/usr/bin/env node

/**
 * Re-Chat.to Server Control - Node.js Version
 * A server management tool for the Re-Chat.to secure PGP chat application
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const findProcess = require('find-process');
const portfinder = require('portfinder');
const { format } = require('date-fns');

// Constants
const ERROR_DIR = path.join(__dirname, 'errors');
const DEFAULT_BACKEND_PORT = 5000;
const DEFAULT_FRONTEND_PORT = 3000;

// Create error directory if it doesn't exist
if (!fs.existsSync(ERROR_DIR)) {
  fs.mkdirSync(ERROR_DIR, { recursive: true });
}

// Process tracking
const processes = {};

/**
 * Utility function to log errors to file
 */
function logError(errorType, message, stackTrace = null) {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const logFile = path.join(ERROR_DIR, `error_log_${timestamp}.txt`);
  
  const content = [
    '='.repeat(50),
    `TIMESTAMP: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
    `TYPE: ${errorType}`,
    `MESSAGE: ${message}`,
    stackTrace ? `\nTRACEBACK:\n${stackTrace}` : '',
    '='.repeat(50),
    '\n'
  ].join('\n');
  
  fs.appendFileSync(logFile, content, 'utf8');
  return logFile;
}

/**
 * Check if a port is in use
 */
async function isPortInUse(port) {
  try {
    const processes = await findProcess('port', port);
    return processes.length > 0;
  } catch (error) {
    logError('Port Check Error', error.message, error.stack);
    return false;
  }
}

/**
 * Find an available port
 */
async function findAvailablePort(startPort) {
  portfinder.basePort = startPort;
  try {
    return await portfinder.getPortPromise();
  } catch (error) {
    logError('Port Finder Error', error.message, error.stack);
    return startPort + 1; // Fallback to startPort+1
  }
}

/**
 * Create the browser window
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#282a36', // Dracula theme background
    show: false
  });

  // Load the HTML file
  mainWindow.loadFile('server-control.html');
  
  // Show window when ready to avoid white flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Log application start
    logError('INFO', 'Server Control Panel Started');
  });
  
  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Start the backend server
 */
async function startBackend(port = DEFAULT_BACKEND_PORT) {
  try {
    if (processes.backend && !processes.backend.killed) {
      return { success: false, message: 'Backend is already running.' };
    }
    
    // Set environment variables
    const env = { ...process.env, PORT: port.toString() };
    
    // Start backend process
    const backendProcess = spawn('npm', ['run', 'server'], {
      cwd: __dirname,
      env,
      shell: true
    });
    
    processes.backend = backendProcess;
    
    return { 
      success: true, 
      message: `Backend server started on port ${port}`,
      pid: backendProcess.pid
    };
  } catch (error) {
    logError('Backend Start Error', error.message, error.stack);
    return { success: false, message: `Failed to start backend: ${error.message}` };
  }
}

/**
 * Stop the backend server
 */
async function stopBackend() {
  try {
    if (!processes.backend || processes.backend.killed) {
      return { success: false, message: 'Backend is not running.' };
    }
    
    // Platform-specific process killing
    if (process.platform === 'win32') {
      // On Windows, kill the process tree
      exec(`taskkill /F /T /PID ${processes.backend.pid}`);
    } else {
      // On Unix-like systems
      processes.backend.kill('SIGTERM');
    }
    
    return { success: true, message: 'Backend server stopped.' };
  } catch (error) {
    logError('Backend Stop Error', error.message, error.stack);
    return { success: false, message: `Error stopping backend: ${error.message}` };
  }
}

/**
 * Start the frontend server
 */
async function startFrontend(port = DEFAULT_FRONTEND_PORT) {
  try {
    if (processes.frontend && !processes.frontend.killed) {
      return { success: false, message: 'Frontend is already running.' };
    }
    
    // Set environment variables
    const env = { ...process.env, PORT: port.toString() };
    
    // Start frontend process
    const frontendProcess = spawn('npm', ['start'], {
      cwd: __dirname,
      env,
      shell: true
    });
    
    processes.frontend = frontendProcess;
    
    return { 
      success: true, 
      message: `Frontend server started on port ${port}`,
      pid: frontendProcess.pid
    };
  } catch (error) {
    logError('Frontend Start Error', error.message, error.stack);
    return { success: false, message: `Failed to start frontend: ${error.message}` };
  }
}

/**
 * Stop the frontend server
 */
async function stopFrontend() {
  try {
    if (!processes.frontend || processes.frontend.killed) {
      return { success: false, message: 'Frontend is not running.' };
    }
    
    // Platform-specific process killing
    if (process.platform === 'win32') {
      // On Windows, kill the process tree
      exec(`taskkill /F /T /PID ${processes.frontend.pid}`);
    } else {
      // On Unix-like systems
      processes.frontend.kill('SIGTERM');
    }
    
    return { success: true, message: 'Frontend server stopped.' };
  } catch (error) {
    logError('Frontend Stop Error', error.message, error.stack);
    return { success: false, message: `Error stopping frontend: ${error.message}` };
  }
}

/**
 * Start all services
 */
async function startAll() {
  const backendResult = await startBackend();
  const frontendResult = await startFrontend();
  
  return {
    success: backendResult.success && frontendResult.success,
    message: 'All services started.',
    details: {
      backend: backendResult,
      frontend: frontendResult
    }
  };
}

/**
 * Stop all services
 */
async function stopAll() {
  const backendResult = await stopBackend();
  const frontendResult = await stopFrontend();
  
  return {
    success: true,
    message: 'All services stopped.',
    details: {
      backend: backendResult,
      frontend: frontendResult
    }
  };
}

/**
 * Run a custom npm command or special commands
 */
async function runCommand(command) {
  try {
    if (!command) {
      return { success: false, message: 'No command specified' };
    }
    
    // Handle special commands
    if (command === 'clear') {
      return { 
        success: true, 
        message: 'clear',
        special: 'clear'
      };
    }
    
    if (command === 'errors') {
      return { 
        success: true, 
        message: 'Showing only errors',
        special: 'errors'
      };
    }
    
    // Run npm command
    const process = spawn('npm', [command], {
      cwd: __dirname,
      shell: true
    });
    
    // Return process info
    return { 
      success: true, 
      message: `Running npm ${command}`,
      pid: process.pid,
      process: process
    };
  } catch (error) {
    logError('Custom Command Error', error.message, error.stack);
    return { success: false, message: `Error running command: ${error.message}` };
  }
}

/**
 * Export error logs
 */
function exportErrorLogs(targetPath) {
  try {
    const errorFiles = fs.readdirSync(ERROR_DIR)
      .filter(file => file.startsWith('error_log_') && file.endsWith('.txt'))
      .map(file => path.join(ERROR_DIR, file));
    
    if (errorFiles.length === 0) {
      return { success: false, message: 'No error logs found to export.' };
    }
    
    // Concatenate all log files
    let combinedLogs = '';
    errorFiles.forEach(file => {
      combinedLogs += fs.readFileSync(file, 'utf8') + '\n';
    });
    
    // Write to the target path
    fs.writeFileSync(targetPath, combinedLogs, 'utf8');
    
    return { success: true, message: `Logs exported to ${targetPath}` };
  } catch (error) {
    logError('Log Export Error', error.message, error.stack);
    return { success: false, message: `Error exporting logs: ${error.message}` };
  }
}

// Set up IPC handlers for communication with renderer process
ipcMain.handle('start-backend', async (_, port) => {
  return await startBackend(port);
});

ipcMain.handle('stop-backend', async () => {
  return await stopBackend();
});

ipcMain.handle('start-frontend', async (_, port) => {
  return await startFrontend(port);
});

ipcMain.handle('stop-frontend', async () => {
  return await stopFrontend();
});

ipcMain.handle('start-all', async () => {
  return await startAll();
});

ipcMain.handle('stop-all', async () => {
  return await stopAll();
});

ipcMain.handle('run-command', async (_, command) => {
  return await runCommand(command);
});

ipcMain.handle('export-logs', async (_, targetPath) => {
  return exportErrorLogs(targetPath);
});

ipcMain.handle('check-status', async () => {
  return {
    backend: processes.backend && !processes.backend.killed,
    frontend: processes.frontend && !processes.frontend.killed
  };
});

// Handle process output
function setupProcessListeners(process, name, window) {
  if (!process) return;
  
  process.stdout.on('data', (data) => {
    const output = data.toString();
    const timestamp = format(new Date(), 'HH:mm:ss');
    let type = 'info';
    
    // Determine message type based on content
    if (/error|err|exception/i.test(output)) {
      type = 'error';
      logError(`${name} Error`, output.trim());
    } else if (/warn|warning/i.test(output)) {
      type = 'warning';
    } else if (/success|done|listening/i.test(output)) {
      type = 'success';
    }
    
    // Send to renderer
    window.webContents.send('process-output', {
      name,
      output, 
      timestamp,
      type
    });
  });
  
  process.stderr.on('data', (data) => {
    const output = data.toString();
    const timestamp = format(new Date(), 'HH:mm:ss');
    
    // Log error and send to renderer
    logError(`${name} Error`, output.trim());
    window.webContents.send('process-output', {
      name,
      output, 
      timestamp,
      type: 'error'
    });
  });
  
  process.on('close', (code) => {
    const timestamp = format(new Date(), 'HH:mm:ss');
    const output = `${name} process exited with code ${code}`;
    const type = code === 0 ? 'success' : 'error';
    
    // Send to renderer
    window.webContents.send('process-output', {
      name,
      output, 
      timestamp,
      type
    });
    
    // Update process status
    window.webContents.send('status-update', {
      [name.toLowerCase()]: false
    });
  });
}

// App events
app.whenReady().then(() => {
  createWindow();
  
  // Set up process listeners when the window is created
  const mainWindow = BrowserWindow.getAllWindows()[0];
  
  // Listen for backend process creation
  ipcMain.on('backend-process-created', (_, pid) => {
    if (processes.backend) {
      setupProcessListeners(processes.backend, 'Backend', mainWindow);
    }
  });
  
  // Listen for frontend process creation
  ipcMain.on('frontend-process-created', (_, pid) => {
    if (processes.frontend) {
      setupProcessListeners(processes.frontend, 'Frontend', mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  // Clean up and stop all processes
  stopAll().then(() => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error.message, error.stack);
});
