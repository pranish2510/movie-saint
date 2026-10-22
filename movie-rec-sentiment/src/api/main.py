"""
FastAPI Backend.

Serves precomputed recommendations and sentiment analysis results from MongoDB.
Designed to be lightweight and memory-efficient for free-tier hosting.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

load_dotenv()

# Global dictionary to hold our database connection
app_data = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events for the API."""
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI not found in environment variables.")
    
    # Initialize DB connection on startup
    client = MongoClient(mongo_uri)
    app_data["db"] = client["movie_rec_db"]
    yield
    # Close DB connection on shutdown
    client.close()

app = FastAPI(
    title="MovieRec & Sentiment API", 
    description="Serves ALS recommendations and DistilBERT sentiment scores.",
    lifespan=lifespan
)

# Allow Cross-Origin requests so our frontend can communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Validates the API is running and connected to the database."""
    return {"status": "ok", "db_connected": "db" in app_data}

@app.get("/recommend/{user_id}")
def get_recommendations(user_id: int):
    """Fetches top 10 precomputed recommendations for a user and enriches with movie details."""
    db = app_data["db"]
    user_docs = db.user_recs.find_one({"userId": user_id}, {"_id": 0, "recommendations": 1})
    
    if not user_docs:
        raise HTTPException(status_code=404, detail="User not found")
        
    recs = user_docs.get("recommendations", [])
    enriched_recs = []
    
    # Hydrate movie details (titles, genres, sentiment) into the recommendation list
    for rec in recs:
        movie = db.movies.find_one(
            {"movieId": rec["movieId"]}, 
            {"_id": 0, "title": 1, "genres": 1, "positive_percentage": 1, "total_reviews": 1}
        )
        if movie:
            enriched_recs.append({
                "movieId": rec["movieId"],
                "title": movie.get("title"),
                "genres": movie.get("genres"),
                "predicted_rating": round(rec["predicted_rating"], 2),
                "sentiment_positive_pct": movie.get("positive_percentage", 0),
                "total_reviews": movie.get("total_reviews", 0)
            })
            
    return {"userId": user_id, "recommendations": enriched_recs}

@app.get("/movie/{movie_id}")
def get_movie_details(movie_id: int):
    """Fetches a specific movie's details and aggregated review sentiment."""
    db = app_data["db"]
    movie = db.movies.find_one({"movieId": movie_id}, {"_id": 0})
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie

@app.get("/similar/{movie_id}")
def get_similar_movies(movie_id: int):
    """Fetches top 10 similar movies based on ALS item factors."""
    db = app_data["db"]
    sim_docs = db.item_sims.find_one({"movieId": movie_id}, {"_id": 0, "similar_movies": 1})
    
    if not sim_docs:
        raise HTTPException(status_code=404, detail="Movie not found or no similarities computed")
        
    sims = sim_docs.get("similar_movies", [])
    enriched_sims = []
    
    for sim in sims:
        movie = db.movies.find_one(
            {"movieId": sim["similar_movieId"]}, 
            {"_id": 0, "title": 1, "genres": 1, "positive_percentage": 1}
        )
        if movie:
            enriched_sims.append({
                "movieId": sim["similar_movieId"],
                "title": movie.get("title"),
                "genres": movie.get("genres"),
                "similarity_score": round(sim["similarity"], 4),
                "sentiment_positive_pct": movie.get("positive_percentage", 0)
            })
            
    return {"movieId": movie_id, "similar_movies": enriched_sims}