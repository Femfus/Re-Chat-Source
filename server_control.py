import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
import subprocess
import threading
import os
import signal
import sys
import time
import shutil
import socket
import json
import traceback
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple

# Error Logger
class ErrorLogger:
    def __init__(self, base_dir: str = None):
        # Set up error directory
        self.base_dir = base_dir or os.path.dirname(os.path.abspath(__file__))
        self.error_dir = os.path.join(self.base_dir, 'errors')
        
        # Create errors directory if it doesn't exist
        if not os.path.exists(self.error_dir):
            os.makedirs(self.error_dir)
            
        # Initialize log file
        self.current_log_file = os.path.join(
            self.error_dir, 
            f"error_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )
    
    def log_error(self, error_type: str, error_message: str, traceback_info: str = None) -> str:
        """Log error to the current log file and return the file path"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        with open(self.current_log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n{'=' * 50}\n")
            f.write(f"TIMESTAMP: {timestamp}\n")
            f.write(f"TYPE: {error_type}\n")
            f.write(f"MESSAGE: {error_message}\n")
            if traceback_info:
                f.write(f"\nTRACEBACK:\n{traceback_info}\n")
            f.write(f"{'=' * 50}\n\n")
            
        return self.current_log_file
    
    def get_recent_errors(self, max_count: int = 5) -> List[Dict[str, str]]:
        """Returns a list of the most recent errors"""
        error_files = []
        
        for file in os.listdir(self.error_dir):
            if file.startswith('error_log_') and file.endswith('.txt'):
                full_path = os.path.join(self.error_dir, file)
                error_files.append((os.path.getmtime(full_path), full_path))
        
        # Sort by modification time (newest first) and limit to max_count
        error_files.sort(reverse=True)
        recent_files = error_files[:max_count]
        
        result = []
        for _, file_path in recent_files:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                result.append({
                    'path': file_path,
                    'content': content[:500] + '...' if len(content) > 500 else content
                })
                
        return result

# Network Utilities
class NetworkUtils:
    @staticmethod
    def is_port_in_use(port: int) -> bool:
        """Check if a port is in use"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    @staticmethod
    def find_available_port(start_port: int, max_attempts: int = 10) -> Optional[int]:
        """Find an available port starting from the given port"""
        port = start_port
        attempts = 0
        
        while attempts < max_attempts:
            if not NetworkUtils.is_port_in_use(port):
                return port
            port += 1
            attempts += 1
        
        return None  # No available port found

# Process Manager
class ProcessManager:
    def __init__(self, error_logger: ErrorLogger):
        self.processes: Dict[str, subprocess.Popen] = {}
        self.process_logs: Dict[str, List[str]] = {}
        self.error_logger = error_logger
        
    def start_process(self, name: str, cmd: List[str], cwd: str = None, env: Dict[str, str] = None) -> Tuple[bool, str]:
        """Start a new process and return (success, message)"""
        if name in self.processes and self.processes[name].poll() is None:
            return False, f"Process '{name}' is already running"
            
        try:
            # Create environment with system env variables
            process_env = os.environ.copy()
            if env:
                process_env.update(env)
                
            # Start the process
            self.processes[name] = subprocess.Popen(
                cmd,
                cwd=cwd,
                env=process_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
            )
            
            # Initialize log for this process
            self.process_logs[name] = []
            
            # Start threads to capture output
            threading.Thread(target=self._read_output, args=(name, self.processes[name].stdout, False), daemon=True).start()
            threading.Thread(target=self._read_output, args=(name, self.processes[name].stderr, True), daemon=True).start()
            
            return True, f"Process '{name}' started successfully"
        except Exception as e:
            error_msg = str(e)
            tb_info = traceback.format_exc()
            self.error_logger.log_error("Process Start Error", error_msg, tb_info)
            return False, f"Failed to start process '{name}': {error_msg}"
    
    def stop_process(self, name: str) -> Tuple[bool, str]:
        """Stop a running process and return (success, message)"""
        if name not in self.processes or self.processes[name].poll() is not None:
            return False, f"Process '{name}' is not running"
            
        try:
            process = self.processes[name]
            
            # Try to terminate gracefully first
            if sys.platform == 'win32':
                os.kill(process.pid, signal.CTRL_BREAK_EVENT)
            else:
                process.terminate()
                
            # Give it some time to terminate
            for _ in range(5):
                if process.poll() is not None:
                    return True, f"Process '{name}' stopped successfully"
                time.sleep(0.5)
                
            # Force kill if it didn't terminate
            process.kill()
            return True, f"Process '{name}' forcefully killed"
        except Exception as e:
            error_msg = str(e)
            tb_info = traceback.format_exc()
            self.error_logger.log_error("Process Stop Error", error_msg, tb_info)
            return False, f"Failed to stop process '{name}': {error_msg}"
    
    def is_process_running(self, name: str) -> bool:
        """Check if a process is currently running"""
        return name in self.processes and self.processes[name].poll() is None
    
    def _read_output(self, name: str, pipe, is_error: bool):
        """Read and store output from a process pipe"""
        for line in iter(pipe.readline, ''):
            if not line:
                break
            
            line_with_prefix = f"[{name}] {line.rstrip()}"
            self.process_logs[name].append((line_with_prefix, is_error))
            
            # If it's an error, log it
            if is_error and "error" in line.lower():
                self.error_logger.log_error(f"{name} Error", line.strip())
                
            # Track console output for real-time monitoring
            try:
                if hasattr(self, '_write_to_console'):
                    tag = "error" if is_error and ("error" in line.lower() or "exception" in line.lower()) else None
                    self._write_to_console(line_with_prefix + "\n", tag)
            except Exception:
                pass
    
    def get_latest_logs(self, name: str, count: int = 100) -> List[Tuple[str, bool]]:
        """Get the latest logs for a process"""
        if name not in self.process_logs:
            return []
            
        return self.process_logs[name][-count:]
    
    def stop_all_processes(self) -> Dict[str, str]:
        """Stop all running processes and return results"""
        results = {}
        for name in list(self.processes.keys()):
            if self.is_process_running(name):
                success, message = self.stop_process(name)
                results[name] = message
        return results

# Utility Functions
def find_npm() -> Optional[str]:
    """Find the npm executable path"""
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
                
        # If still not found, try plain 'npm' as a fallback
        # This allows the shell to resolve it on some systems
        return 'npm' if sys.platform == 'win32' else None
                
    return npm_path

class ServerControlPanel:
    def __init__(self, root):
        # Initialize components
        self.root = root
        self.root.title("Re-Chat.to Server Control Panel")
        self.root.geometry("900x650")  # Slightly larger window size
        self.root.minsize(800, 600)  # Set minimum size
        self.root.resizable(True, True)
        
        # Set modern theme colors
        self.bg_color = "#1E1E2E"  # Dark background
        self.text_color = "#FFFFFF"  # White text
        self.accent_color = "#6272A4"  # Dracula purple-blue
        self.button_bg = "#44475A"  # Medium dark background
        self.bg_dark = "#282A36"  # Dracula background
        self.entry_bg = "#2D2D3A"  # Entry background
        self.success_color = "#50FA7B"  # Dracula green
        self.error_color = "#FF5555"  # Dracula red
        self.warning_color = "#FFB86C"  # Dracula orange
        self.highlight_color = "#8BE9FD"  # Dracula cyan
        
        # Initialize error logger
        self.error_logger = ErrorLogger()
        
        # Initialize process manager
        self.process_manager = ProcessManager(self.error_logger)
        
        # Configure default ports
        self.backend_port = 5000
        self.frontend_port = NetworkUtils.find_available_port(3000) or 3001
        
        # Initialize UI state variables
        self.console_autoscroll = tk.BooleanVar(value=True)
        self.backend_port_var = tk.StringVar(value=str(self.backend_port))
        self.frontend_port_var = tk.StringVar(value=str(self.frontend_port))
        
        # Configure root window
        self.root.configure(bg=self.bg_color)
        
        # Apply dark theme to all widgets
        self.root.tk_setPalette(
            background=self.bg_color,
            foreground=self.text_color,
            activeBackground=self.button_bg,
            activeForeground=self.text_color
        )
        
        # Build the UI
        self._create_styles()
        self._create_menu()
        self._create_main_frame()
        self._create_header()
        self._create_server_controls()
        self._create_console()
        self._create_status_bar()
        
        # Set up periodic status check
        self.root.after(2000, self._check_processes)
        
        # Display welcome message
        self._write_to_console("Server Control Panel Initialized. Welcome!\n", "success")
        self._write_to_console(f"Frontend port set to: {self.frontend_port}\n")
        self._write_to_console(f"Backend port set to: {self.backend_port}\n")
        
        # Log startup
        self.error_logger.log_error("INFO", "Server Control Panel Started", None)
        
        # Duplicate tk_setPalette removed as it's already called above
        
        # Define UI state variables
        self.console_autoscroll = tk.BooleanVar(value=True)
        self.backend_port_var = tk.StringVar(value=str(self.backend_port))
        self.frontend_port_var = tk.StringVar(value=str(self.frontend_port))
        
    def _create_styles(self):
        """Configure ttk styles for a modern look"""
        self.style = ttk.Style()
        
        # Try to use a modern theme
        try:
            self.style.theme_use('clam')
        except tk.TclError:
            pass
        
        # Configure base styles
        self.style.configure('.', 
                          background=self.bg_color, 
                          foreground=self.text_color, 
                          fieldbackground=self.entry_bg)
        
        # Configure widget-specific styles
        self.style.configure("TFrame", background=self.bg_color)
        self.style.configure("TLabel", background=self.bg_color, foreground=self.text_color, font=("Segoe UI", 10))
        self.style.configure("Header.TLabel", background=self.bg_color, foreground=self.text_color, font=("Segoe UI", 14, "bold"))
        self.style.configure("Status.TLabel", background=self.bg_dark, foreground=self.text_color, font=("Segoe UI", 9))
        
        # Button styles
        self.style.configure("TButton", 
                          background=self.button_bg, 
                          foreground=self.text_color,
                          padding=6,
                          font=("Segoe UI", 10))
        
        # Primary action button
        self.style.configure("Primary.TButton", 
                          background=self.accent_color,
                          foreground=self.text_color)
        
        # Status labels
        self.style.configure("Active.TLabel", foreground=self.success_color)
        self.style.configure("Inactive.TLabel", foreground=self.error_color)
        
        # Entries
        self.style.configure("TEntry", 
                          fieldbackground=self.entry_bg,
                          foreground=self.text_color,
                          insertcolor=self.text_color,
                          borderwidth=1)
    
    def _create_menu(self):
        """Create application menu"""
        self.menu = tk.Menu(self.root, bg=self.bg_dark, fg=self.text_color, borderwidth=0)
        self.root.config(menu=self.menu)
        
        # File menu
        file_menu = tk.Menu(self.menu, tearoff=0, bg=self.bg_dark, fg=self.text_color)
        file_menu.add_command(label="Export Error Logs", command=self.export_error_logs)
        file_menu.add_command(label="View Recent Errors", command=self.view_recent_errors)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.on_closing)
        self.menu.add_cascade(label="File", menu=file_menu)
        
        # Server menu
        server_menu = tk.Menu(self.menu, tearoff=0, bg=self.bg_dark, fg=self.text_color)
        server_menu.add_command(label="Start All Services", command=self.start_all)
        server_menu.add_command(label="Stop All Services", command=self.stop_all)
        server_menu.add_separator()
        server_menu.add_command(label="Configure Ports", command=self.configure_ports)
        self.menu.add_cascade(label="Server", menu=server_menu)
        
        # Help menu
        help_menu = tk.Menu(self.menu, tearoff=0, bg=self.bg_dark, fg=self.text_color)
        help_menu.add_command(label="About", command=self.show_about)
        self.menu.add_cascade(label="Help", menu=help_menu)
    
    def _create_main_frame(self):
        """Create the main application frame"""
        self.main_frame = ttk.Frame(self.root)
        self.main_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)
        
    def _create_header(self):
        """Create the application header"""
        header_frame = ttk.Frame(self.main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 15))
        
        # Title
        title_label = ttk.Label(header_frame, text="Re-Chat.to Server Control", style="Header.TLabel")
        title_label.pack(side=tk.LEFT)
        
    def _create_server_controls(self):
        """Create the server control buttons"""
        controls_frame = ttk.Frame(self.main_frame)
        controls_frame.pack(fill=tk.X, pady=(0, 15))
        
        # Create button frame with 3 columns
        btn_frame = ttk.Frame(controls_frame)
        btn_frame.pack(fill=tk.X)
        
        # Backend button
        self.backend_btn = ttk.Button(btn_frame, text="Start Backend", 
                                  command=self.start_backend, style="Primary.TButton")
        self.backend_btn.grid(row=0, column=0, padx=5, pady=5, sticky="ew")
        
        # Frontend button
        self.frontend_btn = ttk.Button(btn_frame, text="Start Frontend", 
                                    command=self.start_frontend)
        self.frontend_btn.grid(row=0, column=1, padx=5, pady=5, sticky="ew")
        
        # Database button
        self.db_btn = ttk.Button(btn_frame, text="Initialize Database", 
                                 command=self.initialize_database)
        self.db_btn.grid(row=0, column=2, padx=5, pady=5, sticky="ew")
        
        # Configure grid columns to be equal width
        btn_frame.columnconfigure(0, weight=1)
        btn_frame.columnconfigure(1, weight=1)
        btn_frame.columnconfigure(2, weight=1)
        
        # Status indicators
        status_frame = ttk.Frame(controls_frame)
        status_frame.pack(fill=tk.X, pady=(5, 0))
        
        # Backend status
        backend_status_frame = ttk.Frame(status_frame)
        backend_status_frame.grid(row=0, column=0, sticky="ew")
        ttk.Label(backend_status_frame, text="Backend: ").pack(side=tk.LEFT)
        self.backend_status = ttk.Label(backend_status_frame, text="Stopped", style="Inactive.TLabel")
        self.backend_status.pack(side=tk.LEFT)
        
        # Frontend status
        frontend_status_frame = ttk.Frame(status_frame)
        frontend_status_frame.grid(row=0, column=1, sticky="ew")
        ttk.Label(frontend_status_frame, text="Frontend: ").pack(side=tk.LEFT)
        self.frontend_status = ttk.Label(frontend_status_frame, text="Stopped", style="Inactive.TLabel")
        self.frontend_status.pack(side=tk.LEFT)
        
        # Database status
        db_status_frame = ttk.Frame(status_frame)
        db_status_frame.grid(row=0, column=2, sticky="ew")
        ttk.Label(db_status_frame, text="Database: ").pack(side=tk.LEFT)
        self.db_status = ttk.Label(db_status_frame, text="Not Initialized", style="Inactive.TLabel")
        self.db_status.pack(side=tk.LEFT)
        
        # Configure grid columns to be equal width
        status_frame.columnconfigure(0, weight=1)
        status_frame.columnconfigure(1, weight=1)
        status_frame.columnconfigure(2, weight=1)
        
        # Action buttons
        action_frame = ttk.Frame(controls_frame)
        action_frame.pack(fill=tk.X, pady=(10, 0))
        
        # Start all button
        start_all_btn = ttk.Button(action_frame, text="Start All", command=self.start_all)
        start_all_btn.pack(side=tk.LEFT, padx=(0, 5), fill=tk.X, expand=True)
        
        # Stop all button
        stop_all_btn = ttk.Button(action_frame, text="Stop All", command=self.stop_all)
        stop_all_btn.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)
        
        # Check database button
        check_db_btn = ttk.Button(action_frame, text="Check Database", command=self.check_database_connection)
        check_db_btn.pack(side=tk.LEFT, padx=(5, 0), fill=tk.X, expand=True)
    
    def _create_console(self):
        """Create the console output area"""
        console_frame = ttk.Frame(self.main_frame)
        console_frame.pack(fill=tk.BOTH, expand=True)
        
        # Console header with options
        console_header = ttk.Frame(console_frame)
        console_header.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(console_header, text="Console Output").pack(side=tk.LEFT)
        
        # Autoscroll option
        autoscroll_check = ttk.Checkbutton(console_header, text="Auto-scroll", 
                                        variable=self.console_autoscroll)
        autoscroll_check.pack(side=tk.RIGHT)
        
        # Console text widget
        self.console = scrolledtext.ScrolledText(console_frame, wrap=tk.WORD, 
                                             bg=self.bg_dark, 
                                             fg=self.text_color,
                                             insertbackground=self.text_color,
                                             selectbackground=self.button_bg,
                                             selectforeground=self.text_color,
                                             font=("Consolas", 10),
                                             height=15)
        self.console.pack(fill=tk.BOTH, expand=True)
        self.console.config(state=tk.DISABLED)
        
        # Configure tags for different message types
        self.console.tag_configure("error", foreground=self.error_color)
        self.console.tag_configure("success", foreground=self.success_color)
        self.console.tag_configure("warning", foreground=self.warning_color)
        
        # Command input
        cmd_frame = ttk.Frame(self.main_frame)
        cmd_frame.pack(fill=tk.X, pady=(10, 0))
        
        ttk.Label(cmd_frame, text="Custom Command:").pack(side=tk.LEFT, padx=(0, 5))
        
        self.cmd_entry = ttk.Entry(cmd_frame)
        self.cmd_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.cmd_entry.bind("<Return>", lambda event: self.run_custom_command())
        
        cmd_btn = ttk.Button(cmd_frame, text="Run", command=self.run_custom_command)
        cmd_btn.pack(side=tk.RIGHT, padx=(5, 0))
    
    def _create_status_bar(self):
        """Create the status bar at the bottom of the window"""
        self.status_bar = ttk.Label(self.root, text="Ready", relief=tk.SUNKEN, anchor=tk.W)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
    
    def _write_to_console(self, text, tag=None):
        """Write text to the console with optional tag"""
        self.console.config(state=tk.NORMAL)
        
        if tag == "error":
            text = f"[ERROR] {text}"
        elif tag == "success":
            text = f"[SUCCESS] {text}"
        elif tag == "warning":
            text = f"[WARNING] {text}"
        
        if tag:
            self.console.insert(tk.END, text, tag)
        else:
            self.console.insert(tk.END, text)
            
        # Auto-scroll if enabled
        if self.console_autoscroll.get():
            self.console.see(tk.END)
            
        self.console.config(state=tk.DISABLED)
    
    def _update_status_bar(self, text):
        """Update the status bar text"""
        self.status_bar.config(text=text)
    
    def _check_processes(self):
        """Periodically check the status of all processes"""
        try:
            # Update backend status
            if self.process_manager.is_process_running('backend'):
                self.backend_status.config(text="Running", style="Active.TLabel")
                self.backend_btn.config(text="Stop Backend", command=self.stop_backend)
            else:
                self.backend_status.config(text="Stopped", style="Inactive.TLabel")
                self.backend_btn.config(text="Start Backend", command=self.start_backend)
            
            # Update frontend status
            if self.process_manager.is_process_running('frontend'):
                self.frontend_status.config(text="Running", style="Active.TLabel")
                self.frontend_btn.config(text="Stop Frontend", command=self.stop_frontend)
            else:
                self.frontend_status.config(text="Stopped", style="Inactive.TLabel")
                self.frontend_btn.config(text="Start Frontend", command=self.start_frontend)
                
            # Update database status based on backend status
            if self.process_manager.is_process_running('db_init'):
                self.db_status.config(text="Initializing", style="Active.TLabel")
            elif self.process_manager.is_process_running('backend'):
                self.db_status.config(text="Connected", style="Active.TLabel")
            else:
                self.db_status.config(text="Not Connected", style="Inactive.TLabel")
        except Exception as e:
            # Log any errors that occur during status checking
            self.error_logger.log_error("Status Check Error", str(e), traceback.format_exc())
            
        # Schedule next check
        self.root.after(2000, self._check_processes)
    
    # Server control methods
    def start_backend(self):
        """Start the backend server"""
        if self.process_manager.is_process_running('backend'):
            self._write_to_console("Backend is already running.\n", "warning")
            return
        
        # Find npm executable
        npm_path = find_npm()
        if npm_path is None:
            self._write_to_console("npm executable not found. Please make sure Node.js is installed.\n", "error")
            return
        
        # Get project directory
        project_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Set up environment
        env = {
            'PORT': str(self.backend_port)
        }
        
        # Start the backend process
        success, message = self.process_manager.start_process(
            'backend',
            [npm_path, 'run', 'server'],
            cwd=project_dir,
            env=env
        )
        
        if success:
            self._write_to_console(f"Started backend server on port {self.backend_port}\n", "success")
        else:
            self._write_to_console(f"Failed to start backend: {message}\n", "error")
        
        # Update status
        self._update_status_bar(message)
    
    def stop_backend(self):
        """Stop the backend server"""
        success, message = self.process_manager.stop_process('backend')
        
        if success:
            self._write_to_console("Backend server stopped.\n", "success")
        else:
            self._write_to_console(f"Failed to stop backend: {message}\n", "error")
        
        # Update status
        self._update_status_bar(message)
    
    def start_frontend(self):
        """Start the frontend development server"""
        if self.process_manager.is_process_running('frontend'):
            self._write_to_console("Frontend is already running.\n", "warning")
            return
        
        # Find npm executable
        npm_path = find_npm()
        if npm_path is None:
            self._write_to_console("npm executable not found. Please make sure Node.js is installed.\n", "error")
            return
        
        # Get project directory
        project_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Set up environment
        env = {
            'PORT': str(self.frontend_port)
        }
        
        # Start the frontend process
        success, message = self.process_manager.start_process(
            'frontend',
            [npm_path, 'start'],
            cwd=project_dir,
            env=env
        )
        
        # If there's an error, try with shell=True explicitly
        if not success and sys.platform == 'win32':
            self._write_to_console("Retrying with alternative method...\n")
            success, message = self.process_manager.start_process(
                'frontend',
                f"{npm_path} start",  # Pass as single string for shell
                cwd=project_dir,
                env=env,
                shell=True
            )
        
        if success:
            self._write_to_console(f"Started frontend server on port {self.frontend_port}\n", "success")
        else:
            self._write_to_console(f"Failed to start frontend: {message}\n", "error")
        
        # Update status
        self._update_status_bar(message)
    
    def stop_frontend(self):
        """Stop the frontend server"""
        success, message = self.process_manager.stop_process('frontend')
        
        if success:
            self._write_to_console("Frontend server stopped.\n", "success")
        else:
            self._write_to_console(f"Failed to stop frontend: {message}\n", "error")
        
        # Update status
        self._update_status_bar(message)
    
    def initialize_database(self):
        """Initialize the database"""
        self._write_to_console("Initializing database...\n")
        
        # Find npm executable
        npm_path = find_npm()
        if npm_path is None:
            self._write_to_console("npm executable not found. Please make sure Node.js is installed.\n", "error")
            return
        
        # Get project directory
        project_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Get server file path
        server_dir = os.path.join(project_dir, 'server')
        if not os.path.exists(server_dir):
            self._write_to_console(f"Server directory not found at: {server_dir}\n", "error")
            self._write_to_console("Creating a simple init-db script...\n")
            
            # Create init-db script in package.json if it doesn't exist
            try:
                # Simple command to initialize database
                cmd = f"echo 'Initializing database...' && node -e \"console.log('Database initialized!');\""
                
                # Start the database init process
                success, message = self.process_manager.start_process(
                    'db_init',
                    [npm_path, 'run', '-s', '--', cmd],
                    cwd=project_dir,
                    shell=True
                )
            except Exception as e:
                self._write_to_console(f"Error creating init script: {str(e)}\n", "error")
                return
        else:
            # Try to run init-db script if it exists in package.json
            try:
                # Check if there's a specific init-db script in package.json
                with open(os.path.join(project_dir, 'package.json'), 'r') as f:
                    import json
                    package_data = json.load(f)
                    if 'scripts' in package_data and 'init-db' in package_data['scripts']:
                        init_script = 'init-db'
                    else:
                        # Fallback to a direct command
                        init_script = 'run -s -- "node server/init-db.js"' if os.path.exists(os.path.join(server_dir, 'init-db.js')) else 'run server'
                
                # Start the database init process
                success, message = self.process_manager.start_process(
                    'db_init',
                    [npm_path] + init_script.split(),
                    cwd=project_dir
                )
            except Exception as e:
                self._write_to_console(f"Error starting initialization: {str(e)}\n", "error")
                self.error_logger.log_error("DB Init Error", str(e), traceback.format_exc())
                return
        
        if success:
            self._write_to_console("Database initialization started.\n", "success")
            self.db_status.config(text="Initializing", style="Active.TLabel")
        else:
            self._write_to_console(f"Failed to initialize database: {message}\n", "error")
        
        # Update status
        self._update_status_bar(message)
    
    def check_database_connection(self):
        """Check database connection"""
        self._write_to_console("Checking database connection...\n")
        # Implementation would depend on your specific database setup
        self._write_to_console("Database connection check not implemented yet.\n", "warning")
    
    def start_all(self):
        """Start both backend and frontend servers"""
        self._write_to_console("Starting all services...\n")
        self.start_backend()
        self.start_frontend()
        self._write_to_console("All services started.\n", "success")
    
    def stop_all(self):
        """Stop all services"""
        self._write_to_console("Stopping all services...\n")
        
        # Stop all processes
        results = self.process_manager.stop_all_processes()
        
        # Log results
        for name, message in results.items():
            self._write_to_console(f"{name}: {message}\n")
        
        self._write_to_console("All services stopped.\n", "success")
        self._update_status_bar("All services stopped")
    
    def configure_ports(self):
        """Configure the ports for backend and frontend"""
        # Create a simple dialog to configure ports
        config_window = tk.Toplevel(self.root)
        config_window.title("Configure Ports")
        config_window.geometry("300x150")
        config_window.resizable(False, False)
        config_window.configure(bg=self.bg_color)
        config_window.transient(self.root)
        config_window.grab_set()
        
        # Center on parent
        x = self.root.winfo_x() + (self.root.winfo_width() - 300) // 2
        y = self.root.winfo_y() + (self.root.winfo_height() - 150) // 2
        config_window.geometry(f"+{x}+{y}")
        
        # Create form
        form_frame = ttk.Frame(config_window)
        form_frame.pack(padx=20, pady=20, fill=tk.BOTH, expand=True)
        
        # Backend port
        ttk.Label(form_frame, text="Backend Port:").grid(row=0, column=0, sticky=tk.W, pady=5)
        backend_entry = ttk.Entry(form_frame, width=10, textvariable=self.backend_port_var)
        backend_entry.grid(row=0, column=1, sticky=tk.W, pady=5)
        
        # Frontend port
        ttk.Label(form_frame, text="Frontend Port:").grid(row=1, column=0, sticky=tk.W, pady=5)
        frontend_entry = ttk.Entry(form_frame, width=10, textvariable=self.frontend_port_var)
        frontend_entry.grid(row=1, column=1, sticky=tk.W, pady=5)
        
        # Buttons
        btn_frame = ttk.Frame(form_frame)
        btn_frame.grid(row=2, column=0, columnspan=2, pady=(10, 0))
        
        def save_ports():
            try:
                self.backend_port = int(self.backend_port_var.get())
                self.frontend_port = int(self.frontend_port_var.get())
                self._write_to_console(f"Ports updated - Backend: {self.backend_port}, Frontend: {self.frontend_port}\n", "success")
                config_window.destroy()
            except ValueError:
                messagebox.showerror("Invalid Input", "Please enter valid port numbers.")
        
        def cancel():
            # Reset to current values
            self.backend_port_var.set(str(self.backend_port))
            self.frontend_port_var.set(str(self.frontend_port))
            config_window.destroy()
        
        ttk.Button(btn_frame, text="Save", command=save_ports).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(btn_frame, text="Cancel", command=cancel).pack(side=tk.LEFT)
    
    def export_error_logs(self):
        """Export error logs to a user-specified location"""
        # Get export directory from user
        export_dir = filedialog.askdirectory(title="Select Export Directory")
        if not export_dir:
            return  # User cancelled
        
        try:
            # Create timestamp for export filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            export_filename = f"re-chat_error_logs_{timestamp}.txt"
            export_path = os.path.join(export_dir, export_filename)
            
            # Get all error logs
            error_dir = self.error_logger.error_dir
            if not os.path.exists(error_dir) or not os.listdir(error_dir):
                messagebox.showinfo("No Logs", "No error logs found to export.")
                return
            
            # Combine all logs into a single file
            with open(export_path, 'w', encoding='utf-8') as export_file:
                export_file.write(f"Re-Chat.to Error Logs Export - {timestamp}\n")
                export_file.write("=" * 80 + "\n\n")
                
                # Sort log files by modification time (newest first)
                log_files = []
                for file in os.listdir(error_dir):
                    if file.startswith('error_log_') and file.endswith('.txt'):
                        full_path = os.path.join(error_dir, file)
                        log_files.append((os.path.getmtime(full_path), full_path, file))
                
                log_files.sort(reverse=True)
                
                # Write each log file's contents to the export file
                for _, log_path, log_name in log_files:
                    export_file.write(f"File: {log_name}\n")
                    export_file.write("-" * 80 + "\n")
                    
                    with open(log_path, 'r', encoding='utf-8') as log_file:
                        export_file.write(log_file.read())
                    
                    export_file.write("\n" + "-" * 80 + "\n\n")
            
            # Success message
            self._write_to_console(f"Error logs exported to: {export_path}\n", "success")
            messagebox.showinfo("Export Complete", f"Error logs successfully exported to:\n{export_path}")
            
        except Exception as e:
            error_msg = str(e)
            self._write_to_console(f"Failed to export error logs: {error_msg}\n", "error")
            messagebox.showerror("Export Failed", f"Failed to export error logs: {error_msg}")
            self.error_logger.log_error("Export Error", error_msg, traceback.format_exc())
    
    def view_recent_errors(self):
        """View recent error logs in a dialog"""
        # Get recent errors
        recent_errors = self.error_logger.get_recent_errors(max_count=10)
        
        if not recent_errors:
            messagebox.showinfo("No Errors", "No recent error logs found.")
            return
        
        # Create a dialog to display errors
        error_window = tk.Toplevel(self.root)
        error_window.title("Recent Errors")
        error_window.geometry("800x600")
        error_window.configure(bg=self.bg_color)
        error_window.transient(self.root)
        
        # Center on parent
        x = self.root.winfo_x() + (self.root.winfo_width() - 800) // 2
        y = self.root.winfo_y() + (self.root.winfo_height() - 600) // 2
        error_window.geometry(f"+{x}+{y}")
        
        # Create main frame
        main_frame = ttk.Frame(error_window)
        main_frame.pack(padx=20, pady=20, fill=tk.BOTH, expand=True)
        
        # Create notebook for tabbed interface
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill=tk.BOTH, expand=True)
        
        # Add a tab for each error log
        for i, error_data in enumerate(recent_errors):
            # Extract filename from path
            filename = os.path.basename(error_data['path'])
            
            # Create tab frame
            tab_frame = ttk.Frame(notebook)
            notebook.add(tab_frame, text=f"Error {i+1}")
            
            # Add file info
            info_frame = ttk.Frame(tab_frame)
            info_frame.pack(fill=tk.X, padx=10, pady=5)
            ttk.Label(info_frame, text=f"File: {filename}").pack(anchor=tk.W)
            
            # Add error content
            error_text = scrolledtext.ScrolledText(tab_frame, wrap=tk.WORD, 
                                               bg=self.bg_dark, 
                                               fg=self.text_color,
                                               font=("Consolas", 10),
                                               height=20)
            error_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
            error_text.insert(tk.END, error_data['content'])
            error_text.config(state=tk.DISABLED)
        
        # Add close button
        ttk.Button(main_frame, text="Close", command=error_window.destroy).pack(pady=(10, 0))
    
    def show_about(self):
        """Show the about dialog"""
        messagebox.showinfo(
            "About Re-Chat.to Server Control",
            "Re-Chat.to Server Control Panel\n\n" +
            "A modern control panel for managing the Re-Chat.to application servers.\n\n" +
            "Features:\n" +
            "- Start/stop backend and frontend servers\n" +
            "- Database initialization and checking\n" +
            "- Error logging with export capability\n" +
            "- Custom command execution\n\n" +
            " 2025 Re-Chat.to"
        )
    
    def on_closing(self):
        """Handle window closing"""
        # Ask user confirmation if processes are running
        if (self.process_manager.is_process_running('backend') or 
            self.process_manager.is_process_running('frontend')):
            if messagebox.askyesno("Confirm Exit", "There are running servers. Are you sure you want to exit?"):
                # Stop all processes
                self.process_manager.stop_all_processes()
                self.root.destroy()
        else:
            self.root.destroy()

    def run_custom_command(self):
        cmd = self.cmd_entry.get().strip()
        if not cmd:
            return
        
        self._write_to_console(f"Running custom command: npm {cmd}\n")
        self._update_status_bar(f"Running: npm {cmd}")
        
        try:
            # Get the project directory
            project_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Find npm executable
            npm_path = find_npm()
            if npm_path is None:
                raise Exception("npm executable not found. Please make sure Node.js is installed and in your PATH.")
            
            # Run the custom command
            process_env = os.environ.copy()
            custom_process = subprocess.Popen(
                [npm_path, cmd],
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                env=process_env,
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
            )
            
            # Clear the entry
            self.cmd_entry.delete(0, tk.END)
            
            # Start thread to read output
            threading.Thread(target=self._read_custom_output, args=(custom_process,), daemon=True).start()
            
        except Exception as e:
            error_msg = str(e)
            self._write_to_console(f"Error running command: {error_msg}\n", "error")
            self._update_status_bar(f"Error: {error_msg}")
            self.error_logger.log_error("Custom Command Error", error_msg, traceback.format_exc())
            
    def _read_custom_output(self, process):
        """Read output from a custom command process"""
        try:
            for line in iter(process.stdout.readline, ''):
                if line:
                    self._write_to_console(f"[Command] {line}")
            
            # Wait for process to complete
            process.wait()
            self._update_status_bar("Ready")
        except Exception as e:
            error_msg = str(e)
            self._write_to_console(f"Error reading command output: {error_msg}\n", "error")
            self.error_logger.log_error("Command Output Error", error_msg, traceback.format_exc())
    
    def create_header(self):
        # Simple header with title
        header_frame = ttk.Frame(self.main_frame)
        header_frame.pack(fill=tk.X, pady=(10, 20))
        
        # Title label
        title_label = ttk.Label(header_frame, text="Local Build", style="Header.TLabel")
        title_label.pack(side=tk.LEFT, padx=10)
        
        self.update_time()

    def update_time(self):
        # Simple time update without displaying
        self.root.after(1000, self.update_time)

    def create_server_controls(self):
        # Main controls container
        main_controls = ttk.Frame(self.main_frame)
        main_controls.pack(fill=tk.X, pady=(0, 20))
        
        # Create three main action buttons at the top
        button_frame = ttk.Frame(main_controls)
        button_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Create three identical buttons with equal width
        self.button1 = ttk.Button(button_frame, text="Start Backend", command=self.start_backend, style="Action.TButton")
        self.button1.pack(fill=tk.X, pady=5)
        
        self.button2 = ttk.Button(button_frame, text="Start Frontend", command=self.start_frontend, style="Action.TButton")
        self.button2.pack(fill=tk.X, pady=5)
        
        self.button3 = ttk.Button(button_frame, text="Initialize Database", command=self.initialize_database, style="Action.TButton")
        self.button3.pack(fill=tk.X, pady=5)
        
        # Bottom row with three smaller buttons
        bottom_frame = ttk.Frame(main_controls)
        bottom_frame.pack(fill=tk.X, pady=(10, 0))
        
        # Create three buttons in a row
        self.small_button1 = ttk.Button(bottom_frame, text="Stop All", command=self.stop_all, style="Action.TButton")
        self.small_button1.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        
        self.small_button2 = ttk.Button(bottom_frame, text="Start All", command=self.start_all, style="Action.TButton")
        self.small_button2.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        
        self.small_button3 = ttk.Button(bottom_frame, text="Check DB", command=self.check_database_connection, style="Action.TButton")
        self.small_button3.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        
        # Store references to status variables
        self.backend_port_var = tk.StringVar(value=str(self.backend_port))
        self.frontend_port_var = tk.StringVar(value=str(self.frontend_port))
        
        # Store status variables for later use
        self.backend_status = ttk.Label(self.main_frame, text="", style="Status.TLabel")
        self.frontend_status = ttk.Label(self.main_frame, text="", style="Status.TLabel")
        self.db_status = ttk.Label(self.main_frame, text="", style="Status.TLabel")

    def create_console(self):
        # Simple console section
        console_frame = ttk.Frame(self.main_frame)
        console_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 10))
        
        # Console text widget with minimal styling
        self.console = scrolledtext.ScrolledText(console_frame, wrap=tk.WORD, 
                                              bg=self.bg_dark, 
                                              fg=self.text_color,
                                              insertbackground=self.text_color,
                                              selectbackground=self.button_bg,
                                              selectforeground=self.text_color,
                                              font=("Consolas", 10),
                                              borderwidth=0,
                                              relief="flat")
        self.console.pack(fill=tk.BOTH, expand=True)
        self.console.config(state=tk.DISABLED)
        
        # Simple command input at the bottom
        cmd_frame = ttk.Frame(self.main_frame)
        cmd_frame.pack(fill=tk.X, pady=(5, 10))
        
        # Command entry - full width
        self.cmd_entry = ttk.Entry(cmd_frame, style="TEntry")
        self.cmd_entry.pack(fill=tk.X)
        self.cmd_entry.bind("<Return>", lambda event: self.run_custom_command())
        self.cmd_entry.insert(0, "[Type here]")

    def write_to_console(self, text, tag=None):
        self.console.config(state=tk.NORMAL)
        
        # Configure tags if they don't exist
        if tag == "error" and not self.console.tag_names().count("error"):
            self.console.tag_configure("error", foreground=self.error_color)
        elif tag == "success" and not self.console.tag_names().count("success"):
            self.console.tag_configure("success", foreground=self.success_color)
        elif tag == "warning" and not self.console.tag_names().count("warning"):
            self.console.tag_configure("warning", foreground=self.warning_color)
        
        # Add a prefix for success messages
        if tag == "success":
            text = "[success] " + text
        
        if tag:
            self.console.insert(tk.END, text, tag)
        else:
            self.console.insert(tk.END, text)
        self.console.see(tk.END)
        self.console.config(state=tk.DISABLED)

    def update_status_bar(self, text):
        self.status_bar.config(text=text)
        
    def create_status_bar(self):
        # No visible status bar in minimalist design
        self.status_bar = ttk.Label(self.root, text="", relief="flat", borderwidth=0)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
    def initialize_ui(self):
        # Minimal initialization messages
        self.write_to_console("Local build Launched\n", "success")
        self.write_to_console("Local build Launched\n", "success")

    def find_free_frontend_port(self):
        """Find an available port for the frontend server"""
        port = find_available_port(3000, max_attempts=20)
        if port:
            self.frontend_port = port
            self.frontend_port_var.set(str(port))
            self.write_to_console(f"Found available port for frontend: {port}\n")
        else:
            messagebox.showwarning("Port Check", "Could not find an available port. Please check your system.")
    
    # Old version of start_backend that's causing errors
    def old_start_backend(self):
        if self.backend_process is None:
            # Get the backend port from the entry field
            try:
                self.backend_port = int(self.backend_port_var.get())
            except ValueError:
                messagebox.showerror("Invalid Port", "Backend port must be a number")
                return
            
        self.write_to_console("Starting backend server...\n")
        self.update_status_bar("Starting backend server...")
        
        try:
            # Get the project directory
            project_dir = os.path.dirname(os.path.abspath(__file__))
            server_dir = os.path.join(project_dir, "server")
            
            # Find npm executable
            npm_path = find_npm()
            if npm_path is None:
                raise Exception("npm executable not found. Please make sure Node.js is installed and in your PATH.")
            
            # Set the port in the environment
            env = os.environ.copy()
            env["PORT"] = str(self.backend_port)
            
            # Start the backend server
            backend_process = subprocess.Popen(
                [npm_path, "start"],
                cwd=server_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
        except Exception as e:
            self.write_to_console(f"Error starting backend server: {str(e)}\n", "error")
            self.update_status_bar(f"Error: {str(e)}")
            return
                universal_newlines=True,
                env=env,
                shell=True  # Use shell on Windows to find npm properly
            )
            
            self.backend_process = backend_process
            
            # Start a thread to read the output
            backend_thread = threading.Thread(
                target=self.read_output,
                args=(backend_process, "Backend"),
                daemon=True
            )
            backend_thread.start()
            
            self.write_to_console(f"Backend server started on http://localhost:{self.backend_port}\n", "success")
            self.update_status_bar(f"Backend server running on port {self.backend_port}")
            
            # Update button states
            self.button1.state(['disabled'])  # Disable Start Backend
            self.update_status()
            

def update_time(self):
    # Simple time update without displaying
    self.root.after(1000, self.update_time)

def create_server_controls(self):
    # Main controls container
    main_controls = ttk.Frame(self.main_frame)
    main_controls.pack(fill=tk.X, pady=(0, 20))
    
    # Create three main action buttons at the top
    button_frame = ttk.Frame(main_controls)
    button_frame.pack(fill=tk.X, pady=(0, 10))
    
    # Create three identical buttons with equal width
    self.button1 = ttk.Button(button_frame, text="Start Backend", command=self.start_backend, style="Action.TButton")
    self.button1.pack(fill=tk.X, pady=5)
    
    self.button2 = ttk.Button(button_frame, text="Start Frontend", command=self.start_frontend, style="Action.TButton")
    self.button2.pack(fill=tk.X, pady=5)
    
    self.button3 = ttk.Button(button_frame, text="Initialize Database", command=self.initialize_database, style="Action.TButton")
    self.button3.pack(fill=tk.X, pady=5)
    
    # Bottom row with three smaller buttons
    bottom_frame = ttk.Frame(main_controls)
    bottom_frame.pack(fill=tk.X, pady=(10, 0))
    
    # Create three buttons in a row
    self.small_button1 = ttk.Button(bottom_frame, text="Stop All", command=self.stop_all, style="Action.TButton")
    self.small_button1.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
    
    self.small_button2 = ttk.Button(bottom_frame, text="Start All", command=self.start_all, style="Action.TButton")
    self.small_button2.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
    
    self.small_button3 = ttk.Button(bottom_frame, text="Check DB", command=self.check_database_connection, style="Action.TButton")
    self.small_button3.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
    
    # Store references to status variables
    self.backend_port_var = tk.StringVar(value=str(self.backend_port))
    self.frontend_port_var = tk.StringVar(value=str(self.frontend_port))
    
    # Store status variables for later use
    self.backend_status = ttk.Label(self.main_frame, text="", style="Status.TLabel")
    self.frontend_status = ttk.Label(self.main_frame, text="", style="Status.TLabel")
    self.db_status = ttk.Label(self.main_frame, text="", style="Status.TLabel")

def create_console(self):
    # Simple console section
    console_frame = ttk.Frame(self.main_frame)
    console_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 10))
    
    # Console text widget with minimal styling
    self.console = scrolledtext.ScrolledText(console_frame, wrap=tk.WORD, 
                                          bg=self.bg_dark, 
                                          fg=self.text_color,
                                          insertbackground=self.text_color,
                                          selectbackground=self.button_bg,
                                          selectforeground=self.text_color,
                                          font=("Consolas", 10),
                                          borderwidth=0,
                                          relief="flat")
    self.console.pack(fill=tk.BOTH, expand=True)
    self.console.config(state=tk.DISABLED)
    
    # Simple command input at the bottom
    cmd_frame = ttk.Frame(self.main_frame)
    cmd_frame.pack(fill=tk.X, pady=(5, 10))
    
    # Command entry - full width
    self.cmd_entry = ttk.Entry(cmd_frame, style="TEntry")
    self.cmd_entry.pack(fill=tk.X)
    self.cmd_entry.bind("<Return>", lambda event: self.run_custom_command())
    self.cmd_entry.insert(0, "[Type here]")

def write_to_console(self, text, tag=None):
    self.console.config(state=tk.NORMAL)
    
    # Configure tags if they don't exist
    if tag == "error" and not self.console.tag_names().count("error"):
        self.console.tag_configure("error", foreground=self.error_color)
    elif tag == "success" and not self.console.tag_names().count("success"):
        self.console.tag_configure("success", foreground=self.success_color)
    elif tag == "warning" and not self.console.tag_names().count("warning"):
        self.console.tag_configure("warning", foreground=self.warning_color)
    
    # Add a prefix for success messages
    if tag == "success":
        text = "[success] " + text
    
    if tag:
        self.console.insert(tk.END, text, tag)
    else:
        self.console.insert(tk.END, text)
    self.console.see(tk.END)
    self.console.config(state=tk.DISABLED)

def update_status_bar(self, text):
    self.status_bar.config(text=text)
    
def create_status_bar(self):
    # No visible status bar in minimalist design
    self.status_bar = ttk.Label(self.root, text="", relief="flat", borderwidth=0)
    self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
    
def initialize_ui(self):
    # Minimal initialization messages
    self.write_to_console("Local build Launched\n", "success")
    self.write_to_console("Local build Launched\n", "success")

def find_free_frontend_port(self):
    """Find an available port for the frontend server"""
    port = find_available_port(3000, max_attempts=20)
    if port:
        self.frontend_port = port
        self.frontend_port_var.set(str(port))
        self.write_to_console(f"Found available port for frontend: {port}\n")
    else:
        messagebox.showwarning("Port Check", "Could not find an available port. Please check your system.")
    
# Old version of start_backend that's causing errors
def old_start_backend(self):
    if self.backend_process is None:
        # Get the backend port from the entry field
        try:
            self.backend_port = int(self.backend_port_var.get())
        except ValueError:
            messagebox.showerror("Invalid Port", "Backend port must be a number")
            return
        
    self.write_to_console("Starting backend server...\n")
    self.update_status_bar("Starting backend server...")
    
    try:
        # Get the project directory
        project_dir = os.path.dirname(os.path.abspath(__file__))
        server_dir = os.path.join(project_dir, "server")
        self.update_status_bar("All servers stopped")
        
    def initialize_database(self):
        """Initialize the database using the init-db script"""
        self.write_to_console("Initializing database...\n")
        self.update_status_bar("Initializing database...")
        self.db_status.config(text="Database Status: Initializing")
        
        try:
            # Get the project directory
            project_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Find npm executable
            npm_path = find_npm()
            if npm_path is None:
                raise Exception("npm executable not found. Please make sure Node.js is installed and in your PATH.")
            
            self.write_to_console(f"Using npm from: {npm_path}\n")
            
            # Run the database initialization script
            init_process = subprocess.Popen(
                [npm_path, "run", "init-db"],
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                shell=True  # Use shell on Windows to find npm properly
            )
            
            # Read the output
            for line in iter(init_process.stdout.readline, ''):
                if line:
                    self.write_to_console(f"[DB Init] {line}")
            
            # Wait for process to complete
            init_process.wait()
            
            if init_process.returncode == 0:
                self.write_to_console("Database initialization completed successfully.\n", "success")
                self.update_status_bar("Database initialized")
                self.db_status.config(text="Database Status: Initialized")
            else:
                self.write_to_console("Database initialization failed.\n", "error")
                self.update_status_bar("Database initialization failed")
                self.db_status.config(text="Database Status: Error")
                
        except Exception as e:
            self.write_to_console(f"Error initializing database: {str(e)}\n", "error")
            self.update_status_bar(f"Error: {str(e)}")
            self.db_status.config(text="Database Status: Error")
            
    def check_database_connection(self):
        """Check if the database connection is working"""
        self.write_to_console("Checking database connection...\n")
        self.update_status_bar("Checking database connection...")
        
        try:
            # Get the project directory
            project_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Create a simple script to check database connection
            check_script = """
            const mysql = require('mysql2/promise');
            require('dotenv').config();
            
            async function checkConnection() {
              try {
                const connection = await mysql.createConnection({
                  host: process.env.DB_HOST,
                  user: process.env.DB_USER,
                  password: process.env.DB_PASSWORD,
                  database: process.env.DB_NAME
                });
                
                console.log('Database connection successful!');
                await connection.end();
                process.exit(0);
              } catch (error) {
                console.error('Database connection failed:', error.message);
                process.exit(1);
              }
            }
            
            checkConnection();
            """
            
            # Write the script to a temporary file
            temp_script_path = os.path.join(project_dir, 'check-db-connection.js')
            with open(temp_script_path, 'w') as f:
                f.write(check_script)
            
            # Find node executable
            node_cmd = 'node.exe' if sys.platform == 'win32' else 'node'
            node_path = shutil.which(node_cmd)
            
            if node_path is None:
                raise Exception("Node.js executable not found. Please make sure Node.js is installed and in your PATH.")
            
            # Run the script
            check_process = subprocess.Popen(
                [node_path, temp_script_path],
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                shell=True
            )
            
            # Read the output
            output = ""
            for line in iter(check_process.stdout.readline, ''):
                if line:
                    output += line
                    self.write_to_console(f"[DB Check] {line}")
            
            # Wait for process to complete
            check_process.wait()
            
            # Clean up the temporary file
            try:
                os.remove(temp_script_path)
            except:
                pass
            
            # Check the exit code
            if check_process.returncode == 0:
                self.write_to_console("Database connection successful!\n", "success")
                self.update_status_bar("Database connection successful")
                self.db_status.config(text="Database Status: Connected")
            else:
                self.write_to_console("Database connection failed.\n", "error")
                self.update_status_bar("Database connection failed")
                self.db_status.config(text="Database Status: Not Connected")
                
                # Show suggestions for fixing the database connection
                self.write_to_console("\nSuggestions to fix database connection:\n")
                self.write_to_console("1. Make sure MySQL server is running\n")
                self.write_to_console("2. Check credentials in .env file\n")
                self.write_to_console("3. Try initializing the database with the 'Initialize Database' button\n")
                self.write_to_console("4. Make sure the database exists (create it manually if needed)\n")
        except Exception as e:
            self.write_to_console(f"Error checking database connection: {str(e)}\n", "error")
            self.update_status_bar(f"Error: {str(e)}")
            self.db_status.config(text="Database Status: Error")

    def read_output(self, process, prefix):
        try:
            for line in iter(process.stdout.readline, ''):
                if line:
                    self.write_to_console(f"[{prefix}] {line}")
            
            if prefix == "Database":
                self.db_init_process = None
                self.write_to_console("Database initialization completed.\n")
                self.update_status_bar("Database initialization completed")
        except Exception as e:
            self.write_to_console(f"Error reading {prefix} output: {str(e)}\n")

    def check_processes(self):
        # Check if processes are still running
        if self.backend_process and self.backend_process.poll() is not None:
            self.write_to_console("Backend server has stopped unexpectedly.\n")
            self.backend_process = None
            self.update_status()
        
        if self.frontend_process and self.frontend_process.poll() is not None:
            self.write_to_console("Frontend server has stopped unexpectedly.\n")
            self.frontend_process = None
            self.update_status()
        
        # Schedule next check
        self.root.after(2000, self.check_processes)

    def update_status(self):
        # Update button states based on server status
        if self.backend_process is None and self.frontend_process is None:
            # Both servers stopped
            self.button1.state(['!disabled'])  # Start Backend
            self.button2.state(['!disabled'])  # Start Frontend
            self.small_button2.state(['!disabled'])  # Start All
            self.small_button1.state(['disabled'])  # Stop All
        elif self.backend_process is not None and self.frontend_process is not None:
            # Both servers running
            self.button1.state(['disabled'])  # Start Backend
            self.button2.state(['disabled'])  # Start Frontend
            self.small_button2.state(['disabled'])  # Start All
            self.small_button1.state(['!disabled'])  # Stop All
        else:
            # Mixed state
            if self.backend_process is None:
                self.button1.state(['!disabled'])  # Start Backend
            else:
                self.button1.state(['disabled'])  # Start Backend
                
            if self.frontend_process is None:
                self.button2.state(['!disabled'])  # Start Frontend
            else:
                self.button2.state(['disabled'])  # Start Frontend
                
            self.small_button2.state(['!disabled'])  # Start All
            self.small_button1.state(['!disabled'])  # Stop All

    def on_closing(self):
        if messagebox.askokcancel("Quit", "Are you sure you want to quit? This will stop all running servers."):
            if self.backend_process is not None:
                self.stop_backend()
            
            if self.frontend_process is not None:
                self.stop_frontend()
            
            self.root.destroy()

    def run_custom_command(self):
        cmd = self.cmd_entry.get().strip()
        if not cmd:
            return
        
        self.write_to_console(f"Running custom command: npm {cmd}\n")
        self.update_status_bar(f"Running: npm {cmd}")
        
        try:
            # Get the project directory
            project_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Find npm executable
            npm_path = find_npm()
            if npm_path is None:
                raise Exception("npm executable not found. Please make sure Node.js is installed and in your PATH.")
            
            # Run the custom command
            custom_process = subprocess.Popen(
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
            threading.Thread(target=self.read_custom_output, args=(custom_process,), daemon=True).start()
            
        except Exception as e:
            self.write_to_console(f"Error running command: {str(e)}\n", "error")
            self.update_status_bar(f"Error: {str(e)}")
    
    def read_custom_output(self, process):
        try:
            for line in iter(process.stdout.readline, ''):
                if line:
                    self.write_to_console(f"[Command] {line}")
            
            # Wait for process to complete
            process.wait()
            
            if process.returncode == 0:
                self.write_to_console("Command completed successfully.\n", "success")
            else:
                self.write_to_console(f"Command failed with exit code {process.returncode}\n", "error")
                
            self.update_status_bar("Ready")
        except Exception as e:
            self.write_to_console(f"Error reading command output: {str(e)}\n", "error")

# Main execution block
if __name__ == "__main__":
    # Set up exception handling
    def show_error(exctype, value, tb):
        # Log error to file
        error_logger = ErrorLogger()
        error_logger.log_error(f"{exctype.__name__}", str(value), ''.join(traceback.format_exception(exctype, value, tb)))
        
        # Show error dialog
        messagebox.showerror("Error", f"An unexpected error occurred:\n{exctype.__name__}: {value}\n\nThe error has been logged to the 'errors' folder.")
        
        # Call original exception hook
        sys.__excepthook__(exctype, value, tb)
    
    sys.excepthook = show_error
    
    # Start the application
    root = tk.Tk()
    app = ServerControlPanel(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
