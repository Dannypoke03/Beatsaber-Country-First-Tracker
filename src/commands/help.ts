import { Message } from "discord.js";
import { BotConfig } from "../controllers/config";
import { ICommand } from "../models/command";

export default class Help implements ICommand {
    command: string[] = ["help", "h", "info"];
    description: string = "Shows commands avaliable for the bot";

    canRun(msg: Message): boolean {
        return true;
    }

    async run(msg: Message, args: string[]): Promise<void> {
        let out = "**Avaliable Commands**\n";
        for (const command of BotConfig.commands) {
            if (command.canRun(msg, args)) {
                out += `\`${BotConfig.config.prefix}${command.command[0]} ${command.requiredArgs ? `<${command.requiredArgs.join('| ')}>` : ''}\` -> ${command.description}\n`;
            }
        }
        msg.channel.send(out);
    }
}