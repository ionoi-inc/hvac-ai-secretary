// M. Jacob Company - Standalone Frontend JavaScript

// Mobile Navigation Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

// Modal Functions
const modal = document.getElementById('bookingModal');

function openModal(serviceType = '') {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Pre-select service type if provided
    if (serviceType) {
        const serviceSelect = document.getElementById('service');
        const option = Array.from(serviceSelect.options).find(opt => 
            opt.value === serviceType || opt.textContent.includes(serviceType)
        );
        if (option) {
            serviceSelect.value = option.value;
        }
    }
    
    // Set minimum date to today
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset form
    document.getElementById('bookingForm').reset();
    hideMessage();
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// Close modal on escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
    }
});

// Form Message Display
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('formMessage');
    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = 'block';
    
    // Scroll message into view
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideMessage() {
    const messageDiv = document.getElementById('formMessage');
    messageDiv.style.display = 'none';
}

// Form Submission Handler
async function handleSubmit(event) {
    event.preventDefault();
    hideMessage();
    
    const form = document.getElementById('bookingForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    // Collect form data
    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        service: document.getElementById('service').value,
        address: document.getElementById('address').value,
        date: document.getElementById('date').value,
        notes: document.getElementById('notes').value,
        timestamp: new Date().toISOString(),
    };
    
    try {
        // Check if backend API is available
        const backendUrl = window.location.origin + '/api/bookings';
        
        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            
            if (response.ok) {
                showMessage('✓ Booking request submitted successfully! We\'ll contact you soon to confirm your appointment.', 'success');
                
                // Reset form after 3 seconds
                setTimeout(() => {
                    form.reset();
                    hideMessage();
                }, 3000);
                
                // Close modal after 5 seconds
                setTimeout(() => {
                    closeModal();
                }, 5000);
            } else {
                throw new Error('Backend returned error');
            }
        } catch (fetchError) {
            // Backend not available - use fallback methods
            console.log('Backend API not available, using fallback methods');
            
            // METHOD 1: Email fallback (mailto link)
            const emailSubject = encodeURIComponent(`Service Request from ${formData.name}`);
            const emailBody = encodeURIComponent(
                `New Service Request:\n\n` +
                `Name: ${formData.name}\n` +
                `Phone: ${formData.phone}\n` +
                `Email: ${formData.email}\n` +
                `Service: ${formData.service}\n` +
                `Address: ${formData.address}\n` +
                `Preferred Date: ${formData.date}\n` +
                `Notes: ${formData.notes}\n\n` +
                `Submitted: ${formData.timestamp}`
            );
            
            // Store in localStorage as backup
            const bookings = JSON.parse(localStorage.getItem('hvac_bookings') || '[]');
            bookings.push(formData);
            localStorage.setItem('hvac_bookings', JSON.stringify(bookings));
            
            showMessage(
                '✓ Form submitted! Your request has been saved. We\'ll contact you soon. ' +
                'For immediate service, please call (412) 512-0425.',
                'success'
            );
            
            // Optional: Open email client for user to send manually
            const emailLink = `mailto:info@mjacobcompany.com?subject=${emailSubject}&body=${emailBody}`;
            
            // Show option to send via email
            setTimeout(() => {
                const sendEmail = confirm('Would you like to send this request via email as well?');
                if (sendEmail) {
                    window.location.href = emailLink;
                }
            }, 1000);
            
            // Reset form after 3 seconds
            setTimeout(() => {
                form.reset();
                hideMessage();
            }, 3000);
            
            // Close modal after 5 seconds
            setTimeout(() => {
                closeModal();
            }, 5000);
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showMessage('⚠ There was an error submitting your request. Please call us at (412) 512-0425.', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Form validation
document.getElementById('bookingForm').addEventListener('submit', handleSubmit);

// Phone number formatting
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.slice(0, 10);
        
        if (value.length >= 6) {
            value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
        } else if (value.length >= 3) {
            value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        }
        
        e.target.value = value;
    });
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = document.querySelector('.nav').offsetHeight;
            const targetPosition = target.offsetTop - navHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Add scroll effect to navigation
let lastScroll = 0;
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        nav.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    } else {
        nav.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

console.log('M. Jacob Company website loaded successfully');
console.log('Form submissions will be saved locally if backend is not available');
