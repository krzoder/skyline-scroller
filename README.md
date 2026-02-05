# Skyline Scroller

A procedurally generated parallax landscape scroller built with **TypeScript** and **Vite**, rendering to an HTML5 Canvas.

## Overview

This project features a continuous horizontal scrolling city with dynamic depth (parallax), a day/night cycle, and seed-based procedural generation for reproducible runs.

### Key Features
- **Parallax Layer System**: Multiple depth layers moving at different speeds to create a 3D effect.
- **Procedural Generation**: Deterministic city generation based on seed keywords.
- **Sky System**: Dynamic time of day, celestial bodies (Sun/Moon), and atmospheric gradients.
- **Performance**: Optimized HTML5 Canvas rendering.

## Tech Stack
- **Language**: TypeScript
- **Build Tool**: Vite
- **Rendering**: Canvas API (2D Context)

## Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

## Project Structure
- `src/main.ts`: Application entry point and UI logic.
- `src/engine/`: Core game loop and systems (Game, SkySystem, Layer).
- `src/procgen/`: Procedural generation logic (CityGenerator).
