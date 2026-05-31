import { FieldDto } from "./field.dto";

export class FieldResponseDto {
    data!: FieldDto[];
    metadata!: {
        total: number,
        page: number,
        limit: number,
        lastPage: number,
        isSuggestion: boolean,
        suggestMessage: string
    }
}