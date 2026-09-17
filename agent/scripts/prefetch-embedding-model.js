const { pipeline } = require('@huggingface/transformers');

async function main() {
  console.log('Prefetching embedding model Xenova/all-MiniLM-L6-v2...');
  await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Embedding model cached.');
}

main().catch((err) => {
  console.error('Failed to prefetch embedding model:', err);
  process.exit(1);
});
