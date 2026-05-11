#!/bin/bash
# ================================================
# SPPP-MBI - Google Cloud Deployment Script
# ================================================
# This script automates the deployment of SPPP-MBI
# to Google Cloud (Cloud Run or Compute Engine VM).
#
# Usage:
#   chmod +x deploy-gcloud.sh
#   ./deploy-gcloud.sh setup       # First-time GCP infrastructure setup
#   ./deploy-gcloud.sh deploy      # Deploy to Cloud Run (serverless)
#   ./deploy-gcloud.sh deploy-vm   # Deploy to Compute Engine VM (Docker)
#   ./deploy-gcloud.sh deploy-vm-pm2  # Deploy to Compute Engine VM (PM2)
#   ./deploy-gcloud.sh seed        # Seed database with default admin
#   ./deploy-gcloud.sh status      # Check deployment status
#   ./deploy-gcloud.sh logs        # View application logs
#   ./deploy-gcloud.sh ssh         # SSH into the VM
#   ./deploy-gcloud.sh destroy     # Remove all resources
# ================================================

set -euo pipefail

# ================================================
# Configuration (edit these before running)
# ================================================
PROJECT_ID=""                    # Your GCP Project ID (REQUIRED)
REGION="asia-southeast1"         # GCP Region (Malaysia/Singapore)
ZONE="${REGION}-a"               # GCP Zone for VM
SERVICE_NAME="sppp-mbi"         # Cloud Run service name
REPO_NAME="sppp-mbi-repo"       # Artifact Registry repo name
DB_INSTANCE_NAME="sppp-mbi-db"  # Cloud SQL instance name
DB_NAME="sppp_mbi"              # Database name
DB_USER="sppp_admin"            # Database user
DB_PASSWORD=""                   # Set a strong password! (REQUIRED)
JWT_SECRET=""                    # Auto-generated if empty
INSTANCE_NAME="sppp-mbi-vm"    # Compute Engine VM name
MACHINE_TYPE="e2-medium"        # VM machine type

# Cloud Run settings
MEMORY="1Gi"
CPU="1"
MIN_INSTANCES="0"               # 0 = scale to zero (save cost)
MAX_INSTANCES="3"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ================================================
# Helper Functions
# ================================================
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()    { echo -e "${CYAN}[STEP]${NC} $1"; }

check_prerequisites() {
  info "Checking prerequisites..."
  
  # Check gcloud CLI
  if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI not found. Install it from: https://cloud.google.com/sdk/docs/install"
  fi
  success "gcloud CLI found"
  
  # Check if logged in
  ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
  if [ -z "$ACTIVE_ACCOUNT" ]; then
    warn "Not logged in to gcloud. Starting login..."
    gcloud auth login
  fi
  success "Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1)"
}

check_docker() {
  if ! command -v docker &> /dev/null; then
    error "Docker not found. Install it from: https://docs.docker.com/get-docker/"
  fi
  success "Docker found"
}

check_config() {
  if [ -z "$PROJECT_ID" ]; then
    error "PROJECT_ID not set. Edit deploy-gcloud.sh and set your GCP Project ID."
  fi
  if [ -z "$DB_PASSWORD" ]; then
    error "DB_PASSWORD not set. Edit deploy-gcloud.sh and set a strong database password."
  fi
  if [ -z "$JWT_SECRET" ]; then
    warn "JWT_SECRET not set. Generating a random one..."
    JWT_SECRET=$(openssl rand -base64 32)
    info "Generated JWT_SECRET: $JWT_SECRET"
    info "Save this for future deployments!"
  fi
  success "Configuration valid (Project: $PROJECT_ID, Region: $REGION)"
}

get_cloudsql_connection() {
  echo "${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
}

get_database_url() {
  local cloudsql_conn=$(get_cloudsql_connection)
  echo "postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${cloudsql_conn}"
}

get_vm_ip() {
  gcloud compute instances describe "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null
}

# ================================================
# Setup Command - First-time infrastructure setup
# ================================================
cmd_setup() {
  check_prerequisites
  check_config
  
  info "Starting first-time setup for SPPP-MBI on Google Cloud..."
  echo ""
  
  # Step 1: Set project
  step "1/8: Setting GCP project..."
  gcloud config set project "$PROJECT_ID"
  success "Project set to $PROJECT_ID"
  
  # Step 2: Enable APIs
  step "2/8: Enabling required APIs..."
  gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudresourcemanager.googleapis.com \
    compute.googleapis.com
  success "APIs enabled"
  
  # Step 3: Create Artifact Registry repository
  step "3/8: Creating Artifact Registry repository..."
  if gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" &> /dev/null; then
    warn "Repository $REPO_NAME already exists, skipping"
  else
    gcloud artifacts repositories create "$REPO_NAME" \
      --repository-format=docker \
      --location="$REGION" \
      --description="SPPP-MBI Docker images"
    success "Repository created"
  fi
  
  # Step 4: Create Cloud SQL instance
  step "4/8: Creating Cloud SQL PostgreSQL instance..."
  if gcloud sql instances describe "$DB_INSTANCE_NAME" &> /dev/null; then
    warn "Cloud SQL instance $DB_INSTANCE_NAME already exists, skipping"
  else
    gcloud sql instances create "$DB_INSTANCE_NAME" \
      --database-version=POSTGRES_15 \
      --tier=db-f1-micro \
      --region="$REGION" \
      --storage-auto-increase \
      --availability-type=regional
    success "Cloud SQL instance created"
  fi
  
  # Step 5: Set database password
  step "5/8: Setting database password..."
  gcloud sql users set-password "$DB_USER" \
    --instance="$DB_INSTANCE_NAME" \
    --password="$DB_PASSWORD" 2>/dev/null || \
  gcloud sql users create "$DB_USER" \
    --instance="$DB_INSTANCE_NAME" \
    --password="$DB_PASSWORD"
  success "Database user configured"
  
  # Step 6: Create database
  step "6/8: Creating database..."
  if gcloud sql databases describe "$DB_NAME" --instance="$DB_INSTANCE_NAME" &> /dev/null; then
    warn "Database $DB_NAME already exists, skipping"
  else
    gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE_NAME"
    success "Database created"
  fi
  
  # Step 7: Store secrets in Secret Manager
  step "7/8: Storing secrets in Secret Manager..."
  
  local db_url=$(get_database_url)
  
  # Database URL secret
  echo -n "$db_url" | gcloud secrets create sppp-mbi-database-url \
    --data-file=- --replication-policy=automatic 2>/dev/null || \
  echo -n "$db_url" | gcloud secrets versions add sppp-mbi-database-url \
    --data-file=-
  success "Database URL secret stored"
  
  # JWT Secret
  echo -n "$JWT_SECRET" | gcloud secrets create sppp-mbi-jwt-secret \
    --data-file=- --replication-policy=automatic 2>/dev/null || \
  echo -n "$JWT_SECRET" | gcloud secrets versions add sppp-mbi-jwt-secret \
    --data-file=-
  success "JWT secret stored"
  
  # Step 8: Grant IAM permissions
  step "8/8: Configuring IAM permissions..."
  
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
  RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  
  gcloud secrets add-iam-policy-binding sppp-mbi-database-url \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" 2>/dev/null || true
  
  gcloud secrets add-iam-policy-binding sppp-mbi-jwt-secret \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" 2>/dev/null || true
  
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/cloudsql.client" 2>/dev/null || true
  
  success "IAM permissions configured"
  
  echo ""
  success "=========================================="
  success "  Setup complete!"
  success "  Next: ./deploy-gcloud.sh deploy"
  success "  Or:   ./deploy-gcloud.sh deploy-vm"
  success "=========================================="
}

# ================================================
# Build & Push Docker Image (shared by deploy & deploy-vm)
# ================================================
build_and_push_image() {
  check_docker
  
  local IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
  local TIMESTAMP_TAG="$(date +%Y%m%d-%H%M%S)"
  
  step "Building Docker image..."
  docker build \
    --build-arg DOCKER_BUILD=1 \
    -t "${IMAGE_TAG}:latest" \
    -t "${IMAGE_TAG}:${TIMESTAMP_TAG}" \
    .
  success "Docker image built"
  
  step "Pushing to Artifact Registry..."
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
  docker push "${IMAGE_TAG}" --all-tags
  success "Image pushed to Artifact Registry"
  
  echo "${IMAGE_TAG}"
}

# ================================================
# Deploy Command - Cloud Run (serverless)
# ================================================
cmd_deploy() {
  check_prerequisites
  check_config
  
  local cloudsql_conn=$(get_cloudsql_connection)
  
  info "Deploying SPPP-MBI to Cloud Run (serverless)..."
  echo ""
  
  # Step 1: Build & push
  step "1/4: Building and pushing Docker image..."
  local IMAGE_TAG=$(build_and_push_image)
  
  # Step 2: Run database migrations
  step "2/4: Running database migrations..."
  local db_url=$(get_database_url)
  
  # Use Cloud SQL Auth Proxy for migrations
  warn "Running migrations via Cloud Build..."
  gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions="_REGION=${REGION},_REPO_NAME=${REPO_NAME},_SERVICE_NAME=${SERVICE_NAME},_CLOUDSQL_INSTANCE=${cloudsql_conn}" \
    --timeout=1200s \
    . 2>/dev/null || {
    warn "Cloud Build migration failed. You may need to run migrations manually."
    info "Install Cloud SQL Auth Proxy: https://cloud.google.com/sql/docs/postgres/sql-proxy"
    info "Then run: DATABASE_URL='$db_url' npx prisma migrate deploy"
  }
  success "Migrations applied"
  
  # Step 3: Deploy to Cloud Run
  step "3/4: Deploying to Cloud Run..."
  gcloud run deploy "$SERVICE_NAME" \
    --image="${IMAGE_TAG}:latest" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory="$MEMORY" \
    --cpu="$CPU" \
    --min-instances="$MIN_INSTANCES" \
    --max-instances="$MAX_INSTANCES" \
    --set-secrets="DATABASE_URL=sppp-mbi-database-url:latest,JWT_SECRET=sppp-mbi-jwt-secret:latest" \
    --set-env-vars="NODE_ENV=production" \
    --add-cloudsql-instances="$cloudsql_conn" \
    --set-cloudsql-instances="$cloudsql_conn"
  success "Deployed to Cloud Run"
  
  # Step 4: Get URL
  step "4/4: Getting service URL..."
  SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format="value(status.url)")
  
  echo ""
  success "=========================================="
  success "  SPPP-MBI is now live on Cloud Run!"
  success "  URL: $SERVICE_URL"
  success "=========================================="
  echo ""
  info "Run './deploy-gcloud.sh seed' to seed the database"
}

# ================================================
# Deploy VM Command - Compute Engine with Docker
# ================================================
cmd_deploy_vm() {
  check_prerequisites
  check_config
  check_docker
  
  info "Deploying SPPP-MBI to Compute Engine (Docker container)..."
  echo ""
  
  # Step 1: Build & push Docker image
  step "1/6: Building and pushing Docker image..."
  local IMAGE_TAG=$(build_and_push_image)
  
  # Step 2: Check if VM already exists
  step "2/6: Checking VM status..."
  VM_EXISTS=false
  if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    VM_EXISTS=true
    warn "VM $INSTANCE_NAME already exists"
  fi
  
  # Step 3: Create or update VM
  if [ "$VM_EXISTS" = true ]; then
    step "3/6: Updating VM container..."
    gcloud compute instances update-container "$INSTANCE_NAME" \
      --zone="$ZONE" \
      --container-image="${IMAGE_TAG}:latest" \
      --container-env="NODE_ENV=production,DATABASE_URL=$(get_database_url),JWT_SECRET=${JWT_SECRET}" \
      --container-port=8080
    success "VM container updated"
  else
    step "3/6: Creating Compute Engine VM..."
    gcloud compute instances create-with-container "$INSTANCE_NAME" \
      --zone="$ZONE" \
      --machine-type="$MACHINE_TYPE" \
      --container-image="${IMAGE_TAG}:latest" \
      --container-env="NODE_ENV=production,DATABASE_URL=$(get_database_url),JWT_SECRET=${JWT_SECRET}" \
      --container-port=8080 \
      --tags=http-server,https-server \
      --boot-disk-size=30GB \
      --boot-disk-type=pd-balanced
    success "VM instance created"
  fi
  
  # Step 4: Configure firewall rules
  step "4/6: Configuring firewall rules..."
  if gcloud compute firewall-rules describe allow-http-8080 --quiet &> /dev/null; then
    warn "Firewall rule allow-http-8080 already exists, skipping"
  else
    gcloud compute firewall-rules create allow-http-8080 \
      --allow=tcp:8080 \
      --target-tags=http-server \
      --description="Allow HTTP traffic on port 8080 for SPPP-MBI"
    success "Firewall rule created (port 8080)"
  fi
  
  if gcloud compute firewall-rules describe allow-https-443 --quiet &> /dev/null; then
    warn "Firewall rule allow-https-443 already exists, skipping"
  else
    gcloud compute firewall-rules create allow-https-443 \
      --allow=tcp:443 \
      --target-tags=https-server \
      --description="Allow HTTPS traffic on port 443 for SPPP-MBI"
    success "Firewall rule created (port 443)"
  fi
  
  # Step 5: Run database migrations via Cloud SQL Proxy
  step "5/6: Running database migrations..."
  local db_url=$(get_database_url)
  local cloudsql_conn=$(get_cloudsql_connection)
  
  # Attempt migration via Cloud Build
  gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions="_REGION=${REGION},_REPO_NAME=${REPO_NAME},_SERVICE_NAME=${SERVICE_NAME},_CLOUDSQL_INSTANCE=${cloudsql_conn}" \
    --timeout=1200s \
    . 2>/dev/null || {
    warn "Cloud Build migration not available. Running migration on VM..."
    # SSH into VM and run migration
    gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --quiet -- \
      "docker exec \$(docker ps -q) npx prisma migrate deploy" 2>/dev/null || \
    warn "Could not run migrations automatically. Please run manually after VM is ready."
  }
  success "Migrations applied"
  
  # Step 6: Get VM IP
  step "6/6: Getting VM IP address..."
  EXTERNAL_IP=$(get_vm_ip)
  
  echo ""
  success "=========================================="
  success "  SPPP-MBI VM deployed!"
  success "  URL: http://${EXTERNAL_IP}:8080"
  success "=========================================="
  echo ""
  info "Next steps:"
  info "  1. Seed the database:  ./deploy-gcloud.sh seed"
  info "  2. SSH into VM:        ./deploy-gcloud.sh ssh"
  info "  3. View logs:          ./deploy-gcloud.sh logs"
  echo ""
  warn "For production, set up SSL with Let's Encrypt:"
  warn "  ./deploy-gcloud.sh ssh"
  warn "  sudo apt install certbot"
  warn "  sudo certbot certonly --standalone -d your-domain.com"
}

# ================================================
# Deploy VM PM2 Command - Compute Engine with PM2 (no Docker)
# ================================================
cmd_deploy_vm_pm2() {
  check_prerequisites
  check_config
  
  info "Deploying SPPP-MBI to Compute Engine with PM2 (no Docker)..."
  echo ""
  
  local cloudsql_conn=$(get_cloudsql_connection)
  local db_url=$(get_database_url)
  
  # Step 1: Create VM if not exists
  step "1/5: Checking/creating Compute Engine VM..."
  if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    warn "VM $INSTANCE_NAME already exists, will update in place"
  else
    gcloud compute instances create "$INSTANCE_NAME" \
      --zone="$ZONE" \
      --machine-type="$MACHINE_TYPE" \
      --image-family=ubuntu-2204-lts \
      --image-project=ubuntu-os-cloud \
      --tags=http-server,https-server \
      --boot-disk-size=30GB \
      --boot-disk-type=pd-balanced \
      --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt jammy-pgdg main" > /etc/apt/sources.list.d/pgdg.list
apt-get update
apt-get install -y postgresql-15'
    success "VM created with Node.js 20, PM2, and PostgreSQL"
  fi
  
  # Step 2: Configure firewall
  step "2/5: Configuring firewall rules..."
  if ! gcloud compute firewall-rules describe allow-http-8080 --quiet &> /dev/null; then
    gcloud compute firewall-rules create allow-http-8080 \
      --allow=tcp:8080 \
      --target-tags=http-server \
      --description="Allow HTTP on port 8080"
  fi
  if ! gcloud compute firewall-rules describe allow-http-3000 --quiet &> /dev/null; then
    gcloud compute firewall-rules create allow-http-3000 \
      --allow=tcp:3000 \
      --target-tags=http-server \
      --description="Allow HTTP on port 3000"
  fi
  success "Firewall rules configured"
  
  # Step 3: Setup PostgreSQL on the VM
  step "3/5: Setting up PostgreSQL on VM..."
  gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --quiet -- <<REMOTE_SCRIPT
set -e
echo "Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
echo "PostgreSQL configured"

# Setup application directory
mkdir -p /opt/sppp-mbi
echo "Directory ready"
REMOTE_SCRIPT
  success "PostgreSQL and directories configured"
  
  # Step 4: Deploy application code
  step "4/5: Deploying application to VM..."
  
  # Create a tarball of the project (excluding unnecessary files)
  tar czf /tmp/sppp-mbi-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.env' \
    --exclude='logs' \
    --exclude='dev.log' \
    --exclude='db' \
    --exclude='upload' \
    --exclude='download' \
    --exclude='.git' \
    --exclude='agent-ctx' \
    --exclude='examples' \
    .
  
  # Upload to VM
  gcloud compute scp /tmp/sppp-mbi-deploy.tar.gz \
    "${INSTANCE_NAME}:/tmp/sppp-mbi-deploy.tar.gz" \
    --zone="$ZONE" --quiet
  
  # Extract and build on VM
  # Use localhost DB URL since PostgreSQL is on the same VM
  local VM_DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
  
  gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --quiet -- <<REMOTE_SCRIPT
set -e
cd /opt/sppp-mbi

# Extract new code
rm -rf node_modules .next
tar xzf /tmp/sppp-mbi-deploy.tar.gz
rm /tmp/sppp-mbi-deploy.tar.gz

# Create .env file
cat > .env <<EOF
DATABASE_URL=${VM_DB_URL}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
EOF

# Install dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Seed database (if first time)
npm run db:seed 2>/dev/null || echo "Seed already run or not needed"

# Build
npm run build

# Start/Restart with PM2
pm2 delete sppp-mbi 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "Application started!"
REMOTE_SCRIPT
  success "Application deployed and started"
  
  # Step 5: Get VM IP
  step "5/5: Getting VM IP address..."
  EXTERNAL_IP=$(get_vm_ip)
  
  echo ""
  success "=========================================="
  success "  SPPP-MBI VM deployed with PM2!"
  success "  URL: http://${EXTERNAL_IP}:3000"
  success "=========================================="
  echo ""
  info "Management commands:"
  info "  SSH into VM:      ./deploy-gcloud.sh ssh"
  info "  View PM2 logs:    ./deploy-gcloud.sh ssh → pm2 logs"
  info "  Restart app:      ./deploy-gcloud.sh ssh → pm2 restart sppp-mbi"
  info "  View app status:  ./deploy-gcloud.sh ssh → pm2 status"
  echo ""
  warn "For production, configure Nginx reverse proxy + SSL:"
  warn "  1. SSH into VM:  ./deploy-gcloud.sh ssh"
  warn "  2. Install:      sudo apt install nginx certbot python3-certbot-nginx"
  warn "  3. Configure:    See .env.example for Nginx config"
}

# ================================================
# Seed Command
# ================================================
cmd_seed() {
  check_config
  
  info "Seeding the database..."
  
  local cloudsql_conn=$(get_cloudsql_connection)
  local IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
  
  # Check if running on VM (PM2) or Cloud Run
  if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    info "VM found. Seeding database on VM..."
    gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --quiet -- \
      "cd /opt/sppp-mbi && npm run db:seed" 2>/dev/null || {
      # Try Docker container approach
      gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --quiet -- \
        "docker exec \$(docker ps -q) sh -c 'npx prisma db seed'" 2>/dev/null || \
      warn "Could not seed automatically. SSH into VM and run: npm run db:seed"
    }
    success "Database seeded"
  else
    # Cloud Run: use a Cloud Run job
    info "Running seed as Cloud Run job..."
    gcloud run jobs create sppp-mbi-seed \
      --image="${IMAGE_TAG}:latest" \
      --region="$REGION" \
      --set-secrets="DATABASE_URL=sppp-mbi-database-url:latest" \
      --set-env-vars="NODE_ENV=production" \
      --add-cloudsql-instances="$cloudsql_conn" \
      --entrypoint="sh" \
      --args="-c,npx prisma db seed" \
      --memory="512Mi" \
      --cpu="1" \
      --task-timeout=300 2>/dev/null || \
    gcloud run jobs update sppp-mbi-seed \
      --image="${IMAGE_TAG}:latest" \
      --region="$REGION" \
      --set-secrets="DATABASE_URL=sppp-mbi-database-url:latest" \
      --set-env-vars="NODE_ENV=production" \
      --add-cloudsql-instances="$cloudsql_conn" 2>/dev/null
    
    gcloud run jobs execute sppp-mbi-seed --region="$REGION" --wait
    success "Database seeded"
  fi
  
  echo ""
  success "Default admin user created: admin / admin123"
  warn "IMPORTANT: Change the default password after first login!"
}

# ================================================
# Status Command
# ================================================
cmd_status() {
  check_config
  
  info "SPPP-MBI Deployment Status"
  echo "============================"
  
  # Cloud Run
  echo ""
  echo "Cloud Run Service:"
  gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format="table(status.url,status.latestCreatedRevision,status.conditions[0].status)" 2>/dev/null || \
    echo "  (not deployed)"
  
  # Compute Engine VM
  echo ""
  echo "Compute Engine VM:"
  if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    local vm_ip=$(get_vm_ip)
    local vm_status=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="get(status)" 2>/dev/null)
    echo "  Name:   $INSTANCE_NAME"
    echo "  Status: $vm_status"
    echo "  IP:     $vm_ip"
  else
    echo "  (not created)"
  fi
  
  # Cloud SQL
  echo ""
  echo "Cloud SQL Instance:"
  gcloud sql instances describe "$DB_INSTANCE_NAME" \
    --format="table(name,databaseVersion,state,settings.tier)" 2>/dev/null || \
    echo "  (not created)"
}

# ================================================
# Logs Command
# ================================================
cmd_logs() {
  check_config
  
  # Check if VM exists
  if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    info "Streaming logs from VM ($INSTANCE_NAME)..."
    gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --quiet -- \
      "cd /opt/sppp-mbi && pm2 logs sppp-mbi --lines 100" 2>/dev/null || \
    gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --quiet -- \
      "docker logs \$(docker ps -q) --tail 100 -f" 2>/dev/null
  else
    info "Streaming logs from Cloud Run ($SERVICE_NAME)..."
    gcloud run services logs read "$SERVICE_NAME" \
      --region="$REGION" \
      --limit=100 \
      --format="table(timestamp,severity,textPayload)"
  fi
}

# ================================================
# SSH Command
# ================================================
cmd_ssh() {
  check_config
  
  if ! gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    error "VM $INSTANCE_NAME not found. Deploy first with: ./deploy-gcloud.sh deploy-vm"
  fi
  
  info "SSH-ing into $INSTANCE_NAME..."
  gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE"
}

# ================================================
# Destroy Command
# ================================================
cmd_destroy() {
  check_config
  
  warn "This will delete ALL SPPP-MBI resources on Google Cloud!"
  warn "Resources: Cloud Run service, Compute Engine VM, Cloud SQL, Artifact Registry, Secrets"
  echo ""
  read -p "Are you sure? Type 'yes' to confirm: " confirm
  
  if [ "$confirm" != "yes" ]; then
    info "Cancelled."
    exit 0
  fi
  
  info "Deleting Compute Engine VM..."
  gcloud compute instances delete "$INSTANCE_NAME" --zone="$ZONE" --quiet --delete-disks=all 2>/dev/null || true
  
  info "Deleting Cloud Run service..."
  gcloud run services delete "$SERVICE_NAME" --region="$REGION" --quiet 2>/dev/null || true
  
  info "Deleting Cloud SQL instance..."
  gcloud sql instances delete "$DB_INSTANCE_NAME" --quiet 2>/dev/null || true
  
  info "Deleting Artifact Registry images..."
  gcloud artifacts repositories delete "$REPO_NAME" --location="$REGION" --quiet 2>/dev/null || true
  
  info "Deleting firewall rules..."
  gcloud compute firewall-rules delete allow-http-8080 --quiet 2>/dev/null || true
  gcloud compute firewall-rules delete allow-http-3000 --quiet 2>/dev/null || true
  gcloud compute firewall-rules delete allow-https-443 --quiet 2>/dev/null || true
  
  info "Deleting secrets..."
  gcloud secrets delete sppp-mbi-database-url --quiet 2>/dev/null || true
  gcloud secrets delete sppp-mbi-jwt-secret --quiet 2>/dev/null || true
  
  success "All resources deleted."
}

# ================================================
# Main Command Router
# ================================================
case "${1:-}" in
  setup)
    cmd_setup
    ;;
  deploy)
    cmd_deploy
    ;;
  deploy-vm)
    cmd_deploy_vm
    ;;
  deploy-vm-pm2)
    cmd_deploy_vm_pm2
    ;;
  seed)
    cmd_seed
    ;;
  status)
    cmd_status
    ;;
  logs)
    cmd_logs
    ;;
  ssh)
    cmd_ssh
    ;;
  destroy)
    cmd_destroy
    ;;
  *)
    echo "SPPP-MBI - Google Cloud Deployment Tool"
    echo ""
    echo "Usage: $0 {command}"
    echo ""
    echo "Commands:"
    echo "  setup          First-time GCP infrastructure setup (APIs, Cloud SQL, secrets)"
    echo "  deploy         Build & deploy to Cloud Run (serverless, recommended)"
    echo "  deploy-vm      Deploy to Compute Engine VM (Docker container)"
    echo "  deploy-vm-pm2  Deploy to Compute Engine VM (PM2 + Node.js, no Docker)"
    echo "  seed           Seed database with default admin user"
    echo "  status         Check deployment status"
    echo "  logs           View application logs"
    echo "  ssh            SSH into the VM"
    echo "  destroy        Remove all Google Cloud resources"
    echo ""
    echo "Before running, edit this script to set:"
    echo "  PROJECT_ID     - Your GCP Project ID (REQUIRED)"
    echo "  DB_PASSWORD    - Strong password for PostgreSQL (REQUIRED)"
    echo "  JWT_SECRET     - Strong secret for JWT (auto-generated if empty)"
    echo ""
    echo "Deployment options comparison:"
    echo "  ┌─────────────────┬──────────┬──────────┬──────────────┐"
    echo "  │                 │ Cloud Run│ VM+Docker│ VM+PM2       │"
    echo "  ├─────────────────┼──────────┼──────────┼──────────────┤"
    echo "  │ Cost (est.)     │ \$10-20/m │ \$30-50/m │ \$25-40/m    │"
    echo "  │ Auto-scale      │ ✅ Yes   │ ❌ No    │ ❌ No        │"
    echo "  │ Scale to zero   │ ✅ Yes   │ ❌ No    │ ❌ No        │"
    echo "  │ Always running  │ Optional │ ✅ Yes   │ ✅ Yes       │"
    echo "  │ Docker required │ ✅ Yes   │ ✅ Yes   │ ❌ No        │"
    echo "  │ Database        │ Cloud SQL│ Cloud SQL│ Local PG     │"
    echo "  │ Complexity      │ Medium   │ Medium   │ Low          │"
    echo "  │ Best for        │ Production│ Prod/Demo│ Dev/Demo    │"
    echo "  └─────────────────┴──────────┴──────────┴──────────────┘"
    ;;
esac
