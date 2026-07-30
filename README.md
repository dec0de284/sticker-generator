# Sticker Generator

A modern Node.js + Express application for generating printable product stickers with live barcode rendering and clean print layout.

## Overview

This project creates a production-ready sticker generator that:
- renders interactive product lists in the browser
- selects multiple products for batch printing
- generates high-quality barcode canvases using `bwip-js`
- produces printable sticker sheets with centered barcode labels and device-pixel crispness

## Features

- AI-assisted refactor using GitHub Copilot
- Clean MVC-style structure with controllers, models, and dedicated views
- Externalized JavaScript and CSS for maintainability
- Print-friendly layout optimized for 210mm x 297mm sheets
- Barcode support for MAC, PON S/N, and S/N values

## Technologies

- Node.js
- Express
- SQLite (backend product store)
- `bwip-js` for browser barcode generation
- Vanilla JavaScript, HTML, CSS

## Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd sticker-generator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the app:
   ```bash
   npm start
   ```
4. Open the app in your browser at `http://localhost:3000`

## Project Structure

- `controllers/` - route controllers for home, product, and print flows
- `models/` - data models and shared logic
- `routes/` - Express route definitions
- `views/` - HTML templates for pages
- `public/css/` - shared and print styles
- `public/js/` - page controllers and common UI models
- `public/js/vendor/` - third-party barcode library

## Notes

This README was generated with AI-assisted guidance and GitHub Copilot, then refined to match project-specific needs and layout.

## License

This project is available under the terms of the existing `LICENSE` file.
