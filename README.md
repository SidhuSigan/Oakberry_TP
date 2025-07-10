## Setup Instructions

1. Create a new directory for the project:
```bash
mkdir oakberry-teamplanner
cd oakberry-teamplanner
```

2. Initialize the project with Vite:
```bash
npm create vite@latest . -- --template react-ts
```

3. Install dependencies:
```bash
npm install
npm install -D tailwindcss postcss autoprefixer
npm install jspdf @types/jspdf date-fns lucide-react
```

4. Initialize Tailwind CSS:
```bash
npx tailwindcss init -p
```

5. Create the folder structure as shown above

6. Copy all the code files I'll provide into their respective locations

7. Get an OpenWeatherMap API key from https://openweathermap.org/api

8. Run the development server:
```bash
npm run dev
```