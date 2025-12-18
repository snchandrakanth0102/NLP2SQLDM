import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('⚠️ GEMINI_API_KEY is missing or invalid in semantic-cache.service.ts');
}

const genAI = new GoogleGenerativeAI(apiKey);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

interface CacheEntry {
    question: string;
    embedding: number[];
    sql: string;
    timestamp: number;
}

export class SemanticCacheService {
    private cache: CacheEntry[] = [];
    private cacheFilePath: string;
    private similarityThreshold: number;
    private maxCacheSize: number;
    private lastModified: number = 0;

    constructor() {
        this.cacheFilePath = path.join(process.cwd(), 'cache.json');
        this.similarityThreshold = parseFloat(process.env.SEMANTIC_CACHE_THRESHOLD || '0.9');
        this.maxCacheSize = parseInt(process.env.SEMANTIC_CACHE_MAX_SIZE || '1000', 10);
        this.initialize();
    }

    private initialize() {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const data = fs.readFileSync(this.cacheFilePath, 'utf-8');
                this.cache = JSON.parse(data);
                this.lastModified = fs.statSync(this.cacheFilePath).mtimeMs;
                console.log(`✅ Semantic Cache loaded: ${this.cache.length} entries.`);
            } else {
                console.log('ℹ️ No existing cache file found. Starting with empty cache.');
            }
        } catch (error) {
            console.error('⚠️ Failed to load semantic cache:', error);
            this.cache = [];
        }
    }

    private reloadIfModified() {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const stats = fs.statSync(this.cacheFilePath);
                if (stats.mtimeMs > this.lastModified) {
                    console.log('🔄 Cache file modified externally, reloading...');
                    const data = fs.readFileSync(this.cacheFilePath, 'utf-8');
                    this.cache = JSON.parse(data);
                    this.lastModified = stats.mtimeMs;
                    console.log(`✅ Cache reloaded: ${this.cache.length} entries.`);
                }
            }
        } catch (error) {
            console.error('⚠️ Failed to reload cache:', error);
        }
    }

    private saveCache() {
        try {
            fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2));
        } catch (error) {
            console.error('⚠️ Failed to save semantic cache:', error);
        }
    }

    private async getEmbedding(text: string): Promise<number[]> {
        try {
            const result = await embeddingModel.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    public async findSimilar(question: string): Promise<string | null> {
        try {
            this.reloadIfModified();
            console.log(`🔍 Checking cache for: "${question}"`);
            const embedding = await this.getEmbedding(question);

            let bestMatch: CacheEntry | null = null;
            let maxSimilarity = -1;

            for (const entry of this.cache) {
                const similarity = this.cosineSimilarity(embedding, entry.embedding);
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    bestMatch = entry;
                }
            }

            console.log(`📊 Max Similarity: ${maxSimilarity.toFixed(4)}`);

            if (maxSimilarity >= this.similarityThreshold && bestMatch) {
                console.log('✅ Cache HIT!');
                return bestMatch.sql;
            }

            console.log('❌ Cache MISS');
            return null;
        } catch (error) {
            console.error('Error in findSimilar:', error);
            return null; // Fail safe to LLM
        }
    }

    public async cacheResult(question: string, sql: string): Promise<void> {
        try {
            const embedding = await this.getEmbedding(question);
            const newEntry: CacheEntry = {
                question,
                embedding,
                sql,
                timestamp: Date.now()
            };

            this.cache.push(newEntry);

            // Enforce Max Size (Remove oldest)
            if (this.cache.length > this.maxCacheSize) {
                this.cache.sort((a, b) => a.timestamp - b.timestamp); // Sort by oldest
                const removed = this.cache.shift(); // Remove oldest
                console.log(`🗑️ Cache full (${this.maxCacheSize}), removed oldest entry: "${removed?.question}"`);
            }

            this.saveCache();
            console.log(`💾 Cached new result for: "${question}"`);
        } catch (error) {
            console.error('Error caching result:', error);
        }
    }

    public getStats() {
        return {
            totalEntries: this.cache.length,
            cachePath: this.cacheFilePath,
            maxSize: this.maxCacheSize,
            threshold: this.similarityThreshold
        };
    }

    public clearCache() {
        this.cache = [];
        this.saveCache();
        console.log('🧹 Semantic Cache cleared manually.');
        return { message: 'Cache cleared successfully' };
    }
}

export const semanticCache = new SemanticCacheService();
