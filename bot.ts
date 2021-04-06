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
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift().toLowerCase();

    switch (command) {
        case 'update':
            if (message.member.roles.cache.find(x => x.id == config.staffRoleId) && leaderboard) {
                message.channel.send('Updating, this may take a while');
                await leaderboard.updateScores();
                message.channel.send('User Update complete');
            }
            break;
        case 'pr':
            if (message.member.roles.cache.find(x => x.id == config.staffRoleId)) {
                message.delete();
                leaderboard.progressReport(message.channel);
            }
            break;
        case 'fl':
            messageController.firstLeaderboardMessage(await leaderboard.firstLeadboard(), message.channel);
            break;
        case 'snipe':
            if (!args.length) {
                return message.channel.send(`You didn't provide a userId, ${message.author}!`);
            }
            leaderboard.snipeUser(args[0], message.channel);
            break;
        case 'acc':
            leaderboard.accleaderboard(message.channel)
            break;
        case 'help':
            let string = "**Avaliable Commands**\n`~fl` -> Returns the first leaderboard\n`~snipe <userId>` -> Returns a playlist to snipe the given player\n`~acc` -> Returns the accuracy leaderboard";
            message.channel.send(string);
            break;
        default:
            break;
    }
}

const client = new Client();

async function onReady() {
    console.info('Bot Ready');
    leaderboard = new leaderboardController('./data.json', config, client);
    leaderboard.init();
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
}

new debugLogger();

init();