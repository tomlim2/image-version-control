# 🌳 Pixtree

**AI Image Version Control System** - Like Git for your creative AI workflow

> ⚠️ **Work in Progress** - Currently under active development. Core functionality is working but some features are still being implemented.

Pixtree helps AI artists manage their image generation process with Git-like version control, intelligent tagging, and seamless integration with AI models.

**Current Status**: Simplified Project/Tree system with tag-based organization. Each directory = one independent Pixtree project (like Git).

## ✨ Features

### 🏗️ **Simple Project Organization**
- **📂 Projects**: Each directory = one independent Pixtree project (Git-style)
- **🌳 Trees**: Group related images by theme, style, or purpose
- **🖼️ Images**: Individual nodes with full metadata and version history
- **🏷️ Tag-Based Classification**: Flexible tagging instead of rigid categories

### 🎨 **Creative Workflow**
- **🤖 AI Support**: Currently supports Nano Banana (Google Gemini)
- **⚡ Instant Setup**: `pixtree init` - no complex configuration needed
- **📊 Smart Search**: Find images by tags, prompts, ratings, and more  
- **📤 Easy Export**: Export your creations with metadata tracking
- **⚙️ Simple Config**: Minimal configuration, maximum usability

### 📈 **Core Management**  
- **📊 Project Statistics**: Track usage, ratings, and activity
- **⚡ Performance**: Hash-based image deduplication prevents bloat
- **🔍 Metadata Rich**: Full AI generation parameters preserved
- **🏷️ Rating System**: 1-5 star rating for quality tracking

## 🚀 Quick Start

> ⚠️ **Note**: `import` command is currently being implemented. For now, you can use `generate` to create images.

### Installation

```bash
npm install -g pixtree
```

### Initialize Your First Project

```bash
# Create a new directory for your AI art project
mkdir my-ai-art && cd my-ai-art

# Initialize pixtree (instant, no prompts)
pixtree init
# ✅ Creates .pixtree/ structure
# ✅ Uses directory name as project name

# Set your API key
pixtree config set apiKey your-google-gemini-api-key

# Import your first image (creates a tree automatically)
pixtree import photo.jpg  # ← Coming soon!
```

### Generate Your First Image

```bash
# Generate an image
pixtree generate "a cute cat wearing a wizard hat"

# View your project structure  
pixtree tree                            # View project tree hierarchy

# Generate a variation
pixtree generate "same cat, but with a red hat" --tags "variation,red"

# Add tags to organize your work
pixtree tag node-123 "favorite" "cats" "wizard"
```

## 📋 Available Commands

### Project Setup
```bash
pixtree init                              # Initialize new project (instant)
pixtree config list                       # View configuration
pixtree config set apiKey <key>           # Set API key
pixtree config test                       # Test API connection
```

### Core Workflow
```bash
# ⚠️ Not yet implemented
pixtree import image.jpg                  # Import image (creates tree)

# ✅ Working
pixtree generate "prompt"                 # Generate AI image
pixtree tree                             # Show project tree structure
pixtree export node-123                  # Export image
```

### Organization & Tagging
```bash
pixtree tag node-123 "favorite" "cats"   # Add tags to image
pixtree tag node-123 --rating 5          # Set rating
pixtree tree --tags "favorite"           # Filter by tags
```

### Navigation
```bash
pixtree checkout node-123                 # Switch to specific node
pixtree export node-123 ~/art.png        # Export to specific path
```

### Current Limitations
- ⚠️ **Missing**: `import` command (being implemented)
- ⚠️ **Limited**: Tree management commands
- ⚠️ **Single Model**: Only Nano Banana (Google Gemini) supported

## 🏗️ Project Structure

When you initialize a pixtree project, it creates:

```
your-project/
├── .pixtree/                   # Project data (don't delete!)
│   ├── project.json           # Project metadata and settings
│   ├── trees/                 # Tree definitions and metadata
│   │   ├── tree-001.json     # Individual tree metadata
│   │   └── tree-002.json
│   ├── images/                # Generated and imported images
│   │   ├── abc123.png        # Stored by hash to avoid duplicates
│   │   └── def456.jpg
│   ├── nodes/                 # Image node metadata (JSON)
│   │   ├── node-001.json     # Individual image metadata
│   │   └── node-002.json
│   ├── context.json          # Current workspace context
│   └── config.json           # Global configuration
├── exports/                   # Your exported images (optional)
└── your-other-files...
```

### Hierarchy Explained

```
📂 Project (current directory)
├── 🌳 Tree: "portraits" [creative, faces]
│   ├── 🖼️ Initial concept ⭐
│   ├── 🖼️ ├─ Style variation 1
│   ├── 🖼️ ├─ Style variation 2
│   └── 🖼️ └─ Final design ⭐⭐⭐⭐⭐
├── 🌳 Tree: "references" [reference, inspiration]
│   ├── 🖼️ Art style refs
│   └── 🖼️ Color palette refs
└── 🌳 Tree: "experiments" [testing, wild-ideas]
    ├── 🖼️ Crazy idea 1
    └── 🖼️ Crazy idea 2
```

**Key Changes:**
- ✅ Flexible tag-based classification: `[creative, faces]` instead of rigid `(creative)`
- ✅ Rating system: ⭐⭐⭐⭐⭐ (1-5 stars)
- ✅ User-defined organization via tags

## 🤖 Supported AI Models

### Nano Banana (Google Gemini)
- **Model**: `gemini-2.5-flash-image-preview`
- **Features**: Text-to-image, image-to-image, analysis
- **API Key**: Get from [Google AI Studio](https://ai.google.dev/)
- **Cost**: ~$0.039 per image

### Coming Soon
- **Seedream 4.0** (ByteDance)
- **DALL-E 3** (OpenAI)
- **Midjourney** (via API)

## 🔧 Configuration

Simple configuration system - no complex settings needed!

### API Setup
```bash
# Set your Google Gemini API key
pixtree config set apiKey your-gemini-api-key

# Test connection
pixtree config test

# View current settings
pixtree config list
```

### Project Statistics
```bash
pixtree config stats   # Show project statistics
```

**Simplified Settings:**
- ✅ Only essential configuration: API key and default model
- ✅ No complex auto-features - everything is manual and predictable
- ✅ Git-like simplicity

## 🎯 Simple Workflow Example

> ⚠️ **Note**: This shows the planned workflow. `import` command is still being implemented.

### Basic Creative Workflow
```bash
# 1. Initialize project
cd my-artwork
pixtree init                # Instant setup

# 2. Set up API key  
pixtree config set apiKey sk-...

# 3. Import reference image (creates tree automatically)
pixtree import reference.jpg  # ← Coming soon!

# 4. Generate variations
pixtree generate "fantasy warrior character" --tags "character,concept"
pixtree generate "same character, different armor" --tags "armor,variation"

# 5. Organize and export
pixtree tag node-abc --rating 5
pixtree tree                # View structure
pixtree export node-abc ~/final-character.png
```

### Multi-Project Setup (Git-style)
```bash
# Each directory = independent project
mkdir client-a && cd client-a
pixtree init
pixtree generate "minimalist logo design"

cd ../personal-art  
pixtree init
pixtree generate "surreal landscape"

# No project switching needed - just cd to the directory!
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- pnpm (recommended)

### Local Development
```bash
# Clone the repository
git clone https://github.com/younsoolim/pixtree.git
cd pixtree

# Install dependencies
pnpm install

# Build packages
pnpm build

# Link for local testing
cd packages/cli && npm link
```

### Project Structure
```
pixtree/
├── packages/
│   ├── core/                   # Core business logic
│   └── cli/                    # CLI interface
├── docs/                       # Documentation
└── examples/                   # Example projects
```

## 📚 API Reference

### Core Classes

#### `Pixtree`
Main class for managing image version control (renamed from ImageVersionControl).

```typescript
import { Pixtree } from '@pixtree/core';

const pixtree = new Pixtree('./my-project');
await pixtree.init({ name: 'My Project' });
const node = await pixtree.generate('a cute cat');
```

#### `StorageManager`
Handles file system operations and metadata storage.

#### `AIProvider`
Abstract base class for AI model integrations.

### Types

All TypeScript types are available from `@pixtree/core`:

```typescript
import { ImageNode, ProjectConfig, Tree, Project } from '@pixtree/core';
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Current Status & Roadmap

#### ✅ **Completed (Recent Simplification)**
- [x] Simplified Project/Tree system with tag-based classification
- [x] Single project model (Git-style: each directory = one project)  
- [x] ImageVersionControl → Pixtree rebranding
- [x] Minimal configuration system (no complex auto-features)
- [x] CLI commands: init, generate, tree, tag, export, config

#### 🔄 **Currently Working On**
- [ ] **Critical**: `import` command implementation
- [ ] TypeScript compilation error fixes
- [ ] Enhanced tree management commands

#### 🚀 **Next Steps**
- [ ] Complete import workflow with automatic tree creation
- [ ] Advanced search and filtering
- [ ] Additional AI model support (Seedream 4.0, DALL-E 3)
- [ ] Web interface for visual project management

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **Documentation**: [pixtree.dev/docs](https://pixtree.dev/docs)
- **Issues**: [GitHub Issues](https://github.com/younsoolim/pixtree/issues)
- **Discussions**: [GitHub Discussions](https://github.com/younsoolim/pixtree/discussions)

## 🙏 Acknowledgments

- Google for the Gemini API and Nano Banana model
- The AI art community for inspiration and feedback
- Contributors and beta testers

---

**Made with ❤️ for AI artists everywhere**

*Pixtree helps you grow your creative ideas like a tree* 🌳