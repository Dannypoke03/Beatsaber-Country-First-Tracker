import { Client, Message, TextChannel, Guild, Role, GuildMember, Collection, MessageEmbed, DMChannel, NewsChannel, GuildChannel } from 'discord.js';
import { config, savedData, Score, ssPlayer, ssScore, user } from './src/types';
import { leaderboardController } from './src/leadboard';
import { messageController } from './src/message';
import { debugLogger } from './src/debug.controller';
const fs = require('fs').promises;

const prefix = '~';

let config: config;
let leaderboard: leaderboardController;



async function onMessage(message: Message) {
    if (!message.content.startsWith(prefix)) return;
    let command = message.content.split(' ')[0].replace(prefix, '').toLowerCase();
    if (command == 'update') {
        if (message.member.roles.cache.find(x => x.id == config.staffRoleId) && leaderboard) {
            message.channel.send('Updating, this may take a while');
            await leaderboard.updateScores();
            message.channel.send('User Update complete');
        }
    } else if (command == 'test') {
        let user: user = {
            userId: "76561198118969924",
            totalPlayCount: 10,
            scores: [],
            "ssData": {
                "playerId": "76561198118969924",
                "playerName": "Dannypoke03",
                "avatar": "/api/static/avatars/76561198118969924.jpg",
                "rank": 398,
                "countryRank": 16,
                "pp": 11406.2,
                "country": "AU",
                "role": "",
                "badges": [],
                "history": "295,296,297,298,300,301,301,303,305,306,306,306,308,309,309,309,311,312,313,313,313,316,320,324,330,336,338,339,341,344,347,348,351,350,356,359,361,361,361,367,369,374,379,385,388,391,393,394,396",
                "permissions": 0,
                "inactive": 0,
                "banned": 0
            }
        }
        let score: Score = {
            "rank": 3784,
            "scoreId": 19108282,
            "score": 675637,
            "unmodififiedScore": 675637,
            "mods": "",
            "pp": 77.9863,
            "weight": 0.018495202663121,
            "timeSet": new Date("2019-06-06T14:32:33.000Z"),
            "leaderboardId": 84212,
            "songHash": "9ADD07A1625027A42110EFC4E1EFD03D8C960FEF",
            "songName": "Epic",
            "songSubName": "",
            "songAuthorName": "Tokyo Machine",
            "levelAuthorName": "Brady",
            "difficulty": 9,
            "difficultyRaw": "_ExpertPlus_SoloStandard",
            "maxScore": 832715
        }
        messageController.sendMessage(user, score, message.channel);
    }
}

const client = new Client();

async function onReady() {
    console.info('Bot Ready');
}

client.once('ready', onReady);
client.on('message', onMessage);

async function setConfig() {
    let data = await fs.readFile('./config.json');
    config = JSON.parse(data);
}

async function init() {
    await setConfig();
    await client.login(config.token || 'NO_TOKEN_PROVIDED').then(async () => {
        console.info('[Init] Connected to discord.');
    });
    leaderboard = new leaderboardController('./data.json', config, client);
    leaderboard.init();
}
new debugLogger();

init();