import { MessageEmbed } from "discord.js";
import { Score, user } from "./types";

const colours = {
    "ExpertPlus": "#8f48db",
    "Expert": "#bf2a42",
    "Hard": "#ff6347",
    "Normal": "#59b0f4",
    "Easy": "#3cb371"
}

export class messageController {

    static async sendMessage(user: user, score: Score, channel, oldScore?: Score) {
        // let user = curData.users.find(x => x.userId == userId);
        if (!user) return;
        let colour = colours[score.difficultyRaw.split("_")[1]];
        const embed = new MessageEmbed()
            .setColor(colour)
            .setTitle(`**${user.ssData.playerName}** set a new **#1 OCE Score**`)
            .setDescription(`[${user.ssData.playerName}'s Profile](https://scoresaber.com/u/${user.userId})`)
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

}