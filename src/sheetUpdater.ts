import { baliRanked, config, savedData } from "./types";
import fetch from 'node-fetch';

const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');



export class sheetUpdater {

    static async upateSheet(data: savedData, config: config) {
        try {
            let creds = JSON.parse(fs.readFileSync('./creds.json'));
            const doc = new GoogleSpreadsheet(config.sheet.sheetId);
            await doc.useServiceAccountAuth({
                client_email: creds.client_email,
                private_key: creds.private_key,
            });
            await doc.loadInfo();
            const mainDataSheet = doc.sheetsByIndex[config.sheet.dataSheetIndex];

            let sheetUsers = [];
            let i = 0;
            for (const user of data.users) {
                sheetUsers.push([
                    `=HYPERLINK("https://scoresaber.com/u/${user.userId}","${user.ssData.playerInfo.playerName}")`,
                    (user.ssData.scoreStats.averageRankedAccuracy / 100).toFixed(4),
                    user.ssData.playerInfo.pp,
                    user.ssData.playerInfo.rank,
                    user.ssData.scoreStats.totalPlayCount,
                    user.topScore?.pp,
                    `${user.topScore?.songName} - ${user.topScore?.songAuthorName}`,
                    (i + 1),
                    user.ssData.scoreStats.totalScore,
                    user.topScore?.difficultyRaw.split("_")[1]
                ]);
                i++;
            }

            console.log("Updating spreadsheet...");
            await mainDataSheet.clear();
            await mainDataSheet.setHeaderRow(["Data :)"]);
            await mainDataSheet.addRows(sheetUsers);

            // firsts info
            let sheetInfo = [];
            let res = await fetch(`https://scoresaber.balibalo.xyz/ranked`);
            let ranked: { list: baliRanked[] } = await res.json();
            for (const score of data.scores) {
                let user = data.users.find(x => x.userId === score.userId);
                let song = ranked.list.find(x => x.uid === score.leaderboardId);
                sheetInfo.push([
                    user ? `=HYPERLINK("https://scoresaber.com/u/${user.userId}","${user.ssData.playerInfo.playerName}")` : `=HYPERLINK("https://scoresaber.com/u/${score.userId}","${score.userId}")`,
                    `${score.songName} - ${score.songAuthorName}`,
                    score.levelAuthorName,
                    (score.unmodififiedScore / score.maxScore).toFixed(4),
                    score.unmodififiedScore,
                    score.pp,
                    song.stars,
                    song.bpm,
                    song.noteCount,
                    song.njs,
                    song.durationSeconds,
                    song.beatSaverKey,
                    score.rank,
                    `=HYPERLINK("https://scoresaber.com/leaderboard/${score.leaderboardId}","Leaderboard")`,
                    dateStandard(new Date(score.timeSet)),
                    score.difficultyRaw.split("_")[1]
                ]);
            }
            const firstSheet = doc.sheetsByIndex[config.sheet.firstSheetIndex];
            await firstSheet.clear();
            await firstSheet.setHeaderRow(["Player", "Song", "Mapper", "Acc", "Score", "PP", "Stars", "BPM", "Note Count", "NJS", "Duration", "Key", "Rank", "Link", "Date", "Diff"]);
            await firstSheet.addRows(sheetInfo);

            // Update last updated time
            const mainSheet = doc.sheetsByIndex[config.sheet.mainSheetIndex];
            await mainSheet.loadCells('A1:A1');
            let a1 = mainSheet.getCell(0, 0);
            let now = new Date();
            a1.value = `Last Updated: ${dateStandard(now)}`;
            await mainSheet.saveUpdatedCells();
            console.log("Spreadsheet Updadted");
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