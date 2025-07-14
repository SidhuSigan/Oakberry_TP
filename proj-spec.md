# Oakberry TeamPlanner - Updated Project Specification

## 1. Project Overview

**Project Name:** Oakberry TeamPlanner
**Version:** 1.0
**Date:** July 2025
**Location:** Zurich, Switzerland

### Purpose
A semi-automated weekly shift scheduling system for retail store workers with manual override capabilities, designed for desktop/laptop use.

### Core Problem Statement
Create an intuitive web application that automatically generates weekly work schedules while allowing easy manual adjustments, designed for desktop/laptop use with minimal technical expertise required.

## 2. Business Requirements

### 2.1 User Profile
- **Primary User:** Store manager with minimal technical skills
- **Technical Level:** Cannot use Excel effectively
- **Access Method:** Web browser on laptop/desktop
- **Primary Device:** Laptop/Desktop (responsive design)
- **Secondary Device:** Mobile for viewing (mobile-friendly but not mobile-first)

### 2.2 Store Operations
- **Location:** Zurich, Switzerland
- **Store Type:** Retail (Oakberry)
- **Worker Model:** All workers can perform all tasks equally

#### Operating Hours (Customer Hours)
- **Monday:** 9:30 - 20:00 (8 PM)
- **Tuesday:** 9:30 - 20:00 (8 PM)
- **Wednesday:** 9:30 - 20:00 (8 PM)
- **Thursday:** 9:30 - 21:00 (9 PM)
- **Friday:** 9:30 - 21:00 (9 PM)
- **Saturday:** 9:30 - 21:00 (9 PM)
- **Sunday:** 9:30 - 21:00 (9 PM)

#### Staffing Rules
- **Opening:** 1 person arrives 30 minutes before store opens
- **Closing:** 2 people stay 30 minutes after store closes
- **Regular Hours:** Adequate coverage during operating hours
- **Weather Dependency:** More staff needed on sunny/hot days (especially Friday-Sunday)

### 2.3 Arbeitspensum (Work Percentage) Management
- **Definition:** Each worker has a target work percentage (e.g., 20%, 50%, 100%)
- **Tracking:** System monitors actual vs. target hours weekly and monthly
- **Warnings:** Visual indicators when workers are significantly over/under target
- **Override Authority:** User can proceed despite warnings but must acknowledge impact
- **Holiday Impact:** When workers take holidays, it's acceptable to be under target
- **Priority:** Schedule coverage takes precedence over perfect Arbeitspensum adherence

## 3. Functional Requirements

### 3.1 Worker Management
- Add/remove employees
- Store worker information:
  - Name
  - Contact information (for sharing schedules)
  - Work percentage (e.g., 20%, 50%, 100%) - **Arbeitspensum**
  - Available days (Monday-Sunday selection)
  - Holiday/absence calendar
  - Any special constraints
- **Holiday Management:**
  - Mark specific dates as unavailable (holidays, sick days, etc.)
  - Override availability for individual weeks
  - Calendar interface for easy date selection
  - Historical holiday tracking

### 3.2 Schedule Generation
- **Input:** Week selection (start date)
- **Process:**
  - Calculate required shifts based on operating hours
  - Check worker availability (including holidays/absences)
  - Assign workers based on availability and work percentage
  - Respect worker constraints and preferences
- **Output:** Complete weekly schedule with opening/closing assignments
- **Arbeitspensum Tracking:**
  - Real-time calculation of actual vs. target work percentage
  - Visual indicators for workers who are over/under their Arbeitspensum
  - Weekly hour totals per worker
  - Monthly/period tracking for overall balance

### 3.3 Manual Override System
- **Two-tier editing interface optimized for non-technical users:**

#### 3.3.1 Simple Assignment (Click-based)
- **Click on empty shift** → Dropdown list of available workers
- **Click on assigned worker** → Options to "Remove" or "Change worker"
- **Dropdown selection** → Instant assignment with immediate visual feedback
- **Clear visual states:** Assigned (green), Unassigned (gray), Conflict (red)

#### 3.3.2 Advanced Shift Moving (Smart Drag-and-Drop)
- **Drag existing shifts between days** for the same worker
- **Smart visual feedback during drag:**
  - ✅ **Green highlights** on days where worker is available
  - ❌ **Red/grayed areas** on days worker cannot work (holidays/unavailable days)
  - ⚠️ **Yellow warnings** on days with potential conflicts (already has shifts)
  - **Snap-to-grid** alignment for clean positioning
- **Automatic constraint enforcement:**
  - Cannot drop shifts on unavailable days
  - Prevents double-booking conflicts
  - Respects worker availability settings
- **Real-time updates** as shifts are moved

#### 3.3.3 Conflict Detection & Feedback
- **Real-time conflict detection:**
  - Worker double-booking prevention
  - Insufficient coverage warnings
  - Holiday/absence violations
  - Availability conflicts
- **Visual feedback system:**
  - Color-coded shifts and workers
  - Immediate error messages
  - Undo functionality for mistakes

#### 3.3.4 Arbeitspensum Monitoring
- **Warning indicators** when workers are significantly over/under target percentage
- **Color-coded worker status:**
  - 🟢 Green: On target (within 5% of Arbeitspensum)
  - 🟡 Yellow: Slightly off target (5-15% variance)
  - 🔴 Red: Significantly off target (>15% variance)
- **Override capability:** User can proceed despite Arbeitspensum warnings
- **Real-time hour calculations** visible during editing
- **Weekly vs. monthly percentage tracking**

### 3.4 Weather Integration
- Display 7-day weather forecast for Zurich
- Highlight sunny/hot days requiring additional staffing
- Weather indicators:
  - Temperature
  - Precipitation
  - Sunshine hours
  - Weather conditions (sunny, cloudy, rainy)

### 3.5 Export and Sharing
- Generate PDF schedule for printing and sharing
- **Multiple sharing options:**
  - Download PDF to computer
  - Copy schedule as text for messaging apps
  - Email-friendly format
- **PDF Content:**
  - Worker names and shift times
  - Contact information
  - Week dates
  - Weather alerts and recommendations
- **Format:** Professional layout optimized for both screen and print

## 4. Technical Requirements

### 4.1 Technology Stack
- **Frontend:** React with TypeScript
- **Styling:** Tailwind CSS (desktop-first approach)
- **Build Tool:** Vite
- **Data Storage:** Browser localStorage (no backend required)
- **PDF Generation:** jsPDF
- **Weather API:** OpenWeatherMap API
- **Hosting:** GitHub Pages (free static hosting)
- **Development:** Node.js environment with modern tooling

### 4.2 Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 4.3 Performance Requirements
- Initial load time < 3 seconds on desktop
- **Desktop-first design** (primary target: laptop/desktop)
- Responsive design that works on tablets and phones
- Optimized for landscape orientation
- Offline capability for viewing existing schedules
- Fast PDF generation and download

### 4.4 Design Requirements
- **Primary Platform:** Desktop/Laptop browsers
- **Layout:** Traditional web app layout with sidebar navigation
- **Interactions:** Mouse and keyboard optimized
- **Navigation:** Side panel or top navigation bar
- **Viewport:** Optimized for screens 1024px+ wide
- **Performance:** Fast interaction and responsive UI

### 4.5 Data Storage
- All data stored locally in browser
- Export/import functionality for backup
- No personal data sent to external servers (except weather API)

### 4.6 Deployment (GitHub Pages)
- **Platform:** GitHub Pages (free static hosting)
- **Domain:** Custom subdomain (e.g., `username.github.io/oakberry-teamplanner`)
- **Build Process:** GitHub Actions for automated deployment
- **HTTPS:** Enabled by default
- **Updates:** Automatic deployment on main branch push
- **Backup:** Git version control provides full backup

## 5. User Interface Requirements

### 5.1 Design Principles
- **Desktop-First:** Design for laptop/desktop, scale down for mobile
- **Mouse & Keyboard Optimized:** Traditional web interactions
- **Simplicity:** Clean, professional interface with clear navigation
- **Clarity:** Clear visual hierarchy with good use of whitespace
- **Accessibility:** Readable fonts, good contrast, keyboard navigation
- **Professional:** Business-appropriate design aesthetic

### 5.2 Desktop UI Patterns
- **Navigation:** Side panel or top navigation bar
- **Layout:** Multi-column layouts where appropriate
- **Actions:** Standard buttons and dropdowns
- **Forms:** Traditional form layouts with good spacing
- **Tables:** Data tables for schedule viewing and editing
- **Modals:** Centered modal dialogs for forms and confirmations

### 5.3 Key Screens (Desktop-Optimized)
1. **Dashboard:** Overview with sidebar navigation
2. **Worker Management:** Table view with forms in modals
3. **Schedule Generator:** Step-by-step form with preview
4. **Schedule Editor:** Table/grid view with drag-and-drop editing
5. **Weather View:** Card-based forecast display
6. **Export/Share:** Download options and sharing tools
7. **Arbeitspensum Overview:** Charts and statistics
8. **Settings:** Configuration panel

### 5.4 Desktop Interaction Patterns
- **Primary Actions:** Standard buttons and menus
- **Navigation:** Sidebar or top navigation
- **Simple Editing:** Click-to-assign with dropdown menus for shift assignment
- **Advanced Editing:** Smart drag-and-drop for moving shifts between days
  - Visual feedback showing valid/invalid drop zones
  - Color-coded availability (green=available, red=unavailable, yellow=conflict)
  - Snap-to-grid alignment for clean positioning
- **Data Display:** Tables and cards with clear visual status indicators
- **Feedback:** Toast notifications, inline messages, and real-time visual updates
- **Error Prevention:** Interface prevents invalid actions (grayed out unavailable options)
- **Undo/Redo:** Easy recovery from accidental changes

## 6. Updated Success Criteria

### 6.1 Functional Success
- Generate complete weekly schedule in < 30 seconds
- Allow manual adjustments using mouse/keyboard without errors
- Easy PDF download and sharing options
- Weather integration influences staffing decisions
- **Accurate Arbeitspensum tracking** with clear visual indicators
- **Holiday management** with calendar interface
- Works reliably on desktop browsers

### 6.2 User Experience Success
- User can create schedule without training
- Less than 5 minutes to generate and adjust weekly schedule
- **Clear visual feedback** on Arbeitspensum status
- Intuitive holiday management
- Professional PDF output suitable for printing
- Reliable data persistence
- Positive user feedback on ease of use

## 7. Development Environment

### 7.1 Local Development Setup
- **Node.js** (Latest LTS version)
- **Git** for version control
- **VS Code** or similar editor
- **Modern browser** for testing

### 7.2 No Complex Setup Required
- No Docker needed
- No virtual environments required
- No database setup
- No server configuration
- Simple `npm install` and `npm run dev` to start

---

**Document Version:** 1.1
**Last Updated:** July 14, 2025
**Primary Change:** Updated from mobile-first to desktop-first design