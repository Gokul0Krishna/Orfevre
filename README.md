# YuvaShakti - Informal Economy Trust Network

YuvaShakti is a decentralized trust and economic management platform for Karnataka's informal economy. It uses AI and Graph Theory to empower artisans, youth, and local vendors.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.12+**
- **Node.js 18+**
- **Java 21** (Required for Firebase Local Emulator)

### 2. Environment Setup
Clone the repository and navigate to the project root:

```powershell
# 1. Create a virtual environment
python -m venv .venv

# 2. Activate the virtual environment
# On Windows:
.\.venv\Scripts\activate

# 3. Install backend dependencies
pip install -r gram-sphere/requirements.txt

# 4. Install frontend dependencies
cd gram-sphere/frontend
npm install
cd ../..
```

### 3. Folder Structure & Security
You need to create two specific folders in the root directory that are ignored by Git for security:

1.  **`config/`**: Place your Firebase Service Account JSON key here.
    - Go to Firebase Console > Project Settings > Service Accounts.
    - Generate a new private key and save it in this folder.
    - Update the `FIREBASE_SERVICE_ACCOUNT_PATH` in your `.env` file to point here.
2.  **`firebase/`**: This folder contains local Firestore rules and indexes.
    - These files are managed by the Firebase CLI but kept here to keep the root clean.

### 4. Configuration (.env)
Create a `.env` file inside the `gram-sphere/` directory:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=../config/your-key-filename.json
GEMINI_API_KEY=your_gemini_api_key_here
FIRESTORE_EMULATOR_HOST=localhost:8080
```

### 5. Running the Application
We have provided a convenient batch file to launch everything:

```powershell
# Run both Backend and Frontend
.\code_run.bat
```

### 6. Development Tools
- **Seed Data**: Populates your local emulator with fake artisans and gigs.
  ```powershell
  python gram-sphere/test/seed_db.py
  ```
- **Firebase Emulator**: View your local data at [http://localhost:4000](http://localhost:4000).
  ```powershell
  firebase emulators:start
  ```

---

## 🛠 Tech Stack
- **Backend**: FastAPI, Firestore, NetworkX (Graph Theory)
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **AI**: Google Gemini (Skill Gap Analysis, Listing Generation)
- **Data**: Firebase Local Emulator Suite