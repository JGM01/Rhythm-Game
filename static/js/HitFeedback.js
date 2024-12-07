// js/HitFeedback.js
class HitFeedback {
    constructor() {
        this.element = document.getElementById('hitFeedback');
        this.timeout = null;
    }


    show(type) {
        clearTimeout(this.timeout);

        this.element.className = `feedback-${type}`;
        this.element.textContent = type.toUpperCase();
        this.element.style.opacity = '1';

        this.timeout = setTimeout(() => {
            this.element.style.opacity = '0';
        }, 500);
    }
}
