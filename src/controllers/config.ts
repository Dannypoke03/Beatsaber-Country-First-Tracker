import { ICommand } from "../models/command";
import { IConfig } from "../models/config";
const fs = require('fs').promises;

let config: IConfig;
let commands: ICommand[] = [];

export class BotConfig {

    static async loadConfig() {
        let data = await fs.readFile(__dirname + '/../../config.json');
        config = JSON.parse(data);
    }

    static async loadCommands() {
        let files = await fs.readdir('./src/commands');
        for (const file of files) {
            let x = await import(`${__dirname}/../commands/${file}`);
            commands.push(new x.default);
        }
    }

    static readonly commands: ICommand[] = commands;

    static get config(): IConfig {
        return config;
    }

}