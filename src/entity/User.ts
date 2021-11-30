import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, OneToMany, JoinColumn } from "typeorm";
import { Score } from "./Score";

@Entity()
export class User {

    @PrimaryColumn()
    userId: string;

    @Column()
    playerName: string;

    @Column()
    avatar: string;

    @Column({
        length: 2
    })
    country: string;

    @Column("float")
    pp: number;

    @Column()
    rank: number;

    @Column()
    countryRank: number;

    @Column("bigint")
    totalScore: number;

    @Column()
    totalRankedScore: number;

    @Column("float")
    averageRankedAccuracy: number;

    @Column()
    PlayCount: number;

    @Column()
    rankedPlayCount: number;

    @OneToMany(type => Score, score => score.user)
    @JoinColumn()
    scores: Score[];
}
