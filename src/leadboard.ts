import { config, firstLeadboard, savedData, score, ssPlayer, ssScore, user } from "./types";
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
                // console.log(`Page ${i}...`)
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
        let scoresToUpdate: score[] = [];
        await this.savePlayers();
        for (const user of this.curData.users) {
            let pages = Math.ceil(user.totalPlayCount / 8);
            updateUserLoop:
            for (let i = 1; i <= pages; i++) {
                try {
                    let scorePage: ssScore = await this.ssRequest(`https://new.scoresaber.com/api/player/${user.userId}/scores/recent/${i}`);
                    for (const score of scorePage.scores) {
                        if (score.pp == 0) continue;
                        if ((new Date(score.timeSet)).getTime() <= this.getMostRecentScore(user.userId).getTime()) break updateUserLoop;
                        let scoreIndex = this.curData.scores.findIndex(x => x.leaderboardId == score.leaderboardId)
                        if (scoreIndex > -1) {
                            let savedScore = this.curData.scores[scoreIndex];
                            if (score.score > savedScore.score) {
                                messageController.firstMessage(user, score, this.feedChannel, this.curData.scores[scoreIndex]);
                                this.curData.scores[scoreIndex] = { 'userId': user.userId, ...score };
                                scoresToUpdate.push({ 'userId': user.userId, ...score });
                            }
                        } else {
                            messageController.firstMessage(user, score, this.feedChannel);
                            this.curData.scores.push({ 'userId': user.userId, ...score });
                            scoresToUpdate.push({ 'userId': user.userId, ...score });
                        }
                    }
                } catch (error) {
                    console.error(`Failed getting page ${i}`);
                    i--;
                }
                if (i % 10 == 0) this.updateSaved();
            }
        }
        for (const score of scoresToUpdate) {
            let user = this.curData.users.find(x => x.userId === score.userId);
            let usrScoreIndex = user.scores.findIndex(x => x.leaderboardId == score.leaderboardId);
            if (usrScoreIndex > -1) {
                user.scores[usrScoreIndex] = score;
            } else {
                user.scores.push(score);
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

    async firstLeadboard(): Promise<firstLeadboard[]> {
        let usersCount: firstLeadboard[] = [];
        for (const score of this.curData.scores) {
            let curUser = usersCount.find(x => x.user.userId == score.userId);
            let user = this.curData.users.find(x => x.userId == score.userId);
            if (!user) continue;
            if (curUser) {
                curUser.count += 1;
            } else {
                usersCount.push({ user: user, count: 1 });
            }
        }
        // console.log(usersCount);
        return usersCount;
    }

    async snipeUser(userId: string, channel) {
        let user = this.curData.users.find(x => x.userId == userId);
        if (!user) return channel.send('Could not generate playlist for this user');
        let scores = this.curData.scores.filter(x => x.userId == userId);
        if (scores.length == 0) return channel.send('This users does not have any first scores');
        let songs = scores.map(x => { return { hash: x.songHash } });
        songs = [...new Set(songs)];
        let playlist = {
            playlistTitle: `${user.ssData.playerName} First Scores`,
            playlistAuthor: `First Tracker Bot`,
            playlistDescription: ``,
            image: `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`,
            songs: songs,
        }
        messageController.snipeMessage(playlist, user.ssData.playerName, channel);
    }
}
