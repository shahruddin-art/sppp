#!/bin/bash
# ================================================
# SPPP-MBI - First-Time Setup Script
# ================================================
# Run this after extracting the project archive:
#   tar xzf sppp-mbi.tar.gz -C sppp-mbi
#   cd sppp-mbi
#   chmod +x setup.sh
#   ./setup.sh
# ================================================

set -e

echo "=========================================="
echo "  SPPP-MBI Setup"
echo "=========================================="
echo ""

# Step 1: Install dependencies
echo "[1/5] Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Step 2: Generate Prisma client
echo ""
echo "[2/5] Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"

# Step 3: Database setup (SQLite - no server needed)
echo ""
echo "[3/5] Database setup (SQLite)..."
mkdir -p db
npx prisma db push
echo "✅ Database schema pushed"

# Step 4: Seed database
echo ""
echo "[4/5] Seeding database..."
read -p "Seed database with default admin user? (y/n): " seed_db
if [ "$seed_db" = "y" ]; then
  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
  echo "✅ Database seeded (admin/admin123)"
else
  echo "⏭️  Skipped. Run 'npm run db:seed' later."
fi

# Step 5: Ready
echo ""
echo "[5/5] Ready to start!"
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Database: SQLite (file: ./db/custom.db)"
echo "No external database server required!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "To build for production:"
echo "  npm run build"
echo "  npm run start"
echo ""
echo "Default login: admin / admin123"
echo "⚠️  Change the password after first login!"
