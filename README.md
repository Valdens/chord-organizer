# 🎵 Valdens Chord Organizer

An elegant, secure, and serverless Web Application designed for musicians and buskers to organize, transpose, and search chords. It features premium dark-themed interfaces, real-time Google SSO admin approval gates, and a decoupled high-fidelity AI chord-engraving engine.

---

## 🚀 Key Features

* **🔑 Google SSO & Admin Approval Gatekeeping**: Secure user registration. New logins are placed in a real-time `Pending` state and must be approved by the administrator via single-click dashboard notifications or the **Control Room** before database access is granted.
* **📦 Decoupled Scraper Engine (`scraper-core.js`)**: A database-independent open-source module that fetches Ultimate Guitar chord pages through a residential proxy (Scrape.do), cleans up HTML formatting, and utilizes the Google Gemini API to structure chords and metadata.
* **🎨 Immersive Stage-Ready UX**:
  * Vibrant **Glassmorphism dark theme** optimized for low-light stage use.
  * Real-time transposer (pitch shift) and dynamic font sizing.
  * **Interactive AI Loading Panel** that plays a smooth engraving animation while the background Cloud Run container is fetching chords.
* **📊 Playlists & Stats**: Group chords into custom sets and analyze your library distribution by genre.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client Tier
        FE[React Frontend <br> Vite / Firebase Hosting]
        GA[Access Approval Gate <br> PendingApproval.jsx]
    end

    subgraph Service Tier (Cloud Run)
        EX[Express Controller <br> index.js]
        CORE[Modular Scraper Engine <br> scraper-core.js]
    end

    subgraph Database Tier
        FS[Firestore Database <br> Security Rules Gated]
    end

    FE -->|Check user status| FS
    GA -->|Gates unapproved logins| FE
    FE -->|POST /clean + JWT token| EX
    EX -->|Verify status == approved| FS
    EX -->|Invokes Engine| CORE
    CORE -->|Fetch residential HTML| SD[Scrape.do Proxy]
    CORE -->|AI chord engraving| GM[Gemini API]
    EX -->|Write parsed chords| FS
```

---

## 🛠️ Environment Variables & Secret Configuration

To safeguard your API quotas and keep the repository secure, **all secrets are isolated at the environment level**. Never write keys directly into source code.

### 1. Cloud Run Scraper Variables
Configure the following env vars in your Google Cloud Run dashboard or local `.env`:
* `FIREBASE_SERVICE_ACCOUNT`: The parsed JSON string of your Firebase IAM Admin Service Account key.
* `GEMINI_API_KEY`: Your Google Gemini API Key.
* `SCRAPE_DO_TOKEN`: Your Scrape.do Residential Proxy Token.

### 2. Google Apps Script Properties
For Google Doc integrations, load the following key in your Apps Script **Project Settings ➔ Script Properties**:
* `GEMINI_API_KEY`: Your Google Gemini API Key.

---

## 💻 Local Setup & Installation

### Prerequisities
* Node.js v18+
* Google Cloud SDK (gcloud CLI)
* Firebase CLI (`npm install -g firebase-tools`)

### 1. Run the Frontend locally
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```

### 2. Run the Scraper locally
```bash
# Navigate to the scraper directory
cd cloud-scraper

# Install dependencies
npm install

# Run Express server (listens on PORT 8080)
npm run start
```

---

## ⚡ Deployment Instructions

### 1. Deploy Frontend & Database Rules
Deploy rules and Vite compilation assets to Firebase Hosting:
```bash
# Compile client assets
cd frontend
npm run build

# Deploy rules and files via Firebase CLI
cd ..
npx firebase deploy --only hosting,firestore --project <YOUR_PROJECT_ID>
```

### 2. Deploy Scraper to Google Cloud Run
Deploy the decoupled node container to Google Cloud Run from source in seconds:
```bash
cd cloud-scraper
gcloud run deploy chord-scraper --source . --platform managed --region us-central1 --allow-unauthenticated --min-instances 0 --max-instances 2 --memory 512Mi --cpu 1 --project <YOUR_GCP_PROJECT_ID>
```

---

## 📄 License

This project is open-source and available under the [ISC License](LICENSE).
