# ReLive (v3.0) - Digital Journaling Reimagined

ReLive is a skeumorphic, immersive digital diary designed to bring the tactile feeling of a physical journal to the modern web. It combines nostalgic aesthetics with powerful cloud synchronization, ensuring your memories are both beautiful to look at and safely preserved forever.

![ReLive Preview](./public/bg_final.png)

## 🌟 Key Features

### 📖 Immersive Book Interface
ReLive offers a unique "BookOS" experience that stands out from sterile, flat apps:
- **Realistic 3D Page Flipping**: Navigate days by physically turning pages.
- **Skeuomorphic Design**: Rich textures, leather covers, paper grains, and bookmark ribbons.
- **Responsive Animations**: Smooth transitions and micro-interactions that feel alive.

### 🎨 Dynamic Themes (Ambiance)
Customize your writing environment to match your mood. The entire application—including fonts, colors, and background textures—adapts instantly.
- **Classic Wooden**: Traditional leather diary on a mahogany desk.
- **Obsidian Desk**: sleek, dark mode for night-time contemplation.
- **Misty Forest**: Calming greens and nature-inspired textures.
- **Cosmic Night**: Deep blues and starlight for dreamy reflection.
- **Cozy Library**: Warm reds and vintage paper feels.
- **Sunset Dream**: Soft, warm pastels for energetic days.

### ✍️ Rich Journaling Experience
- **Focus-First Editor**: A clean, distraction-free writing surface on realistic lined paper.
- **Multimedia Support**:
  - 📸 **Polaroid Photos**: Upload images that render as vintage polaroid prints on your page.
  - 🎙️ **Voice Notes**: Record, save, and play back audio memories natively within your entry.
- **Mood Tracking**: Log your daily emotional state with expressive icons.
- **Tags & Metadata**: Organize your thoughts with flexible hashtags and "pinned" favorites.
- **AI Reflection**: (Experimental) On-demand summarization to help you find clarity in your ramblings.

### 🧭 Smart Navigation & Organization
- **Calendar View**: A visual heat-map of your writing history.
- **Timeline**: A vertically scrolling feed of your life's story.
- **Universal Search**: Instantly find specific memories, tags, or dates.
- **Favorites Collection**: Quick access to your most cherished moments.
- **Keyboard Shortcuts**:
  - `Ctrl + Arrow Left/Right`: Navigate days.
  - `Ctrl + F`: Open Search.
  - `Esc`: Close open views or return to the Editor.

---

## 🛠 Technical Architecture

ReLive v3 utilizes a modern **Hybrid Cloud** architecture to optimize for performance (local-first feel) and scalability (cloud reliability).

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React + Vite | High-performance SPA with memoized components to prevent re-renders. |
| **Styling** | CSS Variables | Advanced custom theming engine without heavy CSS frameworks. |
| **Authentication** | Firebase Auth | Secure, one-click Google Sign-In integration. |
| **Database** | Firebase Firestore | Real-time NoSQL database for storing journal text, tags, and metadata. |
| **Asset Storage** | Supabase Storage | High-capacity object storage handling audio blobs and image uploads. |
| **Synchronization** | Custom Sync Engine | "Hybrid" logic (`sync.js`) that orchestrates uploads to Supabase while saving references to Firebase. |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A **Firebase Project** with Authentication and Firestore enabled.
- A **Supabase Project** with a storage bucket named `uploads` (set to public for read access).

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/relive-v3.git
   cd relive
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory (refer to `.env.example` if available) and add your keys:
   ```env
   # Firebase Config
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   ...

   # Supabase Config
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Locally**
   Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

### Building for Production
To create a strictly optimized production build:
```bash
npm run build
```
The output will be in the `dist/` folder, ready for deployment on Vercel or Firebase Hosting.

---

## 🔒 Privacy & Security

- **User Ownership**: Data is keyed by your unique User ID (UID). You only see what you write.
- **Row Level Security**: Database and Storage rules utilize strict RLS policies to ensure no cross-user data leakage.
- **Encryption**: All data in transit is encrypted via HTTPS/TLS.

## 🤝 Contributing

We welcome contributions! Whether it's a new theme, a bug fix, or a feature request.
Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

*ReLive - Because some memories deserve more than just a text file.*
