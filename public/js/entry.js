/**
 * KiranaWala — Entry Experience Interactivity & Cinematic Motion Coordinator
 */

document.addEventListener("DOMContentLoaded", () => {
    initEntryMotion();
    initScrollCoordinator();
});

function initEntryMotion() {
    // Check if user prefers reduced motion
    const motionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const prefersReducedMotion = motionQuery.matches;

    if (prefersReducedMotion) {
        document.querySelectorAll(".fade-up-init").forEach((el) => {
            el.classList.add("fade-up-active");
        });

        if (
            window.Kirana3D &&
            typeof window.Kirana3D.setReducedMotion === "function"
        ) {
            window.Kirana3D.setReducedMotion(true);
        }

        return;
    }

    // Scroll reveal observer
    const observerOptions = {
        root: null,
        rootMargin: "0px 0px -50px 0px",
        threshold: 0.15,
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("fade-up-active");
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll(".fade-up-init").forEach((el) => {
        observer.observe(el);
    });

    // Listen for system reduced-motion changes
    const handleMotionChange = (event) => {
        if (
            window.Kirana3D &&
            typeof window.Kirana3D.setReducedMotion === "function"
        ) {
            window.Kirana3D.setReducedMotion(event.matches);
        }

        if (event.matches) {
            document.querySelectorAll(".fade-up-init").forEach((el) => {
                el.classList.add("fade-up-active");
            });
        }
    };

    motionQuery.addEventListener("change", handleMotionChange);

    // Return cleanup function
    return () => {
        observer.disconnect();
        motionQuery.removeEventListener("change", handleMotionChange);
    };
}

function initScrollCoordinator() {
    let ticking = false;
    let animationFrameId = null;

    function updateScrollProgress() {
        const totalHeight =
            document.documentElement.scrollHeight - window.innerHeight;

        const progress =
            totalHeight > 0
                ? Math.max(
                      0,
                      Math.min(1, window.scrollY / totalHeight)
                  )
                : 0;

        if (
            window.Kirana3D &&
            typeof window.Kirana3D.onScroll === "function"
        ) {
            window.Kirana3D.onScroll(progress);
        }

        ticking = false;
        animationFrameId = null;
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;

            animationFrameId = window.requestAnimationFrame(
                updateScrollProgress
            );
        }
    }

    window.addEventListener("scroll", onScroll, {
        passive: true,
    });

    // Trigger initial progress
    onScroll();

    // Return cleanup function
    return () => {
        window.removeEventListener("scroll", onScroll);

        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        ticking = false;
    };
}
