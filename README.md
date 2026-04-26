# 🧠 DevDebugger – AI-Powered Debugging Assistant

DevDebugger is an AI-powered debugging project that helps developers quickly identify and fix errors using **text, screenshots, or uploaded files**.
It leverages multimodal AI to understand issues and provide **context-aware, instant solutions**.

---

## ⚡ Features

* 📸 **Screenshot Analysis**
  Upload error screenshots — no need to manually type logs

* 🧠 **Context-Aware Debugging**
  Understands dependencies and project context

* ⚡ **Instant Solutions**
  Get accurate fixes in under 5 seconds

* 💻 **Copy-Ready Fixes**
  Ready-to-use solutions to reduce trial and error

* 📂 **Multi-Input Support**
  Works with text, images, and files

---

## 🏗️ Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | React, Tailwind CSS                  |
| Backend  | FastAPI (Python)                     |
| AI Model | Google Gemini 1.5 Flash (Multimodal) |

---

## 📂 Project Structure

```
devdebugger/
│── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
│── backend/
│   ├── app/
│   ├── api/
│   └── main.py
│
│── data/
│   ├── raw/
│   └── processed/
│
│── requirements.txt
│── README.md
```

---

## 🚀 How It Works

1. User uploads:

   * Error text / logs
   * Screenshot
   * File

2. Backend processes the input

3. Gemini AI analyzes:

   * Error patterns
   * Code context
   * Dependencies

4. Returns:

   * Root cause
   * Suggested fix
   * Optimized solution

---

## ⚙️ Installation & Setup

### 🔹 Clone the Repository

```bash
git clone https://github.com/EDITH96929/retail-object-detection.git
cd retail-object-detection
```

---

### 🔹 Backend Setup (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

### 🔹 Frontend Setup (React)

```bash
cd frontend
npm install
npm run dev
```

---

## 📸 Demo

👉 Add your demo video link here (LinkedIn / YouTube)

---

## 🎯 Future Improvements

* 🎨 Minimal & interactive UI redesign
* 📊 Debug history & tracking
* 🤖 Smarter auto-fix suggestions
* 🌙 Dark/light mode
* 🔍 Advanced error classification

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to fork the repo and submit a PR.

---

## 📬 Contact

* GitHub: https://github.com/EDITH96929
* LinkedIn: https://www.linkedin.com/in/hi-world-584660288

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

---

## ⚠️ Notes

Make sure to add the following to your `.gitignore`:

```
data/
node_modules/
__pycache__/
.env
```

This prevents large files and sensitive data from being pushed to GitHub.
