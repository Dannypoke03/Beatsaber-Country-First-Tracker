export interface IConfig {
    token: string;
    serverId: string;
    channelId: string;
    countries: string[];
    individualUsers: string[];
    numPlayers: number;
    staffRoleId: string;
    sheet: ISheetOptions;
    prefix: string;
}

export interface ISheetOptions {
    sheetId: string;
    mainSheetIndex: number;
    dataSheetIndex: number;
    firstSheetIndex: number;
}