# RAG Chatbot CLI

A command-line interface tool for building and interacting with a Retrieval-Augmented Generation (RAG) system using Supabase and OpenAI.

## Features

- 🔄 **Simple Installation**: Install globally using npm
- 🧙‍♂️ **Guided Setup**: First-run wizard guides you through configuration
- 🔒 **Secure Configuration**: Credentials stored securely in a local config file
- 🤖 **Interactive Chat**: Ask questions and get AI responses powered by your documents
- 📝 **Document Management**: Add, list, and delete documents easily
- ✨ **Rich Terminal Experience**: Colorful, informative interface with spinners and tables

## Installation

```bash
npm install -g rag-chatbot-cli
```

## Prerequisites

- Node.js 16 or higher
- A Supabase account with a project set up
- An OpenAI API key

## Quick Start

1. Install the package globally:
   ```bash
   npm install -g rag-chatbot-cli
   ```

2. Run the CLI:
   ```bash
   ragchat
   ```

3. Follow the configuration wizard to set up your Supabase and OpenAI credentials.

4. Start chatting with your documents!

## Commands

### Configuration

```bash
ragchat configure
```

### Database Setup

```bash
ragchat setup-db
```

### Adding Documents

```bash
ragchat add <file_path>
```

### Listing Documents

```bash
ragchat list
```

### Deleting Documents

```bash
ragchat delete <document_id_or_name>
```

## Interactive Chat Commands

While in the chat interface:
- Type any question to get AI responses
- Type `add` to add a new document interactively
- Type `exit` to quit

## License

MIT

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/yourusername/rag-chatbot-cli). 