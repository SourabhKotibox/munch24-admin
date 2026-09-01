
export interface Episode {
  number: number | "Trailer";
  title: string;
  duration: string;
  locked: boolean;
  videoUrl: string;
}

export interface ShortDrama {
  id: number;
  title: string;
  description: string;
  genres: string[];
  year: number;
  rating: string;
  poster: string;
  totalEpisodes: number;
  freeEpisodes: number;
  badge?: "NEW" | "HOT" | "TRENDING" | "EXCLUSIVE";
  language: string;
  episodes: Episode[];
}

const V = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
];

const DURATIONS = ["3:25", "4:10", "3:50", "5:02", "4:30", "3:45", "5:15", "4:00", "3:30", "4:45", "5:20", "3:55"];

function makeEpisodes(count: number, freeCount: number): Episode[] {
  const eps: Episode[] = [
    { number: "Trailer", title: "Official Trailer", duration: "1:45", locked: false, videoUrl: V[0] },
  ];
  for (let i = 1; i <= count; i++) {
    eps.push({
      number: i,
      title: `Episode ${i}`,
      duration: DURATIONS[(i - 1) % DURATIONS.length],
      locked: i > freeCount,
      videoUrl: V[(i - 1) % V.length],
    });
  }
  return eps;
}

const P = "https://images.unsplash.com/";

export const shortDramas: ShortDrama[] = [
  {
    id: 1,
    title: "The Hockey Captain That Hates Me",
    description: "A clumsy college student falls for the ice-cold hockey captain who despises her — but behind his cold exterior lies a heart that only beats for her.",
    genres: ["Romance", "College Life", "Sports"],
    year: 2024,
    rating: "8.6",
    poster: `${P}photo-1529626455594-4ff0802cfb7e?w=400&h=711&fit=crop&q=80`,
    totalEpisodes: 63,
    freeEpisodes: 10,
    badge: "HOT",
    language: "Chinese",
    episodes: makeEpisodes(63, 10),
  },
  {
    id: 2,
    title: "Billionaire's Secret Love",
    description: "An ordinary secretary discovers her cold boss is the billionaire who saved her ten years ago — and he has been secretly watching over her ever since.",
    genres: ["Romance", "Drama", "CEO"],
    year: 2024,
    rating: "8.4",
    poster: `${P}photo-1534528741775-53994a69daeb?w=400&h=711&fit=crop&q=80`,
    totalEpisodes: 48,
    freeEpisodes: 8,
    badge: "TRENDING",
    language: "Chinese",
    episodes: makeEpisodes(48, 8),
  },
  {
    id: 3,
    title: "Married to the Mafia Boss",
    description: "After a mistaken identity mix-up at a casino, an innocent woman finds herself married to the ruthless head of the city's most feared crime family.",
    genres: ["Thriller", "Romance", "Crime"],
    year: 2024,
    rating: "8.7",
    poster: `${P}photo-1524504388940-b1c1722653e1?w=400&h=711&fit=crop&q=80`,
    totalEpisodes: 56,
    freeEpisodes: 9,
    badge: "HOT",
    language: "English",
    episodes: makeEpisodes(56, 9),
  },
  {
    id: 4,
    title: "The CEO's Runaway Bride",
    description: "She ran away on their wedding day. Three years later, she returns as his company's new designer — not knowing he has been searching for her ever since.",
    genres: ["Romance", "Drama", "Business"],
    year: 2024,
    rating: "8.5",
    poster: `${P}photo-1531746020798-e6953c6e8e04?w=400&h=711&fit=crop&q=80`,
    totalEpisodes: 52,
    freeEpisodes: 8,
    badge: "NEW",
    language: "Korean",
    episodes: makeEpisodes(52, 8),
  },
  {
    id: 5,
    title: "My Dragon Prince",
    description: "A modern-day archaeologist accidentally breaks an ancient seal and releases a 1000-year-old dragon prince who vows to marry her as repayment.",
    genres: ["Fantasy", "Romance", "Comedy"],
    year: 2024,
    rating: "8.2",
    poster: `${P}photo-1507003211169-0a1dd7228f2d?w=400&h=711&fit=crop&q=80`,
    totalEpisodes: 40,
    freeEpisodes: 7,
    badge: "NEW",
    language: "Chinese",
    episodes: makeEpisodes(40, 7),
  },
  {
    id: 6,
    title: "The Revenge Bride",
    description: "Betrayed by her fiancé on their wedding day, she rises from nothing to become the most powerful woman in the city — and her revenge has only just begun.",
    genres: ["Drama", "Revenge", "Business"],
    year: 2025,
    rating: "8.8",
    poster: `${P}photo-1494790108377-be9c29b29330?w=400&h=711&fit=crop&q=80`,
    totalEpisodes: 44,
    freeEpisodes: 9,
    badge: "EXCLUSIVE",
    language: "Korean",
    episodes: makeEpisodes(44, 9),
  },
  {
    id: 7,
    title: "Love in the Emergency Room",
    description: "Two rival doctors with a turbulent past are forced to work together in the same ER — and old feelings begin to resurface with every shift they share.",
    genres: ["Medical", "Romance", "Drama"],
    year: 2025,
    rating: "8.3",
    poster: `${P}photo-1544005313-94ddf0286df2?w=400&h=711&fit=crop&q=80`,
    totalEpisodes: 38,
    freeEpisodes: 8,
    badge: "TRENDING",
    language: "Korean",
    episodes: makeEpisodes(38, 8),
  },
  {
    id: 8,
    title: "The Alpha's Chosen Mate",
    description: "In a world where werewolf packs rule the night, the lone wolf princess is chosen as the mate for the most powerful Alpha — who wants nothing to do with her.",
    genres: ["Fantasy", "Romance", "Supernatural"],
    year: 2025,
    rating: "8.1",
    poster: `${P}photo-1520813792240-56fc4a3765a7?w=400&h=711&fit=crop&q=80`,
    totalEpisodes: 60,
    freeEpisodes: 10,
    badge: "HOT",
    language: "English",
    episodes: makeEpisodes(60, 10),
  },
];

export const featuredDramas = shortDramas.filter(d => d.badge === "HOT" || d.badge === "TRENDING");
export const newDramas = shortDramas.filter(d => d.badge === "NEW" || d.badge === "EXCLUSIVE");
