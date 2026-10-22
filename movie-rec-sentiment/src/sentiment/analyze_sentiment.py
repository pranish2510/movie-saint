"""
Batch Sentiment Analysis Pipeline.

Reads movie reviews, runs them through a Hugging Face transformer model,
and aggregates sentiment scores and positive/negative percentages per movie.
"""

import logging
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from tqdm import tqdm
from transformers import pipeline

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] - %(message)s")
logger = logging.getLogger("SentimentAnalysis")

def analyze_reviews(reviews_df: pd.DataFrame) -> pd.DataFrame:
    """Runs batch inference on review text using DistilBERT."""
    logger.info("Initializing Hugging Face sentiment pipeline (downloading model if first run)...")
    
    # Force CPU for local execution; use truncation to avoid token length crashes
    sentiment_pipeline = pipeline(
        "sentiment-analysis", 
        model="distilbert-base-uncased-finetuned-sst-2-english",
        device=-1,
        truncation=True,
        max_length=512
    )

    logger.info("Running inference on %d reviews...", len(reviews_df))
    
    texts = reviews_df["review_text"].tolist()
    results = []
    
    for text in tqdm(texts, desc="Analyzing Sentiment"):
        try:
            res = sentiment_pipeline(text)[0]
            results.append(res)
        except Exception as e:
            logger.warning(f"Failed to process text: {text[:50]}... Error: {e}")
            results.append({"label": "NEUTRAL", "score": 0.5})

    reviews_df["sentiment_label"] = [r["label"] for r in results]
    reviews_df["sentiment_confidence"] = [r["score"] for r in results]
    
    reviews_df["is_positive"] = (reviews_df["sentiment_label"] == "POSITIVE").astype(int)
    
    return reviews_df

def aggregate_movie_sentiment(analyzed_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregates sentiment metrics at the movie level."""
    logger.info("Aggregating sentiment metrics per movie...")
    
    agg_df = analyzed_df.groupby(["movieId", "title"]).agg(
        total_reviews=("review_id", "count"),
        positive_reviews=("is_positive", "sum"),
        avg_confidence=("sentiment_confidence", "mean")
    ).reset_index()
    
    agg_df["positive_percentage"] = (agg_df["positive_reviews"] / agg_df["total_reviews"]) * 100.0
    agg_df["positive_percentage"] = agg_df["positive_percentage"].round(2)
    agg_df["avg_confidence"] = agg_df["avg_confidence"].round(4)
    
    return agg_df

def main():
    processed_dir = Path(os.getenv("DATA_PROCESSED_DIR", "./data/processed"))
    
    reviews_path = processed_dir / "reviews.parquet"
    if not reviews_path.exists():
        logger.error(f"Reviews file not found at {reviews_path}. Run Phase 1 first.")
        return

    logger.info("Loading reviews data...")
    reviews_df = pd.read_parquet(reviews_path)
    
    analyzed_reviews = analyze_reviews(reviews_df)
    movie_sentiment = aggregate_movie_sentiment(analyzed_reviews)
    
    analyzed_reviews.to_parquet(processed_dir / "analyzed_reviews.parquet", index=False)
    movie_sentiment.to_parquet(processed_dir / "movie_sentiment.parquet", index=False)
    movie_sentiment.to_csv(processed_dir / "movie_sentiment.csv", index=False)
    
    logger.info("Phase 3 complete. Sentiment artifacts saved successfully.")

if __name__ == "__main__":
    main()