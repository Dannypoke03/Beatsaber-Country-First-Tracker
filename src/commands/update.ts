import { Message } from "discord.js";
import { ICommand } from "../models/command";

export default class Update implements ICommand {
    command: string[] = ["update"];
    description: string = "Updates the data stored, and updates the spreadsheet";

    canRun(msg: Message): boolean {
        return false;
    }

    async run(msg: Message, args: string[]): Promise<void> {

    }
}