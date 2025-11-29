export class PaymentResponseDto {
  isSuccess!: boolean;
  message!: string;
  orderId!: string;
  amount!: number;
  rspCode?: string;
  transactionDate?: string;
}
