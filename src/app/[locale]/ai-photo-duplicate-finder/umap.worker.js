import { UMAP } from 'umap-js';

self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'reduce_dimensions':
            try {
                const { embeddings, imageIds, options = {} } = data;
                
                if (!embeddings || embeddings.length === 0) {
                    self.postMessage({ 
                        status: 'error', 
                        data: 'No embeddings provided for UMAP reduction.' 
                    });
                    return;
                }

                self.postMessage({ status: 'starting', data: 'Starting UMAP reduction...' });

                // Convert embeddings to the format expected by UMAP
                const embeddingMatrix = embeddings.map(emb => Array.from(emb));
                
                // Log embedding dimensions for validation
                const firstEmbedding = embeddingMatrix[0];
                console.log(`UMAP Worker: Processing ${embeddings.length} embeddings, dimension: ${firstEmbedding?.length}`);
                
                // Validate dimensions (ViT-Base CLS token should be 768)
                if (firstEmbedding && firstEmbedding.length !== 768) {
                    console.error(`UMAP Worker: Wrong embedding dimension! Expected 768 (CLS token), got ${firstEmbedding.length}`);
                    throw new Error(`Invalid embedding dimensions: expected 768, got ${firstEmbedding.length}`);
                }
                
                // Configure UMAP with optimized parameters for 768-dimensional ViT CLS token embeddings
                const umapOptions = {
                    nComponents: 2,
                    // For 768D ViT embeddings, optimal neighbor count
                    nNeighbors: Math.min(30, Math.max(10, Math.floor(embeddings.length / 2))),
                    // Small minDist for tight clustering of similar images
                    minDist: 0.01,
                    // Moderate spread for good separation
                    spread: 1.5,
                    // Cosine metric is optimal for normalized ViT embeddings
                    metric: 'cosine',
                    // More epochs for better convergence with high-dimensional data
                    nEpochs: Math.min(500, Math.max(200, embeddings.length * 10)),
                    random: Math.random,
                    ...options
                };

                self.postMessage({ 
                    status: 'progress', 
                    data: `Configuring UMAP with ${embeddings.length} embeddings...` 
                });

                // Initialize and fit UMAP
                const umap = new UMAP(umapOptions);
                
                self.postMessage({ status: 'progress', data: 'Running UMAP reduction...' });
                
                const reducedEmbeddings = await umap.fitAsync(embeddingMatrix, (epochNumber) => {
                    // Send progress updates every 10 epochs
                    if (epochNumber % 10 === 0) {
                        self.postMessage({ 
                            status: 'progress', 
                            data: `UMAP epoch ${epochNumber}...`,
                            epoch: epochNumber
                        });
                    }
                });

                self.postMessage({ 
                    status: 'complete', 
                    data: {
                        reducedEmbeddings,
                        imageIds,
                        originalCount: embeddings.length
                    }
                });

            } catch (error) {
                console.error('UMAP Worker: Error during reduction:', error);
                self.postMessage({ 
                    status: 'error', 
                    data: `UMAP reduction failed: ${error.message}` 
                });
            }
            break;

        default:
            console.warn(`UMAP Worker: Unknown message type: ${type}`);
            self.postMessage({ 
                status: 'error', 
                data: `Unknown message type: ${type}` 
            });
    }
});

// Notify that worker is ready
self.postMessage({ 
    status: 'worker_ready', 
    data: 'UMAP worker initialized and ready.' 
}); 