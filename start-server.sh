#!/bin/bash

# Simple Certificate Generator Development Server
# Just starts the server and opens the browser - no git operations

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default configuration
PORT=8090
OPEN_BROWSER=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --port|-p)
            PORT="$2"
            shift 2
            ;;
        --no-browser|-n)
            OPEN_BROWSER=false
            shift
            ;;
        --help|-h)
            echo "Certificate Generator Development Server"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -p, --port PORT     Use specified port (default: 8090)"
            echo "  -n, --no-browser    Don't open browser automatically"
            echo "  -h, --help          Show this help message"
            echo ""
            exit 0
            ;;
        *)
            # If it's just a number, treat it as port
            if [[ $1 =~ ^[0-9]+$ ]]; then
                PORT="$1"
            else
                echo -e "${RED}❌ Unknown option: $1${NC}"
                echo "Use --help for usage information"
                exit 1
            fi
            shift
            ;;
    esac
done

# Function to print colored output
print_info() {
    echo -e "${BLUE}🚀 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if port is in use
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $PORT is already in use"
        echo -n "Kill existing process and continue? (y/n): "
        read -r kill_process
        
        if [[ $kill_process =~ ^[Yy]$ ]]; then
            print_info "Stopping existing process on port $PORT..."
            lsof -ti:$PORT | xargs kill -9 2>/dev/null
            sleep 2
            print_success "Process stopped"
        else
            print_error "Cannot start server - port $PORT is occupied"
            exit 1
        fi
    fi
}

# Function to open browser
open_browser() {
    if [ "$OPEN_BROWSER" = true ]; then
        print_info "Opening browser..."
        
        case "$(uname)" in
            "Darwin")
                # macOS - try Chrome first, fallback to default browser
                if command -v "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" >/dev/null 2>&1; then
                    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --new-tab "http://localhost:$PORT" 2>/dev/null &
                else
                    open "http://localhost:$PORT" 2>/dev/null &
                fi
                ;;
            "Linux")
                # Linux - try google-chrome, chromium, then fallback
                if command -v google-chrome >/dev/null 2>&1; then
                    google-chrome --new-tab "http://localhost:$PORT" 2>/dev/null &
                elif command -v chromium >/dev/null 2>&1; then
                    chromium --new-tab "http://localhost:$PORT" 2>/dev/null &
                elif command -v chromium-browser >/dev/null 2>&1; then
                    chromium-browser --new-tab "http://localhost:$PORT" 2>/dev/null &
                else
                    xdg-open "http://localhost:$PORT" 2>/dev/null &
                fi
                ;;
            CYGWIN*|MINGW*|MSYS*)
                # Windows - try Chrome then fallback
                if command -v chrome >/dev/null 2>&1; then
                    chrome --new-tab "http://localhost:$PORT" 2>/dev/null &
                else
                    start "http://localhost:$PORT" 2>/dev/null &
                fi
                ;;
        esac
        
        print_success "Browser opened - you should see the certificate generator!"
    fi
}

# Function to handle cleanup on exit
cleanup() {
    echo ""
    print_info "Shutting down server..."
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    echo -e "${BLUE}🚀 Certificate Generator Development Server${NC}"
    echo "=========================================="
    
    # Check if index.html exists
    if [ ! -f "index.html" ]; then
        print_error "index.html not found in current directory"
        print_info "Please run this script from the certificate generator directory"
        exit 1
    fi
    
    # Check and handle port conflicts
    check_port
    
    # Start the server
    print_info "Starting PHP development server..."
    print_success "Server starting on http://localhost:$PORT"
    print_info "Serving from: $(pwd)"
    
    if [ "$OPEN_BROWSER" = true ]; then
        print_info "Press Ctrl+C to stop the server"
    else
        print_info "Browser auto-open disabled"
        print_info "Visit: http://localhost:$PORT"
        print_info "Press Ctrl+C to stop the server"
    fi
    
    echo ""
    
    # Start PHP server in background
    php -S localhost:$PORT &
    server_pid=$!
    
    # Wait for server to be ready
    sleep 2
    
    # Check if server started successfully
    if kill -0 $server_pid 2>/dev/null; then
        print_success "Server is ready!"
        
        # Open browser
        open_browser
        
        echo ""
        
        # Wait for server process to finish (or Ctrl+C)
        wait $server_pid
    else
        print_error "Failed to start PHP server"
        print_info "Make sure PHP is installed and available in your PATH"
        exit 1
    fi
}

# Run main function
main "$@"
