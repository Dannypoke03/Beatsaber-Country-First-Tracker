import { type } from "os";
import { Column, Entity, JoinColumn, OneToMany, PrimaryColumn } from "typeorm";
import { Score } from "./Score";

@Entity()
export class Leaderboard {
    @PrimaryColumn()
    id: number;

    @Column()
    songHash: string;

    @Column()
    songName: string;

    @Column()
    songSubName: string;

    @Column()
    songAuthorName: string;

    @Column()
    levelAuthorName: string;

    @Column({
        nullable: true,
    })
    maxScore: number;

    @Column()
    ranked: boolean;

    @Column()
    difficulty: string;

    @Column()
    qualified: boolean;

    @Column("float")
    stars: number;

    @Column()
    coverImage: string;

    @OneToMany(type => Score, Score => Score.leaderboard)
    @JoinColumn()
    scores: Score[];
}