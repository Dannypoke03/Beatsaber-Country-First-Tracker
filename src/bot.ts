import { Client, Intents, Message } from 'discord.js';
import { config } from './types';
// import { leaderboardController } from './leadboard';
import { messageController } from './controllers/message';
import { debugLogger } from './debug.controller';
import { BotConfig } from './controllers/config';
import { commandHandler } from './controllers/commandHandler';
import { createConnection } from 'typeorm';
import { leaderboardController } from './controllers/Leaderboard';

const prefix = '~';

let config: config;
// let leaderboard: leaderboardController;



async function onMessage(message: Message) {
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift().toLowerCase();

    // switch (command) {
    //     case 'update':
    //         if (message.member.roles.cache.find(x => x.id == config.staffRoleId) && leaderboard) {
    //             message.channel.send('Updating, this may take a while');
    //             await leaderboard.updateScores();
    //             message.channel.send('User Update complete');
    //         }
    //         break;
    //     case 'pr':
    //         if (message.member.roles.cache.find(x => x.id == config.staffRoleId)) {
    //             message.delete();
    //             leaderboard.progressReport(message.channel);
    //         }
    //         break;
    //     case 'fl':
    //         messageController.firstLeaderboardMessage(await leaderboard.firstLeadboard(), message.channel);
    //         break;
    //     case 'sheet-update':
    //         if (message.member.roles.cache.find(x => x.id == config.staffRoleId) && leaderboard) {
    //             message.channel.send('Updating Spreadsheet...');
    //             await leaderboard.updateSheet();
    //             message.channel.send('Spreadsheet Updated');
    //         }
    //         break;
    //     case 'update-top':
    //         if (message.member.roles.cache.find(x => x.id == config.staffRoleId) && leaderboard) {
    //             message.channel.send('Updating Top Scores...');
    //             await leaderboard.updateTopScores();
    //         }
    //         break;
    //     case 'snipe':
    //         if (!args.length) {
    //             return message.channel.send(`You didn't provide a userId, ${message.author}!`);
    //         }
    //         leaderboard.snipeUser(args[0], message.channel);
    //         break;
    //     case 'acc':
    //         leaderboard.accleaderboard(message.channel)
    //         break;
    //     case 'help':
    //         let string = "**Avaliable Commands**\n`~fl` -> Returns the first leaderboard\n`~snipe <userId>` -> Returns a playlist to snipe the given player\n`~acc` -> Returns the accuracy leaderboard";
    //         message.channel.send(string);
    //         break;
    //     default:
    //         break;
    // }
}

const client = new Client();

async function onReady() {
    console.info('Bot Ready');
    // leaderboard = new leaderboardController('./data.json', config, client);
    // leaderboard.init();
    createConnection().catch(error => console.log(error));
    new leaderboardController(client);
}

client.once('ready', onReady);
client.on('message', commandHandler.handle);

async function setConfig() {
    await BotConfig.loadConfig();
    await BotConfig.loadCommands();
}

async function init() {
    await setConfig();
    await client.login(BotConfig.config.token || 'NO_TOKEN_PROVIDED').then(async () => {
        console.info('[Init] Connected to discord.');
    });
}

new debugLogger();

init();