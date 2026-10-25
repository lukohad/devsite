
import { initNavigation } from "./navigation";
import { initPhysics } from "./physics";

// Update copyright year
const yearElement = document.getElementById("year");

if (yearElement) {
    yearElement.textContent =
        new Date().getFullYear().toString();
}

// Initialize website systems
initNavigation();
initPhysics();
