import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically scrolls the page/viewport to top (0, 0)
 * on every route change for both mobile and desktop screens.
 */
export default function ScrollToTop() {
    const { pathname, search } = useLocation();

    useEffect(() => {
        // Reset window and document scrolling
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant'
        });

        if (document.documentElement) {
            document.documentElement.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant'
            });
        }

        if (document.body) {
            document.body.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant'
            });
        }

        // Reset main content container scrolling if nested
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }

        const appLayout = document.querySelector('.app-layout');
        if (appLayout) {
            appLayout.scrollTop = 0;
        }
    }, [pathname, search]);

    return null;
}
