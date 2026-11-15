# VEYRA – Sustain Life Beyond Earth 🌕🚀

**NASA Space Apps Challenge 2026**

**Team Name:** Mission Void  
**Project Name:** VEYRA – Sustain Life Beyond Earth



 # 🌍 About the Project

VEYRA is an interactive lunar settlement and survival simulation designed to explore the challenges of establishing and sustaining human life beyond Earth.

The project allows users to experience the process of developing a lunar base, managing limited resources, completing missions, and upgrading infrastructure to create a sustainable settlement on the Moon.

Our goal is to make the challenges of space exploration and lunar habitation interactive, engaging, and educational.

# 🎯 Problem Statement

Establishing a sustainable human presence beyond Earth requires careful planning, resource management, infrastructure development, and the ability to overcome environmental challenges.

Understanding these challenges is important for preparing for future lunar exploration and long-term human habitation in space.

# 💡 Our Solution

VEYRA provides an interactive lunar settlement experience where users start with a basic module and gradually develop their lunar base.

Users can:

- Build and upgrade lunar infrastructure.
- Manage resources required for construction.
- Complete missions and side quests.
- Earn points through activities and achievements.
- Unlock new construction possibilities.
- Experience the challenges of developing a sustainable lunar settlement.

The simulation aims to make lunar settlement planning easier to understand through interactive gameplay.

# 🎮 Key Features

- **Lunar Environment:** An interactive lunar surface environment.
- **Base Development:** Start with a single module and expand the settlement.
- **Resource Management:** Manage available resources for construction and upgrades.
- **Missions and Side Quests:** Complete objectives to earn rewards and unlock progress.
- **Upgrade System:** Improve existing structures and expand capabilities.
- **Points and Progression:** Track achievements and settlement development.

# 🛠️ Technologies Used

- Programming Languages:
  JavaScript (ES modules) for all game logic: App.jsx, missionRunner.js, outpostScene.js, interior.js and missions.js.
  JSX for the React components.
  HTML5 and CSS3 for the intro page (index.html) and the entry page (outpost.html).
- Frontend:
  React 19 and React DOM for the interface, with hooks such as useSyncExternalStore for the mission runner state.
  Three.js 0.180 (WebGL) for the 3D lunar outpost, the habitat interior, the astronaut and the rover. All textures are drawn in code with canvas; the only image file is orion.gif.
  Tailwind CSS 4, via the @tailwindcss/vite plugin, for styling.
  lucide-react for the icons.
  Vite 8 with @vitejs/plugin-react for dev server and build.
  The animated hero intro is plain HTML/CSS/JS. It loads three.js r128 from the cdnjs CDN and the Montserrat font from Google Fonts.
- Backend:
  None. The game runs entirely in the browser, and there is no server, database or login.
  Saving uses browser localStorage, under the keys missionvoid-mission-runner-v2, missionvoid-base-state-v1 and missionvoid-orion-style.
  NASA responses are cached in sessionStorage for 30 minutes.
- APIs and Data Sources:
  NASA APOD API (api.nasa.gov/planetary/apod): Astronomy Picture of the Day.
  NASA DONKI API, solar flares (api.nasa.gov/DONKI/FLR): flares from the last 30 days.
  NASA DONKI API, coronal mass ejections (api.nasa.gov/DONKI/CME): CMEs from the last 30 days.
  NASA Image and Video Library (images-api.nasa.gov/search): Moon pictures, no key needed.
  The api.nasa.gov endpoints use the shared DEMO_KEY by default, or your own key through VITE_NASA_API_KEY.
-Browser APIs:
  Web Speech API (speechSynthesis) for the ORION voice.
  WebGL for the 3D scene.
  Pointer events, keyboard, ResizeObserver and localStorage/sessionStorage for controls, resizing and saving.

# 🚀 How to Run the Project

1. Download or clone this repository.
2. Extract the project files if downloaded as a ZIP.
3. Open the project folder in your code editor.
4. Install the required dependencies according to the project setup.
5. Run the application using the appropriate development command.
6. Open the application in your browser or supported environment.

**Note:** Refer to the project configuration and setup instructions for the exact commands.

# 🌌 Our Vision

Our vision is to encourage people to explore the possibilities and challenges of sustainable human life beyond Earth.

Through VEYRA, we aim to combine space exploration, resource management, and interactive learning into an engaging experience.

# 👥 Team

**Team Name: Mission Void**

**Project: VEYRA – Sustain Life Beyond Earth**

Developed for the NASA Space Apps Challenge 2026.

---

# 📦 Project Files

The complete project submission is available in this repository:

MissionVoid_Submission.zip

---

**Built with curiosity, innovation, and a vision beyond Earth. 🌕**
