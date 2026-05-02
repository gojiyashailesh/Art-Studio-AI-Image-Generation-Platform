<p align="center">
  <img src="./frontend/public/Imagination%20to%20Reality.svg" alt="Art Studio - Imagination to Reality" width="220" />
</p>

<h1 align="center">Art Studio - AI Image Generation Platform</h1>

<p align="center">
  A full-stack AI image and thumbnail generation app built with FastAPI, React, OpenAI, ImageKit, SQLModel, Pydantic, SQLite, UV, and Ruff.
</p>

<p align="center">
  <a href="#-demo">Demo</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-tech-stack">Tech Stack</a> ·
  <a href="#-quick-start">Quick Start</a>
</p>

## 🎬 Demo

<p align="center">
  <a href="https://youtu.be/f2Ql0oQzZTc?si=NWQ8jNElMp4DKEEQ">
    <img src="https://img.youtube.com/vi/f2Ql0oQzZTc/maxresdefault.jpg" alt="Watch the Art Studio demo" width="720" />
  </a>
</p>

## ✨ Features

- 🤖 Generate AI-powered thumbnail/image variants from a prompt and headshot.
- 🔐 Signup and login flow with bcrypt password hashing and token sessions.
- 🖼️ Image upload and delivery through ImageKit.
- ⚡ FastAPI backend with Pydantic validation and SQLModel models.
- 🎨 React frontend with a polished generator workspace.
- 🗃️ SQLite database for local development and simple persistence.

## 🧰 Tech Stack

- 🐍 Python + FastAPI
- ⚛️ React + Vite
- 🧠 OpenAI
- 🖼️ ImageKit
- 🗄️ SQLModel + SQLite
- ✅ Pydantic
- 📦 UV
- 🧹 Ruff

## 🚀 Quick Start

```bash
uv sync
cd frontend
npm install
cd ..
```

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_URL_ENDPOINTS=your_imagekit_url_endpoint
DATABASE_URL=sqlite:///./thumbnail_builder.db
```

Run the full stack locally:

```bash
bash scripts/dev.sh
```

The frontend runs on Vite, and the backend runs on FastAPI. By default the dev script starts the backend on `http://127.0.0.1:8001`.

## 📁 Project Structure

```text
app/                  FastAPI app boilerplate, auth, models, schemas, services
frontend/             React + Vite frontend
services/             AI generation and ImageKit service helpers
routes.py             Thumbnail generation API routes
main.py               FastAPI application entrypoint
thumbnail_builder.db  Local SQLite database
```

## 📝 Notes

- The auth flow uses bcrypt for password hashing.
- Generated sessions are stored as hashed tokens in SQLite.
- The frontend requires signup/login before accessing the studio page.
