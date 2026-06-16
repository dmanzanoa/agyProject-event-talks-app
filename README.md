# BigQuery Release Radar 📡

A modern, responsive web application built using **Python Flask** and vanilla **HTML5, CSS3, and JavaScript** that fetches, parses, and formats the official Google Cloud BigQuery Release Notes feed. It allows you to search, filter by release categories, and instantly compose and tweet about specific updates.

![BigQuery Release Radar Screenshot Stub](https://raw.githubusercontent.com/dmanzanoa/agyProject-event-talks-app/main/static/favicon.svg)

---

## 🚀 Key Features

* **Atomic Update Splitting:** Google Cloud's Atom feed groups all updates for a given day into a single entry. BigQuery Release Radar parses this HTML and splits the daily summaries into discrete, categorized cards (e.g., *Features*, *Changes*, *Issues*, *Deprecations*).
* **Category Filters & Search:** Instantly filter releases by category pills or search through descriptions, dates, and parameters in real-time.
* **Release Analytics:** Sidebar dashboard displaying counts of total updates, features, and fixes loaded in the current feed.
* **X (Twitter) Composer Integration:** 
  * Select any update card to open a custom tweet composer.
  * Preview how your tweet will look live in a mock social post bubble.
  * Dynamic character counter tracks length limits (max 280 characters) with color warnings (yellow at 250+, red at 280+).
  * Direct "Quick Share" button on individual cards for fast sharing.
* **Modern Glassmorphic Dark UI:** Beautiful dark theme using customized CSS variables, radial gradients, glass containers, responsive grids, and animated loading skeletons (shimmer states).

---

## 🛠️ Tech Stack

* **Backend:** Python 3, Flask (REST API, XML Parser)
* **Frontend:** Vanilla HTML5, Vanilla CSS3 (Custom properties), Vanilla ES6 JavaScript (DOMParser API)
* **Data Source:** Google Cloud BigQuery Release Notes RSS/Atom Feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`)

---

## 📂 Project Structure

```text
agyProject-event-talks-app/
│
├── app.py                 # Flask server backend & RSS feed parser
├── README.md              # Project documentation
├── .gitignore             # Git exclusion rules
│
├── templates/
│   └── index.html         # Main dashboard markup
│
└── static/
    ├── app.js             # Client-side state, filters, DOMParser, & sharing
    └── style.css          # Glassmorphic layout stylesheets & animations
```

---

## ⚙️ Installation & Running Locally

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Clone the Repository
```bash
git clone https://github.com/dmanzanoa/agyProject-event-talks-app.git
cd agyProject-event-talks-app
```

### 3. Create a Virtual Environment (Recommended)
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install flask
```

### 5. Run the Server
```bash
python app.py
```

### 6. Access the Dashboard
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📦 How the Data Flows

1. **Request:** The browser requests `/api/release-notes`.
2. **Fetch:** Flask downloads Google's official XML feed (bypassing SSL verification blockers and setting custom User-Agents).
3. **Parse Backend:** Flask reads the Atom structure (`<entry>`, `<title>`, `<content>`) and responds with raw structured JSON.
4. **Parse Frontend:** JavaScript reads the raw HTML content block and uses `DOMParser` to split elements on `<h3>` tags, creating separate JavaScript update objects.
5. **Render:** JavaScript groupings organize updates by date headers and render them on cards, updating the sidebar counters.
6. **Share:** Selecting a card uses Twitter Web Intents (`https://twitter.com/intent/tweet?text=...`) to securely populate the status update in a secure popup without requiring custom API tokens.

---

## 📄 License
This project is open-source and available under the MIT License.
