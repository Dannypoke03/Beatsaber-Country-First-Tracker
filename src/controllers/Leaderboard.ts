import axios from "axios";
import { Client } from "discord.js";
import { createQueryBuilder, getConnection } from "typeorm";
import { Leaderboard } from "../entity/Leaderboard";
import { Score } from "../entity/Score";
import { User } from "../entity/User";
import { LeaderboardInfo, Score as SSScore } from "../models/ScoreSaber/LeaderboardData";
import { Player, PlayerScore } from "../models/ScoreSaber/PlayerData";
import { delay } from "../utils/helper";
import { BotConfig } from "./config";
import { messageController } from "./message";
import { sheetUpdater } from "./sheetUpdater";

export class leaderboardController {
    client: Client;
    feedChannel;

    constructor(client: Client) {
        this.client = client;
        this.init();
    }

    async init() {
        this.feedChannel = (this.client.channels.cache as any).get(BotConfig.config.channelId);
        await this.userUpdate();
        await this.initialScoreSync();
        await this.updateLoop();
    }

    private async updateLoop() {
        await this.userUpdate();
        await this.newScoresSync();
        // await this.scoreCleanUp();
        await sheetUpdater.upateSheet();
        // rerun every hour
        setTimeout(() => this.updateLoop(), 1000 * 60 * 60);
    }

    async userUpdate() {
        console.info("Begin user update");
        let playersToGet = BotConfig.config.numPlayers;
        let pages = Math.ceil(playersToGet / 50);
        let countriesString = BotConfig.config.countries.join(',');
        let allPlayers: Player[] = [];
        for (let i = 1; i <= pages; i++) {
            let res = await axios(`https://scoresaber.com/api/players?page=${i}&countries=${countriesString}`);
            if (parseInt(res.headers['x-ratelimit-remaining'] || "0") < 5) {
                let d1 = new Date(parseInt(res.headers['x-ratelimit-reset'] || "0") * 1000);
                let d2 = new Date();
                await delay(d1.getTime() - d2.getTime());
            }
            let users: Player[] = res.data;
            allPlayers = allPlayers.concat(users.filter((x, i) => i + allPlayers.length < playersToGet));
        }
        for (const userId of BotConfig.config.individualUsers) {
            let res = await axios(`https://scoresaber.com/api/player/${userId}/full`);
            if (parseInt(res.headers['x-ratelimit-remaining'] || "0") < 5) {
                let d1 = new Date(parseInt(res.headers['x-ratelimit-reset'] || "0") * 1000);
                let d2 = new Date();
                await delay(d1.getTime() - d2.getTime());
            }
            let user: Player = res.data;
            allPlayers.push(user);
        }
        for (const player of allPlayers) {
            let savedUser = await getConnection().getRepository(User).findOne({ userId: player.id });
            let toInsert: Player[] = [];
            if (savedUser) {
                await getConnection()
                    .createQueryBuilder()
                    .update(User)
                    .set(this.ssToUser(player))
                    .where("userId = :id", { id: player.id })
                    .execute();
            } else {
                toInsert.push(player);
            }
            if (toInsert.length > 0) {
                await getConnection().getRepository(User).insert(toInsert.map(this.ssToUser));
            }
        }
        console.info("End user update");
    }

    async initialScoreSync() {
        console.info("Begin initial score update");
        let users = await createQueryBuilder(User, "user")
            .orderBy("user.pp", "DESC")
            .leftJoinAndSelect("user.scores", "scores")
            .leftJoin("user.scores", "scores2", "scores2.timeSet > scores.timeSet")
            .where("scores2.id IS NULL")
            .limit(BotConfig.config.numPlayers)
            .getMany();
        for (const user of users) {
            let page = 1;
            // console.log(page)
            if (user.scores.length > 0) continue;
            while (page > 0) {
                try {
                    let scoresReq = await axios(`https://scoresaber.com/api/player/${user.userId}/scores?limit=100&sort=top&page=${page}`);
                    if (parseInt(scoresReq.headers['x-ratelimit-remaining'] || "0") < 5) {
                        let d1 = new Date(parseInt(scoresReq.headers['x-ratelimit-reset'] || "0") * 1000);
                        let d2 = new Date();
                        await delay(d1.getTime() - d2.getTime());
                    }
                    let scores: PlayerScore[] = scoresReq.data;
                    let hasUnranked = false;
                    for (const score of scores) {
                        if (!score.leaderboard.ranked) {
                            hasUnranked = true;
                            continue;
                        }
                        // check if leaderboard already exists
                        let savedLeaderboard = await createQueryBuilder(Leaderboard, "leaderboard")
                            .leftJoinAndSelect("leaderboard.scores", "scores")
                            .where("leaderboard.id = :id", { id: score.leaderboard.id })
                            .getOne();
                        if (!savedLeaderboard) {
                            await getConnection().getRepository(Leaderboard).insert(this.ssToLeaderboard(score.leaderboard));
                            savedLeaderboard = await createQueryBuilder(Leaderboard, "leaderboard")
                                .leftJoinAndSelect("leaderboard.scores", "scores")
                                .where("leaderboard.id = :id", { id: score.leaderboard.id })
                                .getOne();
                        }
                        let savedScore = await getConnection().getRepository(Score).findOne({ id: score.score.id });
                        if (!savedScore) {
                            await getConnection().getRepository(Score).insert(this.ssToScore(score.score, user, savedLeaderboard));
                        }
                    }
                    if (hasUnranked) {
                        page = 0;
                    } else {
                        page++;
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        }

        console.info("End initial score update");
    }

    async newScoresSync() {
        console.info("Begin score update");
        let users = await createQueryBuilder(User, "user")
            .orderBy("user.pp", "DESC")
            .leftJoinAndSelect("user.scores", "scores")
            .leftJoin("user.scores", "scores2", "scores2.timeSet > scores.timeSet")
            .where("scores2.id IS NULL")
            .limit(BotConfig.config.numPlayers)
            .getMany();
        let newScores: { newScore: Score, oldScore?: Score }[] = [];
        for (const user of users) {
            let page = 1;
            while (page > 0) {
                try {
                    let scoresReq = await axios(`https://scoresaber.com/api/player/${user.userId}/scores?limit=100&sort=recent&page=${page}`);
                    if (parseInt(scoresReq.headers['x-ratelimit-remaining'] || "0") < 5) {
                        let d1 = new Date(parseInt(scoresReq.headers['x-ratelimit-reset'] || "0") * 1000);
                        let d2 = new Date();
                        await delay(d1.getTime() - d2.getTime());
                    }
                    let scores: PlayerScore[] = scoresReq.data;
                    let skip = false;
                    for (const score of scores) {
                        if (!score.leaderboard.ranked) continue;
                        if (new Date(score.score.timeSet) < new Date(user.scores[0].timeSet)) {
                            skip = true;
                            break;
                        }
                        // check if leaderboard already exists
                        let savedLeaderboard = await createQueryBuilder(Leaderboard, "leaderboard")
                            .leftJoinAndSelect("leaderboard.scores", "scores")
                            .leftJoin("leaderboard.scores", "scores2", "scores2.pp > scores.pp")
                            .leftJoinAndSelect("scores.user", "user")
                            .where("leaderboard.id = :id AND scores2.id IS NULL", { id: score.leaderboard.id })
                            .getOne();
                        if (!savedLeaderboard) {
                            await getConnection().getRepository(Leaderboard).insert(this.ssToLeaderboard(score.leaderboard));
                            savedLeaderboard = await createQueryBuilder(Leaderboard, "leaderboard")
                                .leftJoinAndSelect("leaderboard.scores", "scores")
                                .leftJoin("leaderboard.scores", "scores2", "scores2.pp > scores.pp")
                                .where("leaderboard.id = :id AND scores2.id IS NULL", { id: score.leaderboard.id })
                                .getOne();
                        }
                        let savedScore = await getConnection().getRepository(Score).findOne({ id: score.score.id });
                        if (!savedScore) {
                            await getConnection().getRepository(Score).insert(this.ssToScore(score.score, user, savedLeaderboard));
                            let newScore = await createQueryBuilder(Score, "score")
                                .leftJoinAndSelect("score.leaderboard", "leaderboard")
                                .leftJoinAndSelect("score.user", "user")
                                .where("score.id = :id", { id: score.score.id })
                                .getOne();
                            if (score.score.pp > (savedLeaderboard.scores[0] ? savedLeaderboard.scores[0].pp : 0)) {
                                newScores.push({
                                    newScore: newScore,
                                    oldScore: savedLeaderboard.scores[0]
                                });
                            }
                        }
                    }
                    if (skip) {
                        page = 0;
                    } else {
                        page++;
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        }
        for (const scores of newScores) {
            this.feedChannel.send(await messageController.firstMessage(scores.newScore, scores.oldScore));
        }
        console.info("End score update");
    }

    async scoreCleanUp() {
        console.info("Begin score cleanup");
        // let users = await createQueryBuilder(User, "user")
        //     .orderBy("user.pp", "DESC")
        //     .leftJoinAndSelect("user.scores", "scores")
        //     .leftJoinAndSelect("scores.leaderboard", "leaderboard")
        //     .orderBy("scores.timeSet", "DESC")
        //     .getMany();
        // let leaderboards = await createQueryBuilder(Leaderboard, "leaderboard")
        //     .leftJoinAndSelect("leaderboard.scores", "scores")
        //     .leftJoin("leaderboard.scores", "scores2", "scores2.pp > scores.pp")
        //     .where("scores2.id IS NULL")
        //     .getMany();
        // for (const user of users) {
        //     let mostRecentScore = user.scores[0];
        //     let deleted = 0;
        //     for (const score of user.scores) {
        //         let leaderboard = leaderboards.find(l => l.id == score.leaderboard.id);
        //         // console.log(score.timeSet, leaderboard.scores[0].timeSet, score.pp, leaderboard.scores[0].pp);
        //         if (new Date(score.timeSet) > new Date(mostRecentScore.timeSet) || score.pp < leaderboard.scores[0].pp) {
        //             await getConnection()
        //                 .createQueryBuilder()
        //                 .delete()
        //                 .from(Score)
        //                 .where("id = :id", { id: score.id })
        //                 .execute();
        //             deleted++;
        //         }
        //     }
        // }
        console.info("End score cleanup");
    }

    private ssToUser(player: Player) {
        return {
            userId: player.id,
            playerName: player.name,
            country: player.country,
            avatar: player.profilePicture,
            pp: player.pp,
            rank: player.rank,
            countryRank: player.countryRank,
            totalScore: player.scoreStats ? player.scoreStats.totalScore : 0,
            totalRankedScore: player.scoreStats ? player.scoreStats.totalRankedScore : 0,
            averageRankedAccuracy: player.scoreStats ? player.scoreStats.averageRankedAccuracy : 0,
            PlayCount: player.scoreStats ? player.scoreStats.totalPlayCount : 0,
            rankedPlayCount: player.scoreStats ? player.scoreStats.rankedPlayCount : 0,
        }
    }

    private ssToLeaderboard(leaderboard: LeaderboardInfo) {
        return {
            id: leaderboard.id,
            songHash: leaderboard.songHash,
            songName: leaderboard.songName,
            songSubName: leaderboard.songSubName,
            songAuthorName: leaderboard.songAuthorName,
            levelAuthorName: leaderboard.levelAuthorName,
            difficulty: leaderboard.difficulty.difficultyRaw,
            maxScore: leaderboard.maxScore,
            ranked: leaderboard.ranked,
            qualified: leaderboard.qualified,
            stars: leaderboard.stars,
            coverImage: leaderboard.coverImage,
        }
    }

    private ssToScore(score: SSScore, user: User, leaderboard: Leaderboard) {
        let newScore = new Score();
        newScore.id = score.id;
        newScore.rank = score.rank;
        newScore.baseScore = score.baseScore;
        newScore.modifiedScore = score.modifiedScore;
        newScore.pp = score.pp;
        newScore.weight = score.weight;
        newScore.modifiers = score.modifiers;
        newScore.multiplier = score.multiplier;
        newScore.badCuts = score.badCuts;
        newScore.missedNotes = score.missedNotes;
        newScore.maxCombo = score.maxCombo;
        newScore.fullCombo = score.fullCombo;
        newScore.hmd = score.hmd;
        newScore.timeSet = score.timeSet;
        newScore.user = user;
        newScore.leaderboard = leaderboard;

        return newScore;
    }

}