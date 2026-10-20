const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear().toString();
}


const nav = document.querySelector<HTMLElement>(".navflex");
const indicator = nav?.querySelector<HTMLElement>(".nav-indicator");

if (nav && indicator) {
    const links = nav.querySelectorAll<HTMLAnchorElement>(".navigation");
    let selected: HTMLAnchorElement | null = null;

    function moveIndicator(link: HTMLAnchorElement | null) {
        if (!link) {
            indicator!.style.opacity = "0";
            return;
        }

        indicator!.style.width = `${link.offsetWidth}px`;
        indicator!.style.transform = `translateX(${link.offsetLeft}px)`;
        indicator!.style.opacity = "1";
    }

    links.forEach(link => {
        link.addEventListener("pointerenter", () => {
            moveIndicator(link);
        });

        link.addEventListener("focus", () => {
            moveIndicator(link);
        });

        link.addEventListener("click", () => {
            selected = link;
            moveIndicator(link);

            indicator.classList.remove("clicked");
            void indicator.offsetWidth;
            indicator.classList.add("clicked");
        });
    });

    nav.addEventListener("pointerleave", () => {
        moveIndicator(selected);
    });

    nav.addEventListener("focusout", event => {
        if (!nav.contains(event.relatedTarget as Node | null)) {
            moveIndicator(selected);
        }
    });

    window.addEventListener("resize", () => {
        moveIndicator(selected);
    });

    indicator.addEventListener("animationend", () => {
        indicator.classList.remove("clicked");
    });
}
