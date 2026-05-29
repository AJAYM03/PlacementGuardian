const API_BASE_URL = 'http://127.0.0.1:8000';
let jwtToken = null;
let userEmail = null;
let profileExists = false; // Track if we need to POST or PUT

// --- Initialize Dashboard ---
document.addEventListener('DOMContentLoaded', async () => {
    const storage = await chrome.storage.local.get(['pg_jwt', 'pg_email']);
    if (!storage.pg_jwt) {
        document.getElementById('dashboard-content').classList.add('hidden');
        document.getElementById('auth-warning').classList.remove('hidden');
        return;
    }
    
    jwtToken = storage.pg_jwt;
    userEmail = storage.pg_email;
    
    await loadProfile();
    await loadResumes();
});

// --- Fetch Profile ---
async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/profile/me`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        
        if (response.ok) {
            profileExists = true;
            const data = await response.json();
            
            // Hydrate the form fields
            document.getElementById('full_name').value = data.full_name || '';
            document.getElementById('college_uid').value = data.college_uid || '';
            document.getElementById('phone_number').value = data.phone_number || '';
            document.getElementById('branch').value = data.branch || '';
            document.getElementById('btech_cgpa').value = data.btech_cgpa || '';
            document.getElementById('active_backlogs').value = data.active_backlogs ?? 0;
            document.getElementById('twelfth_percentage').value = data.twelfth_percentage || '';
            document.getElementById('tenth_percentage').value = data.tenth_percentage || '';
            document.getElementById('linkedin_url').value = data.linkedin_url || '';
            document.getElementById('github_url').value = data.github_url || '';
            document.getElementById('portfolio_url').value = data.portfolio_url || '';
        } else if (response.status === 404) {
            // Profile doesn't exist yet, which is fine! The user just needs to create it.
            profileExists = false;
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// --- Save Profile ---
document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-profile');
    btn.textContent = "Saving...";
    
    // Helper function to safely pull values and drop empty strings
    const getVal = (id) => document.getElementById(id).value.trim() || undefined;
    const getNum = (id, isFloat = true) => {
        const val = document.getElementById(id).value.trim();
        if (!val) return undefined;
        return isFloat ? parseFloat(val) : parseInt(val);
    };

    // Build the payload dynamically
    const payload = {
        full_name: getVal('full_name'),
        college_uid: getVal('college_uid'),
        phone_number: getVal('phone_number'),
        branch: getVal('branch'),
        btech_cgpa: getNum('btech_cgpa'),
        active_backlogs: getNum('active_backlogs', false),
        twelfth_percentage: getNum('twelfth_percentage'),
        tenth_percentage: getNum('tenth_percentage'),
        linkedin_url: getVal('linkedin_url'),
        github_url: getVal('github_url'),
        portfolio_url: getVal('portfolio_url'),
    };

    // If it's a new profile, we MUST include the email to satisfy the backend
    if (!profileExists) {
        payload.personal_email = userEmail;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/profile/me`, {
            method: profileExists ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            // Parse the 422 error to see exactly what rule we broke
            const errData = await response.json();
            console.error("Backend Error:", errData);
            
            let errMsg = "Validation Error. Check your inputs.";
            if (errData.detail && Array.isArray(errData.detail)) {
                // Extracts the specific field that failed (e.g., "phone_number")
                errMsg = `Error in ${errData.detail[0].loc[1]}: ${errData.detail[0].msg}`;
            }
            throw new Error(errMsg);
        }
        
        // Success!
        profileExists = true; // Mark as created
        btn.textContent = "Saved!";
        btn.style.backgroundColor = "var(--accent-green)";
        btn.style.color = "white";
        setTimeout(() => {
            btn.textContent = "Save Changes";
            btn.style = "";
        }, 2000);

    } catch (error) {
        alert(error.message);
        btn.textContent = "Save Changes";
    }
});

// --- Fetch Resumes ---
async function loadResumes() {
    const list = document.getElementById('resume-list');
    try {
        const response = await fetch(`${API_BASE_URL}/profile/me/resumes/`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        
        if (response.ok) {
            const resumes = await response.json();
            list.innerHTML = '';
            
            if (resumes.length === 0) {
                list.innerHTML = '<p class="text-muted">No resumes added yet.</p>';
                return;
            }

            resumes.forEach(resume => {
                const item = document.createElement('div');
                item.className = 'resume-item';
                item.innerHTML = `
                    <div>
                        <div style="font-weight: 500;">${resume.resume_name}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${resume.drive_link}</div>
                    </div>
                    <span class="badge ${resume.is_default ? 'highlight' : ''}" style="border:1px solid var(--border-color); padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        ${resume.is_default ? '★ Default' : 'Standard'}
                    </span>
                `;
                list.appendChild(item);
            });
        }
    } catch (error) {
        list.innerHTML = '<p class="text-muted" style="color:#fca5a5;">Failed to load resumes.</p>';
    }
}

// --- Add Resume ---
document.getElementById('resume-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Adding...";
    
    const payload = {
        resume_name: document.getElementById('new_resume_name').value,
        drive_link: document.getElementById('new_resume_link').value,
        is_default: true // Making new uploads default automatically
    };

    try {
        const response = await fetch(`${API_BASE_URL}/profile/me/resumes/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Ensure profile is saved first and URL is valid.");
        
        // Reset form and reload list
        e.target.reset();
        await loadResumes();
    } catch (error) {
        alert(error.message);
    } finally {
        btn.textContent = "Add Resume";
    }
});

// --- Logout ---
document.getElementById('btn-logout').addEventListener('click', () => {
    chrome.storage.local.remove(['pg_jwt', 'pg_email'], () => {
        window.location.reload();
    });
});