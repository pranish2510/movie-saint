# MovieSaint 🎬

MovieSaint is a full-stack recommendation engine that combines Big Data collaborative filtering and NLP sentiment analysis to deliver highly personalized, zero-latency movie watchlists. 

## 🚀 Tech Stack
* **Frontend:** Next.js (Vercel)
* **Backend:** FastAPI (Render)
* **Database:** MongoDB Atlas
* **Machine Learning & Data Processing:** PySpark (ALS Matrix Factorization)
* **External Data:** TMDB API

## 🧠 Core Engine Modules

* **"For You" (User-Centric):** Utilizes the Alternating Least Squares (ALS) algorithm to analyze a specific user's historical viewing and rating behavior, predicting unseen movies tailored to their unique taste clusters.
* **"Similar Matches" (Item-Centric):** Uses Cosine Similarity to measure the mathematical distance between movie vectors in the latent space, suggesting films with the highest historical audience crossover.
* **New User Flow:** Solves the classic "Cold Start Problem" using Content-Based Filtering. It maps a new user's selected genres to the TMDB Discover API to generate instant, heuristic-based recommendations before historical data is established.
