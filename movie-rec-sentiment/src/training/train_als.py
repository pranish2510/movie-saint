"""
PySpark ALS Model Training & Evaluation.

Trains collaborative filtering model, evaluates RMSE and Precision@K, 
and precomputes user recommendations and item similarities using Pandas for Windows compatibility.
"""

import json
import logging
import os
from pathlib import Path

import numpy as np
import pandas as pd
from dotenv import load_dotenv

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.ml.recommendation import ALS
from pyspark.ml.evaluation import RegressionEvaluator

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] - %(message)s")
logger = logging.getLogger("ALSTraining")

def get_spark_session() -> SparkSession:
    """Initializes a local Spark session."""
    return (
        SparkSession.builder.appName("MovieRec_ALS")
        .master("local[*]")
        .config("spark.driver.memory", "4g")
        .config("spark.sql.shuffle.partitions", "10")
        .getOrCreate()
    )

def compute_ranking_metrics(model, test_df):
    """Calculates Precision@10 using pure PySpark SQL."""
    user_actuals = test_df.filter(F.col("rating") >= 3.5).groupBy("userId") \
        .agg(F.collect_list("movieId").alias("actual_items"))

    test_users = test_df.select("userId").distinct()
    user_preds = model.recommendForUserSubset(test_users, 10)
    
    user_preds = user_preds.select(
        "userId", 
        F.col("recommendations.movieId").alias("predicted_items")
    )

    joined = user_preds.join(user_actuals, on="userId").dropna()
    
    metrics_df = joined.withColumn(
        "hits", F.size(F.array_intersect("predicted_items", "actual_items"))
    ).withColumn(
        "precision_at_10", F.col("hits") / 10.0
    )
    
    avg_precision = metrics_df.select(F.mean("precision_at_10")).collect()[0][0] or 0.0
    
    return {
        "Mean_Average_Precision": avg_precision, 
        "Precision_at_10": avg_precision
    }

def compute_item_similarities(item_factors_df: pd.DataFrame, top_k: int = 10) -> pd.DataFrame:
    """Computes Cosine Similarity between items using vectorized NumPy operations."""
    logger.info("Computing item-item similarities in NumPy...")
    
    items = item_factors_df['id'].values
    features = np.stack(item_factors_df['features'].values)
    
    norms = np.linalg.norm(features, axis=1, keepdims=True)
    norms[norms == 0] = 1 
    features_norm = features / norms
    
    sim_matrix = np.dot(features_norm, features_norm.T)
    
    similar_items = []
    for i in range(len(items)):
        top_indices = np.argsort(sim_matrix[i])[::-1][1:top_k + 1]
        sim_scores = sim_matrix[i][top_indices]
        
        for rank, (idx, score) in enumerate(zip(top_indices, sim_scores), 1):
            similar_items.append({
                "movieId": int(items[i]),
                "similar_movieId": int(items[idx]),
                "similarity": float(score),
                "rank": rank
            })
            
    return pd.DataFrame(similar_items)

def main():
    processed_dir = Path(os.getenv("DATA_PROCESSED_DIR", "./data/processed"))
    reports_dir = Path("./reports")
    reports_dir.mkdir(exist_ok=True)
    
    spark = get_spark_session()
    
    logger.info("Loading ratings data...")
    ratings_df = spark.read.parquet(str(processed_dir / "ratings.parquet"))
    train, test = ratings_df.randomSplit([0.8, 0.2], seed=42)
    
    logger.info("Starting ALS Training...")
    als = ALS(
        maxIter=10,
        rank=20,
        regParam=0.1,
        userCol="userId",
        itemCol="movieId",
        ratingCol="rating",
        coldStartStrategy="drop",
        nonnegative=True
    )
    
    model = als.fit(train)
    
    logger.info("Evaluating Model...")
    predictions = model.transform(test)
    evaluator = RegressionEvaluator(metricName="rmse", labelCol="rating", predictionCol="prediction")
    rmse = evaluator.evaluate(predictions)
    
    rank_metrics = compute_ranking_metrics(model, test)
    
    report = {
        "rank": 20,
        "regParam": 0.1,
        "rmse": rmse,
        "mean_average_precision": rank_metrics["Mean_Average_Precision"],
        "precision_at_10": rank_metrics["Precision_at_10"]
    }
    
    with open(reports_dir / "als_evaluation.json", "w") as f:
        json.dump(report, f, indent=4)
    logger.info(f"Evaluation metrics saved: {report}")
    
    logger.info("Precomputing top 10 recommendations for all users...")
    user_recs = model.recommendForAllUsers(10)
    user_recs_flat = user_recs.select(
        "userId",
        F.explode("recommendations").alias("rec")
    ).select(
        "userId",
        F.col("rec.movieId").alias("movieId"),
        F.col("rec.rating").alias("predicted_rating")
    )
    
    # Bypassing Spark's Parquet writer for Windows stability
    logger.info("Converting recommendations to Pandas and saving...")
    user_recs_pd = user_recs_flat.toPandas()
    user_recs_pd.to_parquet(processed_dir / "user_recs.parquet", index=False)
    
    logger.info("Extracting Item Factors for Similarity matching...")
    item_factors_pd = model.itemFactors.toPandas()
    item_sims_pd = compute_item_similarities(item_factors_pd, top_k=10)
    item_sims_pd.to_parquet(processed_dir / "item_sims.parquet", index=False)
    
    spark.stop()
    logger.info("Phase 2 complete. Artifacts saved successfully.")

if __name__ == "__main__":
    main()