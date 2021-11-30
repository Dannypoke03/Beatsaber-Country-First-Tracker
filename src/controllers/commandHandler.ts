import { Message } from "discord.js";
import { BotConfig } from "./config";

export class commandHandler {

    static handle(message: Message) {
        if (!commandHandler.isCommand(message)) return;
        const args = message.content.slice(BotConfig.config.prefix.length).trim().split(' ');
        const commandLabel = args.shift().toLowerCase();

        let command = BotConfig.commands.find(cmd => cmd.command.includes(commandLabel));
        if (!command) return;

        if (command.canRun(message, args)) {
            command.run(message, args).catch(console.error);
        }
    }

    static isCommand(message: Message) {
        return message.content.startsWith(BotConfig.config.prefix);
    }

}