import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript";
import { Document } from "./Document";

@Table
export class Base extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @HasMany(() => Document)
  documents!: Document[];
}
