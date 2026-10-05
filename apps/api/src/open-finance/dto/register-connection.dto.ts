import { IsUUID } from 'class-validator';

export class RegisterConnectionDto {
  /** Pluggy Item ID returned by the Connect widget on success. */
  @IsUUID()
  itemId!: string;
}
