// Main JavaScript for Hyperion Racing Team Website

// The site is hosted as a static website (Cloudflare Pages), so there is no /api server.
// Sponsors and events are written directly in the HTML. Set this to true only if a
// backend with the /api routes is deployed again.
const API_ENABLED = false;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initMobileMenu();
    initScrollAnimations();
    initSmoothScroll();
    initFormHandlers();
    initPaymentIntegration();
    loadDynamicContent();
});

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            
            // Animate hamburger menu
            const spans = mobileToggle.querySelectorAll('span');
            spans.forEach((span, index) => {
                if (navLinks.classList.contains('active')) {
                    if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                    if (index === 1) span.style.opacity = '0';
                    if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    span.style.transform = 'none';
                    span.style.opacity = '1';
                }
            });
        });
    }
}

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all elements with animation classes
    const animatedElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
    animatedElements.forEach(el => observer.observe(el));
}

// Smooth Scroll for Navigation Links
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const navbar = document.querySelector('.navbar');
                const navHeight = navbar ? navbar.offsetHeight : 0;
                const targetTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const offsetTop = targetTop - navHeight - 10;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Form Handlers
function initFormHandlers() {
    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }

    // Donation Form
    const donationForm = document.getElementById('donationForm');
    if (donationForm) {
        donationForm.addEventListener('submit', handleDonationForm);
    }
}

// Contact Form Handler
async function handleContactForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.innerHTML = '<span class="loading"></span> Sending...';
        submitBtn.disabled = true;
        
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showNotification('Message sent successfully!', 'success');
            e.target.reset();
        } else {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        showNotification('Failed to send message. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Donation Form Handler
async function handleDonationForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.innerHTML = '<span class="loading"></span> Processing...';
        submitBtn.disabled = true;
        
        // Create payment order
        const orderResponse = await fetch('/api/donations/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: parseFloat(data.amount),
                donorName: data.donorName,
                donorEmail: data.donorEmail
            })
        });
        
        if (!orderResponse.ok) {
            throw new Error('Failed to create payment order');
        }
        
        const orderData = await orderResponse.json();
        
        // Initialize Razorpay
        const options = {
            key: 'rzp_test_your_key_id', // Replace with actual key
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'Hyperion Racing Team',
            description: 'Support Hyperion Racing',
            order_id: orderData.orderId,
            handler: async function(response) {
                try {
                    // Verify payment
                    const verifyResponse = await fetch('/api/donations/verify-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            donationId: orderData.donationId
                        })
                    });
                    
                    if (verifyResponse.ok) {
                        showNotification('Thank you for your donation! Receipt sent to your email.', 'success');
                        e.target.reset();
                        loadTotalFunds(); // Refresh total funds
                    } else {
                        throw new Error('Payment verification failed');
                    }
                } catch (error) {
                    showNotification('Payment verification failed. Please contact support.', 'error');
                }
            },
            prefill: {
                name: data.donorName,
                email: data.donorEmail
            },
            theme: {
                color: '#dc2626'
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
        
    } catch (error) {
        showNotification('Failed to process donation. Please try again.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Payment Integration
function initPaymentIntegration() {
    // Only load the Razorpay script on pages that actually have a donation form
    if (!API_ENABLED || !document.getElementById('donationForm')) return;
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.head.appendChild(script);
}

// Load Dynamic Content
async function loadDynamicContent() {
    if (!API_ENABLED) return; // static hosting: keep the content already in the HTML
    await loadSponsors();
    await loadEvents();
    await loadTotalFunds();
}

// Load Sponsors
async function loadSponsors() {
    try {
        const response = await fetch('/api/sponsors');
        const sponsors = await response.json();
        
        const sponsorsContainer = document.getElementById('sponsorsContainer');
        if (sponsorsContainer && sponsors.length > 0) {
            sponsorsContainer.innerHTML = sponsors.map(sponsor => `
                <div class="sponsor-card fade-in">
                    <img src="${sponsor.logoURL}" alt="${sponsor.name}" class="sponsor-logo">
                    <h3 class="sponsor-name">${sponsor.name}</h3>
                    <p class="sponsor-tagline">${sponsor.tagline}</p>
                    <a href="${sponsor.website}" target="_blank" class="sponsor-website">Visit Website</a>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load sponsors:', error);
    }
}

// Load Events
async function loadEvents() {
    try {
        const response = await fetch('/api/events/upcoming');
        const events = await response.json();
        
        const eventsContainer = document.getElementById('eventsContainer');
        if (eventsContainer && events.length > 0) {
            eventsContainer.innerHTML = events.map(event => `
                <div class="card fade-in">
                    <h3>${event.name}</h3>
                    <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                    <p><strong>Location:</strong> ${event.location}</p>
                    <p>${event.description}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load events:', error);
    }
}

// Load Total Funds
async function loadTotalFunds() {
    try {
        const response = await fetch('/api/donations/total');
        const data = await response.json();
        
        const totalElement = document.getElementById('totalFunds');
        if (totalElement) {
            animateCounter(totalElement, data.total);
        }
    } catch (error) {
        console.error('Failed to load total funds:', error);
    }
}

// Animate Counter
function animateCounter(element, targetValue) {
    const duration = 2000; // 2 seconds
    const startValue = 0;
    const increment = targetValue / (duration / 16); // 60fps
    let currentValue = startValue;
    
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = `₹${Math.floor(currentValue).toLocaleString()}`;
    }, 16);
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
    
    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    });
}

// Gallery Lightbox
function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            const img = this.querySelector('img');
            if (img) {
                showLightbox(img.src, img.alt);
            }
        });
    });
}

// Show Lightbox
function showLightbox(src, alt) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <img src="${src}" alt="${alt}">
            <button class="lightbox-close">&times;</button>
        </div>
    `;
    
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const content = lightbox.querySelector('.lightbox-content');
    content.style.cssText = `
        position: relative;
        max-width: 90%;
        max-height: 90%;
    `;
    
    const img = lightbox.querySelector('img');
    img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    `;
    
    const closeBtn = lightbox.querySelector('.lightbox-close');
    closeBtn.style.cssText = `
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
    `;
    
    document.body.appendChild(lightbox);
    
    setTimeout(() => {
        lightbox.style.opacity = '1';
    }, 100);
    
    // Close handlers
    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    function closeLightbox() {
        lightbox.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(lightbox);
        }, 300);
    }
}

// Initialize gallery lightbox when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initGalleryLightbox();
});

// Parallax Effect for Hero Section
function initParallax() {
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            hero.style.transform = `translateY(${rate}px)`;
        });
    }
}

// Initialize parallax
document.addEventListener('DOMContentLoaded', function() {
    initParallax();
});

// Typing Animation for Hero Text
function initTypingAnimation() {
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) {
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                heroTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        setTimeout(typeWriter, 1000);
    }
}

// Initialize typing animation
document.addEventListener('DOMContentLoaded', function() {
    initTypingAnimation();
});
