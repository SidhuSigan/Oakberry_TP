# Oakberry TeamPlanner - Development Roadmap

## Overview
This roadmap breaks down the development into manageable steps, focusing on getting a working application quickly and then iteratively improving it.

---

## Step 1: Environment Setup & Project Foundation
**Goal:** Get a basic React app running locally and deployable to GitHub Pages

### What we'll do:
- Set up the development environment (Node.js, Git)
- Create a new React + TypeScript project with Vite
- Configure Tailwind CSS for styling
- Set up basic project structure and folders
- Configure GitHub repository and GitHub Pages deployment
- Create a simple "Hello World" page that deploys successfully

### What you'll have:
- A working development environment
- A basic React app running on your computer
- Automatic deployment to GitHub Pages
- A live URL you can visit to see your app

**Key files created:**
- `package.json` (project dependencies)
- `src/App.tsx` (main app component)
- `tailwind.config.js` (styling configuration)
- GitHub workflow for deployment

---

## Step 2: Core Data Models & Storage
**Goal:** Define how we store workers and schedules, with basic CRUD operations

### What we'll do:
- Create TypeScript interfaces for Worker, Schedule, and Shift
- Build localStorage service for saving/loading data
- Create basic worker management (add, edit, delete workers)
- Simple data persistence (saves when you refresh the page)
- Basic validation and error handling

### What you'll have:
- Ability to add and manage workers
- Data that persists between browser sessions
- Basic form for entering worker information
- Worker list that displays your team

**Key functionality:**
- Add worker with name, phone, work percentage
- Edit existing worker information
- Delete workers
- Data automatically saves to browser

---

## Step 3: Schedule Generation Engine
**Goal:** Automatically create weekly schedules based on store rules

### What we'll do:
- Build the core scheduling algorithm
- Create shifts based on store hours and staffing rules
- Assign workers to shifts automatically
- Handle basic Arbeitspensum (work percentage) logic
- Create a simple schedule display

### What you'll have:
- One-click schedule generation for any week
- Automatic worker assignment based on availability
- Basic schedule view showing who works when
- Arbeitspensum tracking (target vs actual hours)

**Key functionality:**
- Generate complete weekly schedule
- Respect worker availability and work percentages
- Handle opening/closing shift requirements
- Basic conflict detection

---

## Step 4: Schedule Editing & Management
**Goal:** Allow manual adjustments to generated schedules with intuitive two-tier interface

### What we'll do:
- **Phase 4A: Simple Click-to-Assign Interface**
  - Create dropdown-based shift assignment
  - Click empty shift → see available workers
  - Click assigned worker → remove or change options
  - Real-time conflict detection and visual feedback

- **Phase 4B: Smart Drag-and-Drop for Moving Shifts**
  - Implement drag-and-drop for moving shifts between days
  - Smart visual feedback system:
    - Green highlights for available drop zones
    - Red/gray for unavailable days (holidays, days off)
    - Yellow warnings for potential conflicts
  - Automatic constraint enforcement (prevent invalid drops)
  - Snap-to-grid positioning for clean alignment

- **Phase 4C: Advanced Feedback & Controls**
  - Real-time Arbeitspensum monitoring with color coding
  - Undo/redo functionality
  - Visual status indicators throughout interface
  - Error prevention and user guidance

### What you'll have:
- **Beginner-friendly:** Simple click-and-dropdown for basic assignments
- **Power-user friendly:** Drag-and-drop for complex schedule adjustments
- **Error-proof:** Interface prevents invalid assignments
- **Visual feedback:** Clear indicators for availability, conflicts, and status
- **Professional feel:** Smooth interactions with immediate visual updates

**Key functionality:**
- Click-to-assign workers to empty shifts
- Drag shifts between days with smart visual feedback
- Color-coded availability and conflict detection
- Real-time Arbeitspensum status updates (🟢🟡🔴)
- Undo capability for mistake recovery
- Automatic constraint enforcement

---

## Step 5: Holiday Management & Weather Integration
**Goal:** Handle worker holidays and weather-based staffing

### What we'll do:
- Create holiday calendar for workers
- Integrate weather API for Zurich
- Weather-based staffing recommendations
- Holiday impact on Arbeitspensum calculations
- Enhanced schedule generation considering holidays and weather

### What you'll have:
- Calendar interface for marking worker holidays
- 7-day weather forecast for Zurich
- Automatic staffing suggestions based on weather
- Smart scheduling that avoids holiday conflicts

**Key functionality:**
- Mark worker holidays and time off
- Weather forecast display
- Extra staffing recommendations for sunny days
- Holiday-aware schedule generation

---

## Step 6: Export, Sharing & Polish
**Goal:** Professional PDF export and final UI improvements

### What we'll do:
- PDF generation with professional formatting
- Export options (download, copy text)
- UI polish and responsive design
- Error handling and user feedback
- Performance optimization
- Final testing and bug fixes

### What you'll have:
- Professional PDF schedules for printing/sharing
- Polished, professional-looking interface
- Reliable, bug-free application
- Ready for daily use

**Key functionality:**
- Download PDF schedules
- Copy schedule as text for messaging
- Professional-looking interface
- Reliable data handling

---

## Technical Notes

### Development Environment:
- **Node.js** (download from nodejs.org)
- **Git** (for version control)
- **VS Code** (recommended editor)
- **Chrome/Firefox** (for testing)

### Simple Setup Process:
1. Install Node.js
2. Clone/create project repository
3. Run `npm install` (installs dependencies)
4. Run `npm run dev` (starts development server)
5. Open browser to see the app

### No Complex Configuration:
- No Docker required
- No database setup
- No server management
- Everything runs in the browser
- One command to start development

### Deployment:
- Push code to GitHub
- GitHub Actions automatically builds and deploys
- Live website updates within minutes

---

## Why This Approach Works

### Incremental Progress:
- Each step builds on the previous one
- You can see working functionality quickly
- Easy to test and validate each feature

### Low Risk:
- Simple technology stack
- No complex dependencies
- Easy to debug and fix issues

### Practical:
- Focuses on core business needs first
- Adds nice-to-have features later
- Working software from early steps

This roadmap takes you from zero to a fully functional scheduling application in manageable steps, with each step delivering visible progress and working functionality.