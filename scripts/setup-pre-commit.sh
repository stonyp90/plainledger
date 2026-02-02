#!/bin/bash
# Setup pre-commit hooks with Husky and lint-staged
# This script sets up pre-commit hooks to catch errors before CI

set -e

echo "🔧 Setting up pre-commit hooks..."

# Check if we're in the project root
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root"
  exit 1
fi

# Install Husky and lint-staged at root level
echo "📦 Installing Husky and lint-staged..."
npm install --save-dev husky lint-staged

# Initialize Husky (modern approach)
echo "🐕 Initializing Husky..."
npx husky init

# Create pre-commit hook (modern approach)
echo "📝 Creating pre-commit hook..."
echo "npx lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit

# Add lint-staged configuration to root package.json if it doesn't exist
if ! grep -q '"lint-staged"' package.json; then
  echo "📋 Adding lint-staged configuration..."
  
  # Use node to add lint-staged config (safer than sed)
  node << 'EOF'
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

packageJson['lint-staged'] = {
  'apps/api/**/*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  'apps/web/**/*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.{json,md,yml,yaml}': [
    'prettier --write'
  ]
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
EOF

  echo "✅ Added lint-staged configuration"
else
  echo "ℹ️  lint-staged configuration already exists"
fi

echo ""
echo "✅ Pre-commit hooks setup complete!"
echo ""
echo "📋 What was configured:"
echo "  - Husky installed and initialized"
echo "  - Pre-commit hook created (.husky/pre-commit)"
echo "  - lint-staged configured for:"
echo "    - apps/api/**/*.{ts,tsx} → eslint + prettier"
echo "    - apps/web/**/*.{ts,tsx} → eslint + prettier"
echo "    - *.{json,md,yml,yaml} → prettier"
echo ""
echo "🧪 Test it:"
echo "  git add ."
echo "  git commit -m 'test: verify pre-commit hooks'"
echo ""
