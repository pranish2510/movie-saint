# MovieSaint 🎬

MovieSaint is a full-stack recommendation engine that combines Big Data collaborative filtering and NLP sentiment analysis to deliver highly personalized, zero-latency movie watchlists. 

## 🧠 Core Engine Modules

* **"For You" (User-Centric):** Utilizes the Alternating Least Squares (ALS) algorithm to analyze a specific user's historical viewing and rating behavior, predicting unseen movies tailored to their unique taste clusters.
* **"Similar Matches" (Item-Centric):** Uses Cosine Similarity to measure the mathematical distance between movie vectors in the latent space, suggesting films with the highest historical audience crossover.
* **New User Flow:** Solves the classic "Cold Start Problem" using Content-Based Filtering. It maps a new user's selected genres to the TMDB Discover API to generate instant, heuristic-based recommendations before historical data is established.

## 🛠 Architecture & Tech Stack

The project operates on a decoupled Online/Offline architecture for maximum scalability.

* **Frontend (Online UI):** Next.js (React), Tailwind CSS, Vercel Edge Network. Integrated with the TMDB API for live cinematic assets.
* **Backend (Online Serving):** FastAPI (Python), Uvicorn, Render. Provides highly concurrent, asynchronous endpoints to serve pre-computed recommendations.
* **Big Data Engine (Offline Processing):** PySpark for handling large-scale matrix factorization. HuggingFace DistilBERT for NLP sentiment analysis on audience reviews.
* **Database:** MongoDB Atlas for storing computed matrices, vectors, and user metadata.

## 📂 Repository Structure

This repository is structured as a monorepo containing both the decoupled frontend and backend systems:

* `/frontend` — The Next.js web application.
* `/movie-rec-sentiment` — The Python machine learning pipeline and FastAPI serving engine.

## 🚀 Local Setup

To run MovieSaint locally, you will need Node.js, Python 3.9+, and a MongoDB cluster.

**1. Clone the repository:**
```bash
git clone [https://github.com/pranish2510/movie-saint.git](https://github.com/pranish2510/movie-saint.git) 
cd movie-saint

```

**2. Start the FastAPI Backend:**

```bash
cd movie-rec-sentiment 
python -m venv .venv 
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate 
pip install -r requirements.txt

```

*Note: Create a `.env` file in the `movie-rec-sentiment` directory and add your `MONGO_URI`.*

```bash
uvicorn src.api.main:app --reload

```

**3. Start the Next.js Frontend:**

```bash
cd ../frontend 
npm install

```

*Note: Create a `.env.local` file in the `frontend` directory and add your `NEXT_PUBLIC_TMDB_TOKEN`.*

```bash
npm run dev

```
