import { MessageEmbed } from "discord.js";
import { firstLeadboard, user } from "../types";
var AsciiTable = require('ascii-table');
import Discord from 'discord.js';
import { Score } from "../entity/Score";

const colours = {
    "ExpertPlus": "#8f48db",
    "Expert": "#bf2a42",
    "Hard": "#ff6347",
    "Normal": "#59b0f4",
    "Easy": "#3cb371"
}

export class messageController {

    static async firstMessage(score: Score, oldScore?: Score): Promise<MessageEmbed> {
        if (!score) return;
        let colour = colours[score.leaderboard.difficulty.split("_")[1]];
        const embed = new MessageEmbed()
            .setColor(colour)
            .setTitle(`**${score.user.playerName}** set a new **#1 OCE Score**`)
            .setDescription(`[${score.user.playerName}'s Profile](https://scoresaber.com/u/${score.user.userId})`)
            .setThumbnail(`https://scoresaber.com/imports/images/usr-avatars/${score.user.userId}.jpg`)
            .addFields({
                name: `${score.leaderboard.songAuthorName} - ${score.leaderboard.songName}`,
                value: `**Rank:** #${score.rank}\n**PP:** ${score.pp.toFixed(2)}\n**Accuracy:** ${(score.modifiedScore / score.leaderboard.maxScore * 100).toFixed(2)}%\n${score.fullCombo ? "**Full Combo!**" : `**Mistakes:** ${score.badCuts + score.missedNotes}`}\n[Leadboard](https://scoresaber.com/leaderboard/${score.leaderboard.id})`
            })
            .setImage(score.leaderboard.coverImage)
            .setTimestamp(new Date(score.timeSet));
        if (oldScore) {
            embed.addField('Previous Score', `${oldScore.user ? `**Set By:** ${oldScore.user.playerName}\n` : ''}**Rank:** #${oldScore.rank}\n**PP:** ${oldScore.pp.toFixed(2)}\n**Accuracy:** ${(oldScore.baseScore / score.leaderboard.maxScore * 100).toFixed(2)}%\n${score.fullCombo ? "**Full Combo!**" : `**Mistakes:** ${score.badCuts + score.missedNotes}`}`);
        }
        return embed;
        // channel.send(embed);
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

    static async progressReportMessage(data: user[], channel) {
        data.sort((a, b) => {
            return b.ssData.playerInfo.pp - a.ssData.playerInfo.pp;
        })
        var table = new AsciiTable('Progress Report');
        table
            .setHeading('Rank', 'Name', 'PP', 'Global');
        let msg: string[] = [];
        for (let i = 0; i < data.length && i < 100; i++) {
            const user = data[i];
            table
                .addRow(`#${i + 1}`, user.ssData.playerInfo.playerName, user.ssData.playerInfo.pp.toFixed(2), `#${user.ssData.playerInfo.rank}`);
            if ((i + 1) % 25 == 0) {
                if (msg.length > 0) {
                    msg.push(table.toString().substring(msg[msg.length - 1].length));
                } else {
                    msg.push(table.toString());
                }
            }
        }
        let rows: string[] = table.toString().split('\n');
        for (let i = 0; i < 4; i++) {
            let toSend = "";
            if (i == 0) {
                toSend = rows.filter((x, j) => j - 5 < 25).join("\n");
            } else {
                toSend = rows.filter((x, j) => (j - 5 < (i * 25) + 25) && (j - 5 >= i * 25)).join("\n");
            }
            channel.send(`\`\`\`${toSend}\`\`\``);
        }
    }

    static snipeMessage(data, userName: string, channel) {
        let buffer = Buffer.from(JSON.stringify(data));
        const file = new Discord.MessageAttachment(buffer, `${userName}-firsts.bplist`);
        channel.send({ files: [file] });
    }

}