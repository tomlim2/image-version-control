# 🌳 Pixtree

**AI Image Version Control System** - Like Git for your creative AI workflow

Pixtree helps AI artists manage their image generation process with Git-like version control, intelligent tagging, and seamless integration with multiple AI models.

## ✨ Features

- **🌳 Tree Structure**: Organize your AI-generated images in a branching tree structure
- **🤖 Multi-AI Support**: Currently supports Nano Banana (Google Gemini), with more models coming
- **🏷️ Smart Tagging**: Tag and rate your images for easy organization
- **📊 Intelligent Search**: Find images by tags, prompts, ratings, and more
- **📤 Easy Export**: Export your favorite creations to any location
- **🔄 Version Control**: Track every generation with full metadata
- **💡 Prompt Blending**: Combine prompts from different images (coming soon)

## 🚀 Quick Start

### Installation

```bash
npm install -g pixtree
```

### Initialize Your First Project

```bash
# Create a new directory for your AI art project
mkdir my-ai-art && cd my-ai-art

# Initialize pixtree
pixtree init

# Set your API key
pixtree config set apiKey your-google-gemini-api-key
```

### Generate Your First Image

```bash
# Generate an image with a simple prompt
pixtree generate "a cute cat wearing a wizard hat"

# View your project tree
pixtree tree

# Generate a variation
pixtree generate "same cat, but with a red hat" --tags "variation,red"
```

## 📋 Core Commands

### Project Management
```bash
pixtree init                    # Initialize new project
pixtree config list             # View configuration
pixtree config set apiKey <key> # Set API key
pixtree tree                    # Show project tree
```

### Image Generation
```bash
pixtree generate "prompt"                    # Generate image
pixtree generate "prompt" --model nano-banana # Specify model
pixtree generate "prompt" --tags "style,cool" # Add tags
pixtree generate "prompt" --rating 5         # Set initial rating
```

### Organization
```bash
pixtree tag node-123 "favorite" "best"      # Add tags
pixtree tag node-123 --rating 5             # Set rating
pixtree tag node-123 --favorite             # Mark as favorite
pixtree tree --tags "favorite"              # Filter by tags
pixtree tree --rating 4                     # Show 4+ star images
```

### Navigation
```bash
pixtree checkout node-123       # Switch to specific node
pixtree export node-123         # Export image
pixtree export node-123 ~/Desktop/my-art.png # Export to specific path
```

## 🏗️ Project Structure

When you initialize a pixtree project, it creates:

```
your-project/
├── .pixtree/                   # Project data (don't delete!)
│   ├── images/                 # Generated images
│   ├── nodes/                  # Image metadata (JSON)
│   └── config.json            # Project configuration
├── exports/                    # Your exported images (optional)
└── your-other-files...
```

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

## 📊 Advanced Features

### Smart Filtering
```bash
# Find all cat images with high ratings
pixtree tree --tags "cat" --rating 4

# Show only generated images from last week
pixtree tree --generated --since 2025-09-10

# Find favorite variations
pixtree tree --favorites --tags "variation"
```

### Tagging System
```bash
# Add multiple tags
pixtree tag node-123 "character" "fantasy" "final"

# Remove tags
pixtree tag node-123 --remove "draft,wip"

# List all tags in project
pixtree tag --list

# Search by tags
pixtree tree --tags "character,fantasy"
```

### Export Management
```bash
# Export with custom name
pixtree export node-123 --name "final-character-design"

# Export to specific location
pixtree export node-123 exports/portfolio/character.png

# Batch export favorites
for node in $(pixtree tree --favorites --format=ids); do
  pixtree export $node exports/favorites/
done
```

## 🔧 Configuration

### Project Settings
```bash
pixtree config set defaultModel nano-banana
pixtree config set autoExportFavorites true
pixtree config set maxStorageSize 10GB
```

### API Keys
```bash
# Set Nano Banana API key
pixtree config set apiKey your-gemini-api-key

# Test connection
pixtree config test nano-banana
```

### View Configuration
```bash
pixtree config list    # Show all settings
pixtree config stats   # Show project statistics
```

## 🎯 Workflow Examples

### Character Design Workflow
```bash
# 1. Initial concept
pixtree generate "fantasy warrior character" --tags "character,concept"

# 2. Explore variations
pixtree generate "same character, different armor" --tags "character,armor"
pixtree generate "same character, different pose" --tags "character,pose"

# 3. Refine favorites
pixtree tag node-abc --rating 5 --favorite
pixtree generate "enhance details, add magical effects" --tags "character,final"

# 4. Export final designs
pixtree export node-xyz exports/character-designs/warrior-final.png
```

### Style Exploration
```bash
# 1. Base image
pixtree generate "peaceful landscape" --tags "landscape,base"

# 2. Try different styles
pixtree generate "same landscape, anime style" --tags "landscape,anime"
pixtree generate "same landscape, oil painting style" --tags "landscape,painting"
pixtree generate "same landscape, cyberpunk style" --tags "landscape,cyberpunk"

# 3. Compare and rate
pixtree tree --tags "landscape"
pixtree tag best-node --rating 5 --favorite
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

#### `ImageVersionControl`
Main class for managing image version control.

```typescript
import { ImageVersionControl } from '@pixtree/core';

const ivc = new ImageVersionControl('./my-project');
await ivc.init({ name: 'My Project' });
const node = await ivc.generate('a cute cat');
```

#### `StorageManager`
Handles file system operations and metadata storage.

#### `AIProvider`
Abstract base class for AI model integrations.

### Types

All TypeScript types are available from `@pixtree/core`:

```typescript
import { ImageNode, ProjectConfig, TreeNode } from '@pixtree/core';
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Roadmap
- [ ] Prompt blending with AI preview
- [ ] Advanced image diff with AI highlighting
- [ ] Seedream 4.0 integration
- [ ] Web interface
- [ ] Team collaboration features
- [ ] Plugin system for custom AI models

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