#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VoxAID — Deploy API + ML to AWS EC2 via Docker Compose
#
# Usage:
#   ./scripts/deploy-aws.sh              # Full setup: create instance + deploy
#   ./scripts/deploy-aws.sh deploy       # Redeploy only (instance exists)
#   ./scripts/deploy-aws.sh teardown     # Destroy instance + security group
#   ./scripts/deploy-aws.sh status       # Show instance status
#   ./scripts/deploy-aws.sh logs         # Tail Docker logs from instance
#   ./scripts/deploy-aws.sh ssh          # SSH into instance
# =============================================================================

INSTANCE_NAME="voxaid-server"
KEY_NAME="voxaid"
KEY_FILE="$HOME/.ssh/voxaid.pem"
INSTANCE_TYPE="t3.small"
REGION="${AWS_REGION:-us-east-1}"
SG_NAME="voxaid-sg"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -o ServerAliveInterval=15 -i $KEY_FILE"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---------------------------------------------------------------------------
# Colors & formatting
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

log()     { echo -e "${GREEN}${BOLD}[OK]${NC}    $1" >&2; }
info()    { echo -e "${BLUE}${BOLD}[INFO]${NC}  $1" >&2; }
warn()    { echo -e "${YELLOW}${BOLD}[WARN]${NC}  $1" >&2; }
step()    { echo -e "${CYAN}${BOLD}[STEP]${NC}  $1" >&2; }
err()     { echo -e "${RED}${BOLD}[ERROR]${NC} $1" >&2; }
die()     { err "$1"; exit 1; }
divider() { echo -e "${DIM}────────────────────────────────────────────────────────${NC}" >&2; }

# Show a spinner while a background command runs
spin() {
  local pid=$1 msg=$2
  local chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${CYAN}  %s${NC} %s" "${chars:i++%${#chars}:1}" "$msg"
    sleep 0.1
  done
  wait "$pid"
  local exit_code=$?
  printf "\r"
  return $exit_code
}

# Run a command, show spinner, capture output on failure
run_with_spinner() {
  local msg="$1"; shift
  local tmpfile
  tmpfile=$(mktemp)

  "$@" > "$tmpfile" 2>&1 &
  local pid=$!

  if spin "$pid" "$msg"; then
    log "$msg"
    rm -f "$tmpfile"
    return 0
  else
    local code=$?
    err "$msg — ${RED}failed (exit code $code)${NC}"
    echo ""
    echo -e "${DIM}─── command output ──────────────────────────────────────${NC}"
    cat "$tmpfile"
    echo -e "${DIM}─── end output ─────────────────────────────────────────${NC}"
    rm -f "$tmpfile"
    return $code
  fi
}

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
preflight() {
  step "Running preflight checks..."
  local failed=0

  # AWS CLI
  if ! command -v aws &>/dev/null; then
    err "AWS CLI not installed"
    echo -e "  ${DIM}Install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html${NC}"
    failed=1
  else
    log "AWS CLI found: $(aws --version 2>&1 | head -1)"
  fi

  # AWS credentials
  if ! aws sts get-caller-identity &>/dev/null; then
    err "AWS credentials not configured or expired"
    echo -e "  ${DIM}Run: aws configure${NC}"
    echo -e "  ${DIM}Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY${NC}"
    failed=1
  else
    local account_id
    account_id=$(aws sts get-caller-identity --query 'Account' --output text)
    log "AWS account: $account_id (region: $REGION)"
  fi

  # SSH key
  if [[ ! -f "$KEY_FILE" ]]; then
    err "SSH key not found: $KEY_FILE"
    echo -e "  ${DIM}Create one with:${NC}"
    echo -e "  ${CYAN}aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > $KEY_FILE && chmod 400 $KEY_FILE${NC}"
    failed=1
  else
    log "SSH key found: $KEY_FILE"
  fi

  # rsync
  if ! command -v rsync &>/dev/null; then
    err "rsync not installed (needed to sync files to EC2)"
    echo -e "  ${DIM}macOS: brew install rsync${NC}"
    echo -e "  ${DIM}Linux: sudo apt install rsync${NC}"
    failed=1
  else
    log "rsync found"
  fi

  # .env
  if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
    err ".env not found at project root"
    echo -e "  ${DIM}Create it:${NC}"
    echo -e "  ${CYAN}cp .env.example .env${NC}"
    echo -e "  ${DIM}Then fill in all values (DATABASE_URL, TWILIO_*, GROQ_API_KEY, etc.)${NC}"
    failed=1
  else
    # Validate critical env vars
    local missing_vars=()
    for var in DATABASE_URL TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN GROQ_API_KEY UPSTASH_REDIS_URL API_BASE_URL; do
      if ! grep -q "^${var}=" "$PROJECT_ROOT/.env" 2>/dev/null; then
        missing_vars+=("$var")
      fi
    done
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
      warn ".env is missing these variables:"
      for v in "${missing_vars[@]}"; do
        echo -e "    ${RED}- $v${NC}"
      done
      failed=1
    else
      log ".env found with required variables"
    fi
  fi

  # Docker files
  if [[ ! -f "$PROJECT_ROOT/docker-compose.prod.yml" ]]; then
    err "docker-compose.prod.yml not found"
    failed=1
  fi
  if [[ ! -f "$PROJECT_ROOT/apps/api/Dockerfile" ]]; then
    err "apps/api/Dockerfile not found"
    failed=1
  fi
  if [[ ! -f "$PROJECT_ROOT/apps/ml/Dockerfile" ]]; then
    err "apps/ml/Dockerfile not found"
    failed=1
  fi

  if [[ $failed -ne 0 ]]; then
    echo ""
    die "Preflight checks failed. Fix the issues above and retry."
  fi

  log "All preflight checks passed"
  divider
}

# ---------------------------------------------------------------------------
# Get the latest Amazon Linux 2023 AMI
# ---------------------------------------------------------------------------
get_ami() {
  local ami_id
  ami_id=$(aws ec2 describe-images \
    --region "$REGION" \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023.*-x86_64" "Name=state,Values=available" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text 2>/dev/null) || die "Failed to query AMI. Check your AWS credentials and region ($REGION)."

  [[ "$ami_id" != "None" && -n "$ami_id" ]] || die "No Amazon Linux 2023 AMI found in $REGION. Try a different region: AWS_REGION=us-west-2 ./scripts/deploy-aws.sh"

  log "AMI: $ami_id (Amazon Linux 2023)"
  echo "$ami_id"
}

# ---------------------------------------------------------------------------
# Security group
# ---------------------------------------------------------------------------
ensure_security_group() {
  local sg_id
  sg_id=$(aws ec2 describe-security-groups \
    --region "$REGION" \
    --filters "Name=group-name,Values=$SG_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "None")

  if [[ "$sg_id" == "None" || -z "$sg_id" ]]; then
    step "Creating security group: $SG_NAME"
    sg_id=$(aws ec2 create-security-group \
      --region "$REGION" \
      --group-name "$SG_NAME" \
      --description "VoxAID API + ML server" \
      --query 'GroupId' \
      --output text 2>/dev/null) || die "Failed to create security group. Check your VPC/permissions."

    local ports=(22 80 443 3001 8001)
    local labels=("SSH" "HTTP" "HTTPS" "API" "ML")
    for i in "${!ports[@]}"; do
      if aws ec2 authorize-security-group-ingress \
        --region "$REGION" \
        --group-id "$sg_id" \
        --protocol tcp \
        --port "${ports[$i]}" \
        --cidr 0.0.0.0/0 &>/dev/null; then
        log "  Port ${ports[$i]} (${labels[$i]}) opened"
      else
        warn "  Port ${ports[$i]} (${labels[$i]}) — rule may already exist"
      fi
    done
  else
    log "Security group exists: $sg_id"
  fi
  echo "$sg_id"
}

# ---------------------------------------------------------------------------
# Instance helpers
# ---------------------------------------------------------------------------
get_instance_info() {
  aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].[PublicIpAddress,InstanceId,InstanceType,LaunchTime]' \
    --output text 2>/dev/null
}

get_instance_ip() {
  local info
  info=$(get_instance_info)
  echo "$info" | awk '{print $1}'
}

get_instance_id() {
  local info
  info=$(get_instance_info)
  echo "$info" | awk '{print $2}'
}

wait_for_ssh() {
  local ip="$1"
  local max_attempts=30
  step "Waiting for SSH on $ip..."

  for i in $(seq 1 $max_attempts); do
    if ssh $SSH_OPTS ec2-user@"$ip" "echo ok" &>/dev/null; then
      log "SSH connection established"
      return 0
    fi
    printf "\r${CYAN}  ⏳${NC} Attempt $i/$max_attempts — waiting for SSH..."
    sleep 5
  done

  printf "\r"
  die "SSH connection timed out after $((max_attempts * 5))s.
  Possible causes:
    - Security group doesn't allow port 22
    - Wrong key pair (expected: $KEY_NAME)
    - Instance is still booting
  Debug: aws ec2 describe-instances --instance-ids \$(get_instance_id) --query 'Reservations[0].Instances[0].State'"
}

# ---------------------------------------------------------------------------
# Create EC2 instance
# ---------------------------------------------------------------------------
create_instance() {
  step "Provisioning EC2 instance..."
  divider

  local ami_id sg_id instance_id ip

  ami_id=$(get_ami)
  sg_id=$(ensure_security_group)

  info "Launching $INSTANCE_TYPE instance..."
  instance_id=$(aws ec2 run-instances \
    --region "$REGION" \
    --image-id "$ami_id" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$sg_id" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
    --query 'Instances[0].InstanceId' \
    --output text 2>/dev/null) || die "Failed to launch EC2 instance.
  Common causes:
    - Key pair '$KEY_NAME' doesn't exist in $REGION
    - Insufficient permissions (need ec2:RunInstances)
    - Account limits reached
  Check: aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION"

  log "Instance launched: $instance_id"
  info "Waiting for instance to start (usually ~30s)..."

  if ! aws ec2 wait instance-running --region "$REGION" --instance-ids "$instance_id" 2>/dev/null; then
    die "Instance $instance_id failed to reach 'running' state.
  Check: aws ec2 describe-instances --instance-ids $instance_id --query 'Reservations[0].Instances[0].StateReason'"
  fi

  ip=$(aws ec2 describe-instances \
    --region "$REGION" \
    --instance-ids "$instance_id" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text 2>/dev/null)

  [[ "$ip" != "None" && -n "$ip" ]] || die "Instance has no public IP. Ensure your VPC assigns public IPs by default, or use:
  aws ec2 associate-address --instance-id $instance_id --allocation-id <eip-id>"

  log "Instance ready: $ip ($instance_id)"
  divider
  echo "$ip"
}

# ---------------------------------------------------------------------------
# Install Docker on the instance
# ---------------------------------------------------------------------------
setup_instance() {
  local ip="$1"
  step "Installing Docker on $ip..."

  wait_for_ssh "$ip"

  ssh $SSH_OPTS ec2-user@"$ip" << 'SETUP' || die "Docker installation failed.
  SSH into the instance to debug:
    ssh -i $KEY_FILE ec2-user@$ip
    sudo cat /var/log/cloud-init-output.log"
    echo "--- Installing system packages ---"
    sudo dnf update -y -q 2>&1
    echo "--- Installing Docker ---"
    sudo dnf install -y -q docker git 2>&1
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker ec2-user

    # Verify docker is running
    if ! sudo docker info &>/dev/null; then
      echo "ERROR: Docker failed to start"
      exit 1
    fi
    echo "--- Docker installed and running ---"

    echo "--- Installing Docker Compose + Buildx plugins ---"
    sudo mkdir -p /usr/local/lib/docker/cli-plugins

    sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    BUILDX_VERSION=$(curl -fsSL "https://api.github.com/repos/docker/buildx/releases/latest" | grep '"tag_name"' | head -1 | cut -d'"' -f4)
    sudo curl -fsSL "https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-amd64" \
      -o /usr/local/lib/docker/cli-plugins/docker-buildx
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx

    # Verify compose + buildx
    if ! sudo docker compose version &>/dev/null; then
      echo "ERROR: Docker Compose failed to install"
      exit 1
    fi
    if ! sudo docker buildx version &>/dev/null; then
      echo "ERROR: Docker Buildx failed to install"
      exit 1
    fi
    echo "--- Docker Compose + Buildx installed ---"
    sudo docker compose version
    sudo docker buildx version
SETUP

  log "Docker + Compose installed on $ip"
}

# ---------------------------------------------------------------------------
# Deploy: sync files, build, start
# ---------------------------------------------------------------------------
deploy() {
  local ip="$1"
  step "Deploying to $ip..."
  divider

  # Check SSH
  if ! ssh $SSH_OPTS ec2-user@"$ip" "echo ok" &>/dev/null; then
    die "Cannot SSH into $ip.
  Possible causes:
    - Instance is stopped or terminated
    - Security group changed (port 22 closed)
    - Key mismatch
  Debug: ssh -v $SSH_OPTS ec2-user@$ip"
  fi

  # Sync files
  info "Syncing project files..."
  cd "$PROJECT_ROOT"

  # --delete: remove files on the server that no longer exist locally, so
  # deletions in git (e.g. retired modules) actually land on the box. Without
  # this, stale .ts files linger and either break the Docker build or — worse —
  # silently get bundled into the image and run alongside the new code.
  if ! rsync -avz --progress --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.venv' \
    --exclude 'venv' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '__pycache__' \
    --exclude '.turbo' \
    --exclude 'coverage' \
    -e "ssh $SSH_OPTS" \
    . ec2-user@"$ip":~/voxaid/ 2>&1; then
    die "File sync failed.
  Check:
    - SSH connection: ssh $SSH_OPTS ec2-user@$ip
    - Disk space: ssh $SSH_OPTS ec2-user@$ip 'df -h'"
  fi
  log "Files synced"

  # Build and start containers
  info "Building and starting Docker containers (this takes 3-5 min on first deploy)..."

  ssh $SSH_OPTS ec2-user@"$ip" << 'DEPLOY'
    set -e
    cd ~/voxaid

    echo "--- Stopping existing containers (if any) ---"
    sg docker -c "docker compose -f docker-compose.prod.yml down" 2>/dev/null || true

    echo "--- Building containers ---"
    sg docker -c "docker compose -f docker-compose.prod.yml build --progress=plain" 2>&1

    echo "--- Starting containers ---"
    sg docker -c "docker compose -f docker-compose.prod.yml up -d" 2>&1

    echo "--- Waiting for services to start ---"
    sleep 5

    echo ""
    echo "=== Container Status ==="
    sg docker -c "docker compose -f docker-compose.prod.yml ps" 2>&1

    # Health check
    echo ""
    echo "=== Health Checks ==="
    api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null || echo "000")
    ml_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/ 2>/dev/null || echo "000")

    if [[ "$api_status" == "000" ]]; then
      echo "API:  STARTING (not responding yet — may need 10-20s more)"
      echo "      Check logs: docker compose -f docker-compose.prod.yml logs api"
    else
      echo "API:  HTTP $api_status"
    fi

    if [[ "$ml_status" == "000" ]]; then
      echo "ML:   STARTING (not responding yet — may need 10-20s more)"
      echo "      Check logs: docker compose -f docker-compose.prod.yml logs ml"
    else
      echo "ML:   HTTP $ml_status"
    fi
DEPLOY

  if [[ $? -ne 0 ]]; then
    err "Docker build/start failed. Checking container logs..."
    ssh $SSH_OPTS ec2-user@"$ip" "cd ~/voxaid && sg docker -c 'docker compose -f docker-compose.prod.yml logs --tail=50'" 2>/dev/null || true
    die "Deployment failed. Review the logs above."
  fi

  divider
  echo ""
  echo -e "${GREEN}${BOLD}  Deployment complete!${NC}"
  echo ""
  echo -e "  ${BOLD}API${NC}  http://$ip:3001"
  echo -e "  ${BOLD}ML${NC}   http://$ip:8001"
  echo -e "  ${BOLD}ML Docs${NC}  http://$ip:8001/docs"
  echo ""
  divider
  echo ""
  echo -e "${YELLOW}${BOLD}  Post-deploy checklist:${NC}"
  echo ""
  echo -e "  ${CYAN}1.${NC} Update .env API_BASE_URL to ${BOLD}http://$ip:3001${NC}"
  echo -e "     then redeploy: ${DIM}./scripts/deploy-aws.sh deploy${NC}"
  echo ""
  echo -e "  ${CYAN}2.${NC} Set Twilio voice webhook to:"
  echo -e "     ${BOLD}http://$ip:3001/twilio/voice${NC}  (HTTP POST)"
  echo ""
  echo -e "  ${CYAN}3.${NC} Update Vercel env var:"
  echo -e "     ${BOLD}API_URL=http://$ip:3001${NC}"
  echo ""
  echo -e "  ${CYAN}4.${NC} Test: ${DIM}curl http://$ip:3001${NC}"
  echo ""
}

# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
show_status() {
  step "Checking instance status..."
  local info
  info=$(get_instance_info)

  if [[ -z "$info" || "$info" == "None"* ]]; then
    warn "No running instance found with name '$INSTANCE_NAME'"
    echo -e "  ${DIM}Create one: ./scripts/deploy-aws.sh${NC}"
    return 1
  fi

  local ip id type launch_time
  ip=$(echo "$info" | awk '{print $1}')
  id=$(echo "$info" | awk '{print $2}')
  type=$(echo "$info" | awk '{print $3}')
  launch_time=$(echo "$info" | awk '{print $4}')

  echo ""
  echo -e "  ${BOLD}Instance${NC}    $id"
  echo -e "  ${BOLD}Type${NC}        $type"
  echo -e "  ${BOLD}IP${NC}          $ip"
  echo -e "  ${BOLD}Launched${NC}    $launch_time"
  echo -e "  ${BOLD}Region${NC}      $REGION"
  echo ""

  # Check if services are responding
  info "Checking services..."
  local api_status ml_status
  api_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$ip:3001/" 2>/dev/null || echo "000")
  ml_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$ip:8001/" 2>/dev/null || echo "000")

  if [[ "$api_status" == "000" ]]; then
    echo -e "  ${RED}API${NC}  not responding"
  else
    echo -e "  ${GREEN}API${NC}  HTTP $api_status — http://$ip:3001"
  fi

  if [[ "$ml_status" == "000" ]]; then
    echo -e "  ${RED}ML${NC}   not responding"
  else
    echo -e "  ${GREEN}ML${NC}   HTTP $ml_status — http://$ip:8001"
  fi
  echo ""
}

# ---------------------------------------------------------------------------
# Teardown
# ---------------------------------------------------------------------------
teardown() {
  step "Tearing down VoxAID infrastructure..."

  local instance_id
  instance_id=$(get_instance_id)

  if [[ -n "$instance_id" && "$instance_id" != "None" ]]; then
    warn "Terminating instance: $instance_id"
    echo -e -n "  ${YELLOW}Are you sure? This cannot be undone. [y/N]${NC} "
    read -r confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      info "Cancelled."
      return 0
    fi

    aws ec2 terminate-instances --region "$REGION" --instance-ids "$instance_id" &>/dev/null \
      || die "Failed to terminate instance $instance_id"
    log "Instance $instance_id terminating..."

    info "Waiting for termination..."
    aws ec2 wait instance-terminated --region "$REGION" --instance-ids "$instance_id" 2>/dev/null
    log "Instance terminated"
  else
    info "No running instance found"
  fi

  # Delete security group
  local sg_id
  sg_id=$(aws ec2 describe-security-groups \
    --region "$REGION" \
    --filters "Name=group-name,Values=$SG_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "None")

  if [[ "$sg_id" != "None" && -n "$sg_id" ]]; then
    sleep 3  # wait for instance to fully release the SG
    if aws ec2 delete-security-group --region "$REGION" --group-id "$sg_id" &>/dev/null; then
      log "Security group deleted: $sg_id"
    else
      warn "Could not delete security group $sg_id (may still be in use, try again in a minute)"
    fi
  fi

  echo ""
  log "Teardown complete"
}

# ---------------------------------------------------------------------------
# Logs
# ---------------------------------------------------------------------------
show_logs() {
  local ip
  ip=$(get_instance_ip)
  [[ "$ip" != "None" && -n "$ip" ]] || die "No running instance found"

  info "Tailing logs from $ip (Ctrl+C to stop)..."
  ssh $SSH_OPTS ec2-user@"$ip" \
    "cd ~/voxaid && sg docker -c 'docker compose -f docker-compose.prod.yml logs -f --tail=100'"
}

# ---------------------------------------------------------------------------
# SSH
# ---------------------------------------------------------------------------
do_ssh() {
  local ip
  ip=$(get_instance_ip)
  [[ "$ip" != "None" && -n "$ip" ]] || die "No running instance found"

  info "Connecting to $ip..."
  ssh $SSH_OPTS ec2-user@"$ip"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo ""
  echo -e "${BOLD}  VoxAID AWS Deploy${NC}"
  divider

  local mode="${1:-full}"

  case "$mode" in
    deploy)
      preflight
      local ip
      ip=$(get_instance_ip)
      [[ "$ip" != "None" && -n "$ip" ]] || die "No running instance found. Run without arguments first: ./scripts/deploy-aws.sh"
      deploy "$ip"
      ;;
    teardown)
      teardown
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs
      ;;
    ssh)
      do_ssh
      ;;
    full|"")
      preflight
      local ip
      ip=$(get_instance_ip)
      if [[ "$ip" != "None" && -n "$ip" ]]; then
        warn "Instance already running at $ip"
        echo -e -n "  ${YELLOW}Redeploy? [Y/n]${NC} "
        read -r confirm
        if [[ "$confirm" == "n" || "$confirm" == "N" ]]; then
          info "Cancelled."
          exit 0
        fi
        deploy "$ip"
      else
        ip=$(create_instance)
        setup_instance "$ip"
        deploy "$ip"
      fi
      ;;
    *)
      echo -e "${BOLD}Usage:${NC} $0 [command]"
      echo ""
      echo -e "${BOLD}Commands:${NC}"
      echo "  (none)     Full setup — create instance + deploy"
      echo "  deploy     Redeploy code to existing instance"
      echo "  teardown   Destroy instance and security group"
      echo "  status     Show instance and service status"
      echo "  logs       Tail Docker container logs"
      echo "  ssh        SSH into the instance"
      exit 1
      ;;
  esac
}

main "$@"
