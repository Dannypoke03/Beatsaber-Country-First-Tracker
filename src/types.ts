export interface config {
    token: string;
    serverId: string;
    channelId: string;
    countries: string[];
    numPlayers: number;
    staffRoleId: string;
}

export interface savedData {
    users: user[];
    scores: score[];
}

export interface user {
    userId: string;
    oceRank?: number;
    totalPlayCount: number;
    latestScore?: Score;
    topScore?: Score;
    ssData: ssPlayer;
}

export interface score {
    userId: string;
    rank: number;
    scoreId: number;
    score: number;
    unmodififiedScore: number;
    mods: string;
    pp: number;
    weight: number;
    timeSet: Date;
    leaderboardId: number;
    songHash: string;
    songName: string;
    songSubName: string;
    songAuthorName: string;
    levelAuthorName: string;
    difficulty: number;
    difficultyRaw: string;
    maxScore: number;
}

export interface Badge {
    image: string;
    description: string;
}

export interface PlayerInfo {
    playerId: string;
    playerName: string;
    avatar: string;
    rank: number;
    countryRank: number;
    pp: number;
    country: string;
    role: string;
    badges: Badge[];
    history: string;
    permissions: number;
    inactive: number;
    banned: number;
}

export interface ScoreStats {
    totalScore: number;
    totalRankedScore: number;
    averageRankedAccuracy: number;
    totalPlayCount: number;
    rankedPlayCount: number;
}

export interface ssPlayer {
    playerInfo: PlayerInfo;
    scoreStats: ScoreStats;
}

export interface Score {
    rank: number;
    scoreId: number;
    score: number;
    unmodififiedScore: number;
    mods: string;
    pp: number;
    weight: number;
    timeSet: Date;
    leaderboardId: number;
    songHash: string;
    songName: string;
    songSubName: string;
    songAuthorName: string;
    levelAuthorName: string;
    difficulty: number;
    difficultyRaw: string;
    maxScore: number;
}

export interface ssScore {
    scores: Score[];
}

export interface firstLeadboard {
    user: user;
    count: number;
}