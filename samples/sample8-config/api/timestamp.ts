export const TimestampApi = "timestamp";

export interface TimestampApi {
    issue(data: any): TimestampResult;
    verify(input: TimestampResult): TimestampResult;
}

export interface TimestampResult {
    id: string;
    timestamp: string;
    hash: string;
    signature: string;
    data: any;
    valid?: boolean;
    error?: string;
}
