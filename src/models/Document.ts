import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Base } from "./Base";

@Table
export class Document extends Model {
  @ForeignKey(() => Base)
  @Column(DataType.INTEGER)
  baseId!: number;

  @BelongsTo(() => Base)
  base!: Base;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  title!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  filePath!: string;
}
