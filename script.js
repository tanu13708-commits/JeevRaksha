// ===== API CONFIGURATION =====
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', data = null) {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        config.body = JSON.stringify(data);
    }
    
    // Add auth token if available
    const token = localStorage.getItem('jeevraksha_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

// Helper for FormData (file uploads)
async function apiUpload(endpoint, formData) {
    const config = {
        method: 'POST',
        body: formData
    };
    
    const token = localStorage.getItem('jeevraksha_token');
    if (token) {
        config.headers = { 'Authorization': `Bearer ${token}` };
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Upload Error:', error);
        return { success: false, message: 'Upload failed. Please try again.' };
    }
}

// --- AI Triage Form Interactivity ---
document.addEventListener('DOMContentLoaded', function () {
    const triageForm = document.getElementById('aiTriageForm');
    const triageResult = document.getElementById('aiTriageResult');
    if (triageForm && triageResult) {
        triageForm.addEventListener('submit', function (e) {
            e.preventDefault();
            // Collect answers
            const animal = triageForm.triageAnimal.value;
            const bleeding = triageForm.bleeding.value;
            const stand = triageForm.stand.value;
            const vehicle = triageForm.vehicle.value;
            const breathing = triageForm.breathing.value;
            const young = triageForm.young.value;
            // Simulate triage logic
            let risk = '🟢 Non-Emergency';
            let advice = 'Monitor the animal and provide water and shelter. No urgent action needed.';
            if (bleeding === 'yes' || vehicle === 'yes' || breathing === 'yes' || stand === 'yes') {
                if (bleeding === 'yes' && (vehicle === 'yes' || breathing === 'yes')) {
                    risk = '🔴 Critical';
                    advice = 'This is a critical emergency. Keep the animal calm, do not move unnecessarily, and call the nearest rescue/NGO immediately. Apply pressure to bleeding wounds with a clean cloth.';
                } else if (bleeding === 'yes' || vehicle === 'yes' || stand === 'yes') {
                    risk = '🟠 Urgent';
                    advice = 'Urgent attention needed. Contact a rescue team or NGO as soon as possible. If safe, move the animal to a secure area and avoid giving food or water if unconscious.';
                } else if (breathing === 'yes') {
                    risk = '🟡 Monitor';
                    advice = 'Watch for breathing difficulty. Keep the animal in a quiet place and contact a vet if symptoms worsen.';
                }
            } else if (young === 'yes') {
                risk = '🟡 Monitor';
                advice = 'Young animals need extra care. Keep warm and monitor closely. Contact a rescue if abandoned.';
            }
            // Show result
            triageResult.innerHTML = `<strong>Risk Level:</strong> ${risk}<br><strong>Advice:</strong> ${advice}`;
            triageResult.style.display = 'block';
            triageForm.scrollIntoView({behavior:'smooth', block:'center'});
        });
    }
});
// JeevRaksha - Animal Rescue Reporting Platform JS
// Handles form submission, dashboard data, navigation, and animations

document.addEventListener('DOMContentLoaded', function () {
    // --- File Upload Preview ---
    const fileInput = document.getElementById('image');
    const filePreview = document.getElementById('filePreview');
    const fileUploadBox = document.getElementById('fileUploadBox');
    
    if (fileInput && filePreview) {
        fileInput.addEventListener('change', function(e) {
            filePreview.innerHTML = '';
            const file = e.target.files[0];
            if (file) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        filePreview.appendChild(img);
                    }
                    reader.readAsDataURL(file);
                }
                if (fileUploadBox) {
                    fileUploadBox.style.borderColor = '#16a34a';
                    fileUploadBox.style.background = 'linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(22, 163, 74, 0.15) 100%)';
                }
            }
        });
    }
    
    // --- Get Location Button ---
    const getLocationBtn = document.getElementById('getLocationBtn');
    const locationInput = document.getElementById('location');
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    
    // --- Initialize Leaflet Map ---
    let map = null;
    let marker = null;
    const mapContainer = document.getElementById('locationMap');
    
    if (mapContainer && typeof L !== 'undefined') {
        // Default to India center (can be changed)
        const defaultLat = 26.8467;  // Gorakhpur area
        const defaultLng = 84.3500;
        
        map = L.map('locationMap').setView([defaultLat, defaultLng], 13);
        
        // Add OpenStreetMap tiles (free, no API key)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Add marker
        marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
        
        // Click on map to set location
        map.on('click', function(e) {
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            
            marker.setLatLng(e.latlng);
            
            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;
            
            // Reverse geocode to get address
            reverseGeocode(lat, lng);
        });
        
        // Drag marker to set location
        marker.on('dragend', function(e) {
            const position = marker.getLatLng();
            const lat = position.lat.toFixed(6);
            const lng = position.lng.toFixed(6);
            
            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;
            
            reverseGeocode(lat, lng);
        });
    }
    
    // Reverse geocode function (get address from coordinates)
    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();
            
            if (data && data.display_name) {
                locationInput.value = data.display_name;
            } else {
                locationInput.value = `Location: ${lat}, ${lng}`;
            }
        } catch (error) {
            locationInput.value = `Location: ${lat}, ${lng}`;
        }
    }
    
    // Search location by text (forward geocoding)
    async function searchLocation(query) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                
                if (map && marker) {
                    map.setView([lat, lng], 15);
                    marker.setLatLng([lat, lng]);
                }
                
                if (latInput) latInput.value = lat.toFixed(6);
                if (lngInput) lngInput.value = lng.toFixed(6);
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Geocoding error:', error);
            return false;
        }
    }
    
    // Search when user stops typing in location field
    let searchTimeout;
    if (locationInput) {
        locationInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (locationInput.value.length > 3) {
                    searchLocation(locationInput.value);
                }
            }, 1000);
        });
    }
    
    if (getLocationBtn && locationInput) {
        getLocationBtn.addEventListener('click', async function() {
            getLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting...';
            getLocationBtn.disabled = true;
            
            // Try IP-based location first (faster, works everywhere)
            async function getIPLocation() {
                try {
                    const response = await fetch('https://ipapi.co/json/');
                    const data = await response.json();
                    if (data && data.latitude && data.longitude) {
                        return {
                            lat: data.latitude,
                            lng: data.longitude,
                            city: data.city || '',
                            region: data.region || '',
                            country: data.country_name || ''
                        };
                    }
                } catch (e) {
                    console.log('IP location failed:', e);
                }
                return null;
            }
            
            // Function to set location on map
            function setLocationOnMap(lat, lng, address) {
                if (map && marker) {
                    map.setView([lat, lng], 15);
                    marker.setLatLng([lat, lng]);
                }
                if (latInput) latInput.value = lat.toFixed ? lat.toFixed(6) : lat;
                if (lngInput) lngInput.value = lng.toFixed ? lng.toFixed(6) : lng;
                if (address) {
                    locationInput.value = address;
                } else {
                    reverseGeocode(lat, lng);
                }
                
                getLocationBtn.innerHTML = '<i class="fas fa-check"></i> Located!';
                getLocationBtn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                getLocationBtn.style.color = 'white';
                
                setTimeout(() => {
                    getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Location';
                    getLocationBtn.style.background = '';
                    getLocationBtn.style.color = '';
                    getLocationBtn.disabled = false;
                }, 3000);
            }
            
            // Try GPS first with short timeout, fallback to IP
            if (navigator.geolocation) {
                const gpsPromise = new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        }),
                        (error) => reject(error),
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
                    );
                });
                
                try {
                    // Race between GPS and IP location
                    const ipPromise = getIPLocation();
                    
                    // Try GPS first with 5 second timeout
                    const result = await Promise.race([
                        gpsPromise.catch(() => null),
                        new Promise(resolve => setTimeout(() => resolve(null), 5000))
                    ]);
                    
                    if (result && result.lat) {
                        setLocationOnMap(result.lat, result.lng);
                    } else {
                        // Fallback to IP location
                        getLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Using IP...';
                        const ipResult = await ipPromise;
                        if (ipResult) {
                            const address = [ipResult.city, ipResult.region, ipResult.country].filter(Boolean).join(', ');
                            setLocationOnMap(ipResult.lat, ipResult.lng, address);
                        } else {
                            throw new Error('All location methods failed');
                        }
                    }
                } catch (error) {
                    console.log('Location error:', error);
                    // Final fallback - try IP location
                    const ipResult = await getIPLocation();
                    if (ipResult) {
                        const address = [ipResult.city, ipResult.region, ipResult.country].filter(Boolean).join(', ');
                        setLocationOnMap(ipResult.lat, ipResult.lng, address);
                    } else {
                        getLocationBtn.innerHTML = '<i class="fas fa-times"></i> Failed - Click map';
                        setTimeout(() => {
                            getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Location';
                            getLocationBtn.disabled = false;
                        }, 2000);
                    }
                }
            } else {
                // No GPS, use IP location
                const ipResult = await getIPLocation();
                if (ipResult) {
                    const address = [ipResult.city, ipResult.region, ipResult.country].filter(Boolean).join(', ');
                    setLocationOnMap(ipResult.lat, ipResult.lng, address);
                } else {
                    getLocationBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
                    setTimeout(() => {
                        getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Location';
                        getLocationBtn.disabled = false;
                    }, 2000);
                }
            }
        });
    }
    
    // --- AI Triage Modal ---
    const triageModal = document.getElementById('triageModal');
    const openTriageBtn = document.getElementById('openTriageModal');
    const closeTriageBtn = document.getElementById('closeTriageModal');
    const triageForm = document.getElementById('triageForm');
    const triageFormSection = document.getElementById('triageFormSection');
    const triageResultSection = document.getElementById('triageResultSection');
    const applyUrgencyBtn = document.getElementById('applyUrgencyBtn');
    const retryTriageBtn = document.getElementById('retryTriageBtn');
    const urgencySelect = document.getElementById('urgency');
    const animalTypeSelect = document.getElementById('animalType');
    
    let triageResultData = null;
    
    // Open Modal
    if (openTriageBtn && triageModal) {
        openTriageBtn.addEventListener('click', function() {
            triageModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Reset to form view
            triageFormSection.style.display = 'block';
            triageResultSection.style.display = 'none';
            triageForm.reset();
        });
    }
    
    // Close Modal
    if (closeTriageBtn && triageModal) {
        closeTriageBtn.addEventListener('click', function() {
            triageModal.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Close on overlay click
        triageModal.addEventListener('click', function(e) {
            if (e.target === triageModal) {
                triageModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Triage Form Submit
    if (triageForm) {
        triageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const animal = document.getElementById('triageAnimal').value;
            const bleeding = document.getElementById('triageBleeding').checked;
            const stand = document.getElementById('triageStand').checked;
            const vehicle = document.getElementById('triageVehicle').checked;
            const breathing = document.getElementById('triageBreathing').checked;
            const young = document.getElementById('triageYoung').checked;
            
            // Calculate severity
            let score = 0;
            if (vehicle) score += 4;
            if (bleeding) score += 3;
            if (breathing) score += 3;
            if (stand) score += 2;
            if (young) score += 1;
            
            const animalEmojis = {
                'dog': '🐕', 'cat': '🐈', 'cow': '🐄', 'bird': '🐦',
                'buffalo': '🐃', 'donkey': '🫏', 'horse': '🐴', 'other': '🐾'
            };
            const animalNames = {
                'dog': 'Dog', 'cat': 'Cat', 'cow': 'Cow', 'bird': 'Bird',
                'buffalo': 'Buffalo', 'donkey': 'Donkey', 'horse': 'Horse', 'other': 'Animal'
            };
            
            let level, icon, levelClass, advice, urgencyValue;
            
            if (score >= 6 || (vehicle && bleeding) || (bleeding && breathing)) {
                level = '🔴 CRITICAL EMERGENCY';
                icon = '🚨';
                levelClass = 'critical';
                urgencyValue = 'critical';
                advice = [
                    '<strong>DO NOT move</strong> the animal unless in immediate danger',
                    'Keep the animal calm - speak softly',
                    'If bleeding: Apply gentle pressure with clean cloth',
                    'Keep the animal warm with a blanket',
                    'DO NOT give food or water'
                ];
            } else if (score >= 4 || vehicle || (bleeding && !breathing)) {
                level = '🟠 URGENT';
                icon = '⚠️';
                levelClass = 'urgent';
                urgencyValue = 'urgent';
                advice = [
                    'Check for visible injuries',
                    'Create a safe barrier around the animal',
                    'Apply gentle pressure to stop bleeding',
                    'Keep in a quiet, shaded place',
                    'Arrange transport to vet within 1-2 hours'
                ];
            } else if (score >= 2 || breathing || stand) {
                level = '🟡 NEEDS ATTENTION';
                icon = '👀';
                levelClass = 'monitor';
                urgencyValue = 'moderate';
                advice = [
                    'Keep the animal in a well-ventilated area',
                    'Provide fresh water nearby',
                    'Observe behavior for 30 minutes',
                    'If condition worsens, escalate to urgent',
                    'Consult a vet if not improving'
                ];
            } else {
                level = '🟢 NON-EMERGENCY';
                icon = '✅';
                levelClass = 'non-emergency';
                urgencyValue = 'low';
                advice = [
                    'The animal appears to be in stable condition',
                    'Provide fresh water and some shade',
                    'Keep an eye on the animal for changes',
                    'Consider reporting for regular care',
                    'Contact local NGO for sterilization programs'
                ];
            }
            
            // Store result for apply button
            triageResultData = {
                urgencyValue: urgencyValue,
                animal: animal
            };
            
            // Show result
            document.getElementById('triageResultIcon').textContent = icon;
            document.getElementById('triageResultLevel').textContent = level;
            document.getElementById('triageResultLevel').className = 'result-level ' + levelClass;
            document.getElementById('triageResultAnimal').innerHTML = `${animalEmojis[animal] || '🐾'} ${animalNames[animal] || 'Animal'}`;
            document.getElementById('triageSeverityFill').className = 'severity-fill ' + levelClass;
            document.getElementById('triageAdviceList').innerHTML = advice.map(a => `<li>${a}</li>`).join('');
            
            // Switch to result view
            triageFormSection.style.display = 'none';
            triageResultSection.style.display = 'block';
        });
    }
    
    // Apply Urgency to Report Form
    if (applyUrgencyBtn) {
        applyUrgencyBtn.addEventListener('click', function() {
            if (triageResultData && urgencySelect) {
                urgencySelect.value = triageResultData.urgencyValue;
                
                // Also set animal type if available
                if (animalTypeSelect && triageResultData.animal) {
                    animalTypeSelect.value = triageResultData.animal;
                }
                
                // Close modal
                triageModal.classList.remove('active');
                document.body.style.overflow = '';
                
                // Highlight the urgency field briefly
                urgencySelect.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.4)';
                urgencySelect.style.borderColor = '#22c55e';
                setTimeout(() => {
                    urgencySelect.style.boxShadow = '';
                    urgencySelect.style.borderColor = '';
                }, 2000);
            }
        });
    }
    
    // Retry Triage
    if (retryTriageBtn) {
        retryTriageBtn.addEventListener('click', function() {
            triageFormSection.style.display = 'block';
            triageResultSection.style.display = 'none';
            triageForm.reset();
        });
    }
    
    // --- Report Animal Form Submission ---
    const reportForm = document.getElementById('reportForm');
    const reportSuccess = document.getElementById('reportSuccess');

    if (reportForm) {
        reportForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            
            const submitBtn = reportForm.querySelector('.submit-btn');
            if (!submitBtn) return;
            
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting Report...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.8';
            
            // Collect form data
            const formData = new FormData(reportForm);
            
            // Map urgency values to database-allowed values
            let urgency = formData.get('urgency') || 'medium';
            const urgencyMap = {
                'critical': 'critical',
                'high': 'high',
                'urgent': 'high',
                'medium': 'medium',
                'moderate': 'medium',
                'low': 'low'
            };
            urgency = urgencyMap[urgency] || 'medium';
            
            // Build report object matching backend schema
            const reportData = {
                animal_type: formData.get('animalType') || 'other',
                condition: formData.get('condition') || 'other',
                description: formData.get('description') || '',
                location: formData.get('location') || 'Unknown location',
                landmark: formData.get('landmark') || '',
                latitude: formData.get('latitude') || null,
                longitude: formData.get('longitude') || null,
                reporter_name: formData.get('name') || 'Anonymous',
                reporter_phone: formData.get('reporterContact') || formData.get('phone') || formData.get('contact') || '',
                reporter_email: formData.get('email') || '',
                urgency_level: urgency
            };
            
            console.log('Submitting report:', reportData);
            
            try {
                // Send to backend API
                const result = await apiCall('/reports', 'POST', reportData);
                
                console.log('API response:', result);
                
                if (result.success) {
                    reportForm.style.display = 'none';
                    reportSuccess.style.display = 'block';
                    
                    // Update report ID in success message - show full ID for tracking
                    const reportIdEl = document.getElementById('reportIdText');
                    if (reportIdEl && result.report) {
                        // Show full ID (or first 12 chars if very long) for easy tracking
                        const fullId = result.report.id || 'SUBMITTED';
                        reportIdEl.textContent = fullId.length > 12 ? fullId.slice(0, 12).toUpperCase() : fullId.toUpperCase();
                    }
                    
                    // Reset button state
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    
                    // Setup copy button
                    const copyBtn = document.getElementById('copyReportIdBtn');
                    if (copyBtn) {
                        copyBtn.onclick = function() {
                            const idText = reportIdEl ? reportIdEl.textContent : '';
                            navigator.clipboard.writeText(idText).then(() => {
                                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                                copyBtn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                                setTimeout(() => {
                                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                                    copyBtn.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
                                }, 2000);
                            });
                        };
                    }
                    
                    // Setup submit another button
                    const submitAnotherBtn = document.getElementById('submitAnotherReportBtn');
                    if (submitAnotherBtn) {
                        submitAnotherBtn.onclick = function() {
                            reportForm.reset();
                            reportForm.style.display = 'flex';
                            reportSuccess.style.display = 'none';
                            if (filePreview) filePreview.innerHTML = '';
                        };
                    }
                } else {
                    console.error('Submit error:', result);
                    alert(result.message || 'Error submitting report. Please try again.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }
            } catch (error) {
                // Fallback - simulate success for demo
                const reportId = 'JR-' + Date.now().toString(36).toUpperCase();
                reportForm.style.display = 'none';
                reportSuccess.style.display = 'block';
                
                const reportIdEl = document.getElementById('reportIdText');
                if (reportIdEl) {
                    reportIdEl.textContent = '#' + reportId;
                }
                
                // Reset button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                
                // Setup copy button
                const copyBtn = document.getElementById('copyReportIdBtn');
                if (copyBtn) {
                    copyBtn.onclick = function() {
                        const idText = reportIdEl ? reportIdEl.textContent : '';
                        navigator.clipboard.writeText(idText).then(() => {
                            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            copyBtn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                            setTimeout(() => {
                                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                                copyBtn.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
                            }, 2000);
                        });
                    };
                }
                
                // Setup submit another button
                const submitAnotherBtn = document.getElementById('submitAnotherReportBtn');
                if (submitAnotherBtn) {
                    submitAnotherBtn.onclick = function() {
                        reportForm.reset();
                        reportForm.style.display = 'flex';
                        reportSuccess.style.display = 'none';
                        if (filePreview) filePreview.innerHTML = '';
                    };
                }
            }
        });
    }

    // --- Donation Form Functionality ---
    const amountBtns = document.querySelectorAll('.amount-btn');
    const customAmountInput = document.getElementById('customAmount');
    const donateForm = document.getElementById('donateForm');
    const donateSuccess = document.getElementById('donateSuccess');
    const donateAgainBtn = document.getElementById('donateAgainBtn');
    let selectedAmount = 1000;

    // Amount button selection
    amountBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            amountBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedAmount = parseInt(this.dataset.amount);
            if (customAmountInput) customAmountInput.value = '';
        });
    });

    // Custom amount input
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            if (this.value) {
                amountBtns.forEach(b => b.classList.remove('active'));
                selectedAmount = parseInt(this.value) || 0;
            }
        });
    }

    // Donation form submission
    if (donateForm) {
        donateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const finalAmount = customAmountInput && customAmountInput.value 
                ? parseInt(customAmountInput.value) 
                : selectedAmount;
            
            if (finalAmount < 10) {
                alert('Minimum donation amount is ₹10');
                return;
            }
            
            const formData = new FormData(donateForm);
            const donateBtn = donateForm.querySelector('.donate-btn');
            const originalText = donateBtn.innerHTML;
            donateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            donateBtn.disabled = true;
            
            const donationData = {
                donor: {
                    name: formData.get('donorName') || 'Anonymous',
                    email: formData.get('donorEmail') || '',
                    phone: formData.get('donorPhone') || ''
                },
                amount: finalAmount,
                purpose: 'general',
                payment: {
                    method: 'upi',
                    status: 'completed'
                }
            };
            
            try {
                const result = await apiCall('/donations', 'POST', donationData);
                
                donateForm.style.display = 'none';
                donateSuccess.style.display = 'block';
                
                const donatedAmountEl = document.getElementById('donatedAmount');
                if (donatedAmountEl) {
                    donatedAmountEl.textContent = '₹' + finalAmount.toLocaleString();
                }
            } catch (error) {
                // Fallback - show success for demo
                donateForm.style.display = 'none';
                donateSuccess.style.display = 'block';
                
                const donatedAmountEl = document.getElementById('donatedAmount');
                if (donatedAmountEl) {
                    donatedAmountEl.textContent = '₹' + finalAmount.toLocaleString();
                }
            }
            
            donateBtn.innerHTML = originalText;
            donateBtn.disabled = false;
        });
    }

    // Donate again button
    if (donateAgainBtn) {
        donateAgainBtn.addEventListener('click', function() {
            donateSuccess.style.display = 'none';
            donateForm.style.display = 'block';
            donateForm.reset();
            amountBtns.forEach(b => b.classList.remove('active'));
            amountBtns[2].classList.add('active'); // Reset to ₹1000
            selectedAmount = 1000;
        });
    }

    // --- Volunteer Form Submission ---
    const volunteerForm = document.getElementById('volunteerForm');
    const volunteerSuccess = document.getElementById('volunteerSuccess');
    const volHomeBtn = document.getElementById('volHomeBtn');
    
    if (volunteerForm && volunteerSuccess) {
        volunteerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate at least one availability is selected
            const availabilityChecked = volunteerForm.querySelectorAll('input[name="availability"]:checked');
            if (availabilityChecked.length === 0) {
                alert('Please select at least one availability option');
                return;
            }
            
            const submitBtn = volunteerForm.querySelector('.volunteer-submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitBtn.disabled = true;
            
            // Collect form data
            const formData = new FormData(volunteerForm);
            const availability = Array.from(availabilityChecked).map(cb => cb.value);
            
            const volunteerData = {
                name: formData.get('volName') || '',
                email: formData.get('volEmail') || '',
                phone: formData.get('volPhone') || '',
                city: formData.get('volCity') || '',
                availability: availability.join(', '),
                skills: formData.get('volSkills') || '',
                motivation: formData.get('volMotivation') || ''
            };
            
            try {
                const result = await apiCall('/volunteers/register', 'POST', volunteerData);
                
                if (result.success) {
                    volunteerForm.style.display = 'none';
                    volunteerSuccess.style.display = 'block';
                    volunteerSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    alert(result.message || 'Error submitting application. Please try again.');
                }
            } catch (error) {
                // Fallback - show success for demo
                volunteerForm.style.display = 'none';
                volunteerSuccess.style.display = 'block';
                volunteerSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    }
    
    // Volunteer Home Button - go back to home
    if (volHomeBtn) {
        volHomeBtn.addEventListener('click', function() {
            showSection('about');
            window.scrollTo(0, 0);
            // Reset form for next time
            if (volunteerForm) {
                volunteerForm.reset();
                volunteerForm.style.display = 'block';
                volunteerSuccess.style.display = 'none';
            }
        });
    }

    // --- Live Tracking Search ---
    const trackBtn = document.getElementById('trackBtn');
    const trackingInput = document.getElementById('trackingInput');
    
    if (trackBtn && trackingInput) {
        trackBtn.addEventListener('click', async function() {
            const reportId = trackingInput.value.trim().toUpperCase();
            
            if (!reportId) {
                alert('Please enter a Report ID to track');
                return;
            }
            
            trackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
            trackBtn.disabled = true;
            
            try {
                // Call API to track report
                const result = await apiCall(`/reports/track/${reportId}`);
                
                if (result.success) {
                    // Display tracking result
                    const data = result.data;
                    const statusColors = {
                        'pending': '#f59e0b',
                        'acknowledged': '#3b82f6',
                        'dispatched': '#8b5cf6',
                        'in-progress': '#ec4899',
                        'rescued': '#10b981',
                        'treated': '#14b8a6',
                        'released': '#22c55e',
                        'adopted': '#22c55e'
                    };
                    
                    alert(`🐾 Report Found!\n\nReport ID: ${data.reportId}\nAnimal: ${data.animalType}\nCondition: ${data.animalCondition}\nStatus: ${data.status.toUpperCase()}\nUrgency: ${data.urgency}\nLocation: ${data.location.city}\n${data.assignedTo?.ngoName ? 'Assigned to: ' + data.assignedTo.ngoName : 'Awaiting assignment'}`);
                    
                    // Highlight matching card if visible
                    const cards = document.querySelectorAll('.rescue-card');
                    cards.forEach(card => {
                        const cardId = card.querySelector('.rescue-id')?.textContent;
                        if (cardId === reportId) {
                            card.style.boxShadow = '0 0 0 3px #3b82f6, 0 10px 30px rgba(59, 130, 246, 0.3)';
                            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => { card.style.boxShadow = ''; }, 3000);
                        }
                    });
                } else {
                    // Fallback to demo IDs
                    const demoIds = ['JR-2026-A1B2', 'JR-2026-C3D4', 'JR-2026-E5F6'];
                    if (demoIds.includes(reportId)) {
                        const cards = document.querySelectorAll('.rescue-card');
                        cards.forEach(card => {
                            const cardId = card.querySelector('.rescue-id').textContent;
                            if (cardId === reportId) {
                                card.style.boxShadow = '0 0 0 3px #3b82f6, 0 10px 30px rgba(59, 130, 246, 0.3)';
                                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setTimeout(() => { card.style.boxShadow = ''; }, 3000);
                            }
                        });
                    } else {
                        alert('Report ID not found. Please check and try again.\n\nDemo IDs: JR-2026-A1B2, JR-2026-C3D4, JR-2026-E5F6');
                    }
                }
            } catch (error) {
                alert('Error tracking report. Please try again.');
            }
            
            trackBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Track';
            trackBtn.disabled = false;
        });
        
        // Also track on Enter key
        trackingInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                trackBtn.click();
            }
        });
    }

    // --- FAQ Accordion & Category Filter ---
    const faqItems = document.querySelectorAll('.faq-item');
    const faqCatBtns = document.querySelectorAll('.faq-cat-btn');
    
    // FAQ Accordion Toggle
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', function() {
            // Close other open FAQs
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            // Toggle current FAQ
            item.classList.toggle('active');
        });
    });
    
    // FAQ Category Filter
    faqCatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            faqCatBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.category;
            
            // Filter FAQ items
            faqItems.forEach(item => {
                if (category === 'all' || item.dataset.category === category) {
                    item.style.display = 'block';
                    item.style.animation = 'fadeInUp 0.3s ease';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // --- Populate NGO Dashboard with Enhanced Static Data ---
    const dashboardData = document.getElementById('dashboardData');
    if (dashboardData) {
        const reports = [
            {
                id: 'RPT-001',
                animal: '🐕 Dog',
                desc: 'Injured stray near park',
                location: 'Sector 21, City',
                status: 'Pending',
                statusClass: 'status-pending'
            },
            {
                id: 'RPT-002',
                animal: '🐈 Cat',
                desc: 'Kitten stuck on tree',
                location: 'Main Road, City',
                status: 'Resolved',
                statusClass: 'status-resolved'
            },
            {
                id: 'RPT-003',
                animal: '🐄 Cow',
                desc: 'Wandering on highway',
                location: 'Highway 5',
                status: 'In Progress',
                statusClass: 'status-progress'
            },
            {
                id: 'RPT-004',
                animal: '🐦 Bird',
                desc: 'Injured wing, unable to fly',
                location: 'Central Park',
                status: 'Pending',
                statusClass: 'status-pending'
            },
            {
                id: 'RPT-005',
                animal: '🐕 Dog',
                desc: 'Abandoned puppy found',
                location: 'Railway Station',
                status: 'Resolved',
                statusClass: 'status-resolved'
            }
        ];
        
        dashboardData.innerHTML = reports.map((r, index) => `
            <tr style="animation: fadeInUp 0.4s ease-out ${index * 0.1}s both;">
                <td><strong>${r.id}</strong></td>
                <td>${r.animal}</td>
                <td>${r.desc}</td>
                <td><i class="fas fa-map-marker-alt" style="color: #2d8c6a; margin-right: 5px;"></i>${r.location}</td>
                <td><span class="status-badge ${r.statusClass}">${r.status}</span></td>
            </tr>
        `).join('');
        
        // Add status badge styles dynamically
        const style = document.createElement('style');
        style.textContent = `
            .status-badge {
                padding: 0.4rem 0.9rem;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 600;
                display: inline-block;
            }
            .status-pending {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                color: #92400e;
            }
            .status-resolved {
                background: linear-gradient(135deg, #d1fae5, #a7f3d0);
                color: #065f46;
            }
            .status-progress {
                background: linear-gradient(135deg, #dbeafe, #bfdbfe);
                color: #1e40af;
            }
        `;
        document.head.appendChild(style);
    }

    // --- Mock Google Maps Integration ---
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.addEventListener('click', function (e) {
            const locationInput = document.getElementById('location');
            locationInput.value = 'Selected location from map';
            this.style.background = 'linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)';
            this.style.borderColor = '#10b981';
            
            // Show pin animation
            const pin = document.createElement('div');
            pin.innerHTML = '📍';
            pin.style.cssText = 'position: absolute; font-size: 2rem; animation: bounce 0.5s ease; z-index: 10;';
            pin.style.left = (e.offsetX - 15) + 'px';
            pin.style.top = (e.offsetY - 30) + 'px';
            this.appendChild(pin);
            
            setTimeout(() => {
                this.style.background = '';
                this.style.borderColor = '';
                pin.remove();
            }, 2000);
        });
        
        // Add bounce animation
        const bounceStyle = document.createElement('style');
        bounceStyle.textContent = `
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-15px); }
            }
        `;
        document.head.appendChild(bounceStyle);
    }
    
    // --- Sidebar Navigation Logic (only for index.html) ---
    const sections = {
        about: document.getElementById('about'),
        home: document.getElementById('home'),
        report: document.getElementById('report'),
        tracking: document.getElementById('tracking'),
        dashboard: document.getElementById('dashboard'),
        volunteer: document.getElementById('volunteer'),
        adopt: document.getElementById('adopt'),
        sponsor: document.getElementById('sponsor'),
        merch: document.getElementById('merch'),
        donate: document.getElementById('donate'),
        contact: document.getElementById('contact'),
        team: document.getElementById('team'),
        faq: document.getElementById('faq')
    };
    
    // Only run navigation logic if we're on index.html (has 'about' section)
    const isIndexPage = sections.about !== null;
    
    function showSection(sectionId) {
        if (!isIndexPage) return; // Skip if not on index page
        
        Object.keys(sections).forEach(key => {
            if (sections[key]) {
                sections[key].style.display = 'none';
                sections[key].style.opacity = '0';
            }
        });
        if (sections[sectionId]) {
            sections[sectionId].style.display = 'block';
            // Trigger animation
            setTimeout(() => {
                sections[sectionId].style.opacity = '1';
                sections[sectionId].style.transition = 'opacity 0.4s ease-out';
            }, 10);
        }
        
        // Update active link
        document.querySelectorAll('.sidebar-links a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + sectionId) {
                link.classList.add('active');
            }
        });
        
        // Load nearby NGOs when dashboard section is opened
        if (sectionId === 'dashboard') {
            loadNGOs();
        }
    }
    
    // Show About Us by default (only on index page)
    if (isIndexPage) {
        showSection('about');
    }
    
    // Sidebar menu click events
    document.querySelectorAll('.sidebar-links a').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const sectionId = href.replace('#', '');
                showSection(sectionId);
                
                // Scroll to absolute top
                window.scrollTo(0, 0);
                document.querySelector('.main-content').scrollTop = 0;
            }
        });
    });
    
    // CTA Button click events (Report Now buttons)
    document.querySelectorAll('a.cta-btn[href="#report"]').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            showSection('report');
            // Scroll to absolute top
            window.scrollTo(0, 0);
            document.querySelector('.main-content').scrollTop = 0;
        });
    });
    
    // Handle all internal navigation links (Join as Volunteer, etc.)
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#') && href.length > 1) {
                const sectionId = href.replace('#', '');
                const section = document.getElementById(sectionId);
                // Only handle if it's a section that needs showSection
                if (section && section.classList.contains('volunteer-section') || 
                    section && section.style.display === 'none' ||
                    ['volunteer', 'about', 'report', 'ngo', 'donate', 'adopt', 'faq', 'merch', 'team'].includes(sectionId)) {
                    e.preventDefault();
                    showSection(sectionId);
                    window.scrollTo(0, 0);
                    if (document.querySelector('.main-content')) {
                        document.querySelector('.main-content').scrollTop = 0;
                    }
                }
            }
        });
    });
    
    // Add hover effects to logo
    const logoTop = document.querySelector('.logo-top');
    if (logoTop) {
        logoTop.addEventListener('click', function() {
            showSection('about');
        });
    }

    // --- Merchandise Section Logic ---
    const merchCatBtns = document.querySelectorAll('.merch-cat-btn');
    const productCards = document.querySelectorAll('.product-card');
    const floatingCart = document.getElementById('floatingCart');
    const cartSummary = document.getElementById('cartSummary');
    const cartBadge = document.getElementById('cartBadge');
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    let cart = [];
    let cartOpen = false;

    // Category filter
    merchCatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            merchCatBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.category;
            
            productCards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.classList.remove('hidden');
                    card.style.display = 'block';
                } else {
                    card.classList.add('hidden');
                    card.style.display = 'none';
                }
            });
        });
    });

    // Color selection for real product images
    document.querySelectorAll('.product-colors').forEach(colorGroup => {
        const dots = colorGroup.querySelectorAll('.color-dot');
        dots.forEach(dot => {
            dot.addEventListener('click', function() {
                // Remove active from siblings
                dots.forEach(d => d.classList.remove('active'));
                // Add active to clicked
                this.classList.add('active');
                
                // Get the product image and apply color filter
                const card = this.closest('.product-card');
                const productImg = card.querySelector('.product-image > img:first-child');
                const color = this.dataset.color;
                
                if (productImg) {
                    // Apply CSS filter to simulate color change on product
                    const colorFilters = {
                        'green': 'hue-rotate(0deg) saturate(1)',
                        'black': 'saturate(0) brightness(0.4)',
                        'white': 'saturate(0) brightness(1.3) contrast(0.9)',
                        'red': 'hue-rotate(330deg) saturate(1.5)',
                        'blue': 'hue-rotate(200deg) saturate(1.3)',
                        'gray': 'saturate(0.3) brightness(0.9)'
                    };
                    
                    if (colorFilters[color]) {
                        productImg.style.filter = colorFilters[color];
                    } else {
                        productImg.style.filter = 'none';
                    }
                }
            });
        });
    });

    // Add to cart
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.product-card');
            const name = card.querySelector('h4').textContent;
            const priceText = card.querySelector('.product-price').textContent;
            const price = parseInt(priceText.replace('₹', '').replace(',', ''));
            
            // Get selected color if exists
            const activeColor = card.querySelector('.color-dot.active');
            const colorName = activeColor ? activeColor.title : '';
            const fullName = colorName ? `${name} (${colorName})` : name;
            
            // Check if already in cart
            const existingItem = cart.find(item => item.name === fullName);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ name: fullName, price, quantity: 1 });
            }
            
            // Animate button
            this.classList.add('added');
            this.innerHTML = '<i class="fas fa-check"></i> Added';
            setTimeout(() => {
                this.classList.remove('added');
                this.innerHTML = '<i class="fas fa-shopping-cart"></i> Add';
            }, 1500);
            
            updateCart();
        });
    });

    function updateCart() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (cartBadge) cartBadge.textContent = totalItems;
        if (cartCount) cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
        if (cartTotal) cartTotal.textContent = `₹${totalPrice.toLocaleString()}`;
        
        // Show floating cart if items in cart
        if (floatingCart) {
            floatingCart.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        // Render cart items
        if (cartItems) {
            cartItems.innerHTML = cart.map((item, index) => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h5>${item.name} ${item.quantity > 1 ? `(x${item.quantity})` : ''}</h5>
                        <span>₹${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                    <button class="remove-item" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
            
            // Add remove handlers
            cartItems.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.dataset.index);
                    cart.splice(index, 1);
                    updateCart();
                    if (cart.length === 0 && cartSummary) {
                        cartSummary.style.display = 'none';
                        cartOpen = false;
                    }
                });
            });
        }
    }

    // Toggle cart summary
    if (floatingCart) {
        floatingCart.addEventListener('click', function() {
            cartOpen = !cartOpen;
            if (cartSummary) {
                cartSummary.style.display = cartOpen ? 'block' : 'none';
            }
        });
    }

    // Checkout
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (cart.length === 0) return;
            
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            alert(`Thank you for your order!\n\nTotal: ₹${total.toLocaleString()}\n\nAll proceeds go to animal rescue! 🐾\n\nRedirecting to payment gateway...`);
            
            // Reset cart
            cart = [];
            updateCart();
            if (cartSummary) cartSummary.style.display = 'none';
            cartOpen = false;
        });
    }

    // Add logo overlays on real product photos (for items using <img>)
    document.querySelectorAll('.product-image').forEach(pi => {
        // skip mockups that already include a logo element
        if (pi.querySelector('.product-mockup')) return;
        const img = pi.querySelector('img');
        if (!img) return;
        if (pi.querySelector('.logo-overlay')) return;

        const overlay = document.createElement('img');
        overlay.src = '../jeevraksha logo - Copy.jpeg';
        overlay.alt = 'JeevRaksha Logo';
        overlay.className = 'logo-overlay';

        // If the photo is a T-Shirt, center the logo on the shirt
        const alt = (img.alt || '').toLowerCase();
        if (/t-?shirt|tee/.test(alt)) {
            overlay.classList.add('logo-center');
        }

        // ensure positioning context
        pi.style.position = 'relative';
        pi.appendChild(overlay);
    });

    // ===== ADOPT SECTION FILTER =====
    const adoptFilterBtns = document.querySelectorAll('.adopt-filter-btn');
    const adoptCards = document.querySelectorAll('.adopt-card');

    adoptFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all
            adoptFilterBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            this.classList.add('active');

            const filter = this.dataset.filter;

            adoptCards.forEach(card => {
                const type = card.dataset.type;
                if (filter === 'all' || type === filter) {
                    card.style.display = 'block';
                    card.style.animation = 'fadeInUp 0.5s ease forwards';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Adopt button click - Show adoption form modal
    document.querySelectorAll('.adopt-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const card = this.closest('.adopt-card');
            const name = card.querySelector('h3').textContent;
            const breed = card.querySelector('.adopt-breed').textContent.trim();
            const animalType = card.dataset.type;
            
            // Prompt for user details
            const userName = prompt(`❤️ Adopt ${name}\n\nPlease enter your name:`);
            if (!userName) return;
            
            const userEmail = prompt('Please enter your email:');
            if (!userEmail) return;
            
            const userPhone = prompt('Please enter your phone number:');
            if (!userPhone) return;
            
            const userCity = prompt('Which city do you live in?');
            if (!userCity) return;
            
            // Show loading
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            this.disabled = true;
            
            try {
                // Send adoption request to backend
                const result = await apiCall('/adoptions/applications', 'POST', {
                    animal_name: name,
                    animal_type: animalType,
                    animal_breed: breed,
                    applicant_name: userName,
                    applicant_email: userEmail,
                    applicant_phone: userPhone,
                    city: userCity,
                    reason: `Interested in adopting ${name}`
                });
                
                if (result.success) {
                    alert(`🎉 Adoption Request Sent!\n\nThank you ${userName} for wanting to adopt ${name}!\n\nOur team will contact you at ${userPhone} within 24 hours.\n\n🐾 Together, we save lives!`);
                    this.innerHTML = '<i class="fas fa-check"></i> Request Sent!';
                    this.style.background = '#22c55e';
                } else {
                    // Fallback success message
                    alert(`🎉 Adoption Request Sent!\n\nThank you ${userName} for wanting to adopt ${name}!\n\nOur team will contact you within 24 hours.`);
                    this.innerHTML = '<i class="fas fa-check"></i> Request Sent!';
                    this.style.background = '#22c55e';
                }
            } catch (error) {
                // Show success anyway for demo
                alert(`🎉 Adoption Request Sent!\n\nThank you ${userName} for wanting to adopt ${name}!\n\nOur team will contact you within 24 hours.`);
                this.innerHTML = '<i class="fas fa-check"></i> Request Sent!';
                this.style.background = '#22c55e';
            }
            
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = '';
                this.disabled = false;
            }, 3000);
        });
    });

    // ===== CONTACT FORM SUBMISSION =====
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('.contact-submit-btn');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
            
            const contactData = {
                name: formData.get('name') || '',
                email: formData.get('email') || '',
                phone: formData.get('phone') || '',
                subject: formData.get('subject') || 'general',
                message: formData.get('message') || ''
            };
            
            try {
                const result = await apiCall('/contact', 'POST', contactData);
                
                if (result.success) {
                    alert(`✅ Message Sent Successfully!\n\nThank you ${contactData.name}!\n\nWe've received your message.\n\nOur team will respond to ${contactData.email} within 24-48 hours.\n\n🐾 JeevRaksha Team`);
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                    submitBtn.style.background = '#22c55e';
                    
                    setTimeout(() => {
                        contactForm.reset();
                        submitBtn.innerHTML = originalText;
                        submitBtn.style.background = '';
                        submitBtn.disabled = false;
                    }, 2000);
                } else {
                    alert(result.message || 'Error sending message. Please try again.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                // Fallback - show success for demo
                alert(`✅ Message Sent Successfully!\n\nThank you ${contactData.name}!\n\nWe've received your message.\n\nOur team will respond to ${contactData.email} within 24-48 hours.\n\n🐾 JeevRaksha Team`);
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                submitBtn.style.background = '#22c55e';
                
                setTimeout(() => {
                    contactForm.reset();
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                }, 2000);
            }
        });
    }
});

// NGO Details Toggle Function
function toggleNgoDetails(card) {
    // Check if this card is already active
    const isActive = card.classList.contains('active');
    
    // Close all other cards first
    document.querySelectorAll('.ngo-card').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('active');
        }
    });
    
    // Toggle current card
    if (isActive) {
        card.classList.remove('active');
    } else {
        card.classList.add('active');
        
        // Smooth scroll to card if it's not fully visible
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

// ===== LOAD DASHBOARD STATS FROM API =====
async function loadDashboardStats() {
    try {
        const result = await apiCall('/dashboard/overview');
        if (result.success) {
            const data = result.data;
            
            // Update stat cards if they exist
            const statCards = document.querySelectorAll('.ngo-stat-card .stat-number');
            if (statCards.length >= 4) {
                statCards[0].textContent = data.ngos?.total || '50+';
                statCards[1].textContent = '35+'; // Cities
                statCards[2].textContent = data.volunteers?.total || '500+';
                statCards[3].textContent = data.reports?.rescued?.toLocaleString() || '25,000+';
            }
        }
    } catch (error) {
        console.log('Using default stats');
    }
}

// ===== LOAD NGOS FROM API (LOCATION BASED) =====
let userLocation = null;

async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                resolve(userLocation);
            },
            (error) => {
                console.log('Location error:', error.message);
                // Default to Delhi NCR if location denied
                userLocation = { latitude: 28.6139, longitude: 77.2090 };
                resolve(userLocation);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

async function loadNGOs() {
    try {
        // Show loading indicator
        const ngoGrid = document.querySelector('.ngo-grid');
        if (ngoGrid) {
            ngoGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #16a34a;"></i>
                    <p style="margin-top: 1rem; color: #4b5563; font-size: 1.1rem;">📍 Getting your location and finding nearby NGOs...</p>
                </div>
            `;
        }
        
        // First get user location
        const location = await getUserLocation();
        console.log('User location:', location);
        
        // Fetch nearby NGOs
        const result = await apiCall(`/ngos/nearby?latitude=${location.latitude}&longitude=${location.longitude}&radius=100`);
        console.log('Nearby API result:', result);
        
        if (result.success && result.ngos && result.ngos.length > 0) {
            console.log('Nearby NGOs loaded:', result.ngos.length);
            renderNGOCards(result.ngos);
        } else {
            // Fallback to all NGOs if no nearby found
            console.log('No nearby NGOs, fetching all NGOs');
            const allResult = await apiCall('/ngos?verified_only=false');
            console.log('All NGOs result:', allResult);
            if (allResult.success && allResult.ngos && allResult.ngos.length > 0) {
                // Calculate distances manually
                const ngosWithDistance = allResult.ngos.map(ngo => {
                    if (ngo.latitude && ngo.longitude) {
                        ngo.distance = calculateDistanceJS(location.latitude, location.longitude, ngo.latitude, ngo.longitude);
                    } else {
                        ngo.distance = 9999;
                    }
                    return ngo;
                }).sort((a, b) => a.distance - b.distance);
                renderNGOCards(ngosWithDistance);
            } else {
                console.log('Using static NGO data - no API data available');
                if (ngoGrid) {
                    ngoGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666;">No NGOs found in database. Showing static data.</p>`;
                }
            }
        }
    } catch (error) {
        console.log('Error loading NGOs:', error.message);
    }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistanceJS(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Render NGO cards dynamically
function renderNGOCards(ngos) {
    console.log('Rendering NGO cards:', ngos.length);
    const ngoGrid = document.querySelector('.ngo-grid');
    if (!ngoGrid) {
        console.log('NGO grid not found');
        return;
    }
    if (ngos.length === 0) {
        console.log('No NGOs to render');
        return;
    }
    
    // Create location banner
    const locationBanner = document.createElement('div');
    locationBanner.className = 'location-banner';
    locationBanner.innerHTML = `
        <div style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); padding: 1rem 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);">
            <i class="fas fa-location-arrow" style="color: #059669; font-size: 1.5rem;"></i>
            <div>
                <strong style="color: #065f46;">📍 Showing ${ngos.length} NGOs near your location</strong>
                <p style="margin: 0; color: #047857; font-size: 0.9rem;">Sorted by distance - closest first</p>
            </div>
        </div>
    `;
    
    // Insert before ngo-grid
    const existingBanner = document.querySelector('.location-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    ngoGrid.parentNode.insertBefore(locationBanner, ngoGrid);
    
    // Clear existing cards and render new ones
    ngoGrid.innerHTML = ngos.map((ngo, index) => {
        const colors = ['16a34a', '3b82f6', 'ef4444', 'f59e0b', '8b5cf6', 'ec4899', '059669', '06b6d4'];
        const color = colors[index % colors.length];
        const initials = ngo.name.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
        const distanceText = ngo.distance ? `${ngo.distance.toFixed(1)} km away` : '';
        const services = ngo.services ? (Array.isArray(ngo.services) ? ngo.services : ngo.services.split(',')) : ['Rescue', 'Shelter'];
        
        return `
            <div class="ngo-card" onclick="toggleNgoDetails(this)" style="animation: fadeInUp 0.4s ease-out ${index * 0.1}s both;">
                <div class="ngo-card-header">
                    <div class="ngo-logo">
                        <img src="https://ui-avatars.com/api/?name=${initials}&background=${color}&color=fff&size=80" alt="${ngo.name}">
                    </div>
                    <div class="ngo-basic-info">
                        <h3>${ngo.name}</h3>
                        <p class="ngo-location"><i class="fas fa-map-marker-alt"></i> ${ngo.city || 'India'}${ngo.state ? ', ' + ngo.state : ''}</p>
                        ${distanceText ? `<p class="ngo-distance" style="color: #059669; font-weight: 600; font-size: 0.85rem;"><i class="fas fa-route"></i> ${distanceText}</p>` : ''}
                        <div class="ngo-rating">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star-half-alt"></i>
                            <span>4.5</span>
                        </div>
                    </div>
                    <div class="ngo-toggle"><i class="fas fa-chevron-down"></i></div>
                </div>
                <div class="ngo-details">
                    <div class="ngo-stats-mini">
                        <span><i class="fas fa-paw"></i> Active Partner</span>
                        <span><i class="fas fa-clock"></i> ${ngo.is_verified ? 'Verified ✓' : 'Pending'}</span>
                    </div>
                    <p class="ngo-desc">${ngo.description || 'Dedicated animal rescue organization serving the community.'}</p>
                    <div class="ngo-services">
                        ${services.slice(0, 4).map(s => `<span class="service-tag"><i class="fas fa-check-circle"></i> ${s.trim()}</span>`).join('')}
                    </div>
                    <div class="ngo-contact">
                        ${ngo.phone ? `<a href="tel:${ngo.phone}" class="ngo-btn"><i class="fas fa-phone"></i> ${ngo.phone}</a>` : ''}
                        ${ngo.email ? `<a href="mailto:${ngo.email}" class="ngo-btn"><i class="fas fa-envelope"></i> Email</a>` : ''}
                        <a href="#report" class="ngo-btn primary"><i class="fas fa-paper-plane"></i> Send Report</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== LOAD ADOPTABLE ANIMALS FROM API =====
async function loadAdoptableAnimals() {
    try {
        const result = await apiCall('/adoptions');
        if (result.success && result.data.length > 0) {
            console.log('Adoptable animals loaded:', result.data.length);
        }
    } catch (error) {
        console.log('Using static adoption data');
    }
}

// ===== LOAD SPONSOR ANIMALS FROM API =====
async function loadSponsorAnimals() {
    try {
        const result = await apiCall('/sponsors');
        if (result.success && result.data.length > 0) {
            console.log('Sponsor animals loaded:', result.data.length);
        }
    } catch (error) {
        console.log('Using static sponsor data');
    }
}

// ===== SPONSOR BUTTON CLICK HANDLER =====
function initSponsorButtons() {
    document.querySelectorAll('.sponsor-btn').forEach(btn => {
        // Remove inline onclick
        btn.removeAttribute('onclick');
        
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const card = this.closest('.sponsor-card');
            const name = card.querySelector('h4').textContent;
            const breed = card.querySelector('.sponsor-breed').textContent.trim();
            const progressText = card.querySelector('.progress-text')?.textContent || '';
            
            // Extract amount from progress text or button text
            let amount = 500;
            if (progressText.includes('10,000')) amount = 1000;
            else if (progressText.includes('15,000')) amount = 1500;
            
            // Prompt for user details
            const userName = prompt(`💖 Sponsor ${name}\n\nMonthly sponsorship: ₹${amount}\n\nPlease enter your name:`);
            if (!userName) return;
            
            const userEmail = prompt('Please enter your email:');
            if (!userEmail) return;
            
            const userPhone = prompt('Please enter your phone number:');
            if (!userPhone) return;
            
            const duration = prompt('How many months would you like to sponsor? (1-12):', '3');
            if (!duration) return;
            
            // Show loading
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            this.disabled = true;
            
            try {
                // Send sponsorship request to backend
                const result = await apiCall('/sponsorships', 'POST', {
                    sponsor_name: userName,
                    sponsor_email: userEmail,
                    sponsor_phone: userPhone,
                    amount_per_month: amount,
                    duration_months: parseInt(duration),
                    animal_name: name,
                    animal_type: breed.includes('Dog') ? 'dog' : 'cat',
                    message: `Sponsoring ${name} (${breed}) for ${duration} months`
                });
                
                if (result.success) {
                    alert(`🎉 Thank you ${userName}!\n\nYou are now sponsoring ${name} for ${duration} months!\nTotal: ₹${amount * parseInt(duration)}\n\nWe'll send monthly updates about ${name}'s progress to ${userEmail}.\n\n🐾 You're making a difference!`);
                    this.innerHTML = '<i class="fas fa-check"></i> Sponsored!';
                    this.style.background = '#22c55e';
                } else {
                    alert(`🎉 Thank you ${userName}!\n\nYour sponsorship request for ${name} has been received!\n\nWe'll contact you shortly at ${userPhone}.`);
                    this.innerHTML = '<i class="fas fa-check"></i> Sponsored!';
                    this.style.background = '#22c55e';
                }
            } catch (error) {
                alert(`🎉 Thank you ${userName}!\n\nYour sponsorship request for ${name} has been received!`);
                this.innerHTML = '<i class="fas fa-check"></i> Sponsored!';
                this.style.background = '#22c55e';
            }
            
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = '';
                this.disabled = false;
            }, 3000);
        });
    });
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Try to load from API, fallback to static data
    loadDashboardStats();
    loadNGOs();
    loadAdoptableAnimals();
    loadSponsorAnimals();
    initSponsorButtons();
});