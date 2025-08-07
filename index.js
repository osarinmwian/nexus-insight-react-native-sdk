// Auto-initialization requires API key
import NexusInsight from './lib/index.js';

// Export class only - requires API key for initialization
export default NexusInsight;

// Helper function to create instance with API key
export const createAnalytics = (apiKey: string) => {
  return new NexusInsight({ apiKey });
};