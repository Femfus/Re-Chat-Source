import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import subprocess
import threading
import os
import signal
import sys
import time
import shutil
import socket
from datetime import datetime
import traceback

# Error logging directory
ERROR_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'errors')
if not os.path.exists(ERROR_DIR):
    os.makedirs(ERROR_DIR)

# Utility Functions
def log_error(error_type, message, tb_info=None):
    """Log error to a file in the errors directory"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(ERROR_DIR, f"error_log_{timestamp}.txt")
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(f"\n{'=' * 50}\n")
        f.write(f"TIMESTAMP: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"TYPE: {error_type}\n")
        f.write(f"MESSAGE: {message}\n")
        if tb_info:
            f.write(f"\nTRACEBACK:\n{tb_info}\n")
        f.write(f"{'=' * 50}\n\n")
    
    return log_file

def is_port_in_use(port):
    """Check if a port is in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def find_available_port(start_port, max_attempts=10):
    """Find an available port starting from start_port"""
    port = start_port
    attempts = 0
    
    while attempts < max_attempts:
        if not is_port_in_use(port):
            return port
        port += 1
        attempts += 1
    
    return None  # No available port found

def find_npm():
    """Find the npm executable"""
    npm_cmd = 'npm.cmd' if sys.platform == 'win32' else 'npm'
    npm_path = shutil.which(npm_cmd)
    
    if npm_path is None:
        # Try common locations
        common_paths = [
            r'C:\Program Files\nodejs\npm.cmd',
            r'C:\Program Files (x86)\nodejs\npm.cmd',
            os.path.expanduser('~') + r'\AppData\Roaming\npm\npm.cmd'
        ]
        
        for path in common_paths:
            if os.path.exists(path):
                return path
        
        # Last resort, return just 'npm' and let shell resolve it
        return 'npm' if sys.platform == 'win32' else None
    
    return npm_path

class ServerControlPanel:
    def __init__(self, root):
        self.root = root
        self.root.title("Re-Chat.to Server Control")
        self.root.geometry("800x600")
        
        # Theme colors - Dracula theme
        self.bg_color = "#282a36"
        self.text_color = "#f8f8f2"
        self.accent_color = "#bd93f9"
        self.success_color = "#50fa7b"
        self.error_color = "#ff5555"
        self.warning_color = "#ffb86c"
        
        # Process tracking
        self.processes = {}
        
        # Port configuration
        self.backend_port = 5000
        self.frontend_port = find_available_port(3000) or 3001
        
        # Configure root
        self.root.configure(bg=self.bg_color)
        self.root.tk_setPalette(
            background=self.bg_color,
            foreground=self.text_color,
            activeBackground=self.accent_color,
            activeForeground=self.text_color
        )
        
        # Create main frame
        self.main_frame = ttk.Frame(self.root, padding=10)
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Create UI
        self._create_styles()
        self._create_controls()
        self._create_console()
        
        # Create a modern status bar
        status_frame = ttk.Frame(self.root, style="Card.TFrame")
        status_frame.pack(side=tk.BOTTOM, fill=tk.X)
        
        self.status_bar = ttk.Label(status_frame, text="Ready", anchor=tk.W, padding=(10, 5))
        self.status_bar.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Set up periodic status check
        self.root.after(2000, self._check_processes)
        
        # Log startup
        log_error("INFO", "Server Control Panel Started")
        
    def _create_styles(self):
        """Configure styles for the UI"""
        self.style = ttk.Style()
        
        try:
            self.style.theme_use('clam')
        except tk.TclError:
            pass
        
        # Configure base styles
        self.style.configure('.', 
                         background=self.bg_color, 
                         foreground=self.text_color)
        
        # Modern button styles
        self.style.configure("TButton", 
                         padding=8,
                         relief=tk.FLAT,
                         background=self.accent_color,
                         foreground=self.text_color,
                         font=("Segoe UI", 10, "bold"))
        
        self.style.map("TButton",
                    background=[('active', '#a277ff'), ('pressed', '#9263ff')],
                    foreground=[('active', '#ffffff'), ('pressed', '#ffffff')],
                    relief=[('active', tk.FLAT), ('pressed', tk.FLAT)])
        
        # Create success button style
        self.style.configure("Success.TButton", 
                         background=self.success_color,
                         foreground="#282a36")
        self.style.map("Success.TButton",
                    background=[('active', '#6dffb0'), ('pressed', '#3efa7b')],
                    foreground=[('active', '#282a36'), ('pressed', '#282a36')])
        
        # Create warning button style
        self.style.configure("Warning.TButton", 
                         background=self.warning_color,
                         foreground="#282a36")
        self.style.map("Warning.TButton",
                    background=[('active', '#ffcb8c'), ('pressed', '#ffb154')],
                    foreground=[('active', '#282a36'), ('pressed', '#282a36')])
        
        # Frame styles
        self.style.configure("TFrame", background=self.bg_color)
        self.style.configure("Card.TFrame", 
                         background="#313341",
                         relief=tk.RIDGE,
                         borderwidth=1)
        
        # Label styles
        self.style.configure("TLabel", 
                         background=self.bg_color,
                         foreground=self.text_color,
                         font=("Segoe UI", 10))
        
        # Header label style
        self.style.configure("Header.TLabel", 
                         font=("Segoe UI", 16, "bold"),
                         foreground="#bd93f9")
        
        # Subheader label style
        self.style.configure("Subheader.TLabel", 
                         font=("Segoe UI", 12, "bold"),
                         foreground="#f8f8f2")
        
        # LabelFrame styles
        self.style.configure("TLabelframe", 
                         background="#313341",
                         foreground=self.text_color,
                         borderwidth=1,
                         relief=tk.RIDGE)
        self.style.configure("TLabelframe.Label", 
                         background=self.bg_color,
                         foreground="#bd93f9",
                         font=("Segoe UI", 11, "bold"))
        
        # Entry styles
        self.style.configure("TEntry", 
                         fieldbackground="#21222c",
                         foreground=self.text_color,
                         borderwidth=1,
                         relief=tk.FLAT,
                         padding=8)
        
        # Status indicator styles
        self.style.configure("Success.TLabel", foreground=self.success_color, font=("Segoe UI", 10, "bold"))
        self.style.configure("Error.TLabel", foreground=self.error_color, font=("Segoe UI", 10, "bold"))
        self.style.configure("Warning.TLabel", foreground=self.warning_color, font=("Segoe UI", 10, "bold"))
        
    def _create_controls(self):
        """Create control buttons and status indicators"""
        # Header with app title and logo
        header_frame = ttk.Frame(self.main_frame)
        header_frame.pack(fill=tk.X, pady=(5, 15))
        
        title = ttk.Label(header_frame, text="Re-Chat.to Server Control", style="Header.TLabel")
        title.pack(pady=(5, 10))
        
        subtitle = ttk.Label(header_frame, text="Secure PGP Chat Administration", style="Subheader.TLabel")
        subtitle.pack(pady=(0, 15))
        
        # Main controls section
        controls_frame = ttk.Frame(self.main_frame, style="Card.TFrame")
        controls_frame.pack(fill=tk.X, padx=10, pady=(0, 15))
        
        # Section title
        service_title = ttk.Label(controls_frame, text="Services", style="Subheader.TLabel")
        service_title.pack(anchor=tk.W, padx=15, pady=(15, 10))
        
        # Service controls container
        service_container = ttk.Frame(controls_frame)
        service_container.pack(fill=tk.X, padx=15, pady=(0, 15))
        
        # Backend controls
        backend_frame = ttk.LabelFrame(service_container, text="Backend Server")
        backend_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10), pady=5)
        
        # Status indicator for backend
        status_frame_backend = ttk.Frame(backend_frame)
        status_frame_backend.pack(fill=tk.X, padx=10, pady=(10, 0))
        
        ttk.Label(status_frame_backend, text="Status:").pack(side=tk.LEFT)
        self.backend_status = ttk.Label(status_frame_backend, text="Stopped", style="Error.TLabel")
        self.backend_status.pack(side=tk.LEFT, padx=(5, 0))
        
        # Port display for backend
        port_frame_backend = ttk.Frame(backend_frame)
        port_frame_backend.pack(fill=tk.X, padx=10, pady=(5, 10))
        
        ttk.Label(port_frame_backend, text="Port:").pack(side=tk.LEFT)
        ttk.Label(port_frame_backend, text=str(self.backend_port)).pack(side=tk.LEFT, padx=(5, 0))
        
        # Button for backend
        self.backend_btn = ttk.Button(backend_frame, text="Start Backend", command=self.start_backend)
        self.backend_btn.pack(fill=tk.X, padx=10, pady=(0, 10))
        
        # Frontend controls
        frontend_frame = ttk.LabelFrame(service_container, text="Frontend Server")
        frontend_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(10, 0), pady=5)
        
        # Status indicator for frontend
        status_frame_frontend = ttk.Frame(frontend_frame)
        status_frame_frontend.pack(fill=tk.X, padx=10, pady=(10, 0))
        
        ttk.Label(status_frame_frontend, text="Status:").pack(side=tk.LEFT)
        self.frontend_status = ttk.Label(status_frame_frontend, text="Stopped", style="Error.TLabel")
        self.frontend_status.pack(side=tk.LEFT, padx=(5, 0))
        
        # Port display for frontend
        port_frame_frontend = ttk.Frame(frontend_frame)
        port_frame_frontend.pack(fill=tk.X, padx=10, pady=(5, 10))
        
        ttk.Label(port_frame_frontend, text="Port:").pack(side=tk.LEFT)
        ttk.Label(port_frame_frontend, text=str(self.frontend_port)).pack(side=tk.LEFT, padx=(5, 0))
        
        # Button for frontend
        self.frontend_btn = ttk.Button(frontend_frame, text="Start Frontend", command=self.start_frontend)
        self.frontend_btn.pack(fill=tk.X, padx=10, pady=(0, 10))
        
        # Group actions in a card
        actions_card = ttk.Frame(self.main_frame, style="Card.TFrame")
        actions_card.pack(fill=tk.X, padx=10, pady=(0, 15))
        
        # Section title
        actions_title = ttk.Label(actions_card, text="Quick Actions", style="Subheader.TLabel")
        actions_title.pack(anchor=tk.W, padx=15, pady=(15, 10))
        
        # Action buttons container
        action_frame = ttk.Frame(actions_card)
        action_frame.pack(fill=tk.X, padx=15, pady=(0, 15))
        
        # Start All button with success style
        start_all_btn = ttk.Button(action_frame, text="Start All Services", 
                               style="Success.TButton", command=self.start_all)
        start_all_btn.pack(side=tk.LEFT, padx=(0, 5), fill=tk.X, expand=True)
        
        # Stop All button with warning style
        stop_all_btn = ttk.Button(action_frame, text="Stop All Services",
                              style="Warning.TButton", command=self.stop_all)
        stop_all_btn.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)
        
        # Export logs button
        export_logs_btn = ttk.Button(action_frame, text="Export Error Logs",
                                 command=self.export_error_logs)
        export_logs_btn.pack(side=tk.LEFT, padx=(5, 0), fill=tk.X, expand=True)
        
    def _create_console(self):
        """Create console output area with modern styling"""
        # Console card
        console_card = ttk.Frame(self.main_frame, style="Card.TFrame")
        console_card.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 15))
        
        # Console header
        console_header = ttk.Label(console_card, text="Console Output", style="Subheader.TLabel")
        console_header.pack(anchor=tk.W, padx=15, pady=(15, 10))
        
        # Console container
        console_container = ttk.Frame(console_card)
        console_container.pack(fill=tk.BOTH, expand=True, padx=15, pady=(0, 15))
        
        # Console text widget with improved styling
        self.console = scrolledtext.ScrolledText(console_container, 
                                            wrap=tk.WORD,
                                            height=15, 
                                            bg="#21222c",
                                            fg=self.text_color,
                                            font=("Consolas", 10),
                                            padx=10,
                                            pady=10,
                                            bd=0,
                                            relief=tk.FLAT)
        self.console.pack(fill=tk.BOTH, expand=True)
        self.console.config(state=tk.DISABLED)
        
        # Style the scrollbar
        self.console.vbar.config(troughcolor="#313341", bg="#44475a")
        
        # Configure tags for different message types
        self.console.tag_configure("error", foreground=self.error_color)
        self.console.tag_configure("success", foreground=self.success_color)
        self.console.tag_configure("warning", foreground=self.warning_color)
        self.console.tag_configure("command", foreground="#8be9fd")
        self.console.tag_configure("timestamp", foreground="#6272a4")
        
        # Command card
        cmd_card = ttk.Frame(self.main_frame, style="Card.TFrame")
        cmd_card.pack(fill=tk.X, padx=10, pady=(0, 15))
        
        # Command header
        cmd_header = ttk.Label(cmd_card, text="Custom NPM Command", style="Subheader.TLabel")
        cmd_header.pack(anchor=tk.W, padx=15, pady=(15, 10))
        
        # Command container
        cmd_container = ttk.Frame(cmd_card)
        cmd_container.pack(fill=tk.X, padx=15, pady=(0, 15))
        
        # Command input with label
        cmd_input_frame = ttk.Frame(cmd_container)
        cmd_input_frame.pack(fill=tk.X, expand=True)
        
        # Display 'npm' prefix
        npm_prefix = ttk.Label(cmd_input_frame, text="npm", foreground="#8be9fd", font=("Consolas", 10, "bold"))
        npm_prefix.pack(side=tk.LEFT, padx=(0, 5))
        
        # Custom entry field
        self.cmd_entry = ttk.Entry(cmd_input_frame, style="TEntry")
        self.cmd_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        self.cmd_entry.bind("<Return>", lambda event: self.run_command())
        self.cmd_entry.insert(0, "start")  # Default command
        
        # Run button with accent color
        run_btn = ttk.Button(cmd_input_frame, text="Execute", command=self.run_command)
        run_btn.pack(side=tk.RIGHT)
        
    def _write_to_console(self, text, tag=None):
        """Write text to the console with an optional tag and timestamp"""
        self.console.config(state=tk.NORMAL)
        
        # Add timestamp
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.console.insert(tk.END, f"[{timestamp}] ", "timestamp")
        
        # Format the message based on tag
        if tag == "error":
            self.console.insert(tk.END, "ERROR: ", "error")
            self.console.insert(tk.END, text, "error")
        elif tag == "success":
            self.console.insert(tk.END, "SUCCESS: ", "success")
            self.console.insert(tk.END, text, "success")
        elif tag == "warning":
            self.console.insert(tk.END, "WARNING: ", "warning")
            self.console.insert(tk.END, text, "warning")
        elif tag == "command":
            self.console.insert(tk.END, "COMMAND: ", "command")
            self.console.insert(tk.END, text)
        else:
            self.console.insert(tk.END, text)
            
        self.console.see(tk.END)
        self.console.config(state=tk.DISABLED)
        
    def _update_status_bar(self, text):
        """Update the status bar text"""
        self.status_bar.config(text=text)
        
    def _check_processes(self):
        """Periodically check process status and update UI"""
        try:
            # Check backend
            if 'backend' in self.processes and self.processes['backend'].poll() is None:
                self.backend_status.config(text="Running", style="Success.TLabel")
                self.backend_btn.config(text="Stop Backend", command=self.stop_backend)
            else:
                self.backend_status.config(text="Stopped", style="Error.TLabel")
                self.backend_btn.config(text="Start Backend", command=self.start_backend)
                
            # Check frontend
            if 'frontend' in self.processes and self.processes['frontend'].poll() is None:
                self.frontend_status.config(text="Running", style="Success.TLabel")
                self.frontend_btn.config(text="Stop Frontend", command=self.stop_frontend)
            else:
                self.frontend_status.config(text="Stopped", style="Error.TLabel")
                self.frontend_btn.config(text="Start Frontend", command=self.start_frontend)
        except Exception as e:
            log_error("Status Check Error", str(e), traceback.format_exc())
            
        # Schedule next check
        self.root.after(2000, self._check_processes)
        
    def _read_process_output(self, process, name):
        """Read output from a process with improved formatting"""
        try:
            for line in iter(process.stdout.readline, ''):
                if not line:
                    break
                    
                # Format line based on content
                line_lower = line.lower()
                if "error" in line_lower or "err" in line_lower or "exception" in line_lower:
                    self._write_to_console(f"{name}: {line}", "error")
                    log_error(f"{name} Error", line.strip())
                elif "warn" in line_lower or "warning" in line_lower:
                    self._write_to_console(f"{name}: {line}", "warning")
                elif "success" in line_lower or "done" in line_lower or "listening" in line_lower:
                    self._write_to_console(f"{name}: {line}", "success")
                else:
                    self._write_to_console(f"{name}: {line}")
        except Exception as e:
            self._write_to_console(f"Error reading {name} output: {str(e)}\n", "error")
            log_error("Process Output Error", str(e), traceback.format_exc())
    
    def start_backend(self):
        """Start the backend server"""
        if 'backend' in self.processes and self.processes['backend'].poll() is None:
            self._write_to_console("Backend is already running.\n", "warning")
            return
            
        self._write_to_console("Starting backend server...\n")
        self._update_status_bar("Starting backend server...")
        
        try:
            # Get project directory
            project_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Find npm
            npm_path = find_npm()
            if npm_path is None:
                raise Exception("npm executable not found. Please make sure Node.js is installed.")
                
            # Set environment
            env = os.environ.copy()
            env['PORT'] = str(self.backend_port)
            
            # Start backend process
            backend_process = subprocess.Popen(
                [npm_path, "run", "server"],
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                env=env,
                shell=True
            )
            
            # Store the process
            self.processes['backend'] = backend_process
            
            # Start thread to read output
            threading.Thread(
                target=self._read_process_output,
                args=(backend_process, "Backend"),
                daemon=True
            ).start()
            
            self._write_to_console(f"Backend server started on port {self.backend_port}\n", "success")
            self._update_status_bar(f"Backend running on port {self.backend_port}")
            
        except Exception as e:
            self._write_to_console(f"Failed to start backend: {str(e)}\n", "error")
            log_error("Backend Start Error", str(e), traceback.format_exc())
            self._update_status_bar(f"Error: {str(e)}")
    
    def stop_backend(self):
        """Stop the backend server"""
        if 'backend' not in self.processes or self.processes['backend'].poll() is not None:
            self._write_to_console("Backend is not running.\n", "warning")
            return
            
        self._write_to_console("Stopping backend server...\n")
        
        try:
            process = self.processes['backend']
            
            # Try to terminate gracefully
            if sys.platform == 'win32':
                # On Windows, use taskkill to kill the process tree
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)],
                           capture_output=True, text=True)
            else:
                # On Unix-like systems, send SIGTERM
                process.terminate()
                process.wait(timeout=5)
                
            self._write_to_console("Backend server stopped.\n", "success")
            self._update_status_bar("Backend server stopped")
            
        except Exception as e:
            self._write_to_console(f"Error stopping backend: {str(e)}\n", "error")
            log_error("Backend Stop Error", str(e), traceback.format_exc())
            
    def start_frontend(self):
        """Start the frontend server"""
        if 'frontend' in self.processes and self.processes['frontend'].poll() is None:
            self._write_to_console("Frontend is already running.\n", "warning")
            return
            
        self._write_to_console("Starting frontend server...\n")
        self._update_status_bar("Starting frontend server...")
        
        try:
            # Get project directory
            project_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Find npm
            npm_path = find_npm()
            if npm_path is None:
                raise Exception("npm executable not found. Please make sure Node.js is installed.")
                
            # Set environment
            env = os.environ.copy()
            env['PORT'] = str(self.frontend_port)
            
            # Start frontend process
            frontend_process = subprocess.Popen(
                [npm_path, "start"],
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                env=env,
                shell=True
            )
            
            # Store the process
            self.processes['frontend'] = frontend_process
            
            # Start thread to read output
            threading.Thread(
                target=self._read_process_output,
                args=(frontend_process, "Frontend"),
                daemon=True
            ).start()
            
            self._write_to_console(f"Frontend server started on port {self.frontend_port}\n", "success")
            self._update_status_bar(f"Frontend running on port {self.frontend_port}")
            
        except Exception as e:
            self._write_to_console(f"Failed to start frontend: {str(e)}\n", "error")
            log_error("Frontend Start Error", str(e), traceback.format_exc())
            self._update_status_bar(f"Error: {str(e)}")
    
    def stop_frontend(self):
        """Stop the frontend server"""
        if 'frontend' not in self.processes or self.processes['frontend'].poll() is not None:
            self._write_to_console("Frontend is not running.\n", "warning")
            return
            
        self._write_to_console("Stopping frontend server...\n")
        
        try:
            process = self.processes['frontend']
            
            # Try to terminate gracefully
            if sys.platform == 'win32':
                # On Windows, use taskkill to kill the process tree
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)],
                           capture_output=True, text=True)
            else:
                # On Unix-like systems, send SIGTERM
                process.terminate()
                process.wait(timeout=5)
                
            self._write_to_console("Frontend server stopped.\n", "success")
            self._update_status_bar("Frontend server stopped")
            
        except Exception as e:
            self._write_to_console(f"Error stopping frontend: {str(e)}\n", "error")
            log_error("Frontend Stop Error", str(e), traceback.format_exc())
    
    def start_all(self):
        """Start both backend and frontend"""
        self._write_to_console("Starting all services...\n")
        self.start_backend()
        self.start_frontend()
        self._write_to_console("All services started.\n", "success")
    
    def stop_all(self):
        """Stop all running services"""
        self._write_to_console("Stopping all services...\n")
        self.stop_backend()
        self.stop_frontend()
        self._write_to_console("All services stopped.\n", "success")
        self._update_status_bar("All services stopped")
    
    def run_command(self):
        """Run a custom npm command"""
        cmd = self.cmd_entry.get().strip()
        if not cmd:
            self._write_to_console("No command specified\n", "warning")
            return
            
        self._write_to_console(f"npm {cmd}\n", "command")
        
        try:
            # Get project directory
            project_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Find npm
            npm_path = find_npm()
            if npm_path is None:
                raise Exception("npm executable not found. Please make sure Node.js is installed.")
                
            # Run the command
            process = subprocess.Popen(
                [npm_path, cmd],
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                shell=True
            )
            
            # Clear the entry
            self.cmd_entry.delete(0, tk.END)
            
            # Start thread to read output
            threading.Thread(
                target=self._read_process_output,
                args=(process, "Command"),
                daemon=True
            ).start()
            
        except Exception as e:
            self._write_to_console(f"Error running command: {str(e)}\n", "error")
            log_error("Custom Command Error", str(e), traceback.format_exc())
    
    def export_error_logs(self):
        """Export error logs to a single file"""
        from tkinter import filedialog
        
        error_files = []
        for file in os.listdir(ERROR_DIR):
            if file.startswith('error_log_') and file.endswith('.txt'):
                error_files.append(os.path.join(ERROR_DIR, file))
                
        if not error_files:
            messagebox.showinfo("No Logs", "No error logs found to export.")
            return
        
        # Get export location
        export_path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
            title="Export Error Logs"
        )
        
        if not export_path:
            return  # User cancelled
            
        try:
            # Combine all logs
            with open(export_path, 'w', encoding='utf-8') as export_file:
                export_file.write(f"Re-Chat.to Error Logs - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                export_file.write("=" * 80 + "\n\n")
                
                for log_file in sorted(error_files):
                    export_file.write(f"Log File: {os.path.basename(log_file)}\n")
                    export_file.write("-" * 80 + "\n")
                    
                    with open(log_file, 'r', encoding='utf-8') as f:
                        export_file.write(f.read())
                        
                    export_file.write("\n" + "-" * 80 + "\n\n")
                    
            self._write_to_console(f"Error logs exported to: {export_path}\n", "success")
            messagebox.showinfo("Export Complete", f"Error logs exported to:\n{export_path}")
            
        except Exception as e:
            self._write_to_console(f"Error exporting logs: {str(e)}\n", "error")
            log_error("Export Error", str(e), traceback.format_exc())
    
    def on_closing(self):
        """Handle window closing"""
        # Check if any processes are running
        running_processes = []
        if 'backend' in self.processes and self.processes['backend'].poll() is None:
            running_processes.append("Backend")
        if 'frontend' in self.processes and self.processes['frontend'].poll() is None:
            running_processes.append("Frontend")
            
        if running_processes:
            if messagebox.askyesno("Confirm Exit", 
                                f"The following servers are running: {', '.join(running_processes)}.\nAre you sure you want to exit?"):
                self.stop_all()
                self.root.destroy()
        else:
            self.root.destroy()

# Custom exception handler
def show_error(exctype, value, tb):
    # Log to file
    log_file = log_error(f"{exctype.__name__}", str(value), "".join(traceback.format_exception(exctype, value, tb)))
    
    # Show error message
    messagebox.showerror(
        "Error",
        f"An unexpected error occurred:\n{exctype.__name__}: {value}\n\nThe error has been logged to: {log_file}"
    )
    
    # Call original exception hook
    sys.__excepthook__(exctype, value, tb)

# Main execution
if __name__ == "__main__":
    # Set custom exception handler
    sys.excepthook = show_error
    
    # Create and run the application
    root = tk.Tk()
    app = ServerControlPanel(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
