# Taskify
A modern single-page application (SPA) built with JavaScript, leveraging asynchronous programming patterns for a seamless user experience. This task manager provides real-time interactions without page refreshes while maintaining persistent state through backend API integration.

## Overview
This application offers a comprehensive task management solution that allows users to create, organize, and track tasks with due dates. The SPA architecture ensures a responsive user interface that dynamically updates as users interact with their tasks, while asynchronous JavaScript handles background API calls for data persistence without blocking the UI.

## Key Features
- **Single-Page Architecture:** Fluid navigation between views without page reloads
- **Asynchronous Data Management:** Background API operations using async/await
- **Dynamic Todo Organization:** Group and filter todos by due date (month/year)
- **Complete Todo Lifecycle:** Create, read, update, delete, and mark todos as complete
- **Interactive UI Components:** Modal dialogs for creating and editing todos
- **Real-time State Synchronization:** Immediate UI updates reflecting server-side changes

## Technology Stack
**Frontend:**
JavaScript (ES6+)\
Handlebars.js\
HTML/CSS

**Backend:**\
Node.js\
Express.js\
SQLite

## Getting Started
### Prerequisites
```
npm install npm@latest -g
```

### Installation
```
# Clonse repository
git clone https://github.com/kanamiyasato/taskify.git

# Install dependencies
npm install

# Start the application
npm start

# Application will be available at http://localhost:3000
```
