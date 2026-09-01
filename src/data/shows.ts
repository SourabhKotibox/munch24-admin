export interface Show {
  id: number;
  title: string;
  genre: string;
  year: number;
  rating: string;
  episodes: number;
  thumbnail: string;
  badge?: string;
  progress?: number;
}

export const heroShows = [
  {
    id: 1,
    title: "Bound by Love",
    description: "She married the wrong brother. Now the right one wants her back — and he won't take no for an answer.",
    genre: "Romance · Drama",
    bg: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=80",
  },
  {
    id: 2,
    title: "The Dark CEO",
    description: "A ruthless billionaire. A woman who refuses to bow. When two worlds collide, only one heart survives.",
    genre: "Romance · Thriller",
    bg: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1600&q=80",
  },
  {
    id: 3,
    title: "Mafia's Hidden Bride",
    description: "He never wanted a wife. She never wanted a captor. But fate has other plans for both of them.",
    genre: "Suspense · Romance",
    bg: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80",
  },
];

const posters = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1510771463146-e89e6e86560e?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1496440737103-cd596325d314?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1474978528675-4a50a8716a53?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1558203728-00f45181dd84?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1513097633097-329a3a764d2e?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1581803118522-7b72a50f7e9f?w=300&h=450&fit=crop&q=80",
  "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=300&h=450&fit=crop&q=80",
];

function makeShows(titles: string[], badge?: string): Show[] {
  return titles.map((title, i) => ({
    id: i + 1,
    title,
    genre: ["Romance", "Drama", "Thriller", "Action", "Mystery"][i % 5],
    year: 2024 + (i % 2),
    rating: ["8.9", "9.1", "8.4", "9.3", "8.7", "9.0", "8.2", "9.5", "8.6", "9.2"][i % 10],
    episodes: [8, 12, 16, 10, 20, 24, 15, 30][i % 8],
    thumbnail: posters[i % posters.length],
    badge,
  }));
}

export const continueWatching: Show[] = [
  { id: 1, title: "Bound by Love", genre: "Romance", year: 2024, rating: "9.1", episodes: 16, thumbnail: posters[3], progress: 65 },
  { id: 2, title: "My Ruthless CEO", genre: "Drama", year: 2024, rating: "8.7", episodes: 12, thumbnail: posters[5], progress: 30 },
  { id: 3, title: "The Alpha's Bride", genre: "Thriller", year: 2025, rating: "9.3", episodes: 20, thumbnail: posters[2], progress: 80 },
  { id: 4, title: "Mafia King's Secret", genre: "Suspense", year: 2024, rating: "8.9", episodes: 8, thumbnail: posters[7], progress: 45 },
  { id: 5, title: "His Forbidden Love", genre: "Romance", year: 2025, rating: "9.0", episodes: 24, thumbnail: posters[0], progress: 20 },
];

export const homeSections = [
  {
    title: "New Release",
    emoji: "🔥",
    shows: makeShows([
      "My Billionaire Husband's Secret", "Taming the Cold CEO", "Married by Mistake",
      "The Alpha's Forbidden Bride", "His Dark Obsession", "CEO's Hidden Wife",
      "Caught in His World", "The Mafia Lord's Possession", "Love at First Contract",
    ], "NEW"),
  },
  {
    title: "Trending",
    emoji: "📈",
    shows: makeShows([
      "Sweet Deception", "Accidentally Yours", "His Personal Secretary",
      "The Wrong Wedding", "Billion Dollar Mistake", "Never Let Me Go",
      "His Perfect Lie", "The Chosen Bride", "Under His Protection",
    ]),
  },
  {
    title: "Romance & Drama",
    emoji: "❤️",
    shows: makeShows([
      "Love After Betrayal", "Second Chance Hearts", "The Proposal",
      "Marry Me Again", "Falling for My Boss", "One Last Dance",
      "The Wedding Pact", "Forever Starts Now", "His Unexpected Bride",
    ]),
  },
  {
    title: "Action & Power",
    emoji: "⚡",
    shows: makeShows([
      "Shadow Protocol", "The Last Enforcer", "Dark Syndicate",
      "Blood & Power", "Crimson Night", "The Hitman's Wife",
      "No Escape", "Silent Storm", "Underworld Queen",
    ], "HOT"),
  },
  {
    title: "Mystery & Suspense",
    emoji: "🔍",
    shows: makeShows([
      "The Hidden Truth", "Whispers in the Dark", "Identity Unknown",
      "Behind Closed Doors", "The Vanishing", "Dead Reckoning",
      "A Secret Past", "Truth or Dare", "The Last Secret",
    ]),
  },
];
