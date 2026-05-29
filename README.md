# 🎵 Valdens Chord Organizer

An elegant, secure, and serverless Web Application designed for musicians and buskers to organize, transpose, and search chords. It features premium dark-themed interfaces, real-time Google SSO admin approval gates, and a decoupled high-fidelity AI chord-engraving engine.

> [!TIP]
> **Are you a musician or self-hoster who isn't a "tech bro"?**
> We've written an incredibly simple, zero-code step-by-step **[Musician's Easy Guide to Setting Up Chord Organizer](easy_guide.md)** to walk you through getting your free API keys and deploying your very own private chord organizer in minutes!

---

## 🎯 The Philosophy: Own Your Music

Most chord library applications on the market today lock your song library, annotations, and busking sets behind expensive, recurring monthly subscriptions. You don't own your data, your formatting can break, and you have limited control over the database.

**Valdens Chord Organizer was built for the self-hoster, developer-musician, and stage performer.** It is designed to act as a **complete, ultra-premium, and entirely free private platform** under your absolute ownership:
* **Zero Subscription Fees**: Runs on Google's serverless free tiers (Firebase Hosting, Cloud Run, and Firestore) in your own mersinal account, cost-mitigated by strict token authorization.
* **Absolute Data Ownership**: Every song, chord sheet, and playlist resides inside your private, secure Google Firebase database.
* **Decoupled Open-Source Core**: A modular scraping and formatting engine that can be cleanly separated and integrated with any database system (SQL, MongoDB, SQLite) by other developers.
* **Premium UX Gating**: Fully optimized for real-time mobile busking and low-light stage use with absolute visual and operational excellence.

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
flowchart LR
    %% Custom Styling Definitions
    classDef client fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;
    classDef service fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#f3e8ff;
    classDef database fill:#1c1917,stroke:#f59e0b,stroke-width:2px,color:#fef3c7;
    classDef external fill:#180828,stroke:#ec4899,stroke-width:2px,color:#fdf2f8;
    classDef ug fill:#022c22,stroke:#34d399,stroke-width:2px,color:#ecfdf5;

    subgraph client_tier ["📱 Client Tier (Vite Frontend)"]
        FE["🌐 React Dashboard<br>(Firebase Hosting)"]:::client
        GA["🔒 SSO Access Gate<br>(PendingApproval.jsx)"]:::client
    end

    subgraph service_tier ["⚙️ Service Tier (GCP Cloud Run)"]
        EX["🚀 Express API Wrapper<br>(index.js)"]:::service
        CORE["📦 Standalone Scraper<br>(scraper-core.js)"]:::service
    end

    subgraph database_tier ["🔥 Database Tier (Firebase)"]
        FS[("🗄️ Firestore Database<br>(Security Rules Locked)")]:::database
    end

    subgraph external_services ["🌐 External Services"]
        SD["🕷️ Scrape.do Proxy<br>(Residential IP Fetcher)"]:::external
        GM["🧠 Gemini Flash AI<br>(Music Engraving Engine)"]:::external
        UG["🎸 Ultimate Guitar<br>(Source Chord Page)"]:::ug
    end

    %% Data Streams & Connections
    FE -->|1. Check Auth Status| FS
    GA -->|2. Blocks Session| FE
    FE -->|3. Scrape Request (JWT)| EX
    EX -->|4. Validate Approved User| FS
    EX -->|5. Execute Scraper| CORE
    CORE -->|6. Residential IP Bypass| SD
    SD -->|7. Fetch HTML| UG
    CORE -->|8. Structure Chords & Lyrics| GM
    EX -->|9. Save Structured Song| FS

    %% Subgraph Styling
    style client_tier fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#3b82f6
    style service_tier fill:#0f172a,stroke:#a855f7,stroke-width:2px,color:#a855f7
    style database_tier fill:#0f172a,stroke:#eab308,stroke-width:2px,color:#eab308
    style external_services fill:#0f172a,stroke:#ec4899,stroke-width:2px,color:#ec4899
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
