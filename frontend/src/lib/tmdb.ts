// src/lib/tmdb.ts

export async function getMoviePoster(title: string): Promise<string> {
  const token = process.env.NEXT_PUBLIC_TMDB_TOKEN;
  if (!token) return "/placeholder-poster.png"; // Fallback if no token

  // Strip the year from the title for better search results, e.g., "Aladdin (1992)" -> "Aladdin"
  const cleanTitle = title.replace(/\s*\(\d{4}\)\s*$/, "");

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(cleanTitle)}&include_adult=false&language=en-US&page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
        },
      }
    );
    const data = await res.json();
    
    if (data.results && data.results.length > 0 && data.results[0].poster_path) {
      return `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
    }
    // Fallback placeholder if TMDB doesn't find the movie
    return `https://placehold.co/400x600/1B2228/FFFFFF/png?text=${encodeURIComponent(cleanTitle)}&font=Montserrat`;
  } catch (error) {
    console.error("TMDB fetch error:", error);
    return `https://placehold.co/400x600/1B2228/FFFFFF/png?text=Not+Found`;
  }
}