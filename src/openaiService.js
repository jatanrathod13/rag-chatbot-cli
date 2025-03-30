import OpenAI from 'openai';
import { getConfig } from './config.js';
import chalk from 'chalk';

// We will need supabaseService later for context fetching in generateResponse
// import { getDocumentDetails } from './supabaseService.js'; 

let openai = null;

/**
 * Initializes and returns the OpenAI client instance.
 * Ensures the client is created only once.
 * @returns {OpenAI} The OpenAI client instance.
 * @throws {Error} If configuration is missing.
 */
function getOpenAIClient() {
    if (openai) {
        return openai;
    }

    const config = getConfig();
    if (!config.openaiApiKey) {
        console.error(chalk.red('OpenAI API Key is missing in configuration.'));
        console.log(chalk.yellow('Please run `ragchat configure` first.'));
        throw new Error('Missing OpenAI configuration.');
    }

    openai = new OpenAI({
        apiKey: config.openaiApiKey
    });

    return openai;
}

/**
 * Generate embeddings for a text using OpenAI's embedding model
 * @param {string} text - The input text to generate embeddings for
 * @returns {Promise<number[]>} - The embedding vector
 * @throws {Error} If embedding generation fails.
 */
export async function generateEmbedding(text) {
    try {
        const client = getOpenAIClient();
        const response = await client.embeddings.create({
            model: 'text-embedding-ada-002',
            input: text
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error(chalk.red('Error generating embedding:'), error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

/**
 * Generate a response using OpenAI's chat completion with context
 * @param {string} query - The user query
 * @param {Array} relevantSections - Relevant document sections for context (from Supabase search)
 * @param {Function} getDocDetailsFn - Function to fetch document details (e.g., getDocumentDetails from supabaseService)
 * @returns {Promise<string>} - AI generated response
 * @throws {Error} If chat completion fails.
 */
export async function generateResponse(query, relevantSections, getDocDetailsFn) {
    try {
        const client = getOpenAIClient();
        let context = '';

        if (relevantSections && relevantSections.length > 0) {
            context = "Here are some relevant sections from documents:\n\n";
            // Use Promise.all for potentially faster context building if getDocDetailsFn is async
            const contextPromises = relevantSections.map(async (section) => {
                try {
                    // Fetch document details using the provided function
                    const document = await getDocDetailsFn(section.document_id);
                    if (document) {
                        return `From document "${document.name}":\n${section.content}\n\n`;
                    }
                    // Fallback if document details can't be fetched (no else needed)
                    return `From document ID ${section.document_id}:\n${section.content}\n\n`;
                } catch (docError) {
                    console.warn(chalk.yellow(`Could not fetch details for document ${section.document_id}: ${docError.message}`));
                    return `From document ID ${section.document_id} (details unavailable):\n${section.content}\n\n`;
                }
            });
            const contextSnippets = await Promise.all(contextPromises);
            context += contextSnippets.join('');
        } else {
            context = "No relevant context found in the documents.";
        }

        const response = await client.chat.completions.create({
            model: 'gpt-4o', // Or your preferred model
            messages: [
                { role: 'system', content: `You are a helpful assistant. Answer the user's question based on the provided context. If the context doesn't contain relevant information, say so and provide a general response based on your knowledge.` },
                { role: 'user', content: `Context:\n${context}\nQuestion: ${query}` }
            ],
            max_tokens: 1000 // Adjust as needed
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error(chalk.red('Error generating response:'), error);
        // Check for specific OpenAI API error types if needed
        throw new Error(`Failed to generate response: ${error.message}`);
    }
} 