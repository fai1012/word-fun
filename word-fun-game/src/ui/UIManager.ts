export class UIManager {
    constructor() {
        this.setupListeners();
    }

    setupListeners() {
        // Placeholder for button listeners - these will be hooked up to the Game/Scene later
        // For now, we just want ensuring they don't throw errors
        const jumpBtn = document.getElementById('btn-jump');
        const interactBtn = document.getElementById('btn-interact');

        if (jumpBtn) {
            jumpBtn.addEventListener('click', () => {
                // Dispatch a custom event that the game can listen to
                window.dispatchEvent(new CustomEvent('game:jump'));
            });

            // Add touch support just in case
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent ghost clicks
                window.dispatchEvent(new CustomEvent('game:jump'));
            });
        }

        if (interactBtn) {
            interactBtn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('game:interact'));
            });

            interactBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('game:interact'));
            });
        }
    }
}
