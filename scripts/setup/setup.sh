#!/bin/bash
# AR Automation System Setup Script

set -e

echo "================================"
echo "EO Studio AR Automation Setup"
echo "================================"
echo ""

# Check Python version
echo "[1/5] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✅ Found Python $PYTHON_VERSION"
echo ""

# Create virtual environment
echo "[2/5] Creating virtual environment..."
if [ -d "venv" ]; then
    echo "Virtual environment already exists, skipping..."
else
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi
echo ""

# Activate virtual environment
echo "[3/5] Activating virtual environment..."
source venv/bin/activate
echo "✅ Virtual environment activated"
echo ""

# Install dependencies
echo "[4/5] Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Dependencies installed"
echo ""

# Setup environment variables
echo "[5/5] Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file (PLEASE EDIT WITH YOUR CREDENTIALS)"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Edit .env with your API credentials"
    echo "  2. Run: python scripts/run_daily.py"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "================================"
echo "Setup Complete! ✅"
echo "================================"
echo ""
echo "📖 Next steps:"
echo "  1. Edit .env with Bill.com, Plaid, Slack, Notion credentials"
echo "  2. Test with dry-run: python scripts/run_daily.py"
echo "  3. Check agent/memory/ for configuration"
echo "  4. Review CLAUDE.md for development guide"
echo ""
echo "📚 Documentation:"
echo "  - README.md: Full project documentation"
echo "  - agent/context/ar_structure.md: Data structure definitions"
echo "  - agent/memory/decisions.md: Policy and design decisions"
echo ""
