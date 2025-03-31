
---

# 🚀 **RAGChat 2.0 – AI CLI Assistant for DevOps & Security Automation**

**RAGChat 2.0** is a **CLI-native AI assistant** designed to automate DevOps and Security workflows such as log analysis, system audits, file triage, and task scheduling using **natural language commands**.

- 🧠 **Powered by Local LLMs (Mistral 7B/8B)** – Privacy-first, offline mode with optional API fallback to GPT-4/Claude 3 for enhanced reasoning.
- 📚 **RAG-Enabled Context Awareness** – Leverages a local knowledge base (ChromaDB) for task-aware responses.
- 🛡️ **Secure and Controlled Execution** – CLI tool execution, file analysis, and system interaction with optional agent isolation for added security.
- 📦 **Modular and Extensible** – Easily extendable with new tools, models, and vector stores to adapt to enterprise needs.

---

## 🎯 **Key Features**

✅ **Natural Language CLI Automation**  
- Execute complex DevOps and security workflows using plain-English commands.
- **Examples:**
```bash
# Summarize logs and notify admin if errors found
ragchat "Summarize /var/log/auth.log, identify errors, and email results to admin@example.com"
```
```bash
# Check system memory usage
ragchat "How much free memory is available?"
```

✅ **Offline & Privacy-First by Default**  
- Runs locally with Mistral 7B/LLaMA models using `llama.cpp` or `ollama`, ensuring sensitive data stays private.
- **Hybrid Mode:** Optional API fallback to GPT-4/Claude 3 for improved task reasoning and precision.

✅ **RAG-Powered Knowledge Retrieval**  
- Indexes logs, config files, and documentation using **ChromaDB** for context-aware responses.
- Embedding model: `all-MiniLM-L6-v2` for efficient knowledge retrieval.

✅ **Stateful Memory & Task Queues**  
- Maintains conversation state across CLI sessions with **Redis** for session persistence and task routing.
- Supports asynchronous task monitoring and retrieval.

✅ **Secure Tool Execution with Isolation**  
- Predefined tools for secure CLI automation:
    - `ReadFile(path)` – Reads and returns file content.
    - `RunShell(command)` – Executes shell commands securely.
    - `GetSystemStats()` – Retrieves system information (CPU, memory, disk).
- **Agent Isolation:** (Coming Soon) Execute shell actions in isolated Docker containers or microVMs for enhanced security.

✅ **Extensible and Modular Design**  
- Easily integrate new tools, models, and APIs by extending the core interface.
- Supports dynamic task routing, knowledge retrieval, and custom workflows.

---

## 🧩 **Technical Architecture**

RAGChat 2.0 follows a modular, secure, and extensible design with these core components:

### 🎛️ **1. CLI Interface**
- Parses natural language commands with `argparse` or `click`.
- Modes:
    - 📝 **One-Shot Mode:** Run a single task using `ragchat "..."`.
    - 💬 **Interactive REPL Mode:** Launch continuous CLI sessions using `ragchat`.

### 🧠 **2. Orchestrator and Agent Core**
- Interprets user commands, decomposes tasks, and executes them iteratively.
- Implements a **ReAct-style agent loop** for reasoning, planning, and execution.
- Built on LangChain for flexible tool integration and error handling.

### 📚 **3. Vector Store with RAG for Context**
- Embeds and indexes logs, configs, and documentation using ChromaDB.
- Retrieves relevant knowledge to augment LLM responses.

### 🗂️ **4. State and Memory Management**
- Session context and task queues managed with Redis for persistence.
- Enables real-time task routing and stateful CLI interactions.

### 🛠️ **5. Secure Toolset for Automation**
- Predefined tools for CLI automation with strict safety modes.
- Supports custom tool additions with minimal configuration.

---

## 📥 **Installation**

### 🐍 **1. Install via pip**
```bash
pip install ragchat
```

### 🐳 **2. Run via Docker**
```bash
docker run -it --rm -v /var/log:/app/logs ragchat "Summarize /app/logs/auth.log"
```

### 📚 **3. Local Setup (For Development)**
```bash
# Clone the repository
git clone https://github.com/yourusername/ragchat.git
cd ragchat

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## ⚙️ **Usage Examples**

### 🎯 **Single Command Execution**
```bash
# Summarize log and identify suspicious login attempts
ragchat "Summarize /var/log/auth.log for suspicious login attempts"
```

### 🔁 **Interactive REPL Mode**
```bash
ragchat
# Enters chat mode
> Summarize auth.log
> List all failed SSH login attempts
> Exit
```

### 🌐 **Use Cloud API for Enhanced Reasoning**
```bash
ragchat "Analyze system performance and suggest improvements" --use-cloud --api-key OPENAI_API_KEY
```

---

## 🔐 **Security and Safe Execution**

✅ **Safe Mode Enabled by Default**  
- Restricts potentially dangerous shell commands and asks for confirmation.
- Audit logs track all actions and tool executions.

✅ **Agent Isolation (Coming Soon)**  
- Secure execution in **Docker containers** or **Firecracker microVMs**.
- MicroVM isolation ensures sensitive operations are sandboxed.

✅ **Audit and Logging**  
- Comprehensive logs for task execution, errors, and system interactions.

---

## ⚙️ **Configuration Options**

RAGChat uses a YAML config file (`~/.ragchat/config.yaml`) for customization:

```yaml
LLM_MODEL: /path/to/mistral-7b-q4.gguf
VECTOR_STORE_PATH: /path/to/chromadb
SAFE_MODE: true
API_KEY: "your-cloud-api-key"
```

---

## 🧪 **Development and Contribution**

Contributions are welcome! Follow these steps to get started:

1. Fork and clone the repository.
2. Set up a virtual environment and install dependencies.
3. Make your changes, add tests, and submit a pull request.

### 📚 **Developer Setup**
```bash
# Clone repository
git clone https://github.com/yourusername/ragchat.git
cd ragchat

# Set up environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 📚 **Architecture Justification**

### ⚖️ **Key Design Choices and Tradeoffs**
- **LLM Choice:** Mistral 7B (balanced reasoning, fast inference) over larger models like LLaMA 13B to optimize for CPU and quantized environments.
- **Vector Store:** ChromaDB (simple, embedded) over alternatives like FAISS or pgvector for ease of integration.
- **State Management:** Redis (real-time, scalable) over SQLite for faster session management and task routing.
- **Tool Orchestration:** LangChain’s agent interface (flexible and extensible) to accelerate development.

---

## 📦 **Roadmap and Future Enhancements**

✅ Secure tool execution in isolated containers (Firecracker/Docker).  
✅ Advanced agent memory with vector-based context persistence.  
✅ Cloud-based fine-tuning for task-specific improvements.  
✅ Web/TUI interface for richer interactive workflows.  

---

## 🤝 **License and Attribution**

This project is licensed under the [Apache 2.0 License](LICENSE).

---

## 💬 **Contact and Support**

For questions, bug reports, and contributions, please open an [issue](https://github.com/yourusername/ragchat/issues) or contact us at [support@example.com](mailto:support@example.com).
```

---
