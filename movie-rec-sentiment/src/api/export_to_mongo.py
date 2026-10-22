"""
MongoDB Export Pipeline.

Reads processed Parquet artifacts, structures them into optimized nested 
NoSQL documents, and pushes them to MongoDB Atlas for fast API serving.
"""

import logging
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] - %(message)s")
logger = logging.getLogger("MongoExport")

def export_data():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri or "mongodb" not in mongo_uri:
        logger.error("Invalid or missing MONGO_URI in .env file.")
        return

    logger.info("Connecting to MongoDB...")
    client = MongoClient(mongo_uri)
    db = client["movie_rec_db"]
    processed_dir = Path(os.getenv("DATA_PROCESSED_DIR", "./data/processed"))

    # 1. Movies & Sentiment
    logger.info("Loading movies and sentiment...")
    movies_df = pd.read_parquet(processed_dir / "movies.parquet")
    
    # Check if sentiment exists (to handle cold starts safely)
    sentiment_path = processed_dir / "movie_sentiment.parquet"
    if sentiment_path.exists():
        sentiment_df = pd.read_parquet(sentiment_path)
        movies_merged = pd.merge(movies_df, sentiment_df, on=["movieId", "title"], how="left")
        # Fill movies that have no reviews with 0s
        movies_merged = movies_merged.fillna({
            "total_reviews": 0, "positive_reviews": 0, 
            "avg_confidence": 0, "positive_percentage": 0
        })
    else:
        movies_merged = movies_df

    logger.info("Exporting Movies Collection...")
    db.movies.drop()
    db.movies.insert_many(movies_merged.to_dict("records"))
    logger.info("Inserted %d movies.", len(movies_merged))

    # 2. User Recommendations (Nested Documents)
    logger.info("Structuring and exporting User Recommendations...")
    user_recs_df = pd.read_parquet(processed_dir / "user_recs.parquet")
    
    # Group into: { userId: 1, recommendations: [ {movieId, predicted_rating}, ... ] }
    user_docs = (
        user_recs_df.groupby("userId")
        .apply(lambda x: x[["movieId", "predicted_rating"]].to_dict("records"))
        .reset_index(name="recommendations")
    )
    
    db.user_recs.drop()
    db.user_recs.insert_many(user_docs.to_dict("records"))
    logger.info("Inserted recommendations for %d users.", len(user_docs))

    # 3. Item Similarities (Nested Documents)
    logger.info("Structuring and exporting Item Similarities...")
    item_sims_df = pd.read_parquet(processed_dir / "item_sims.parquet")
    
    sim_docs = (
        item_sims_df.groupby("movieId")
        .apply(lambda x: x[["similar_movieId", "similarity", "rank"]].to_dict("records"))
        .reset_index(name="similar_movies")
    )
    
    db.item_sims.drop()
    db.item_sims.insert_many(sim_docs.to_dict("records"))
    logger.info("Inserted similarities for %d movies.", len(sim_docs))

    # Create Indexes for fast API lookups
    db.movies.create_index("movieId", unique=True)
    db.user_recs.create_index("userId", unique=True)
    db.item_sims.create_index("movieId", unique=True)

    logger.info("Phase 4 complete. Data exported and indexed in MongoDB successfully.")

if __name__ == "__main__":
    export_data()