# 🧠 Neural Runner

<div align="center">
  <p><strong>A Kinetic Simulator & Retro Endless Runner powered by Computer Vision.</strong></p>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow.js" />
</div>

## 📖 Overview

Neural Runner is an innovative, browser-based endless runner game controlled entirely by your physical body. By leveraging **TensorFlow.js** and **Google's Teachable Machine**, the application uses your device's webcam to perform real-time image classification and translates your physical gestures into in-game actions with zero latency.

The project features a custom-built, highly optimized 8-bit procedural rendering engine, a retro audio synthesizer, and a sleek, modern, glassmorphic UI.

## ✨ Features

- **🎮 AI Motion Controls**: Play the game without touching your keyboard. The Teachable Machine neural network interprets your physical poses (e.g., pointing a finger to jump, high-fiving to run) in real-time.
- **⚡ Hardware Accelerated Rendering**: Custom HTML5 `<canvas>` rendering engine with procedural generation for obstacles, particles, and day/night cycles.
- **🔊 Retro Synth Audio**: A built-in `AudioContext` synthesizer generates authentic 8-bit square, triangle, and sawtooth waves on the fly for jumps, point milestones, and game-over states.
- **🛡️ Privacy First**: All machine learning inference happens completely client-side in your browser. No webcam data is ever sent to a server.
- **🎨 Premium UI/UX**: Designed with TailwindCSS featuring responsive grid layouts, frosted glass effects, fluid micro-animations, and dynamic status indicators.

## 🛠️ Technology Stack

- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Machine Learning**: `@tensorflow/tfjs`, `@teachablemachine/image`
- **Audio**: Web Audio API

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A web browser with webcam access enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/neural-runner.git
   cd neural-runner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`. Grant webcam permissions when prompted.

## 🧠 Customizing the AI Model

The game is pre-configured with a Teachable Machine model URL. If you want to train your own custom gestures:

1. Go to [Teachable Machine](https://teachablemachine.withgoogle.com/train/image).
2. Create an **Image Project** (Standard image model).
3. Record data for 3 classes. For example:
   - `1finger` (Jump)
   - `hifive` (Run)
   - `idle left` (Stop)
4. Train the model and click **Export Model**.
5. Upload the model to the cloud and copy the generated URL.
6. Open `src/components/TeachableMachineController.tsx` and replace the `u` variable with your new URL.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Built with ❤️ for the future of interactive web experiences.*
