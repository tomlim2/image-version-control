# 🌳 Pixtree

**AI Image Version Control System** - Like Git for your creative AI workflow

Pixtree helps AI artists manage their image generation process with Git-like version control, intelligent tagging, and seamless integration with multiple AI models.

**New in v2.0**: Project-based workflow with Tree organization! Work within **Projects** (땅/land) that contain **Trees** (나무들) of related **Images** (이미지들).

## ✨ Features

### 🏗️ **Project-Based Organization**
- **📂 Projects (땅)**: Organize your work into distinct creative projects
- **🌳 Trees (나무들)**: Group related images by theme, style, or purpose
- **🖼️ Images (이미지들)**: Individual nodes in your creative branching structure
- **🔄 Context Management**: Always know where you are in your creative process

### 🎨 **Enhanced Creative Workflow**
- **🤖 Multi-AI Support**: Currently supports Nano Banana (Google Gemini), with more models coming
- **🏷️ Smart Tagging**: Tag and rate images at project, tree, and image levels
- **📊 Intelligent Search**: Find images across projects, trees, tags, prompts, and more
- **📤 Easy Export**: Export your favorite creations with full metadata tracking
- **💡 Prompt Blending**: Combine prompts from different images (coming soon)

### 📈 **Advanced Management**
- **📊 Rich Statistics**: Track usage, ratings, and activity across your entire workflow
- **🎯 Tree Types**: Organize by purpose - creative, reference, variation, experiment
- **🔍 Context-Aware Import**: Smart tree assignment when importing reference images
- **⚡ Performance**: Optimized storage with hash-based deduplication

## 🚀 Quick Start

### Installation

```bash
npm install -g pixtree
```

### Initialize Your First Project

```bash
# Create a new directory for your AI art project
mkdir my-ai-art && cd my-ai-art

# Initialize pixtree with project setup
pixtree init
# ✨ Interactive setup will guide you through:
#   - Project name and description
#   - Default AI model selection
#   - Initial tree creation

# Set your API key
pixtree config set apiKey your-google-gemini-api-key
```

### Generate Your First Image

```bash
# Generate an image (automatically uses current project/tree context)
pixtree generate "a cute cat wearing a wizard hat"

# View your project structure
pixtree status                           # See current context
pixtree tree                            # View current tree
pixtree project tree-list               # List all trees in project

# Generate a variation in the same tree
pixtree generate "same cat, but with a red hat" --tags "variation,red"

# Create a new tree for experiments
pixtree tree create "Cat Experiments" --type experiment
pixtree generate "cyberpunk cat with neon eyes" --tree "Cat Experiments"
```

## 📋 Core Commands

### Project Management
```bash
pixtree init                              # Initialize new project (interactive)
pixtree status                            # Show current context and project info
pixtree project list                      # List all projects
pixtree project switch <project-name>     # Switch to different project
pixtree config list                       # View configuration
pixtree config set apiKey <key>           # Set API key
```

### Tree Management
```bash
pixtree tree                              # Show current tree structure
pixtree tree create "Tree Name" --type creative  # Create new tree
pixtree tree list                         # List all trees in project
pixtree tree switch <tree-name>           # Switch to different tree
pixtree tree info <tree-name>             # Show tree statistics
pixtree tree archive <tree-name>          # Archive completed tree
```

### Image Generation
```bash
pixtree generate "prompt"                 # Generate in current tree
pixtree generate "prompt" --tree "Tree Name"    # Generate in specific tree
pixtree generate "prompt" --tags "style,cool"   # Add tags
pixtree generate "prompt" --rating 5      # Set initial rating
pixtree generate "prompt" --purpose "final design"  # Set purpose
```

### Organization & Tagging
```bash
pixtree tag node-123 "favorite" "best"   # Add tags to image
pixtree tag tree-456 "character-design"  # Add tags to tree
pixtree tag node-123 --rating 5          # Set rating
pixtree tag node-123 --favorite          # Mark as favorite
pixtree tree --tags "favorite"           # Filter current tree by tags
pixtree search --tags "character" --rating 4    # Search across project
```

### Navigation & Context
```bash
pixtree checkout node-123                 # Switch to specific node
pixtree checkout tree-456                 # Switch to specific tree
pixtree back                             # Go back to previous context
pixtree export node-123                  # Export image
pixtree export node-123 ~/Desktop/art.png  # Export to specific path
```

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
📂 Project (땅 - Land)
├── 🌳 Tree: "Character Design" (creative)
│   ├── 🖼️ Initial concept
│   ├── 🖼️ ├─ Style variation 1
│   ├── 🖼️ ├─ Style variation 2
│   └── 🖼️ └─ Final design
├── 🌳 Tree: "Reference Images" (reference)
│   ├── 🖼️ Art style refs
│   └── 🖼️ Color palette refs
└── 🌳 Tree: "Experiments" (experiment)
    ├── 🖼️ Wild idea 1
    └── 🖼️ Wild idea 2
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
# 1. Create dedicated project and tree
pixtree init
# > Project name: "Fantasy Game Characters"
# > Create initial tree: "Warrior Design" (creative)

# 2. Initial concept
pixtree generate "fantasy warrior character" --tags "character,concept"

# 3. Explore variations in same tree
pixtree generate "same character, different armor" --tags "character,armor"
pixtree generate "same character, different pose" --tags "character,pose"

# 4. Create reference tree for inspiration
pixtree tree create "Reference Art" --type reference
pixtree import warrior-ref.jpg --tree "Reference Art" --description "Art style inspiration"

# 5. Refine favorites and export
pixtree tag node-abc --rating 5 --favorite
pixtree generate "enhance details, add magical effects" --tags "character,final"
pixtree export node-xyz exports/characters/warrior-final.png
```

### Multi-Project Portfolio Workflow
```bash
# 1. Different projects for different clients/themes
pixtree init  # "Client A - Brand Identity"
pixtree generate "modern minimalist logo" --tags "logo,minimalist"

cd ../client-b-project
pixtree init  # "Client B - Game Assets"
pixtree tree create "Character Concepts" --type creative
pixtree tree create "Environment Art" --type creative
pixtree generate "cyberpunk cityscape" --tree "Environment Art"

# 2. Switch between projects easily
pixtree project list
pixtree project switch "Client A - Brand Identity"
pixtree status  # See current context
```

### Style Exploration Workflow
```bash
# 1. Create experiment tree for style tests
pixtree tree create "Landscape Styles" --type experiment

# 2. Base image
pixtree generate "peaceful mountain landscape" --tags "landscape,base"

# 3. Style variations in organized manner
pixtree generate "same landscape, anime style" --tags "anime,style-test"
pixtree generate "same landscape, oil painting style" --tags "painting,style-test"
pixtree generate "same landscape, cyberpunk style" --tags "cyberpunk,style-test"

# 4. Compare across entire project
pixtree search --tags "style-test" --rating 3
pixtree tree info "Landscape Styles"  # See statistics
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

#### ✅ **v2.0 - Project/Tree System** (Current)
- [x] Project-based organization with Tree hierarchy
- [x] Enhanced type system with comprehensive metadata
- [x] Context-aware workspace management
- [ ] Enhanced StorageManager for Project/Tree
- [ ] ProjectManager and TreeManager classes
- [ ] Updated CLI commands for Project/Tree workflow

#### 🔄 **v2.1 - Enhanced Workflow** (Next)
- [ ] Prompt blending with AI preview
- [ ] Advanced search across projects
- [ ] Tree archiving and backup systems
- [ ] Import workflow with smart tree assignment
- [ ] Comprehensive statistics dashboard

#### 🚀 **v3.0 - Advanced Features** (Future)
- [ ] Advanced image diff with AI highlighting
- [ ] Seedream 4.0 integration
- [ ] Web interface for visual project management
- [ ] Team collaboration features
- [ ] Plugin system for custom AI models
- [ ] AI-powered project insights and suggestions

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