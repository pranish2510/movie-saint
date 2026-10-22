import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ 
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "MovieSaint | Cinematic Intelligence",
  description: "Next-generation movie recommendations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans bg-black text-slate-300 antialiased min-h-screen`}>
        <nav className="w-full border-b border-slate-900 bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="font-extrabold text-2xl tracking-tight">
              <span className="text-white">movie</span>
              <span className="text-[#34b1eb]">saint</span>
            </div>
            
            <div className="flex gap-6 text-sm font-bold text-slate-400">
              <button className="hover:text-white transition-colors">Sign In</button>
              <button className="bg-white text-black px-4 py-2 rounded-full hover:bg-slate-200 transition-colors">
                Sign Up
              </button>
            </div>
          </div>
        </nav>

        <main className="w-full overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}