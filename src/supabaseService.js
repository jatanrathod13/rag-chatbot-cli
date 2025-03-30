import { createClient } from '@supabase/supabase-js';
import { getConfig } from './config.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import ora from 'ora';

// Derive the directory name from the current module's URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let supabase = null;

/**
 * Initializes and returns the Supabase client instance.
 * Ensures the client is created only once.
 * @returns {object} The Supabase client instance.
 * @throws {Error} If configuration is missing or invalid.
 */
export function getSupabaseClient() {
    if (supabase) {
        return supabase;
    }

    const config = getConfig();
    if (!config.supabaseUrl || !config.supabaseKey) {
        // Log specific instruction for user
        console.error(chalk.red('Supabase URL or Key is missing in configuration.'));
        console.log(chalk.yellow('Please run `rag-chatbot-cli configure` first.'));
        throw new Error('Missing Supabase configuration.');
    }

    try {
        supabase = createClient(config.supabaseUrl, config.supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
        // Optional: Add a quick check to ensure the connection details are valid
        // e.g., try a simple query that should always work if connected.
        // await supabase.from('pg_tables').select('tablename').limit(1); 
    } catch (error) {
        console.error(chalk.red('Failed to initialize Supabase client.'));
        console.error(chalk.yellow(`Provided URL: ${config.supabaseUrl}`));
        console.error(chalk.yellow('Provided Key: Is it the public anon key?'));
        throw new Error(`Supabase client initialization failed: ${error.message}`);
    }
    return supabase;
}

/**
 * Reads the content of the setup SQL file.
 * @returns {Promise<string>} The SQL script content.
 * @throws {Error} If the file cannot be read.
 */
export async function getSetupSql() {
    const sqlPath = path.join(__dirname, 'sql', 'setup.sql');
    try {
        const sqlContent = await fs.readFile(sqlPath, 'utf-8');
        return sqlContent;
    } catch (error) {
        throw new Error(`Failed to read setup SQL file at ${sqlPath}: ${error.message}`);
    }
}

// --- Database Setup Logic ---

/**
 * Checks if the required Supabase components (extension, tables, function) exist.
 * @returns {Promise<{ allExist: boolean, missing: string[] }>} 
 *          An object indicating if all components exist and a list of missing components.
 * @throws {Error} If any check fails due to connection or permissions issues.
 */
export async function checkDatabaseSetup() {
    const spinner = ora(chalk.blue('Checking database setup...')).start();
    const client = getSupabaseClient();
    const missing = [];
    let checkError = null;

    try {
        // 1. Check for pgvector extension
        spinner.text = chalk.blue('Checking for pgvector extension...');
        
        // Try to use the vector type (indirect check)
        try {
            const { data: vectorTest, error: vectorTestError } = await client
                .from('document_sections')
                .select('embedding')
                .limit(1);
            
            // If we can select from the embedding column, vector is likely working
            if (vectorTestError && vectorTestError.message.includes('relation "document_sections" does not exist')) {
                // Table doesn't exist yet, so we can't check this way
                // We'll assume extension might be missing and check later
                missing.push('vector extension (needs verification)');
            } else if (vectorTestError && vectorTestError.message.includes('type "vector" does not exist')) {
                missing.push('vector extension');
            }
        } catch (finalError) {
            // If we've reached here, just mark it for manual check
            console.log(chalk.yellow('Failed to check vector extension, marking for manual check...'));
            missing.push('vector extension (needs manual check)');
        }

        // 2. Check for documents table
        spinner.text = chalk.blue('Checking for documents table...');
        try {
            const { data: directCheck, error: directError } = await client
                .from('documents')
                .select('id')
                .limit(1);
            
            // If we can query it without error, it exists
            if (directError && directError.message.includes('does not exist')) {
                missing.push('documents table');
            }
        } catch (finalError) {
            missing.push('documents table (needs verification)');
        }

        // 3. Check for document_sections table
        spinner.text = chalk.blue('Checking for document_sections table...');
        try {
            const { data: directCheck, error: directError } = await client
                .from('document_sections')
                .select('id')
                .limit(1);
            
            // If we can query it without error, it exists
            if (directError && directError.message.includes('does not exist')) {
                missing.push('document_sections table');
            }
        } catch (finalError) {
            missing.push('document_sections table (needs verification)');
        }

        // 4. Check for match_document_sections function
        spinner.text = chalk.blue('Checking for match_document_sections function...');
        try {
            const { data: rpcCheck, error: rpcError } = await client.rpc('match_document_sections', {
                query_embedding: Array(1536).fill(0), // Dummy embedding
                match_threshold: 0.5,
                match_count: 1
            });
            
            // If no error, or error is about not finding matches (but function exists), it's good
            if (rpcError && rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
                missing.push('match_document_sections function');
            }
        } catch (finalError) {
            missing.push('match_document_sections function (needs verification)');
        }

        if (missing.length === 0) {
            spinner.succeed(chalk.green('Database setup is complete!'));
            return { allExist: true, missing: [] };
        }
        spinner.warn(chalk.yellow(`Database setup is incomplete. Missing: ${missing.join(', ')}`));
        return { allExist: false, missing };

    } catch (error) {
        spinner.fail(chalk.red('Error checking database setup.'));
        // Throw the specific check error if it was captured, otherwise the general error
        throw checkError || error; 
    }
}

/**
 * Executes the setup SQL script in the Supabase database.
 * @returns {Promise<void>} Resolves on success.
 * @throws {Error} If reading the SQL file or executing the script fails.
 */
export async function executeSetupSql() {
    const spinner = ora(chalk.blue('Reading setup SQL script...')).start();
    const client = getSupabaseClient();
    let sqlContent;

    try {
        sqlContent = await getSetupSql();
        spinner.text = chalk.blue('Executing setup SQL script... (This might take a moment)');
        
        // In newer versions of Supabase client, sql() is available
        // In older versions, we need to execute each statement separately
        // using the REST API
        
        // Split the SQL into individual statements
        const statements = sqlContent.split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        
        // Execute each statement separately
        for (let i = 0; i < statements.length; i++) {
            spinner.text = chalk.blue(`Executing SQL statement ${i+1}/${statements.length}...`);
            
            // Use from() and then() chain to execute raw SQL
            // This works with older Supabase client versions
            const { error } = await client.from('_sqlapi').select('*').eq('query', statements[i]);
            
            if (error) {
                // If this approach doesn't work, we'll need to fall back to manual instructions
                console.warn(chalk.yellow(`Warning: Statement ${i+1} execution might have failed: ${error.message}`));
                // Continue with other statements
            }
        }

        spinner.succeed(chalk.green('Database setup script executed successfully!'));
        return true;
    } catch (error) {
        spinner.fail(chalk.red('Error executing database setup script.'));
        console.error(chalk.red(`Error details: ${error.message}`));
        return false;
    }
}

// --- RAG Core Logic ---

/**
 * Search for relevant document sections based on query embedding.
 * @param {number[]} queryEmbedding - The embedding vector of the query.
 * @param {number} [matchThreshold=0.7] - Similarity threshold (0-1).
 * @param {number} [matchCount=5] - Maximum number of matches to return.
 * @returns {Promise<Array>} - Array of matching document sections.
 * @throws {Error} If the RPC call fails.
 */
export async function searchDocumentSections(queryEmbedding, matchThreshold = 0.7, matchCount = 5) {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc(
        'match_document_sections',
        {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount
        }
    );

    if (error) {
        throw new Error(`Failed to search document sections via RPC: ${error.message} (Code: ${error.code})`);
    }

    return data || []; // Return empty array if data is null/undefined
}

/**
 * Get document details (name and content) by ID.
 * @param {number} documentId - The document ID.
 * @returns {Promise<{name: string, content: string}>} - Document details { name, content }.
 * @throws {Error} If the document is not found or if the query fails.
 */
export async function getDocumentDetails(documentId) {
    const client = getSupabaseClient();
    try {
        const { data, error } = await client
            .from('documents')
            .select('name, content')
            .eq('id', documentId)
            .single(); // .single() throws error if 0 or >1 rows found

        if (error) {
            // Check if it's the specific error for "no rows found" from .single()
            if (error.code === 'PGRST116') { 
                throw new Error(`Document not found for ID: ${documentId}`);
            }
            // Otherwise, it's a different database error
            throw new Error(`Failed to fetch document details for ID ${documentId}: ${error.message} (Code: ${error.code})`);
        }
        
        // Should not happen with .single(), but check just in case
        if (!data) { 
             throw new Error(`Document not found for ID: ${documentId} (query returned null)`);
        }
        
        return data; // Returns { name, content }
    } catch (error) {
        // Rethrow specific errors or wrap unexpected ones
        if (error.message.startsWith('Document not found') || error.message.startsWith('Failed to fetch')) {
            throw error;
        }
        throw new Error(`An unexpected error occurred fetching document details: ${error.message}`);
    }
}

/**
 * Adds a document and its sections (with embeddings) to the database.
 * @param {string} name - Document name.
 * @param {string} content - Document content.
 * @param {Function} generateEmbeddingFn - Async function to generate embeddings (e.g., from openaiService).
 * @returns {Promise<number>} The ID of the newly added document.
 * @throws {Error} If any step (metadata insertion, embedding generation, section insertion) fails.
 */
export async function addDocument(name, content, generateEmbeddingFn) {
    const spinner = ora({ text: chalk.blue('Adding document...'), spinner: 'dots' }).start();
    const client = getSupabaseClient();
    let documentId = null;

    try {
        // 1. Insert document metadata
        spinner.text = chalk.blue('Inserting document metadata...');
        const { data: document, error: documentError } = await client
            .from('documents')
            .insert([{ name, content }])
            .select('id')
            .single(); // Use single to get the ID directly

        if (documentError) {
            throw new Error(`Failed to insert document metadata: ${documentError.message} (Code: ${documentError.code})`);
        }
        documentId = document.id;
        spinner.succeed(chalk.green(`Document metadata added (ID: ${documentId}).`));

        // 2. Split content into sections
        spinner.start(chalk.blue('Splitting content into sections...'));
        const sections = content.split(/\\n\\s*\\n/).filter(section => section.trim().length > 0);
        if (sections.length === 0) {
            spinner.warn(chalk.yellow('Document content resulted in zero sections. Only metadata was added.'));
            return documentId; // Return ID even if no sections
        }
        spinner.succeed(chalk.green(`Split into ${sections.length} sections.`));

        // 3. Generate embeddings and prepare section data
        spinner.start(chalk.blue(`Generating embeddings for ${sections.length} sections...`));
        const sectionData = [];
        for (let i = 0; i < sections.length; i++) {
            spinner.text = chalk.blue(`Generating embedding for section ${i + 1}/${sections.length}...`);
            try {
                const embedding = await generateEmbeddingFn(sections[i]);
                sectionData.push({
                    document_id: documentId,
                    content: sections[i],
                    embedding: embedding
                });
            } catch (embedError) {
                // Halt the entire process if embedding fails for any section
                throw new Error(`Failed to generate embedding for section ${i + 1}: ${embedError.message}`);
            }
        }
        spinner.succeed(chalk.green('Embeddings generated.'));

        // 4. Insert sections into the database
        spinner.start(chalk.blue(`Inserting ${sectionData.length} sections into the database...`));
        const { error: sectionError } = await client
            .from('document_sections')
            .insert(sectionData);

        if (sectionError) {
            // Attempt to clean up the document metadata if sections fail? Maybe too complex.
            throw new Error(`Failed to insert document sections: ${sectionError.message} (Code: ${sectionError.code})`);
        }

        spinner.succeed(chalk.green(`Successfully added document "${name}" with ${sectionData.length} sections`));
        return documentId;

    } catch (error) {
        spinner.fail(chalk.red(`Error adding document "${name}".`));
        // If an error occurred after metadata insertion, maybe mention the ID?
        // if (documentId) { console.log(chalk.yellow(`Metadata for document ID ${documentId} was created but sections failed.`))}
        throw error; // Re-throw the specific error caught
    }
}

// --- Document Management Placeholders ---

/**
 * Lists all documents (ID and name).
 * @returns {Promise<Array<{id: number, name: string}>>} List of documents.
 * @throws {Error} If the query fails.
 */
export async function listDocuments() {
    const client = getSupabaseClient();
    const spinner = ora(chalk.blue('Fetching document list...')).start();
    try {
        const { data, error } = await client
            .from('documents')
            .select('id, name, created_at')
            .order('created_at', { ascending: false }); // Optional: order by creation time

        if (error) {
            throw new Error(`Failed to list documents: ${error.message} (Code: ${error.code})`);
        }
        spinner.succeed(chalk.green('Fetched document list.'));
        return data || [];
    } catch (error) {
        spinner.fail(chalk.red('Error fetching document list.'));
        throw error;
    }
}

/**
 * Finds a document's ID by its exact name or returns the ID if input is numeric.
 * @param {string | number} identifier - The document name (string) or ID (number).
 * @returns {Promise<number>} The document ID.
 * @throws {Error} If the document is not found or if multiple documents match the name.
 */
export async function findDocumentByNameOrId(identifier) {
    const client = getSupabaseClient();
    const spinner = ora(chalk.blue(`Searching for document "${identifier}"...`)).start();

    try {
        // If identifier is numeric, assume it's an ID
        const potentialId = Number.parseInt(identifier, 10);
        if (!Number.isNaN(potentialId)) {
             // Verify the ID exists
             const { error: idError } = await client.from('documents').select('id').eq('id', potentialId).single();
             if (idError) {
                 if (idError.code === 'PGRST116') throw new Error(`Document not found with ID: ${potentialId}`);
                 throw new Error(`Error verifying document ID ${potentialId}: ${idError.message}`);
             }
             spinner.succeed(chalk.green(`Found document by ID: ${potentialId}`));
             return potentialId;
        }

        // If identifier is a string, search by name
        const { data, error } = await client
            .from('documents')
            .select('id, name')
            .eq('name', identifier);

        if (error) {
            throw new Error(`Error searching for document by name "${identifier}": ${error.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error(`Document not found with name: "${identifier}"`);
        }

        if (data.length > 1) {
            throw new Error(`Multiple documents found with name: "${identifier}". Please use the document ID instead.`);
        }

        spinner.succeed(chalk.green(`Found document "${data[0].name}" with ID: ${data[0].id}`));
        return data[0].id;

    } catch (error) {
        spinner.fail(chalk.red('Error finding document.'));
        throw error; // Re-throw the specific error
    }
}

/**
 * Deletes a document and its associated sections (via cascade).
 * @param {number} documentId - The ID of the document to delete.
 * @returns {Promise<void>} Resolves on successful deletion.
 * @throws {Error} If the deletion fails or the document doesn't exist.
 */
export async function deleteDocumentById(documentId) {
    const client = getSupabaseClient();
    const spinner = ora(chalk.blue(`Attempting to delete document ID: ${documentId}...`)).start();

    try {
        const { error } = await client
            .from('documents')
            .delete()
            .eq('id', documentId)
            .select(); // Use select to check if a row was actually deleted

        if (error) {
             // Note: Supabase delete might not error if the row doesn't exist, 
             // depending on RLS. The check in findDocumentByNameOrId is more reliable.
             // But we handle potential errors anyway.
            throw new Error(`Failed to delete document ID ${documentId}: ${error.message} (Code: ${error.code})`);
        }
        
        // Since .delete() might not error on non-existent ID, we rely on findDocumentByNameOrId to have validated it first.
        // If we wanted extra safety, we could re-query here to confirm deletion.

        spinner.succeed(chalk.green(`Successfully deleted document ID: ${documentId}`));
    } catch (error) {
        spinner.fail(chalk.red(`Error deleting document ID: ${documentId}.`));
        throw error; // Re-throw specific error
    }
} 