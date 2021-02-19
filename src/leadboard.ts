import { config, savedData, ssPlayer, ssScore, user } from "./types";
const fs = require('fs');
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { messageController } from "./message";

export class leaderboardController {

    dataPath: string;
    curData: savedData;

    config: config;

    feedChannel;

    constructor(path: string, config: config, client) {
        this.dataPath = path;
        this.config = config;
        let guild = client.guilds.resolve(config.serverId);
        this.feedChannel = guild.channels.cache.get(config.channelId);
    }

    async init() {
        await fs.readFile(this.dataPath, (err, data) => {
            if (err) throw err;
            this.curData = JSON.parse(data);
        });
        // update players
        await this.savePlayers();
        console.info('Updated users');

        // update Scores
        if (this.curData.users.some(x => x.scores.length == 0)) await this.initialScores();

        await this.updateScores();
        this.updateSaved();
        setInterval(() => {
            this.updateScores();
        }, 3600 * 1000)
        console.info('Init done!');
    }

    private async getPlayers(): Promise<string[]> {
        let playersToGet = this.config.numPlayers;
        let pages = Math.ceil(playersToGet / 50);
        let userIds = [];
        let countriesString = this.config.countries.join(',');
        for (let i = 1; i <= pages; i++) {
            // console.info(`Getting page ${i}...`);
            let res = await fetch(`https://scoresaber.com/global/${i}?country=${countriesString}`);
            let html = await res.text();
            let $ = cheerio.load(html);
            $('table > tbody > tr > td.player > a').each((i, elem) => {
                if (userIds.length < playersToGet) userIds.push($(elem).attr('href').replace('/u/', ''));
            });
        }
        return userIds;
    }

    async updateSavedPlayers() {
        let userIds = await this.getPlayers();
        let users: user[] = [];
        for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            try {
                let user: ssPlayer = await this.ssRequest(`https://new.scoresaber.com/api/player/${userId}/full`);
                let scores = [];
                let usrIndex = this.curData.users.findIndex(x => x.userId == userId);
                if (usrIndex > -1) {
                    scores = this.curData.users[usrIndex].scores ?? [];
                }
                users.push({
                    userId: user.playerInfo.playerId,
                    totalPlayCount: user.scoreStats.totalPlayCount,
                    scores: scores,
                    ssData: user.playerInfo
                });
            } catch (error) {
                console.error('failed to get ' + userId);
                i--;
            }
        }
        this.curData.users = users;
        this.updateSaved();
    }

    private async initialScores() {
        for (const user of this.curData.users) {
            if (user.scores.length > 0) continue;
            let pages = Math.ceil(user.totalPlayCount / 8);
            console.log(`Getting user ${user.userId}...`);
            userLoop:
            for (let i = 1; i <= pages; i++) {
                console.log(`Page ${i}...`)
                try {
                    let scorePage: ssScore = await this.ssRequest(`https://new.scoresaber.com/api/player/${user.userId}/scores/top/${i}`);
                    for (const score of scorePage.scores) {
                        if (score.pp == 0) break userLoop;
                        let scoreIndex = this.curData.scores.findIndex(x => x.leaderboardId == score.leaderboardId)
                        if (scoreIndex > -1) {
                            let savedScore = this.curData.scores[scoreIndex];
                            if (score.score > savedScore.score) {
                                this.curData.scores[scoreIndex] = { 'userId': user.userId, ...score };
                            }
                        } else {
                            this.curData.scores.push({ 'userId': user.userId, ...score });
                        }
                        let usrScoreIndex = user.scores.findIndex(x => x.leaderboardId == score.leaderboardId);
                        if (usrScoreIndex > -1) {
                            user.scores[usrScoreIndex] = score;
                        } else {
                            user.scores.push(score);
                        }
                    }
                } catch (error) {
                    console.log(`Failed getting page ${i}`);
                    i--;
                }
                if (i % 10 == 0) this.updateSaved();
            }
        }
    }

    async updateScores() {
        console.info('Updating User Scores');
        await this.savePlayers();
        for (const user of this.curData.users) {
            let pages = Math.ceil(user.totalPlayCount / 8);
            // console.log(`Updating user ${user.userId}...`);
            updateUserLoop:
            for (let i = 1; i <= pages; i++) {
                // console.log(`Page ${i}...`)
                try {
                    let scorePage: ssScore = await this.ssRequest(`https://new.scoresaber.com/api/player/${user.userId}/scores/recent/${i}`);
                    for (const score of scorePage.scores) {
                        if (score.pp == 0) continue;
                        if ((new Date(score.timeSet)).getTime() <= this.getMostRecentScore(user.userId).getTime()) break updateUserLoop;
                        let scoreIndex = this.curData.scores.findIndex(x => x.leaderboardId == score.leaderboardId)
                        if (scoreIndex > -1) {
                            let savedScore = this.curData.scores[scoreIndex];
                            if (score.score > savedScore.score) {
                                messageController.sendMessage(user, score, this.feedChannel, this.curData.scores[scoreIndex]);
                                this.curData.scores[scoreIndex] = { 'userId': user.userId, ...score };
                                // console.log(score);
                            }
                        } else {
                            messageController.sendMessage(user, score, this.feedChannel);
                            this.curData.scores.push({ 'userId': user.userId, ...score });
                        }
                        let usrScoreIndex = user.scores.findIndex(x => x.leaderboardId == score.leaderboardId);
                        if (usrScoreIndex > -1) {
                            user.scores[usrScoreIndex] = score;
                        } else {
                            user.scores.push(score);
                        }
                    }
                } catch (error) {
                    console.error(`Failed getting page ${i}`);
                    i--;
                }
                if (i % 10 == 0) this.updateSaved();
            }
        }
        console.info('Update Complete');
    }

    private getMostRecentScore(userId: string): Date {
        let user = this.curData.users.find(x => x.userId == userId);

        user.scores?.sort((a, b) => {
            return (new Date(b.timeSet)).getTime() - (new Date(a.timeSet)).getTime();
        })

        return new Date(user.scores[0]?.timeSet);
    }

    private async ssRequest(url: string): Promise<any> {
        let res = await fetch(url);
        if (parseInt(res.headers.get('x-ratelimit-remaining')) < 3) {
            let d1 = new Date(parseInt(res.headers.get('x-ratelimit-reset')) * 1000);
            let d2 = new Date();
            // console.log(`Waiting ${(d1.getTime() - (new Date()).getTime()) / 1000} seconds...`);
            await this.delay(d1.getTime() - d2.getTime());
        }
        return await res.json();
    }

    private delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private updateSaved() {
        fs.writeFileSync(this.dataPath, JSON.stringify(this.curData));
    }

    async savePlayers() {
        console.info('Updating Users');
        let userIds = await this.getPlayers();
        let users: user[] = [];
        for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            try {
                let user: ssPlayer = await this.ssRequest(`https://new.scoresaber.com/api/player/${userId}/full`);
                let scores = [];
                let usrIndex = this.curData.users.findIndex(x => x.userId == userId);
                if (usrIndex > -1) {
                    scores = this.curData.users[usrIndex].scores ?? [];
                }
                users.push({
                    userId: user.playerInfo.playerId,
                    totalPlayCount: user.scoreStats.totalPlayCount,
                    scores: scores,
                    ssData: user.playerInfo
                });
            } catch (error) {
                // console.error(error);
                console.error('failed to get ' + userId);
                i--;
            }
        }
        // console.log(users);
        this.curData.users = users;
        this.updateSaved();
        console.info('Users updated');
    }
}
