// Shared ranking types (API ⇄ client).
import type { FeedUser } from "@/lib/feed";

export type RankingRow = {
  rank: number | null; // null = no points in this window
  user: FeedUser;
  value: number;
  visits: number;
  places: number;
  comments: number;
  answers: number;
  delta: number | null; // positions gained since the previous window
  is_new: boolean;
  me: boolean;
};

export type RankingChallenge = {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  ends_at: string;
};

export type RankingResponse = {
  scope: "city" | "all";
  period: "week" | "month" | "all";
  kind: "exploracao" | "contribuicao";
  city: string | null;
  window_start: string | null;
  total: number;
  rows: RankingRow[];
  me: RankingRow | null;
  next: { rank: number; missing: number } | null;
  challenges: RankingChallenge[];
};
