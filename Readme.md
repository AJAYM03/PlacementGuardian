# Placement Guardian

A Chrome Extension and FastAPI backend that streamlines placement applications through intelligent form autofill and eligibility-based opportunity matching.

Every placement season, students repeatedly enter the same information—CGPA, UID, academic scores, contact details, and resume links—across dozens of forms. A single typo or missed email can mean missing an opportunity.

Placement Guardian reduces this friction by maintaining a verified academic profile and securely autofilling placement forms using intelligent field matching. The system also filters opportunities based on eligibility criteria, ensuring students only see drives relevant to them.

Built for the 2026 batch of Rajagiri School of Engineering & Technology (RSET).

---

## Overview

Placement Guardian consists of two primary components:

* A FastAPI backend responsible for authentication, eligibility evaluation, drive management, and analytics.
* A Chrome Extension that manages student profiles, displays placement opportunities, and autofills application forms.

The project was originally developed as a hands-on exploration of FastAPI and browser extension development, and gradually evolved into a practical solution for reducing repetitive work during placement season.

---

## Features

### Smart Eligibility Filtering

Students are shown only the opportunities they are eligible for based on:

* Minimum CGPA requirements
* Maximum active backlogs
* Eligible branches
* Drive-specific criteria

### Intelligent Form Autofill

The Chrome Extension automatically maps stored profile information to placement forms using text normalization and fuzzy matching.

* Works with dynamic Google Forms
* No hardcoded field mappings
* Reduces repetitive data entry
* Minimizes manual errors

### Secure Student Profiles

* Google Workspace authentication
* Institutional email verification
* JWT-based authorization
* User-level data isolation

### Placement Cell Dashboard

Administrators can:

* Create placement drives
* Publish opportunities
* Monitor engagement
* Track student activity

### Analytics and Telemetry

* Unique drive opens
* Application counts
* Open-to-application conversion tracking
* Student engagement insights

### Deadline Validation

Placement drives with invalid or expired deadlines cannot be published.

---

## Technology Stack

### Backend

* FastAPI
* SQLite
* SQLModel
* PyJWT
* Passlib
* HTTPX
* Python Dotenv

### Extension

* Chrome Extension (Manifest V3)
* JavaScript
* HTML5
* CSS3
* Chrome Storage API

---

## Project Structure

```text
PLACEMENT_GUARDIAN/
│
├── placement_ext/
│   ├── background.js
│   ├── content.js
│   ├── manifest.json
│   ├── options.html
│   ├── options.css
│   ├── options.js
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── static/
│   └── admin.html
│
├── main.py
├── security.py
├── placement.db
├── .env
├── .gitignore
└── README.md
```

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/AJAYM03/PlacementGuardian.git
cd PLACEMENT_GUARDIAN
```

### Create a Virtual Environment

Linux/macOS:

```bash
python -m venv venv
source venv/bin/activate
```

Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

### Install Dependencies

```bash
pip install fastapi uvicorn sqlmodel pyjwt passlib httpx python-dotenv
```

### Configure Environment Variables

Create a `.env` file in the project root:

```env
JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256

ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
```

### Start the Backend

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Admin Dashboard:

```text
http://127.0.0.1:8000/admin
```

---

## Chrome Extension Setup

1. Open Chrome and navigate to:

```text
chrome://extensions
```

2. Enable **Developer Mode**.
3. Click **Load unpacked**.
4. Select the `placement_ext` directory.
5. Open the extension from the toolbar.
6. Configure your academic profile.

Supported profile fields include:

* Full Name
* College UID
* Email Address
* Phone Number
* Branch
* CGPA
* 10th Percentage
* 12th Percentage
* Resume Link

---

## Security

The project follows a simple zero-trust approach:

* JWT-secured authentication
* User-level data isolation
* Secure browser-side storage
* Input validation and sanitization
* Protected administrative access

Students can access only their own records, while administrators manage placement drives and analytics.

---

## Engineering Notes

The core design decision behind Placement Guardian was to reduce friction where it actually occurs.

Rather than building another standalone portal that students would need to remember to visit, the system integrates directly into the browser workflow where applications are submitted. By bringing verified academic data to the form itself, the extension removes repetitive work without changing the student's existing process.

The project intentionally favors lightweight infrastructure and targeted automation over complex architecture, making it easy to deploy, maintain, and extend.

---

## Future Improvements

* Resume auto-upload support
* Calendar integration
* Placement reminders
* Enhanced analytics dashboard
* Multi-college support
* Improved eligibility recommendations

---

## Author

**Ajay Mukund A**
B.Tech Computer Science and Engineering
Rajagiri School of Engineering & Technology

---

A project built to learn FastAPI, browser extensions, and secure web application development while solving a real placement-season problem.
