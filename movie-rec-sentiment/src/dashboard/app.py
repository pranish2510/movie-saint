"""
Streamlit Dashboard (Cinematic UI).

A Letterboxd-inspired interface for our movie recommender. 
Uses dynamic poster generation, CSS styling, and sleek typography.
"""

import urllib.parse
import pandas as pd
import requests
import streamlit as st

API_URL = "http://127.0.0.1:8000"

st.set_page_config(page_title="Cinematic | Recommender", page_icon="🎬", layout="centered")

# Injecting Letterboxd-inspired CSS 
st.markdown("""
    <style>
    /* Dark cinematic background and typography */
    .stApp {
        background-color: #14181C;
        color: #89A3B4;
    }
    
    /* Movie Card Container */
    .movie-card {
        background-color: #1B2228;
        border: 1px solid #2C3440;
        border-radius: 6px;
        padding: 1rem;
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1rem;
        transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .movie-card:hover {
        transform: translateY(-2px);
        border-color: #A2A6A9;
    }
    
    /* Poster Image styling */
    .poster-img {
        border-radius: 4px;
        width: 100px;
        height: 150px;
        object-fit: cover;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    }
    
    /* Text & Metadata */
    .movie-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .movie-title { 
        font-size: 1.4rem; 
        font-weight: 700; 
        color: #FFFFFF; 
        margin-bottom: 0.4rem; 
        line-height: 1.2;
    }
    .genre-row {
        margin-bottom: 1.2rem;
    }
    .genre-tag { 
        background-color: #2C3440; 
        color: #A2A6A9; 
        padding: 0.2rem 0.5rem; 
        border-radius: 3px; 
        font-size: 0.7rem; 
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-right: 0.4rem; 
    }
    
    /* Metrics */
    .metrics-row {
        display: flex;
        gap: 2.5rem;
    }
    .metric-box {
        display: flex;
        flex-direction: column;
    }
    .metric-label {
        font-size: 0.7rem;
        color: #89A3B4;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.2rem;
    }
    .metric-value-rating {
        font-size: 1.3rem;
        font-weight: 700;
        color: #3B73A7; /* Brand Blue */
    }
    .metric-value-sentiment-good {
        font-size: 1.3rem;
        font-weight: 700;
        color: #00BE17; /* Brand Green */
    }
    .metric-value-sentiment-bad {
        font-size: 1.3rem;
        font-weight: 700;
        color: #FF8000; /* Brand Orange */
    }
    </style>
""", unsafe_allow_html=True)

def get_placeholder_poster(title):
    """Generates a dynamic, styled placeholder poster based on the title."""
    clean_title = urllib.parse.quote(title.split("(")[0].strip()[:20])
    return f"https://placehold.co/400x600/1B2228/FFFFFF/png?text={clean_title}&font=Montserrat"

def render_movie_card(title, genres, score_label, score_val, sentiment_pct, total_reviews=None):
    """Renders custom HTML for a sleek movie card."""
    poster_url = get_placeholder_poster(title)
    genre_html = "".join([f"<span class='genre-tag'>{g}</span>" for g in str(genres).split("|")])
    
    if total_reviews == 0:
        sentiment_class = "metric-value-rating"
        sentiment_display = "N/A"
        review_text = "No Reviews"
    elif sentiment_pct >= 60:
        sentiment_class = "metric-value-sentiment-good"
        sentiment_display = f"{sentiment_pct}%"
        review_text = f"{total_reviews} Reviews" if total_reviews else "Audience"
    else:
        sentiment_class = "metric-value-sentiment-bad"
        sentiment_display = f"{sentiment_pct}%"
        review_text = f"{total_reviews} Reviews" if total_reviews else "Audience"
        
    html = f"""
    <div class="movie-card">
        <img src="{poster_url}" class="poster-img" alt="{title} poster">
        <div class="movie-info">
            <div class="movie-title">{title}</div>
            <div class="genre-row">{genre_html}</div>
            <div class="metrics-row">
                <div class="metric-box">
                    <span class="metric-label">{score_label}</span>
                    <span class="metric-value-rating">★ {score_val:.2f}</span>
                </div>
                <div class="metric-box">
                    <span class="metric-label">Sentiment ({review_text})</span>
                    <span class="{sentiment_class}">{sentiment_display}</span>
                </div>
            </div>
        </div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)

st.title("🎬 Cinematic Intelligence")
st.markdown("Your Life in Film, curated by **ALS Filtering** and **DistilBERT NLP**.")
st.divider()

tab1, tab2 = st.tabs(["🎯 For You", "🔍 Similar Matches"])

with tab1:
    colA, colB = st.columns([1, 2])
    with colA:
        user_id = st.number_input("User ID (1-610)", min_value=1, max_value=610, value=1, step=1)
        fetch_recs_btn = st.button("✨ Get Recommendations", use_container_width=True)
        
    if fetch_recs_btn:
        with st.spinner("Curating your watchlist..."):
            try:
                response = requests.get(f"{API_URL}/recommend/{user_id}")
                if response.status_code == 200:
                    data = response.json().get("recommendations", [])
                    st.write("") # Spacing
                    for rec in data:
                        render_movie_card(
                            title=rec["title"],
                            genres=rec["genres"],
                            score_label="Predicted Rating",
                            score_val=rec["predicted_rating"],
                            sentiment_pct=rec.get("sentiment_positive_pct", 0),
                            total_reviews=rec.get("total_reviews", 0)
                        )
                else:
                    st.error("API Error - Could not fetch data.")
            except Exception:
                st.error("Failed to connect to the backend API.")

with tab2:
    colA, colB = st.columns([1, 2])
    with colA:
        movie_id = st.number_input("Target Movie ID", min_value=1, value=1, step=1)
        fetch_sims_btn = st.button("🚀 Find Similar Movies", use_container_width=True)
        
    if fetch_sims_btn:
        with st.spinner("Finding cinematic matches..."):
            try:
                response = requests.get(f"{API_URL}/similar/{movie_id}")
                if response.status_code == 200:
                    data = response.json().get("similar_movies", [])
                    st.write("") # Spacing
                    for sim in data:
                        render_movie_card(
                            title=sim["title"],
                            genres=sim["genres"],
                            score_label="Similarity Score",
                            score_val=sim["similarity_score"],
                            sentiment_pct=sim.get("sentiment_positive_pct", 0)
                        )
                else:
                    st.error("Movie not found in the database.")
            except Exception:
                st.error("Failed to connect to the backend API.")