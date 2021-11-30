import { Message } from "discord.js";

export interface ICommand {
    command: string[];
    description: string;
    requiredArgs?: string[];

    run(msg: Message, args: string[]): Promise<void>;

    canRun(msg: Message, args?: string[]): boolean;
}