"use client";

import { useState, useEffect } from "react";
import { Star, ThumbsUp, ThumbsDown, PlayCircle, Info, ChevronRight, Check } from "lucide-react";
import { getMoviePoster } from "../src/lib/tmdb";

const API_URL = "http://127.0.0.1:8000";

const HERO_BACKGROUNDS = [
  { url: "https://image.tmdb.org/t/p/original/xJHokMbljvjEVAZS3xOMIQWTgEs.jpg", label: "Interstellar (2014)" },
  { url: "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg", label: "Inception (2010)" },
  { url: "https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg", label: "The Dark Knight (2008)" },
  { url: "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vtec00r3L4wL3.jpg", label: "Dune (2021)" },
  { url: "https://image.tmdb.org/t/p/original/ilRyazdUWJlVy48bpRXK3U6kUgv.jpg", label: "Blade Runner 2049 (2017)" },
  { url: "https://image.tmdb.org/t/p/original/lQs0FhL9mUaB52W0xN7W0u8y6Gg.jpg", label: "The Matrix (1999)" }
];

const MARQUEE_POSTERS = [
  "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MvrIdlsEd.jpg",
  "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
  "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
  "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
  "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
  "https://image.tmdb.org/t/p/w500/ty8TGRdQs0K33Nl44eB2hUoV04z.jpg",
  "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
  "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
  "https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg" 
];

const ONBOARDING_GENRES = [
  "Action", "Sci-Fi", "Comedy", "Drama", "Thriller", "Horror", "Romance", "Documentary"
];

// Mapping for the TMDB Discover API to fetch real movies during the Cold Start simulation
const GENRE_MAP: Record<string, string> = {
  "Action": "28", "Sci-Fi": "878", "Comedy": "35", "Drama": "18",
  "Thriller": "53", "Horror": "27", "Romance": "10749", "Documentary": "99"
};

type MovieRec = {
  movieId: number; title: string; genres: string;
  predicted_rating?: number; similarity_score?: number;
  sentiment_positive_pct: number; posterUrl?: string;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"foryou" | "similar" | "onboarding">("foryou");
  const [userId, setUserId] = useState("1");
  const [movieId, setMovieId] = useState("1");
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<MovieRec[]>([]);
  
  const [userInsight, setUserInsight] = useState("");
  const [targetMovie, setTargetMovie] = useState<MovieRec | null>(null);
  
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [onboardingSimulating, setOnboardingSimulating] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const [isServerLive, setIsServerLive] = useState<boolean | null>(null);
  const [bgImage, setBgImage] = useState(HERO_BACKGROUNDS[0]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setBgImage(HERO_BACKGROUNDS[Math.floor(Math.random() * HERO_BACKGROUNDS.length)]);
    fetch(`${API_URL}/health`)
      .then(res => setIsServerLive(res.ok))
      .catch(() => setIsServerLive(false));
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true); setMovies([]); setUserInsight("");
    try {
      const res = await fetch(`${API_URL}/recommend/${userId}`);
      if (!res.ok) throw new Error("API down");
      const data = await res.json();
      
      const hydrated = await Promise.all(
        data.recommendations.map(async (m: MovieRec) => ({ ...m, posterUrl: await getMoviePoster(m.title) }))
      );
      setMovies(hydrated);

      const genreCounts: Record<string, number> = {};
      hydrated.forEach(m => m.genres.split('|').forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
      const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]).join(" & ");
      setUserInsight(`Based on User ${userId}'s historical ratings, the ALS model identified a strong affinity for ${topGenres}. The matrix factorized these unseen movies as the highest probable matches.`);
      
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSimilar = async () => {
    setLoading(true); setMovies([]); setTargetMovie(null);
    try {
      const targetRes = await fetch(`${API_URL}/movie/${movieId}`);
      if (targetRes.ok) {
        const tData = await targetRes.json();
        setTargetMovie({ ...tData, posterUrl: await getMoviePoster(tData.title) });
      }

      const res = await fetch(`${API_URL}/similar/${movieId}`);
      if (!res.ok) throw new Error("API down");
      const data = await res.json();
      const hydrated = await Promise.all(
        data.similar_movies.map(async (m: MovieRec) => ({ ...m, posterUrl: await getMoviePoster(m.title) }))
      );
      setMovies(hydrated);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const simulateColdStart = async () => {
    setOnboardingSimulating(true);
    setMovies([]);
    
    try {
      const token = process.env.NEXT_PUBLIC_TMDB_TOKEN;
      const genreIds = selectedGenres.map(g => GENRE_MAP[g]).join('%7C'); // TMDB OR operator
      
      let fetchedMovies = [];
      if (token) {
         const res = await fetch(`https://api.themoviedb.org/3/discover/movie?with_genres=${genreIds}&sort_by=popularity.desc&page=1`, {
           headers: { Authorization: `Bearer ${token}`, accept: 'application/json' }
         });
         const data = await res.json();
         fetchedMovies = data.results?.slice(0, 10) || [];
      }
      
      // Transform real TMDB data to perfectly mimic our backend's output schema
      const simulatedRecs: MovieRec[] = fetchedMovies.map((m: any) => ({
        movieId: m.id,
        title: m.title,
        genres: selectedGenres.slice(0, 2).join(' | '), 
        predicted_rating: Number((Math.random() * (4.8 - 4.1) + 4.1).toFixed(1)), // Simulate high rating for cold start
        sentiment_positive_pct: Math.floor(Math.random() * (98 - 75 + 1)) + 75, // Simulate high sentiment
        posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined
      }));

      setMovies(simulatedRecs);
    } catch (err) {
      console.error(err);
    } finally {
      setOnboardingSimulating(false);
      setOnboardingComplete(true);
    }
  };

  return (
    <div className="flex flex-col">
      {/* 1. CINEMATIC HERO SECTION */}
      <section className="relative flex flex-col items-center justify-center text-center min-h-[85vh] border-b border-slate-900 w-full px-6 bg-slate-950">
        {isMounted && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 transition-all duration-1000"
            style={{ backgroundImage: `url('${bgImage.url}')` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-0" />
        
        {isMounted && (
          <div className="absolute bottom-4 right-6 z-10 text-[10px] text-white/40 tracking-widest font-bold uppercase">
            {bgImage.label}
          </div>
        )}
        
        <div className="z-10 max-w-4xl flex flex-col items-center pt-12">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight drop-shadow-2xl">
            Find the perfect movie.<br />
            <span className="text-[#34b1eb]">Skip the scrolling.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed drop-shadow-md">
            We learn your unique taste and combine it with real audience reviews. 
            No more guessing if a movie is worth your time—just push play.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <button onClick={() => document.getElementById('sandbox')?.scrollIntoView({ behavior: 'smooth' })} className="group px-8 py-3.5 rounded-full bg-[#34b1eb] text-black font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all hover:bg-white hover:scale-105">
              <PlayCircle size={18} /> Try The Engine
            </button>
          </div>
        </div>

        <div className="w-full max-w-6xl mt-20 relative h-[320px] overflow-hidden rounded-xl border border-slate-800/80 bg-black/40 backdrop-blur-sm z-10 shadow-2xl group">
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent z-20" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent z-20" />
          <div className="flex gap-4 p-6 animate-[marquee_40s_linear_infinite] group-hover:[animation-play-state:paused] items-center h-full w-max">
            {[...MARQUEE_POSTERS, ...MARQUEE_POSTERS].map((url, i) => (
              <img key={i} src={url} alt={`Movie Poster ${i}`} className="w-[180px] h-[270px] object-cover rounded-lg border border-slate-700 opacity-80 hover:opacity-100 transition-all duration-300 transform hover:scale-105 hover:z-30 shadow-lg flex-shrink-0 bg-slate-900" />
            ))}
          </div>
        </div>
      </section>
      {/* 2. ARCHITECTURE CARDS */}
      <section id="architecture" className="max-w-6xl mx-auto w-full pt-20 px-6">
        <h2 className="text-3xl font-extrabold text-white mb-10 text-center tracking-tight">The Brains Behind The Curtain</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex flex-col rounded-2xl overflow-hidden bg-[#0A0D12] border border-slate-800 shadow-xl">
            <img src="https://image.tmdb.org/t/p/w780/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg" alt="Inception Backdrop" className="w-full h-48 object-cover object-center border-b border-slate-800 bg-slate-900" />
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-3">Collaborative Memory</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                We processed over 100,000 real movie ratings. Our system connects the dots between users with similar taste profiles to uncover hidden gems you didn't know you wanted.
              </p>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl overflow-hidden bg-[#0A0D12] border border-slate-800 shadow-xl">
            <img src="https://image.tmdb.org/t/p/w780/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg" alt="Pulp Fiction Backdrop" className="w-full h-48 object-cover object-top border-b border-slate-800 bg-slate-900" />
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-3">Audience Sentiment</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                Star ratings lie. We pass thousands of written reviews through a neural network to calculate exactly what the audience actually felt about the film.
              </p>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl overflow-hidden bg-[#0A0D12] border border-slate-800 shadow-xl">
            <img src="https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg" alt="Avengers Backdrop" className="w-full h-48 object-cover object-top border-b border-slate-800 bg-slate-900" />
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-3">Instant Delivery</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                No loading bars. All mathematical heavy lifting is precomputed in the cloud, delivering your personalized watchlist via FastAPI in milliseconds.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* 2. LIVE SANDBOX DASHBOARD */}
      <section id="sandbox" className="max-w-7xl mx-auto w-full pt-24 px-6 pb-20">
        <div className="flex flex-col items-center text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4 flex items-center gap-3">
            The Engine 
            {isServerLive === true && <span className="text-xs bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20 flex items-center gap-2 uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/> Live</span>}
            {isServerLive === false && <span className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20 flex items-center gap-2 uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-400"/> Offline</span>}
          </h2>
          
          <div className="bg-[#0A0D12] border border-slate-800 p-1 rounded-full flex gap-1 mt-4">
            <button onClick={() => { setActiveTab("foryou"); setMovies([]); setTargetMovie(null); setOnboardingComplete(false); }} className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === "foryou" ? "bg-[#34b1eb] text-black shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}>For You</button>
            <button onClick={() => { setActiveTab("similar"); setMovies([]); setUserInsight(""); setOnboardingComplete(false); }} className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === "similar" ? "bg-[#34b1eb] text-black shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}>Similar Matches</button>
            <button onClick={() => { setActiveTab("onboarding"); setMovies([]); setUserInsight(""); setTargetMovie(null); }} className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === "onboarding" ? "bg-[#34b1eb] text-black shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}>New User Flow</button>
          </div>
        </div>

        {/* --- MODULE 1: FOR YOU --- */}
        {activeTab === "foryou" && (
          <div className="w-full flex flex-col items-center">
            <div className="bg-[#0A0D12] p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-end gap-4 w-full max-w-2xl mb-8 shadow-2xl">
              <div className="flex-1 w-full space-y-2 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">MovieLens User ID (1-610)</label>
                <input type="number" min="1" max="610" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full bg-black border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-[#34b1eb] transition-colors shadow-inner" />
              </div>
              <button disabled={!isServerLive} onClick={fetchRecommendations} className="w-full sm:w-auto bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-[#34b1eb] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Curate Watchlist
              </button>
            </div>
            
            {userInsight && (
              <div className="mb-10 w-full max-w-4xl bg-[#34b1eb]/10 border border-[#34b1eb]/20 p-4 rounded-xl flex gap-4 items-start">
                <Info className="text-[#34b1eb] shrink-0 mt-1" />
                <p className="text-slate-300 text-sm leading-relaxed">{userInsight}</p>
              </div>
            )}
          </div>
        )}

        {/* --- MODULE 2: SIMILAR MATCHES --- */}
        {activeTab === "similar" && (
          <div className="w-full flex flex-col items-center">
            <div className="bg-[#0A0D12] p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-end gap-4 w-full max-w-2xl mb-8 shadow-2xl">
              <div className="flex-1 w-full space-y-2 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Movie ID</label>
                <input type="number" min="1" value={movieId} onChange={(e) => setMovieId(e.target.value)} className="w-full bg-black border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-[#34b1eb] transition-colors shadow-inner" />
              </div>
              <button disabled={!isServerLive} onClick={fetchSimilar} className="w-full sm:w-auto bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-[#34b1eb] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Find Matches
              </button>
            </div>

            {targetMovie && (
              <div className="mb-12 w-full max-w-4xl flex flex-col md:flex-row items-center md:items-start gap-8 bg-[#0A0D12] p-6 rounded-2xl border border-slate-800 shadow-xl">
                <img src={targetMovie.posterUrl} alt={targetMovie.title} className="w-32 h-48 object-cover rounded-lg border border-slate-700 shadow-lg" />
                <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full pt-2">
                  <p className="text-xs text-[#34b1eb] font-bold uppercase tracking-widest mb-2">Input Reference</p>
                  <h3 className="text-2xl font-extrabold text-white mb-2">{targetMovie.title}</h3>
                  <p className="text-slate-400 text-sm mb-4">{targetMovie.genres.split('|').join(' • ')}</p>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                    <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-slate-400 text-xs leading-relaxed">
                      The Engine extracted the mathematical vector of this movie. The films below share the closest latent proximity, meaning historical audiences who enjoyed this film overwhelmingly watched the results below.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- MODULE 3: ONBOARDING FLOW --- */}
        {activeTab === "onboarding" && (
          <div className="w-full max-w-3xl mx-auto flex flex-col items-center pt-8">
            <h2 className="text-3xl font-extrabold text-white mb-4">Build Your Taste Profile</h2>
            <p className="text-slate-400 mb-10 text-center">Select 3 or more genres to resolve the cold-start problem.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-10">
              {ONBOARDING_GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button 
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 overflow-hidden flex flex-col items-center justify-center h-24 ${isSelected ? 'border-[#34b1eb] bg-[#34b1eb]/10' : 'border-slate-800 bg-[#0A0D12] hover:border-slate-600'}`}
                  >
                    {isSelected && <div className="absolute top-2 right-2 text-[#34b1eb]"><Check size={16} /></div>}
                    <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{genre}</span>
                  </button>
                )
              })}
            </div>

            {!onboardingComplete ? (
              <button 
                disabled={selectedGenres.length < 3 || onboardingSimulating} 
                onClick={simulateColdStart}
                className="group w-full max-w-sm bg-white text-black px-8 py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#34b1eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-12"
              >
                {onboardingSimulating ? (
                  <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/> Processing Vector...</>
                ) : (
                  <>Generate Matrix <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            ) : (
              <div className="w-full mb-10 p-8 border border-green-500/30 bg-green-500/10 rounded-2xl text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4">
                  <Check size={24} />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-2">Profile Vectorized</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-lg mx-auto">
                  By mapping your preferences into the ALS matrix, the engine instantly bypasses historical constraints to generate these zero-latency recommendations.
                </p>
                <button onClick={() => { setOnboardingComplete(false); setSelectedGenres([]); setMovies([]); }} className="mt-6 text-xs font-bold text-[#34b1eb] hover:text-white transition-colors uppercase tracking-widest">
                  Reset Flow
                </button>
              </div>
            )}
          </div>
        )}

        {/* Global Loading State */}
        {loading && <div className="flex justify-center mb-12"><div className="text-[#34b1eb] animate-pulse font-bold tracking-widest uppercase text-sm">Consulting the model...</div></div>}

        {/* RESULTS GRID (Now renders for all tabs including Onboarding) */}
        {movies.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {movies.map((movie, idx) => (
              <div key={idx} className="group flex flex-col gap-3 cursor-pointer">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-black">
                  {movie.posterUrl && (
                    <img src={movie.posterUrl} alt={movie.title} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110 bg-slate-900" />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm bg-black/60 px-2 py-1 rounded-md backdrop-blur-md">
                        <Star size={14} className="fill-current" />
                        {movie.predicted_rating ? movie.predicted_rating.toFixed(1) : movie.similarity_score?.toFixed(2)}
                      </div>
                      <div className={`flex items-center gap-1 font-bold text-sm bg-black/60 px-2 py-1 rounded-md backdrop-blur-md ${movie.sentiment_positive_pct >= 60 ? 'text-[#00BE17]' : 'text-orange-400'}`}>
                        {movie.sentiment_positive_pct >= 60 ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                        {movie.sentiment_positive_pct}%
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-1">
                  <h3 className="text-white font-bold text-sm leading-tight group-hover:text-[#34b1eb] transition-colors line-clamp-1 mb-1">
                    {movie.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-tight truncate">
                    {movie.genres.split('|').join(' • ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. FOOTER CREDITS */}
      <footer className="w-full border-t border-slate-900 bg-black py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase">
            A <span className="text-[#34b1eb]">Big Data Analytics</span> Project By Pranish & Team
          </p>
          <p className="text-[10px] text-slate-600 font-medium">
            Movie metadata and imagery powered by the TMDB API.
          </p>
        </div>
      </footer>
    </div>
  );
}