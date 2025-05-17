# Check if Swarm is initialized
$swarmStatus = docker info | Select-String -Pattern "Swarm: " | ForEach-Object { $_.Line.Split(":")[1].Trim() }

if ($swarmStatus -eq "inactive") {
    Write-Host "Initializing Docker Swarm locally..." -ForegroundColor Green
    docker swarm init
} else {
    Write-Host "Swarm is already active" -ForegroundColor Cyan
}

# Create required directories
New-Item -ItemType Directory -Force -Path nginx\conf.d
New-Item -ItemType Directory -Force -Path nginx\ssl

# Add nginx configuration
$nginxConfig = @"
upstream api {
    server server:3000;
}

upstream client_upstream {
    server client:3000;
}

server {
    listen 80;
    server_name localhost;
    
    # React app frontend
    location / {
        proxy_pass http://client_upstream/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
        
        # Add additional headers for WebSocket support
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_read_timeout 86400;
    }

    # API endpoints
    location /api {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}
"@

Set-Content -Path "nginx\conf.d\default.conf" -Value $nginxConfig

# Build the images
Write-Host "Building server and client images..." -ForegroundColor Yellow
docker build -t bookmarkeddit:latest .
docker build -t bookmarkeddit-client:latest ./app

# Deploy the stack
Write-Host "Deploying the stack..." -ForegroundColor Yellow
docker stack deploy -c docker-compose.yml bookmarkeddit

Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Show service status
Write-Host "Service Status:" -ForegroundColor Cyan
docker service ls

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Access your application at: http://localhost" -ForegroundColor Green
Write-Host "To view logs: docker service logs bookmarkeddit_client" -ForegroundColor Cyan
Write-Host "To remove the stack: docker stack rm bookmarkeddit" -ForegroundColor Cyan
