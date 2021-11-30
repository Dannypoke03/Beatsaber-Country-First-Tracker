import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Leaderboard } from "./Leaderboard";
import { User } from "./User";

@Entity()
export class Score {
    @PrimaryColumn()
    id: number;

    @Column()
    rank: number;

    @Column()
    baseScore: number;

    @Column()
    modifiedScore: number;

    @Column("float")
    pp: number;

    @Column("float")
    weight: number;

    @Column()
    modifiers: string;

    @Column("float")
    multiplier: number;

    @Column()
    badCuts: number;

    @Column()
    missedNotes: number;

    @Column()
    maxCombo: number;

    @Column()
    fullCombo: boolean;

    @Column()
    hmd: number;

    @Column("datetime")
    timeSet: Date;

    @ManyToOne(type => User)
    @JoinColumn()
    user: User;

    @ManyToOne(type => Leaderboard)
    @JoinColumn()
    leaderboard: Leaderboard
}