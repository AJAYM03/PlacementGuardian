# Placement Guardian

A Chrome Extension and FastAPI backend that streamlines university placement applications through intelligent form autofill and eligibility-based opportunity matching.

Every placement season, students repeatedly enter the same information—CGPA, UID, academic scores, contact details, and resume links—across dozens of placement forms. A single typo or missed email can mean missing an opportunity.

Placement Guardian reduces this friction by maintaining a verified academic profile and securely autofilling placement forms using intelligent field matching. The system also filters opportunities based on eligibility criteria, ensuring students only see drives relevant to them.

This project was built as a learning exercise to explore FastAPI, browser extension development, authentication systems, and full-stack application design while solving a real placement-season problem.

---

## The Backstory

This project originally started as an attempt to recreate a small hackathon workflow that synchronized placement emails with Google Calendar using FastAPI.

While planning the architecture, I realized that calendar reminders were not solving the most repetitive part of the placement process. Students still had to repeatedly fill the same academic information into every application form.

That observation led to a different idea: instead of building another portal that students would need to remember to visit, bring the data directly to where the applications happen—the browser itself.

Placement Guardian became an exploration of FastAPI, Chrome Extension development, JWT authentication, eligibility filtering, and intelligent form automation.

---

## Features

### Smart Eligibility Filtering

Placement drives are automatically filtered based on a student's profile.

* Minimum CGPA requirements
* Maximum active backlogs
* Branch eligibility
* Drive-specific criteria

Students only receive opportunities they are eligible to apply for.

### Intelligent Form Autofill

The Chrome Extension maps stored profile information to placement forms using text normalization and fuzzy matching.

* Works with dynamic Google Forms
* No hardcoded field mappings
* Handles variations in field labels
* Reduces repetitive data entry
* Minimizes manual errors

### Secure Student Profiles

* JWT-based authentication
* User-level data isolation
* Secure profile storage
* Protected API access

### Placement Cell Dashboard

Administrators can:

* Create placement drives
* Publish opportunities
* Manage active listings
* Monitor student engagement

### Analytics

* Unique drive opens
* Application counts
* Engagement tracking
* Open-to-application conversion metrics

### Deadline Validation

Placement drives with invalid or expired deadlines cannot be published.

---

## Architecture

Placement Guardian follows a lightweight client-server architecture.

### Backend

Responsible for authentication, profile management, eligibility evaluation, drive management, and analytics.

**Technology Stack**

* FastAPI
* SQLite
* SQLModel
* PyJWT
* Passlib
* HTTPX
* Python Dotenv

### Chrome Extension

Responsible for student interactions, opportunity notifications, and form autofill.

**Technology Stack**

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

## Local Setup

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

### Run the Backend

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

API Documentation:

```text
http://127.0.0.1:8000/docs
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

Typical profile fields include:

* Full Name
* College UID
* Branch
* CGPA
* Active Backlogs
* Email Address
* Contact Number
* Resume Link

---

## Security

The project follows a simple zero-trust approach.

* JWT-secured authentication
* User-level data isolation
* Protected administrative access
* Input validation and sanitization
* Secure browser-side storage

Students can only access their own information, while administrators can manage placement drives and view analytics.

---

## Future Improvements

* PostgreSQL migration for larger deployments
* Cloud hosting and deployment automation
* Resume auto-upload support
* Calendar integration
* Multi-college support
* Enhanced analytics dashboard

---

## What I Learned

Building Placement Guardian provided hands-on experience with:

* FastAPI application development
* REST API design
* JWT authentication and authorization
* SQLite and ORM-based database interactions
* Chrome Extension development (Manifest V3)
* Browser DOM manipulation
* Fuzzy matching techniques
* Full-stack system design

---

## Author

**Ajay Mukund A**
B.Tech Computer Science and Engineering
Rajagiri School of Engineering & Technology

---

Built to learn FastAPI, browser extension development, authentication systems, and full-stack application design while solving a real placement-season problem.
