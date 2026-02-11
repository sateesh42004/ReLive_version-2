# ReLive

ReLive is a minimalist, local-only diary application designed for focused writing and memory preservation. It prioritizes the writing experience by removing distractions and ensuring high-performance responsiveness, even as the diary grows over time.

## Design Philosophy

- **Writing First**: The editor is the dominant UI element. Metadata and navigation are secondary, using muted colors and typography to minimize visual noise.
- **Intentional Persistence**: ReLive uses a manual save model. Writing is treated as a volatile session until the user intentionally commits it to the permanent history.
- **Privacy by Architecture**: All data is stored locally in the browser’s `localStorage`. There are no backend dependencies, accounts, or external tracking.

## Core Features

- **Focused Editor**: A clean, responsive writing area with support for mood tracking and tagging.
- **Media Attachments**: Support for image uploads and audio note recordings within diary entries.
- **History Navigation**:
  - **Calendar**: Visual overview of writing frequency.
  - **Timeline**: Chronological feed of all past memories.
  - **Search**: Instant, read-only search across all saved text, tags, and dates.
- **AI Reflection**: On-demand summarization of entries to aid in personal reflection (transient, non-mutating).
- **Writing Prompts**: Contextual, non-intrusive prompts for empty entries (can be permanently disabled).
- **Multi-Format Export**: Export options for Plain Text (.txt), Markdown (.md), and PDF (.pdf).
- **Keyboard UX**: Support for `Ctrl+F` (Search), `Ctrl+Arrows` (Date Navigation), and `ESC` (Return to Editor).

## Architecture Summary

The application is built using **React** and **Vite**.

- **State Management**:
  - **Volatile State**: Current session data (text, unsaved edits) is managed by React state in the root `App` component.
  - **Persistent State**: Data is keyed by date (`YYYY-MM-DD`) and stored as JSON objects in `localStorage`.
- **Performance Optimization**: Heavier secondary views (`Calendar`, `Timeline`, `Search`) are memoized using `React.memo`. This ensures that high-frequency keystrokes in the editor do not trigger redundant re-renders of the entire application.
- **Data Serialization**: Metadata (mood, tags) and media (Base64 strings) are encapsulated within a single entry object to maintain technical simplicity and atomic saves.

## Data Safety Guardrails

ReLive implements strict protection against accidental data loss:
- **Dirty State Detection**: The application compares the current in-memory session with the last saved version.
- **Navigation Guards**: Any attempt to change dates or views while there are unsaved changes triggers a confirmation dialog.
- **Export Isolation**: Exports are read-only operations performed on saved data; they never modify the current editor buffer or trigger a save.

## How to Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation
1. Clone or download the repository.
2. Navigate to the project directory:
   ```bash
   cd relive
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the local development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### Production Build
Generate a production-ready bundle:
```bash
npm run build
```
The static assets will be located in the `dist/` directory.
