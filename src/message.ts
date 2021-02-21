import { MessageEmbed } from "discord.js";
import { firstLeadboard, Score, user } from "./types";
var AsciiTable = require('ascii-table');
import Discord from 'discord.js';

const colours = {
    "ExpertPlus": "#8f48db",
    "Expert": "#bf2a42",
    "Hard": "#ff6347",
    "Normal": "#59b0f4",
    "Easy": "#3cb371"
}

export class messageController {

    static async firstMessage(user: user, score: Score, channel, oldScore?: Score) {
        // let user = curData.users.find(x => x.userId == userId);
        if (!user) return;
        let colour = colours[score.difficultyRaw.split("_")[1]];
        const embed = new MessageEmbed()
            .setColor(colour)
            .setTitle(`**${user.ssData.playerInfo.playerName}** set a new **#1 OCE Score**`)
            .setDescription(`[${user.ssData.playerInfo.playerName}'s Profile](https://scoresaber.com/u/${user.userId})`)
            .setThumbnail(`https://scoresaber.com/imports/images/usr-avatars/${user.userId}.jpg`)
            .addFields(
                { name: `${score.songAuthorName} - ${score.songName}`, value: `**Rank:** #${score.rank}\n**PP:** ${score.pp.toFixed(2)}\n**Accuracy:** ${(score.score / score.maxScore * 100).toFixed(2)}%\n[Leadboard](https://scoresaber.com/leaderboard/${score.leaderboardId})` }
            )
            .setImage(`https://scoresaber.com/imports/images/songs/${score.songHash}.png`)
            .setTimestamp(new Date(score.timeSet));
        if (oldScore) {
            embed.addField('Previous Score', `**Rank:** #${oldScore.rank}\n**PP:** ${oldScore.pp.toFixed(2)}\n**Accuracy:** ${(oldScore.score / oldScore.maxScore * 100).toFixed(2)}%\n[Leadboard](https://scoresaber.com/leaderboard/${oldScore.leaderboardId})`)
        }
        channel.send(embed);
    }

    static async firstLeaderboardMessage(data: firstLeadboard[], channel) {
        data.sort((a, b) => {
            return b.count - a.count;
        })
        var table = new AsciiTable('First Leaderboard');
        table
            .setHeading('Rank', 'Name', '#1\'s');
        for (let i = 0; i < data.length && i < 25; i++) {
            const user = data[i];
            if (table.toString().length >= 1700) {
                channel.send(`\`\`\`${table.toString()}\`\`\``);
                var table = new AsciiTable('First Leaderboard');
                table
                    .setHeading('Rank', 'Name', '#1\'s');
            }
            table
                .addRow(`#${i + 1}`, user.user.ssData.playerInfo.playerName, user.count);
        }
        channel.send(`\`\`\`${table.toString()}\`\`\``);
    }

    static async accLeaderboardMessage(data: user[], channel) {
        data.sort((a, b) => {
            return b.ssData.scoreStats.averageRankedAccuracy - a.ssData.scoreStats.averageRankedAccuracy;
        })
        var table = new AsciiTable('Accuracy Leaderboard');
        table
            .setHeading('Acc Rank', 'Name', 'Acc', 'Global Rank');
        for (let i = 0; i < data.length && i < 25; i++) {
            const user = data[i];
            if (table.toString().length >= 1700) {
                channel.send(`\`\`\`${table.toString()}\`\`\``);
                var table = new AsciiTable('Accuracy Leaderboard');
                table
                    .setHeading('Acc Rank', 'Name', 'Acc', 'Global Rank');
            }
            table
                .addRow(`#${i + 1}`, user.ssData.playerInfo.playerName, user.ssData.scoreStats.averageRankedAccuracy.toFixed(2) + "%", `#${user.ssData.playerInfo.rank}`);
        }
        channel.send(`\`\`\`${table.toString()}\`\`\``);
    }

    static snipeMessage(data, userName: string, channel) {
        let buffer = Buffer.from(JSON.stringify(data));
        const file = new Discord.MessageAttachment(buffer, `${userName}-firsts.bplist`);
        channel.send({ files: [file] });
    }

}