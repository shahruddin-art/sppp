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
echo "[1/6] Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Step 2: Set up environment file
echo ""
echo "[2/6] Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo "⚠️  Edit .env to set your DATABASE_URL and JWT_SECRET"
else
  echo "✅ .env already exists"
fi

# Step 3: Generate Prisma client
echo ""
echo "[3/6] Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"

# Step 4: Database setup
echo ""
echo "[4/6] Database setup..."
echo "Make sure PostgreSQL is running and DATABASE_URL in .env is correct."
read -p "Push schema to database now? (y/n): " push_db
if [ "$push_db" = "y" ]; then
  npx prisma db push
  echo "✅ Database schema pushed"
else
  echo "⏭️  Skipped. Run 'npx prisma db push' later."
fi

# Step 5: Seed database
echo ""
echo "[5/6] Seeding database..."
read -p "Seed database with default admin user? (y/n): " seed_db
if [ "$seed_db" = "y" ]; then
  npm run db:seed
  echo "✅ Database seeded (admin/admin123)"
else
  echo "⏭️  Skipped. Run 'npm run db:seed' later."
fi

# Step 6: Start dev server
echo ""
echo "[6/6] Ready to start!"
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "To build for production:"
echo "  npm run build"
echo "  npm run start"
echo ""
echo "To deploy with PM2:"
echo "  npm run build"
echo "  pm2 start ecosystem.config.js"
echo ""
echo "To deploy to Google Cloud:"
echo "  Edit deploy-gcloud.sh with your GCP settings"
echo "  ./deploy-gcloud.sh setup"
echo "  ./deploy-gcloud.sh deploy"
echo ""
echo "Default login: admin / admin123"
echo "⚠️  Change the password after first login!"
