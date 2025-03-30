import Conf from 'conf';

// Initialize conf with a project name to namespace the config file
// e.g., ~/.config/rag-chatbot-cli/config.json
const configSchema = {
	supabaseUrl: {
		type: 'string',
		format: 'url',
	},
	supabaseKey: {
		type: 'string',
	},
	openaiApiKey: {
		type: 'string',
	},
};

const config = new Conf({ projectName: 'rag-chatbot-cli', schema: configSchema });

/**
 * Retrieves the entire configuration object.
 * @returns {object} The configuration object.
 */
export function getConfig() {
	return config.store;
}

/**
 * Saves configuration data.
 * @param {object} configData - Object containing key-value pairs to save.
 * Example: { supabaseUrl: '...', supabaseKey: '...', openaiApiKey: '...' }
 */
export function saveConfig(configData) {
	for (const [key, value] of Object.entries(configData)) {
		config.set(key, value);
	}
	console.log('Configuration saved.'); // Add user feedback
}

/**
 * Retrieves a specific configuration value by key.
 * @param {string} key - The configuration key to retrieve.
 * @returns {*} The value associated with the key, or undefined if not found.
 */
export function getConfigValue(key) {
    return config.get(key);
}


/**
 * Checks if the essential configuration keys are set.
 * @returns {boolean} True if essential configuration exists, false otherwise.
 */
export function hasConfig() {
	const requiredKeys = ['supabaseUrl', 'supabaseKey', 'openaiApiKey'];
	return requiredKeys.every(key => config.has(key) && config.get(key));
}

/**
 * Clears the entire configuration.
 */
export function clearConfig() {
    config.clear();
    console.log('Configuration cleared.');
}

// Example usage (optional, for testing within this file)
// if (import.meta.url === `file://${process.argv[1]}`) {
//  clearConfig();
//  console.log('Has config?', hasConfig());
//  saveConfig({ supabaseUrl: 'http://example.com', supabaseKey: '123', openaiApiKey: 'abc' });
//  console.log('Config:', getConfig());
//  console.log('Has config?', hasConfig());
// } 