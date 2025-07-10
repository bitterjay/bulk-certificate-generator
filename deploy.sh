#!/bin/bash

# Certificate Generator Deploy Script
# Handles: functional spec reminder, git operations, and local server startup

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
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

# Function to read project status from progress tracker
show_project_status() {
    print_status "Certificate Generator - Current Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -f ".clinerules/progress-tracker.md" ]; then
        # Extract completed and pending items - fix syntax error
        completed=$(grep -c "\\[x\\]" .clinerules/progress-tracker.md 2>/dev/null)
        pending=$(grep -c "\\[ \\]" .clinerules/progress-tracker.md 2>/dev/null)
        
        # Handle empty results
        completed=${completed:-0}
        pending=${pending:-0}
        total=$((completed + pending))
        
        if [ $total -gt 0 ]; then
            percentage=$((completed * 100 / total))
            print_status "Progress: $completed/$total features complete ($percentage%)"
        else
            print_status "Progress: Unable to calculate from tracker"
        fi
        
        echo ""
        echo "✅ COMPLETED:"
        grep "\\[x\\]" .clinerules/progress-tracker.md | head -5 | sed 's/- \\[x\\]/  •/' 2>/dev/null || echo "  • Data input, image upload, preview generation"
        
        echo ""
        echo "🔄 PENDING:"
        grep "\\[ \\]" .clinerules/progress-tracker.md | head -3 | sed 's/- \\[ \\]/  •/' 2>/dev/null || echo "  • Element controls UI, PDF integration"
    else
        print_status "Progress tracker not found - proceeding with deployment"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to check for functional specification updates
check_functional_spec() {
    echo ""
    print_status "Functional Specification Check"
    
    if [ -f ".clinerules/functional-specification.md" ]; then
        echo "📄 Found functional specification document"
        echo -n "Review and update functional specification before deploying? (y/n): "
        read -r update_spec
        
        if [[ $update_spec =~ ^[Yy]$ ]]; then
            print_warning "Please update .clinerules/functional-specification.md now"
            echo "Press Enter when ready to continue..."
            read -r
        else
            print_success "Proceeding without functional spec update"
        fi
    else
        print_warning "No functional specification found - consider creating one"
    fi
}

# Function to handle git operations
handle_git() {
    echo ""
    print_status "Starting Git Operations Check..."
    
    # Check if we're in a git repository
    print_status "Checking if this is a git repository..."
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository. Initialize with: git init"
        return 1
    fi
    print_success "Git repository confirmed"
    
    # Check for changes
    print_status "Checking for uncommitted changes..."
    git_changes=$(git status --porcelain)
    
    if [ -n "$git_changes" ]; then
        print_warning "Changes detected in working directory:"
        git status --short
        
        echo ""
        echo -n "💬 Enter commit message: "
        read -r commit_message
        
        if [ -z "$commit_message" ]; then
            print_error "Commit message cannot be empty"
            return 1
        fi
        
        print_status "Adding all changes to staging..."
        if git add .; then
            print_success "Files staged successfully"
        else
            print_error "Failed to stage files"
            return 1
        fi
        
        print_status "Committing changes with message: '$commit_message'"
        if git commit -m "$commit_message"; then
            print_success "Committed: $commit_message"
        else
            print_error "Commit failed"
            return 1
        fi
        
        print_status "Pushing to origin master..."
        if git push origin master; then
            print_success "Successfully pushed to remote repository"
        else
            print_error "Push failed - check your remote repository connection"
            return 1
        fi
    else
        print_success "Working directory clean - no changes to commit"
        print_status "Skipping git operations"
    fi
}

# Function to start local server
start_server() {
    echo ""
    print_status "Starting Local Development Server"
    
    # Check if port 8090 is already in use
    if lsof -Pi :8090 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 8090 is already in use"
        echo -n "Kill existing process and continue? (y/n): "
        read -r kill_process
        
        if [[ $kill_process =~ ^[Yy]$ ]]; then
            lsof -ti:8090 | xargs kill -9 2>/dev/null
            sleep 2
        else
            print_error "Cannot start server - port 8090 is occupied"
            return 1
        fi
    fi
    
    # Check if index.html exists
    if [ ! -f "index.html" ]; then
        print_error "index.html not found in current directory"
        return 1
    fi
    
    print_success "Starting PHP development server on localhost:8090"
    echo "📁 Serving from: $(pwd)"
    echo "🌐 URL: http://localhost:8090"
    echo ""
    print_warning "Press Ctrl+C to stop the server"
    echo ""
    
    # Start PHP server in background
    php -S localhost:8090 &
    server_pid=$!
    
    # Wait for server to be ready
    print_status "Waiting for server to start..."
    sleep 2
    
    # Check if server is running
    if kill -0 $server_pid 2>/dev/null; then
        print_success "Server is ready!"
        
        # Now open Chrome tab
        print_status "Opening browser..."
        case "$(uname)" in
            "Darwin")
                # macOS - try Chrome first, fallback to default browser
                if command -v "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" >/dev/null 2>&1; then
                    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --new-tab "http://localhost:8090" 2>/dev/null &
                else
                    open "http://localhost:8090" 2>/dev/null &
                fi
                ;;
            "Linux")
                # Linux - try google-chrome, chromium, then fallback
                if command -v google-chrome >/dev/null 2>&1; then
                    google-chrome --new-tab "http://localhost:8090" 2>/dev/null &
                elif command -v chromium >/dev/null 2>&1; then
                    chromium --new-tab "http://localhost:8090" 2>/dev/null &
                elif command -v chromium-browser >/dev/null 2>&1; then
                    chromium-browser --new-tab "http://localhost:8090" 2>/dev/null &
                else
                    xdg-open "http://localhost:8090" 2>/dev/null &
                fi
                ;;
            CYGWIN*|MINGW*|MSYS*)
                # Windows - try Chrome then fallback
                if command -v chrome >/dev/null 2>&1; then
                    chrome --new-tab "http://localhost:8090" 2>/dev/null &
                else
                    start "http://localhost:8090" 2>/dev/null &
                fi
                ;;
        esac
        
        print_success "Browser opened - you should see the certificate generator!"
        echo ""
        
        # Wait for server process to finish
        wait $server_pid
    else
        print_error "Failed to start server"
        return 1
    fi
}

# Main execution
main() {
    echo "🚀 Certificate Generator Deployment Script"
    echo "=========================================="
    
    print_status "Step 1: Checking project status..."
    show_project_status
    
    print_status "Step 2: Checking functional specification..."
    check_functional_spec
    
    print_status "Step 3: Handling git operations..."
    if ! handle_git; then
        print_error "Git operations failed - stopping deployment"
        exit 1
    fi
    
    print_status "Step 4: Starting development server..."
    if ! start_server; then
        print_error "Failed to start development server"
        exit 1
    fi
}

# Run main function
main "$@"
