// ==========================================
// --- 1. APP UNLOCK & AUTH LOGIC ---
// ==========================================
function unlockApp(event) {
    if (event) event.preventDefault(); // Page reload ko rokne ke liye

    // Login screen ko gayab karo safely
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.style.display = 'none';

    // Dashboard wrapper (nav + main + footer) ko show karo
    const appContent = document.getElementById('app-content');
    if (appContent) appContent.style.display = 'block';

    // Page ko top par set karo
    window.scrollTo(0, 0);
}

// DomContentLoaded Setup (Page Load Par Runs)
document.addEventListener("DOMContentLoaded", function() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        unlockApp();
        loadDashboardData();
    } else {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.setProperty('display', 'flex', 'important');
        }
    }

    // Safe File Input Listener (Prevents Crashing on login screen)
    const resumeInput = document.getElementById('resumeInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    if (resumeInput && fileNameDisplay) {
        resumeInput.onchange = function() {
            if (this.files[0]) {
                fileNameDisplay.innerText = this.files[0].name;
            }
        };
    }
});


// ==========================================
// --- 2. ANALYZE RESUME LOGIC ---
// ==========================================
async function analyzeResume() {
    const fileInput = document.getElementById("resumeInput");
    const loading = document.getElementById("loading");
    const result = document.getElementById("result");
    
    // Validation Check
    if (!fileInput || !fileInput.files[0]) {
        alert("Please upload a resume first (Text file only)");
        return;
    }
    
    const file = fileInput.files[0];
    const jobDescInput = document.getElementById("jobDescriptionInput");
    const jobDescription = jobDescInput ? jobDescInput.value : "";

    const reader = new FileReader(); 
    reader.onload = async function (e) {
        const text = e.target.result;
        
        // UI Reset and Show loading status
        if (loading) loading.classList.remove("hidden");
        if (result) {
            result.innerHTML = "<p style='color: #00d4ff; text-align:center;'>AI is analyzing your career path...</p>";
            result.style.color = "white";
        }

        try {
            // Backend URL to hit POST API
            const response = await fetch("http://localhost:5001/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, jobDescription })
            });
            
            const data = await response.json();
            console.log("Server Response:", data);

            if (data.result && result) {
                // 1. Score Extraction Logic (Regex)
                const scoreMatch = data.result.match(/(\d+)\s*\/\s*100/) || 
                                   data.result.match(/(\d+)\s*\/\s*10/) || 
                                   data.result.match(/(\d+)\s*%/);

                const rawValue = scoreMatch ? parseInt(scoreMatch[1]) : 75;
                let percentage = rawValue;
                
                // Agar score /10 mein hai toh convert into /100 percentage
                if (scoreMatch && scoreMatch[0].includes('/10') && !scoreMatch[0].includes('/100')) {
                    percentage = rawValue * 10;
                }
                const finalScore = Math.min(Math.max(percentage, 0), 100);

                // 2. Save to LocalStorage
                const email = localStorage.getItem('currentUser') || 'guest';
                localStorage.setItem(`${email}_lastScore`, finalScore);
                localStorage.setItem(`${email}_lastFile`, file.name);
                localStorage.setItem(`${email}_lastSummary`, data.result);

                // 3. Badge Logic (Color and Text Mapping)
                let badgeText = "Excellent";
                let badgeColor = "#00ff7f"; // Green
                if (finalScore < 50) {
                    badgeText = "Needs Work";
                    badgeColor = "#ff4d4d"; // Red
                } else if (finalScore < 80) {
                    badgeText = "Good";
                    badgeColor = "#ffbd03"; // Gold/Yellow
                }

                // 4. Strengths & Improvements Parsing
                const fullText = data.result || "";
                const splitParts = fullText.split(/(?:Main Improvements|Improvements|Areas for Improvement|Weaknesses|Cons):/i);
                
                const parseListItems = (raw) => {
                    if (!raw) return [];
                    return raw
                        .split(/\n|•|-|\*|\d+\./)
                        .map(s => s.trim().replace(/^[:\s\-•*]+/, "")) 
                        .filter(s => s.length > 15);
                };

                let strengthsList = parseListItems(splitParts[0]);
                let improvementsList = parseListItems(splitParts.slice(1).join(" "));
                const sortedImprovements = improvementsList.sort((a, b) => b.length - a.length); 
                
                const finalStrengths = strengthsList.length ? strengthsList : ["Professional Formatting", "Relevant Skillset"];
                const finalImprovements = sortedImprovements.length ? sortedImprovements : ["Quantify achievements", "Improve ATS Keywords"];

                const summaryPart = fullText.split(/(?:Pro Tip:|Tip:)/i)[0].trim();

                // Dynamic Metric Generator based on calculated score
                const baseMetricScore = Math.round(finalScore / 10);
                const metricsData = {
                    "Formatting": { score: Math.min(baseMetricScore + 1, 10), color: "#10b981" },
                    "Content Quality": { score: baseMetricScore, color: "#3b82f6" },
                    "ATS Compatibility": { score: Math.max(baseMetricScore - 1, 1), color: "#8b5cf6" },
                    "Keyword Usage": { score: baseMetricScore, color: "#a855f7" },
                    "Quantified Results": { score: Math.max(baseMetricScore - 2, 1), color: "#f97316" }
                };

                // 5. Dynamic HTML Injection inside Result Card
                result.innerHTML = `
                    <div class="analysis-result-card" style="background: linear-gradient(135deg, #001f3f 0%, #000814 100%); border-radius: 15px; padding: 30px; font-family: sans-serif; text-align: center; color: white; max-width: 500px; margin: 20px auto; border: 1px solid ${badgeColor}33;">
                        <div class="result-header">
                            <span style="font-size: 18px; opacity: 0.9;">🏆 Overall Score</span>
                            <h2 style="font-size: 72px; margin: 10px 0; color: #00d4ff; font-weight: 800;">${finalScore}/100</h2>
                            <div style="background: rgba(255,255,255,0.1); color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 5px 15px; border-radius: 20px; display: inline-block; font-weight: 600;">🌟 ${badgeText}</div>
                        </div>
                        <div class="progress-section" style="margin-top: 25px;">
                            <div style="background: rgba(255,255,255,0.1); height: 12px; border-radius: 10px; overflow: hidden;">
                                <div style="width: ${finalScore}%; height: 100%; background: ${badgeColor}; transition: width 1s ease-in-out;"></div>
                            </div>
                            <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 10px;">Score based on content quality, formatting, and keyword usage</p>
                        </div>
                    </div>

                    <div style="display: flex; gap: 20px; justify-content: center; padding: 20px; flex-wrap: wrap; background: #000814;">
                        <div style="background: #020d0b; border: 1px solid #0a2d24; border-radius: 16px; padding: 25px; flex: 1; min-width: 320px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <div style="background: #00ff87; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                                    <i class="fa-solid fa-check" style="color: #000;"></i>
                                </div>
                                <h3 style="color: #00ff87; font-size: 14px; text-transform: uppercase;">Top Strengths</h3>
                            </div>
                            ${finalStrengths.slice(0, 4).map(item => `
                                <div style="background: #0a1614; border-radius: 10px; padding: 15px; border-left: 4px solid #00ff87; margin-bottom: 10px; color: #e0e0e0; font-size: 13px; text-align: left;">${item}</div>
                            `).join("")}
                        </div>

                        <div style="background: #0d0802; border: 1px solid #2d1a0a; border-radius: 16px; padding: 25px; flex: 1; min-width: 320px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <div style="background: #ff8c00; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                                    <i class="fa-solid fa-bolt" style="color: #000;"></i>
                                </div>
                                <h3 style="color: #ff8c00; font-size: 14px; text-transform: uppercase;">Main Improvements</h3>
                            </div>
                            ${finalImprovements.slice(0, 4).map(item => `
                                <div style="background: #16110a; border-radius: 10px; padding: 15px; border-left: 4px solid #ff8c00; margin-bottom: 10px; color: #e0e0e0; font-size: 13px; text-align: left;">${item}</div>
                            `).join("")}
                        </div>
                    </div>

                    <div class="result-details-grid" style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 25px; margin: 20px auto; max-width: 850px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
                        <h3 style="color: #58a6ff; font-family: 'Inter', sans-serif; font-size: 1.2rem; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #30363d; padding-bottom: 10px; font-weight: 600;">Executive Summary</h3>
                        <div class="detail-item" style="display: flex; gap: 14px; align-items: flex-start;">
                            <i class="fa-solid fa-circle-check" style="color: #238636; font-size: 1.1rem; margin-top: 4px;"></i>
                            <div class="feedback-text" style="color: #c9d1d9; font-family: 'Inter', -apple-system, sans-serif; font-size: 16px; line-height: 1.6; flex: 1; text-align: left;">
                                ${summaryPart}
                            </div>
                        </div>
                    </div>

                    <div class="metrics-container" style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 20px; max-width: 650px; margin: 20px auto; font-family: 'Segoe UI', Tahoma, sans-serif;">
                        <h3 style="color: #ffffff; font-size: 1.1rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                            <span style="background: #1f2937; padding: 5px; border-radius: 5px;">📊</span> Performance Metrics
                        </h3>
                        ${Object.entries(metricsData).map(([label, info]) => `
                            <div style="margin-bottom: 18px;">
                                <div style="display: flex; justify-content: space-between; color: #c9d1d9; font-size: 14px; margin-bottom: 8px;">
                                    <span>${label}</span>
                                    <span style="font-weight: bold;">${info.score}/10</span>
                                </div>
                                <div style="width: 100%; background-color: #161b22; border-radius: 10px; height: 8px; overflow: hidden;">
                                    <div class="progress-fill" data-percent="${info.score * 10}" style="width: 0%; height: 100%; background-color: ${info.color}; border-radius: 10px; transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;

                // Sub-metrics Progress bar fill transitions trigger
                setTimeout(() => {
                    const allBars = document.querySelectorAll(".progress-fill");
                    allBars.forEach(bar => {
                        const target = bar.getAttribute("data-percent");
                        bar.style.width = target + "%";
                    });
                }, 200);

                alert("Analysis Complete! Score saved to Dashboard.");
                loadDashboardData(); 
            } else if (data.error && result) {
                result.innerHTML = `<p style='color: red;'>Server Error: ${data.error}</p>`;
            }

        } catch (err) {
            console.error("Fetch Error:", err);
            if (result) result.innerHTML = "<p style='color: red;'>Error: Cannot connect to server. Did you start node server.js?</p>";
        } finally {
            if (loading) loading.classList.add("hidden");
        }
    };
    reader.readAsText(file);
}


// ==========================================
// --- 3. DASHBOARD DATA LOADER ---
// ==========================================
function loadDashboardData() {
    const email = localStorage.getItem('currentUser');
    if (!email) return;

    const score = localStorage.getItem(`${email}_lastScore`) || "0";
    const fileInfo = localStorage.getItem(`${email}_lastFile`) || "No scans yet";

    const scoreElement = document.getElementById('last-score-val');
    const fileElement = document.getElementById('last-file-info');

    if (scoreElement) scoreElement.innerText = score + "%";
    if (fileElement) fileElement.innerText = "Last Scan: " + fileInfo;
    
    renderHeatmap();
}

function renderHeatmap() {
    const heatmap = document.getElementById('mini-heatmap');
    if (!heatmap) return;
    heatmap.innerHTML = ''; 
    for (let i = 0; i < 15; i++) {
        const dot = document.createElement('div');
        dot.style.cssText = `
            position: absolute;
            left: ${Math.random() * 90}%;
            top: ${Math.random() * 80}%;
            width: 10px;
            height: 10px;
            background: #00d4ff;
            border-radius: 50%;
            filter: blur(4px);
            opacity: 0.6;
        `;
        heatmap.appendChild(dot);
    }
}


// ==========================================
// --- 4. DOWNLOAD REPORT & UTILS ---
// ==========================================
function downloadReport() {
    const element = document.getElementById('result');
    if (!element || !element.innerHTML || element.innerText.includes("AI is analyzing")) {
        return alert("No analysis found to download!");
    }
    // PDF Generation via html2pdf library
    html2pdf().from(element).save('PulseAI_Report.pdf');
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}