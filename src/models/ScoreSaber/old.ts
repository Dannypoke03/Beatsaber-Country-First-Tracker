export module ScoreSaberOld {

    export interface userBasic {
        playerInfo: PlayerInfo;
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
        badges: any[];
        history: string;
        permissions: number;
        inactive: number;
        banned: number;
    }

}