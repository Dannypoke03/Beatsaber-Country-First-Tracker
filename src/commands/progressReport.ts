import { Message } from "discord.js";
import { createQueryBuilder } from "typeorm";
import { BotConfig } from "../controllers/config";
import { User } from "../entity/User";
import { ICommand } from "../models/command";
var AsciiTable = require('ascii-table');

export default class ProgressReport implements ICommand {
    command: string[] = ["pr"];
    description: string = "Monthly progress report";

    canRun(msg: Message): boolean {
        return !!(msg.member.roles.cache as any).find(x => x.id == BotConfig.config.staffRoleId);
    }

    async run(msg: Message, args: string[]): Promise<void> {
        let users = await createQueryBuilder(User, "user")
            .orderBy("user.pp", "DESC")
            .limit(BotConfig.config.numPlayers)
            .getMany();
        var table = new AsciiTable('Progress Report');
        table
            .setHeading('Rank', 'Name', 'PP', 'Global');
        let message: string[] = [];
        for (let i = 0; i < users.length && i < 100; i++) {
            const user = users[i];
            table
                .addRow(`#${i + 1}`, user.playerName, user.pp.toFixed(2), `#${user.rank}`);
            if ((i + 1) % 25 == 0) {
                if (message.length > 0) {
                    message.push(table.toString().substring(message[message.length - 1].length));
                } else {
                    message.push(table.toString());
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
            if (toSend.length > 0) msg.channel.send(`\`\`\`${toSend}\`\`\``);
        }
        msg.delete();
    }
}