/** Optional future vector backend. DeepSeek's documented API currently uses semantic JSON evaluation instead. */
export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  embed(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
