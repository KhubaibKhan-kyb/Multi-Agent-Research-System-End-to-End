/** @type {import('tailwindcss').Config} */
module.exports = {
    // Tell Tailwind which files to scan for class names
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // Custom font families — loaded in layout.tsx via Google Fonts
            fontFamily: {
                display: ["var(--font-display)"],  // Headings
                body: ["var(--font-body)"],        // Body text
                mono: ["var(--font-mono)"],        // Code/data
            },
            // Extend animation durations for smooth streaming effect
            animation: {
                "fade-in": "fadeIn 0.4s ease forwards",
                "slide-up": "slideUp 0.5s ease forwards",
                "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
                "blink": "blink 1s step-end infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                pulseDot: {
                    "0%, 80%, 100%": { opacity: "0.2", transform: "scale(0.8)" },
                    "40%": { opacity: "1", transform: "scale(1)" },
                },
                blink: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0" },
                },
            },
        },
    },
    plugins: [],
};