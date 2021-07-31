import { config, savedData } from "./types";

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
            const sheet = doc.sheetsByIndex[config.sheet.dataSheetIndex];

            let sheetUsers = [];
            let i = 0;
            for (const user of data.users) {
                sheetUsers.push([
                    `=HYPERLINK("https://scoresaber.com/u/${user.userId}","${user.ssData.playerInfo.playerName}")`,
                    (user.ssData.scoreStats.averageRankedAccuracy / 100).toFixed(2),
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
            await sheet.clear();
            await sheet.setHeaderRow(["Data :)"]);
            await sheet.addRows(sheetUsers);
            // Update last updated time
            const mainSheet = doc.sheetsByIndex[config.sheet.mainSheetIndex];
            await mainSheet.loadCells('A1:A1');
            let a1 = mainSheet.getCell(0, 0);
            let now = new Date();
            a1.value = `Last Updated: ${now.toString()}`;
            await mainSheet.saveUpdatedCells();
            console.log("Spreadsheet Updadted");
        } catch (error) {
            console.error("Sheet update failed");
        }
    }

}