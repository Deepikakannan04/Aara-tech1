const navbar = document.querySelector('.navbar');
const revealElements = document.querySelectorAll('.reveal');

function handleNavbarScroll() {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

function initScrollReveal() {
    const observer = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                observerInstance.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
    });

    revealElements.forEach(el => observer.observe(el));
}

window.addEventListener('scroll', handleNavbarScroll);
window.addEventListener('load', () => {
    handleNavbarScroll();
    initScrollReveal();
    initButtonPressEffects();
    initSiblingButtonEffect();
    initFormValidation();
});

// Add visual pressed feedback to buttons/links with class .btn
function initButtonPressEffects(){
    const buttons = document.querySelectorAll('.btn');
    if(!buttons) return;

    buttons.forEach(btn => {
        // mouse
        btn.addEventListener('mousedown', () => btn.classList.add('pressed'));
        btn.addEventListener('mouseup', () => btn.classList.remove('pressed'));
        btn.addEventListener('mouseleave', () => btn.classList.remove('pressed'));

        // touch
        btn.addEventListener('touchstart', () => btn.classList.add('pressed'), {passive:true});
        btn.addEventListener('touchend', () => btn.classList.remove('pressed'));

        // keyboard (space/enter)
        btn.addEventListener('keydown', (e) => {
            if(e.key === ' ' || e.key === 'Enter') btn.classList.add('pressed');
        });
        btn.addEventListener('keyup', (e) => {
            if(e.key === ' ' || e.key === 'Enter') btn.classList.remove('pressed');
        });

        // click handler: delay navigation slightly so pressed state is visible
        btn.addEventListener('click', (e) => {
            try{
                const el = e.currentTarget;
                if(el.tagName.toLowerCase() !== 'a') return;
                const href = el.getAttribute('href');
                const target = el.getAttribute('target');
                // ignore anchors, external targets, or modifier keys
                if(!href || href.startsWith('#') || target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

                // show pressed state (already added on mousedown/touchstart)
                e.preventDefault();
                el.classList.add('pressed');

                // navigate after a short delay so users see the pressed color
                setTimeout(() => {
                    window.location.href = href;
                }, 140);

                // fallback: remove pressed if navigation doesn't occur shortly
                setTimeout(() => el.classList.remove('pressed'), 600);
            }catch(err){
                // ignore
            }
        });
    });
}

// Sibling button visual effect: when outline button is hovered/touched, primary button turns white
function initSiblingButtonEffect(){
    try{
        const heroButtons = document.querySelector('.hero-buttons');
        if(!heroButtons) return;

        const primaryBtn = heroButtons.querySelector('.btn-primary');
        const outlineBtn = heroButtons.querySelector('.btn-outline');
        if(!primaryBtn || !outlineBtn) return;

        // mouse
        outlineBtn.addEventListener('mouseenter', () => primaryBtn.classList.add('sibling-active'));
        outlineBtn.addEventListener('mouseleave', () => primaryBtn.classList.remove('sibling-active'));

        // touch
        outlineBtn.addEventListener('touchstart', () => primaryBtn.classList.add('sibling-active'), {passive:true});
        outlineBtn.addEventListener('touchend', () => primaryBtn.classList.remove('sibling-active'));
    }catch(err){
        // ignore
    }
}

async function parseJsonResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error('Backend returned a non-JSON response');
    }
    return response.json();
}

function initFormValidation(){
    const forms = document.querySelectorAll('form');
    if(!forms.length) return;

    forms.forEach(form => {
        const emailInput = form.querySelector('input[type="email"]');
        const phoneInput = form.querySelector('input[type="tel"]');

        if(emailInput){
            const validateEmail = () => {
                const value = emailInput.value.trim();
                if(value && !value.includes('@')){
                    emailInput.setCustomValidity('Enter again with @');
                } else {
                    emailInput.setCustomValidity('');
                }
            };

            emailInput.addEventListener('input', validateEmail);
            emailInput.addEventListener('invalid', validateEmail);
        }

        if(phoneInput){
            const normalizePhone = () => {
                const digits = phoneInput.value.replace(/\D/g, '');
                phoneInput.value = digits.slice(0, 10);
                if(phoneInput.value.length !== 10){
                    phoneInput.setCustomValidity('Enter exactly 10 digits.');
                } else {
                    phoneInput.setCustomValidity('');
                }
            };

            phoneInput.addEventListener('input', normalizePhone);
            phoneInput.addEventListener('invalid', normalizePhone);
        }

        form.addEventListener('submit', event => {
            event.preventDefault();

            if(emailInput){
                const value = emailInput.value.trim();
                if(value && !value.includes('@')){
                    emailInput.setCustomValidity('Enter again with @');
                } else {
                    emailInput.setCustomValidity('');
                }
            }

            if(phoneInput){
                const digits = phoneInput.value.replace(/\D/g, '');
                if(digits.length !== 10){
                    phoneInput.setCustomValidity('Enter exactly 10 digits.');
                } else {
                    phoneInput.setCustomValidity('');
                }
            }

            if(!form.checkValidity()){
                form.reportValidity();
            } else {
                submitFormWithAjax(form);
            }
        });
    });
}

function getApiBase() {
    // Forms must reach the Express backend (port 3000), not Live Server / file preview
    return window.location.port === '3000' ? '' : 'http://localhost:3000';
}

async function submitFormWithAjax(form) {
    const API_BASE = getApiBase();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerText : 'Submit';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Submitting...';
    }

    try {
        let response;
        let result;
        const nameInput = form.querySelector('[name="name"]') || form.querySelector('[name="applicant-name"]');
        const nameValue = nameInput ? nameInput.value.trim() : 'there';

        if (form.classList.contains('contact-form')) {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            response = await fetch(`${API_BASE}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            result = await parseJsonResponse(response);
        } else if (form.classList.contains('application-form')) {
            const formData = new FormData(form);
            response = await fetch(`${API_BASE}/api/apply`, {
                method: 'POST',
                body: formData
            });
            result = await parseJsonResponse(response);
        } else {
            form.submit();
            return;
        }

        if (response.ok && result.success) {
            const wrapper = form.parentElement;
            wrapper.innerHTML = `
                <div class="form-success-card" style="
                    text-align: center; 
                    padding: 50px 30px; 
                    background: rgba(255, 255, 255, 0.03); 
                    backdrop-filter: blur(12px); 
                    -webkit-backdrop-filter: blur(12px);
                    border-radius: 16px; 
                    border: 1px solid rgba(255, 255, 255, 0.1); 
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
                    margin: 20px auto;
                    max-width: 600px;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                ">
                    <div style="font-size: 50px; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(0, 255, 204, 0.4));">✨</div>
                    <h3 style="
                        font-family: 'Poppins', sans-serif;
                        color: #00ffcc; 
                        font-size: 26px; 
                        font-weight: 700;
                        margin-bottom: 15px;
                        background: linear-gradient(135deg, #00ffcc, #0099ff);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    ">Submission Successful!</h3>
                    <p style="
                        font-family: 'Poppins', sans-serif;
                        color: #b0c4de; 
                        font-size: 16px; 
                        line-height: 1.6;
                        margin-bottom: 25px;
                    ">Thank you, <strong>${nameValue}</strong>. Your message has been safely received by our backend. We will get back to you as soon as possible.</p>
                    <button class="btn btn-primary btn-small" onclick="window.location.reload()" style="padding: 10px 24px; font-size: 14px;">Send Another</button>
                </div>
            `;
            setTimeout(() => {
                const card = wrapper.querySelector('.form-success-card');
                if (card) {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }
            }, 50);
        } else {
            alert(result.error || 'Something went wrong. Please try again.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }
    } catch (error) {
        console.error('AJAX Submit Error:', error);
        alert('Failed to connect to the backend server. Run "npm start" in the project folder, then open http://localhost:3000/contact.html');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    }
}
