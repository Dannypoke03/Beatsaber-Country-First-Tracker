import axios from "axios";
import { createQueryBuilder } from "typeorm";
import { Leaderboard } from "../entity/Leaderboard";
import { User } from "../entity/User";
import { baliRanked } from "../types";
import { BotConfig } from "./config";

const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');



export class sheetUpdater {

    static async upateSheet() {
        try {
            let creds = JSON.parse(fs.readFileSync(__dirname + '/../../creds.json'));
            const doc = new GoogleSpreadsheet(BotConfig.config.sheet.sheetId);
            await doc.useServiceAccountAuth({
                client_email: creds.client_email,
                private_key: creds.private_key,
            });
            await doc.loadInfo();
            const mainDataSheet = doc.sheetsByIndex[BotConfig.config.sheet.dataSheetIndex];

            let sheetUsers = [];
            let i = 0;
            let users = await createQueryBuilder(User, "user")
                .orderBy("user.pp", "DESC")
                .leftJoinAndSelect("user.scores", "scores")
                .leftJoin("user.scores", "scores2", "scores2.pp > scores.pp")
                .leftJoinAndSelect("scores.leaderboard", "leaderboard")
                .where("scores2.id IS NULL")
                .limit(BotConfig.config.numPlayers)
                .getMany();
            for (const user of users) {
                sheetUsers.push([
                    `=HYPERLINK("https://scoresaber.com/u/${user.userId}","${user.playerName.replace(/"/g, '""')}")`,
                    (user.averageRankedAccuracy / 100).toFixed(4),
                    user.pp,
                    user.rank,
                    user.PlayCount,
                    user.scores[0].pp,
                    `${user.scores[0].leaderboard.songName} - ${user.scores[0].leaderboard.songAuthorName}`,
                    (i + 1),
                    user.totalScore,
                    user.scores[0].leaderboard.difficulty.split("_")[1]
                ]);
                i++;
            }
            console.info("Updating spreadsheet...");
            await mainDataSheet.clear();
            await mainDataSheet.setHeaderRow(["Data :)"]);
            await mainDataSheet.addRows(sheetUsers);

            // firsts info
            let sheetInfo = [];
            let res = await axios(`https://scoresaber.balibalo.xyz/ranked`);
            let leaderboards = await createQueryBuilder(Leaderboard, "leaderboard")
                .leftJoinAndSelect("leaderboard.scores", "scores")
                .leftJoin("leaderboard.scores", "scores2", "scores2.pp > scores.pp")
                .leftJoinAndSelect("scores.user", "user")
                .where("scores2.id IS NULL")
                .getMany();
            let ranked: { list: baliRanked[] } = res.data;
            for (const leaderboard of leaderboards) {
                let user = leaderboard.scores[0].user;
                let score = leaderboard.scores[0];
                let song = ranked.list.find(x => x.uid === leaderboard.id);
                if (!song) continue;
                sheetInfo.push([
                    `=HYPERLINK("https://scoresaber.com/u/${user.userId}","${user.playerName.replace(/"/g, '""')}")`,
                    `${leaderboard.songName} - ${leaderboard.songAuthorName}`,
                    leaderboard.levelAuthorName,
                    (score.modifiedScore / leaderboard.maxScore).toFixed(4),
                    score.modifiedScore,
                    score.pp,
                    song.stars,
                    song.bpm,
                    song.noteCount,
                    song.njs,
                    song.durationSeconds,
                    song.beatSaverKey,
                    score.rank,
                    `=HYPERLINK("https://scoresaber.com/leaderboard/${leaderboard.id}","Leaderboard")`,
                    dateStandard(new Date(score.timeSet)),
                    leaderboard.difficulty.split("_")[1]
                ]);
            }
            const firstSheet = doc.sheetsByIndex[BotConfig.config.sheet.firstSheetIndex];
            await firstSheet.clear();
            await firstSheet.setHeaderRow(["Player", "Song", "Mapper", "Acc", "Score", "PP", "Stars", "BPM", "Note Count", "NJS", "Duration", "Key", "Rank", "Link", "Date", "Diff"]);
            await firstSheet.addRows(sheetInfo);

            // Update last updated time
            const mainSheet = doc.sheetsByIndex[BotConfig.config.sheet.mainSheetIndex];
            await mainSheet.loadCells('A1:A1');
            let a1 = mainSheet.getCell(0, 0);
            let now = new Date();
            a1.value = `Last Updated: ${dateStandard(now)}`;
            await mainSheet.saveUpdatedCells();
            console.info("Spreadsheet Updadted");
        } catch (error) {
            console.error(error);
            console.error("Sheet update failed");
        }
    }

}

function dateStandard(date: Date) {
    let options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: "Australia/Melbourne"
    };
    try {
        return new Intl.DateTimeFormat("default", options).format(date);
    } catch (error) {
        return "-";
    }
}