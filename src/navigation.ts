
export function initNavigation() {
    const nav = document.querySelector<HTMLElement>(".navflex");
    const viewport = document.querySelector<HTMLElement>(".slide-viewport");
    const indicator = nav?.querySelector<HTMLElement>(".nav-indicator");

    // Stop if any required HTML element is missing.
    if (!nav || !viewport || !indicator) return;

    // All three elements are confirmed to exist.
    setupNavigation(nav, viewport, indicator);
}

function setupNavigation(
    nav: HTMLElement,
    viewport: HTMLElement,
    indicator: HTMLElement
) {
    const links = Array.from(
        nav.querySelectorAll<HTMLAnchorElement>(".navigation")
    );

    const slides = Array.from(
        viewport.querySelectorAll<HTMLElement>(".slide")
    );

    if (!links.length || !slides.length) return;

    let clickTarget: HTMLElement | null = null;
    let fadeTimer: number | null = null;
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function setIndicator(x: number, width: number) {
        indicator.style.transform = `translateX(${x}px)`;
        indicator.style.width = `${width}px`;
        indicator.style.opacity = "1";
    }

    function moveToLink(link: HTMLAnchorElement) {
        indicator.classList.remove("tracking-slides");

        setIndicator(link.offsetLeft, link.offsetWidth);
    }

    // ========================================
    // Follow horizontal slide scrolling
    // ========================================

    function followSlides(instant = true) {
        if (!viewport.clientWidth) return;

        indicator.classList.toggle("tracking-slides", instant);

        // Calculate horizontal progress through the slides.
        const rawProgress =
            viewport.scrollLeft / viewport.clientWidth;

        const progress = Math.max(
            0,
            Math.min(rawProgress, links.length - 1)
        );

        const from = Math.floor(progress);
        const to = Math.min(from + 1, links.length - 1);
        const t = progress - from;

        const start = links[from];
        const end = links[to];

        // Interpolate underline position and width.
        const x = start.offsetLeft +
            (end.offsetLeft - start.offsetLeft) * t;

        const width = start.offsetWidth +
            (end.offsetWidth - start.offsetWidth) * t;

        setIndicator(x, width);
    }

    // ========================================
    // Slide positioning
    // ========================================

    function getSlideLeft(slide: HTMLElement): number {
        return (
            slide.getBoundingClientRect().left -
            viewport.getBoundingClientRect().left +
            viewport.scrollLeft
        );
    }

    function scrollToSlide(slide: HTMLElement) {
        viewport.scrollTo({
            left: getSlideLeft(slide),
            behavior: reducedMotion.matches ? "auto" : "smooth"
        });
    }

    // ========================================
    // Click navigation fade animation
    // ========================================

    function finishClickNavigation() {
        if (!clickTarget) return;

        clickTarget = null;

        // Move the underline while it is invisible.
        followSlides(true);

        // Ensure the position is applied before revealing.
        void indicator.offsetWidth;

        // Fade back in.
        indicator.classList.remove("click-hidden");
    }

    function navigateToSlide(slide: HTMLElement) {
        // Cancel any pending navigation timer.
        if (fadeTimer !== null) {
            window.clearTimeout(fadeTimer);
            fadeTimer = null;
        }

        clickTarget = slide;

        // Hide the underline on EVERY navigation click.
        indicator.classList.remove("clicked");
        indicator.classList.add("click-hidden");

        // Wait for the fade-out before moving the slide.
        fadeTimer = window.setTimeout(() => {
            fadeTimer = null;

            const destination = getSlideLeft(slide);

            // Clicking the current slide won't trigger scrollend.
            if (Math.abs(viewport.scrollLeft - destination) < 2) {
                finishClickNavigation();
                return;
            }

            scrollToSlide(slide);
        }, 65);
    }

    // Let manual interaction take control again.
    function cancelClickNavigation() {
        if (!clickTarget) return;

        if (fadeTimer !== null) {
            window.clearTimeout(fadeTimer);
            fadeTimer = null;
        }

        clickTarget = null;

        followSlides(true);
        void indicator.offsetWidth;

        indicator.classList.remove("click-hidden");
    }

    // ========================================
    // Manual scrolling
    // ========================================

    viewport.addEventListener("scroll", () => {
        // Click navigation controls the underline temporarily.
        if (clickTarget) return;

        followSlides(true);
    }, { passive: true });

    // Manual scrolling can interrupt clicked navigation.
    viewport.addEventListener(
        "wheel",
        cancelClickNavigation,
        { passive: true }
    );

    viewport.addEventListener(
        "pointerdown",
        cancelClickNavigation
    );

    // ========================================
    // Navigation link events
    // ========================================

    links.forEach(link => {
        // Hover behavior
        link.addEventListener("pointerenter", () => {
            if (clickTarget) return;

            moveToLink(link);
        });

        // Keyboard focus
        link.addEventListener("focus", () => {
            if (clickTarget) return;

            if (link.matches(":focus-visible")) {
                moveToLink(link);
            }
        });

        // Click behavior
        link.addEventListener("click", event => {
            const target = slides.find(
                slide => `#${slide.id}` === link.hash
            );

            if (!target) return;

            event.preventDefault();

            // Update the URL without reloading the page.
            if (window.location.hash !== link.hash) {
                history.pushState(null, "", link.hash);
            }

            // Every click uses the same fade animation.
            navigateToSlide(target);
        });
    });

    // ========================================
    // Scroll completion
    // ========================================

    viewport.addEventListener("scrollend", () => {
        // Don't reveal the bar before the fade-out finishes.
        if (fadeTimer !== null) return;

        if (clickTarget) {
            // Only finish after reaching the requested slide.
            const destination = getSlideLeft(clickTarget);

            if (Math.abs(viewport.scrollLeft - destination) < 2) {
                finishClickNavigation();
            }

            return;
        }

        followSlides(true);
    });

    // ========================================
    // Pointer and keyboard behavior
    // ========================================

    nav.addEventListener("pointerleave", () => {
        if (clickTarget) return;

        followSlides(false);
    });

    nav.addEventListener("focusout", event => {
        if (clickTarget) return;

        if (!nav.contains(event.relatedTarget as Node | null)) {
            followSlides(false);
        }
    });

    // ========================================
    // Browser history
    // ========================================

    window.addEventListener("popstate", () => {
        const id = decodeURIComponent(
            window.location.hash.slice(1)
        );

        const target = slides.find(
            slide => slide.id === id
        ) ?? slides[0];

        if (target) {
            navigateToSlide(target);
        }
    });

    // ========================================
    // Window resizing
    // ========================================

    window.addEventListener("resize", () => {
        if (!clickTarget) {
            followSlides(true);
        }
    });

    // ========================================
    // Initial underline position
    // ========================================

    requestAnimationFrame(() => {
        followSlides(true);
    });
}