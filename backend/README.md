# 🐉 Pokédx API - Auto Scaling Application

A high-performance RESTful API serving Pokemon data, designed to demonstrate AWS Auto Scaling, Load Balancing, and CloudWatch monitoring capabilities.

## 🎯 Project Overview

This project showcases a production-ready Node.js API that can handle variable traffic loads through AWS Auto Scaling Groups, Application Load Balancers, and CloudWatch-based scaling policies.

## 🛠️ AWS Services Used

- **Amazon EC2** - Auto Scaling Group with multiple instances
- **Application Load Balancer (ALB)** - Traffic distribution and health checks
- **Auto Scaling Groups** - Automatic scaling based on metrics
- **Amazon CloudWatch** - Monitoring, metrics, and alarms
- **Amazon SNS** - Email notifications for scaling events
- **AWS Systems Manager** - Configuration and patch management
- **Amazon VPC** - Network isolation across multiple AZs

## ✨ API Features

### Core Endpoints
- **GET /api** - API documentation and server info
- **GET /api/pokemon** - List all Pokemon with pagination
- **GET /api/pokemon/random** - Get a random Pokemon
- **GET /api/pokemon/:id** - Get specific Pokemon by ID (supports 1-1025)
- **GET /api/pokemon/search/:query** - Search Pokemon by name or type
- **GET /api/stats** - API usage statistics and server metrics
- **GET /health** - Health check endpoint for load balancer

### Image Quality
All Pokémon data includes high-quality official artwork URLs:
- **Format**: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`
- **Coverage**: All 1,025 official Pokémon (Generation I-IX)
- **Resolution**: High-quality official artwork (much better than basic sprites)
- **Fields**: Both `image` and `image_url` contain the same URL for compatibility

### Advanced Features
- **Load Balancer Support** - Server identification for debugging
- **Automatic Data Loading** - Reads from CSV or creates sample data
- **High-Quality Artwork** - Official Pokémon artwork from PokeAPI sprites (1-1025)
- **Request Logging** - Detailed API access logs
- **Error Handling** - Comprehensive error responses
- **Graceful Shutdown** - Proper SIGTERM/SIGINT handling
- **Stress Testing** - Built-in endpoint for load testing

## 📁 Project Structure

```
4-auto-scaling-app/
├── server.js              # Main Express.js application
├── package.json           # Node.js dependencies and scripts
├── pokemon.csv            # Pokemon dataset (1000+ entries with image URLs)
├── Dockerfile             # Container deployment (optional)
├── load-test.md           # Load testing instructions
└── README.md              # This file
```

## 🚀 Deployment Instructions

### Step 1: Create Launch Template

```bash
# Create IAM role for EC2 instances
aws iam create-role \
    --role-name PokedexEC2Role \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": { "Service": "ec2.amazonaws.com" },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

# Attach necessary policies
aws iam attach-role-policy \
    --role-name PokedexEC2Role \
    --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

aws iam attach-role-policy \
    --role-name PokedexEC2Role \
    --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Create instance profile
aws iam create-instance-profile --instance-profile-name PokedexEC2Profile
aws iam add-role-to-instance-profile \
    --instance-profile-name PokedexEC2Profile \
    --role-name PokedexEC2Role
```

**User Data Script for Launch Template:**
```bash
#!/bin/bash
yum update -y
yum install -y nodejs npm git

# Create app directory
mkdir -p /opt/pokedex-api
cd /opt/pokedex-api

# Copy application files (replace with your method)
# Option 1: Clone from repository
git clone https://your-repo-url.git .

# Option 2: Copy from S3
# aws s3 sync s3://your-bucket/pokedex-api/ .

# Install dependencies
npm install

# Create systemd service
cat > /etc/systemd/system/pokedex-api.service << 'EOF'
[Unit]
Description=Pokedex API Service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/pokedex-api
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=SERVER_ID=%i

[Install]
WantedBy=multi-user.target
EOF

# Set permissions and start service
chown -R ec2-user:ec2-user /opt/pokedex-api
systemctl enable pokedex-api
systemctl start pokedex-api

# Install CloudWatch agent
yum install -y amazon-cloudwatch-agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
    "metrics": {
        "namespace": "PokedexAPI",
        "metrics_collected": {
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "diskio": {
                "measurement": ["io_time"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/aws/ec2/pokedex-api",
                        "log_stream_name": "{instance_id}/messages"
                    }
                ]
            }
        }
    }
}
EOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
```

### Step 2: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
    --name pokedex-alb \
    --subnets subnet-12345678 subnet-87654321 \
    --security-groups sg-12345678 \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4

# Create target group
aws elbv2 create-target-group \
    --name pokedex-targets \
    --protocol HTTP \
    --port 3000 \
    --vpc-id vpc-12345678 \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 10 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:region:account:loadbalancer/app/pokedex-alb/xyz \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/pokedex-targets/xyz
```

### Step 3: Create Launch Template

```bash
aws ec2 create-launch-template \
    --launch-template-name PokedexLaunchTemplate \
    --launch-template-data '{
        "ImageId": "ami-0abcdef1234567890",
        "InstanceType": "t3.micro",
        "SecurityGroupIds": ["sg-12345678"],
        "IamInstanceProfile": {"Name": "PokedexEC2Profile"},
        "UserData": "'$(base64 -w 0 user-data.sh)'",
        "TagSpecifications": [
            {
                "ResourceType": "instance",
                "Tags": [
                    {"Key": "Name", "Value": "Pokedex-API-Server"},
                    {"Key": "Environment", "Value": "Production"}
                ]
            }
        ]
    }'
```

### Step 4: Create Auto Scaling Group

```bash
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name pokedex-asg \
    --launch-template LaunchTemplateName=PokedexLaunchTemplate,Version='$Latest' \
    --min-size 2 \
    --max-size 10 \
    --desired-capacity 2 \
    --target-group-arns arn:aws:elasticloadbalancing:region:account:targetgroup/pokedex-targets/xyz \
    --health-check-type ELB \
    --health-check-grace-period 300 \
    --vpc-zone-identifier "subnet-12345678,subnet-87654321"
```

### Step 5: Create CloudWatch Alarms and Scaling Policies

**Scale Out Policy:**
```bash
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name pokedex-asg \
    --policy-name scale-out-policy \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
        "TargetValue": 70.0,
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "ASGAverageCPUUtilization"
        },
        "ScaleOutCooldown": 300,
        "ScaleInCooldown": 300
    }'
```

**Custom Scaling Policy for Request Count:**
```bash
# Create custom metric alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "Pokedex-HighRequestCount" \
    --alarm-description "Scale out when request count is high" \
    --metric-name RequestCount \
    --namespace AWS/ApplicationELB \
    --statistic Sum \
    --period 300 \
    --threshold 1000 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=LoadBalancer,Value=app/pokedex-alb/xyz \
    --evaluation-periods 2
```

### Step 6: Set Up SNS Notifications

```bash
# Create SNS topic
aws sns create-topic --name pokedex-scaling-notifications

# Subscribe to email
aws sns subscribe \
    --topic-arn arn:aws:sns:region:account:pokedex-scaling-notifications \
    --protocol email \
    --notification-endpoint your-email@example.com

# Create notification configuration
aws autoscaling put-notification-configuration \
    --auto-scaling-group-name pokedex-asg \
    --topic-arn arn:aws:sns:region:account:pokedex-scaling-notifications \
    --notification-types "autoscaling:EC2_INSTANCE_LAUNCH" "autoscaling:EC2_INSTANCE_TERMINATE"
```

## 🏗️ Architecture Diagram

```
                          ┌─────────────────────────────────────────────┐
                          │                Internet                     │
                          └────────────────┬────────────────────────────┘
                                           │
                          ┌────────────────▼────────────────────────────┐
                          │         Application Load Balancer          │
                          │           (Multi-AZ)                       │
                          └────┬─────────────────────────────────┬──────┘
                               │                                 │
                    ┌──────────▼──────────┐           ┌────────▼──────────┐
                    │    Availability     │           │   Availability    │
                    │      Zone A         │           │     Zone B        │
                    │                     │           │                   │
                    │  ┌───────────────┐  │           │ ┌───────────────┐ │
                    │  │   EC2         │  │           │ │   EC2         │ │
                    │  │ Pokedex API   │  │           │ │ Pokedex API   │ │
                    │  │   Server      │  │           │ │   Server      │ │
                    │  └───────────────┘  │           │ └───────────────┘ │
                    │                     │           │                   │
                    │  ┌───────────────┐  │           │ ┌───────────────┐ │
                    │  │   EC2         │  │           │ │   EC2         │ │
                    │  │ Pokedex API   │  │           │ │ Pokedex API   │ │
                    │  │   Server      │  │           │ │   Server      │ │
                    │  └───────────────┘  │           │ └───────────────┘ │
                    └─────────────────────┘           └───────────────────┘
                               │                                 │
                               └─────────┬───────────────────────┘
                                         │
                              ┌─────────▼──────────┐
                              │    CloudWatch      │
                              │   Monitoring &     │
                              │     Alarms         │
                              └─────────┬──────────┘
                                        │
                              ┌─────────▼──────────┐
                              │  Auto Scaling      │
                              │     Group          │
                              │  (2-10 instances)  │
                              └─────────┬──────────┘
                                        │
                              ┌─────────▼──────────┐
                              │       SNS          │
                              │  Notifications     │
                              └────────────────────┘
```

## 📊 API Usage Examples

### Get Random Pokemon
```bash
curl -X GET http://your-load-balancer-dns/api/pokemon/random
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "name": "Pikachu",
    "type": "Electric",
    "heightM": "0.4",
    "weightKg": "6.0",
    "base_experience": 112,
    "image": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    "image_url": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    "description": "When several of these Pokemon gather, their electricity could build and cause lightning storms."
  },
  "server_id": "server-2"
}
```

### Search Pokemon
```bash
curl -X GET http://your-load-balancer-dns/api/pokemon/search/fire
```

### Get All Pokemon (Paginated)
```bash
curl -X GET "http://your-load-balancer-dns/api/pokemon?page=1&limit=10"
```

### Health Check
```bash
curl -X GET http://your-load-balancer-dns/health
```

## 📈 Load Testing

### Using Apache Bench (ab)
```bash
# Install Apache Bench
sudo yum install httpd-tools  # Amazon Linux/RHEL
sudo apt-get install apache2-utils  # Ubuntu/Debian

# Test random Pokemon endpoint (100 concurrent, 1000 requests)
ab -n 1000 -c 100 http://your-load-balancer-dns/api/pokemon/random

# Test with different concurrency levels
ab -n 5000 -c 200 http://your-load-balancer-dns/api/pokemon/random

# Test search endpoint
ab -n 1000 -c 50 http://your-load-balancer-dns/api/pokemon/search/electric
```

### Using hey (Modern alternative)
```bash
# Install hey
go install github.com/rakyll/hey@latest

# Run load test
hey -n 10000 -c 100 -m GET http://your-load-balancer-dns/api/pokemon/random

# Test with custom duration
hey -z 5m -c 100 http://your-load-balancer-dns/api/pokemon/random
```

### Custom Load Test Script
```javascript
// load-test.js
const http = require('http');

const options = {
  hostname: 'your-load-balancer-dns',
  port: 80,
  path: '/api/pokemon/random',
  method: 'GET'
};

let completed = 0;
let errors = 0;
const totalRequests = 1000;
const concurrency = 50;

console.log(`Starting load test: ${totalRequests} requests with ${concurrency} concurrency`);
const startTime = Date.now();

for (let i = 0; i < concurrency; i++) {
  makeRequests();
}

function makeRequests() {
  if (completed >= totalRequests) return;
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      completed++;
      if (completed < totalRequests) {
        makeRequests();
      } else if (completed === totalRequests) {
        const duration = Date.now() - startTime;
        console.log(`\n✅ Load test completed!`);
        console.log(`📊 Results:`);
        console.log(`   Total requests: ${totalRequests}`);
        console.log(`   Successful: ${totalRequests - errors}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Requests/sec: ${(totalRequests / (duration / 1000)).toFixed(2)}`);
      }
    });
  });

  req.on('error', (err) => {
    errors++;
    completed++;
    console.error(`❌ Request error: ${err.message}`);
    if (completed < totalRequests) makeRequests();
  });

  req.end();
}
```

### Expected Scaling Behavior

1. **Baseline (2 instances)**: ~500 req/sec
2. **Scale out trigger**: CPU > 70% or >1000 req/5min
3. **Scale in trigger**: CPU < 30% for 15 minutes
4. **Maximum capacity**: 10 instances (~2500 req/sec)

## 🔍 Monitoring & Observability

### CloudWatch Metrics to Monitor
- **CPUUtilization**: Server load indicator
- **NetworkIn/Out**: Traffic volume
- **RequestCount**: API usage
- **TargetResponseTime**: Performance metric
- **HealthyHostCount**: Available instances
- **UnHealthyHostCount**: Failed instances

### Custom Application Metrics
```javascript
// Add to your server.js
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

// Send custom metrics
function sendMetric(metricName, value, unit = 'Count') {
    const params = {
        Namespace: 'PokedexAPI/Custom',
        MetricData: [{
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date()
        }]
    };
    
    cloudwatch.putMetricData(params, (err, data) => {
        if (err) console.error('CloudWatch error:', err);
    });
}

// Example usage
app.use((req, res, next) => {
    sendMetric('APIRequest', 1);
    next();
});
```

### Monitoring Dashboard
Create CloudWatch dashboard to visualize:
- Request rate and response times
- CPU and memory usage across instances
- Auto Scaling events and instance health
- Error rates and successful responses

## 💰 Cost Analysis

### Instance Costs (us-east-1)
- **t3.micro**: $0.0104/hour × 2 instances × 24h = $0.50/day
- **t3.small**: $0.0208/hour × 4 instances × 24h = $2.00/day
- **Load Balancer**: $0.0225/hour = $0.54/day
- **Data Transfer**: $0.09/GB out to internet

### Monthly Estimates
- **Light Load (2 t3.micro)**: ~$25/month
- **Medium Load (4 t3.small)**: ~$80/month
- **Heavy Load (8 t3.medium)**: ~$200/month

## 🔒 Security Best Practices

### Network Security
```bash
# Security group for ALB (allow HTTP/HTTPS from internet)
aws ec2 create-security-group \
    --group-name pokedex-alb-sg \
    --description "Security group for Pokedex ALB"

aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Security group for EC2 instances (allow only ALB traffic)
aws ec2 create-security-group \
    --group-name pokedex-instances-sg \
    --description "Security group for Pokedex instances"

aws ec2 authorize-security-group-ingress \
    --group-id sg-87654321 \
    --protocol tcp \
    --port 3000 \
    --source-group sg-12345678
```

### Application Security
- Input validation and sanitization
- Rate limiting with express-rate-limit
- Security headers with helmet.js
- Request logging and monitoring
- Environment variable management

## 🚨 Troubleshooting

### Instance Not Healthy
```bash
# Check instance status
aws ec2 describe-instances --instance-ids i-1234567890abcdef0

# Check target group health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...

# SSH into instance (if SSH access configured)
ssh -i your-key.pem ec2-user@instance-ip
sudo systemctl status pokedex-api
sudo journalctl -u pokedex-api -n 50
```

### Auto Scaling Not Working
```bash
# Check scaling policies
aws autoscaling describe-policies --auto-scaling-group-name pokedex-asg

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-names "Pokedex-HighCPU"

# Manual scaling for testing
aws autoscaling set-desired-capacity \
    --auto-scaling-group-name pokedex-asg \
    --desired-capacity 4
```

### Performance Issues
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name RequestCount \
    --start-time 2024-01-01T00:00:00Z \
    --end-time 2024-01-01T01:00:00Z \
    --period 300 \
    --statistics Sum
```

## 🎉 Success Criteria

- ✅ API serves Pokemon data correctly
- ✅ Load balancer distributes traffic evenly
- ✅ Auto scaling triggers based on CPU/requests
- ✅ Health checks pass consistently
- ✅ CloudWatch metrics show proper data
- ✅ SNS notifications work for scaling events
- ✅ Application handles 1000+ concurrent requests
- ✅ Response time stays under 200ms under load
- ✅ Zero downtime during scaling events

## 📚 Next Steps

1. **Container Deployment**: Dockerize the application for ECS/EKS
2. **Database Integration**: Add RDS for persistent Pokemon data
3. **Caching Layer**: Implement Redis/ElastiCache
4. **API Gateway**: Add AWS API Gateway for additional features
5. **CI/CD Pipeline**: Automate deployments with CodePipeline
6. **Multi-Region**: Deploy across multiple AWS regions

---

**Built with ❤️ for scalable Pokemon adventures! 🐉**
