declare module 'google-trends-api' {
  // Basic response interfaces
  export interface GoogleTrendsResponse {
    default: Record<string, unknown>;
  }

  // Related Queries response
  export interface RelatedQueriesResults {
    default: {
      rankedList: Array<{
        rankedKeyword: Array<{
          query: string;
          value: number;
          formattedValue: string;
          link: string;
        }>;
      }>;
    };
  }

  // Option interfaces
  export interface TrendsApiOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string | string[];
    hl?: string;
    timezone?: number;
    category?: number;
    property?: string;
  }

  // Function definitions
  export function interestOverTime(options: TrendsApiOptions, cb?: (err: Error, results: string) => void): Promise<string>;
  export function interestByRegion(options: TrendsApiOptions, cb?: (err: Error, results: string) => void): Promise<string>;
  export function relatedQueries(options: TrendsApiOptions, cb?: (err: Error, results: string) => void): Promise<string>;
  export function relatedTopics(options: TrendsApiOptions, cb?: (err: Error, results: string) => void): Promise<string>;
  export function dailyTrends(options: { geo: string; trendDate?: Date; hl?: string; }, cb?: (err: Error, results: string) => void): Promise<string>;
  export function realTimeTrends(options: { geo: string; category?: string; hl?: string; }, cb?: (err: Error, results: string) => void): Promise<string>;
  export function autoComplete(options: { keyword: string; hl?: string; }, cb?: (err: Error, results: string) => void): Promise<string>;
} 