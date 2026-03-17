#!/bin/bash
set -e

echo "Installing Risk System Dependencies..."

# System dependencies
sudo apt update
sudo apt install -y python3 python3-venv python3-pip redis-server nginx build-essential

# Function to setup venv
setup_agent() {
    AGENT_DIR=$1
    echo "Setting up $AGENT_DIR..."
    python3 -m venv $AGENT_DIR/venv
    $AGENT_DIR/venv/bin/pip install -r $AGENT_DIR/requirements.txt
}

# Setup Agents
setup_agent "backend/agent1_risk"
setup_agent "backend/agent2_traffic"
setup_agent "backend/agent3_shadow"
setup_agent "backend/agent4_learning"

echo "Setup Complete! Use systemd services to start."
