# 🔧 Load Testing the Pokédx API

This guide provides comprehensive instructions for load testing the Auto Scaling Pokédx API to verify scaling behavior and performance characteristics.

## 🎯 Testing Objectives

- Verify auto scaling triggers work correctly
- Measure API performance under load
- Validate load balancer distribution
- Test health check reliability
- Monitor CloudWatch metrics in real-time

## 🛠️ Testing Tools

### 1. Apache Bench (ab) - Simple HTTP Load Testing

**Installation:**
```bash
# Amazon Linux / RHEL / CentOS
sudo yum install httpd-tools

# Ubuntu / Debian
sudo apt-get install apache2-utils

# macOS
brew install httpd
```

**Basic Load Tests:**
```bash
# Test API root endpoint (light load)
ab -n 100 -c 10 http://your-alb-dns/api/

# Test random Pokemon endpoint (medium load)
ab -n 1000 -c 50 http://your-alb-dns/api/pokemon/random

# Test search endpoint (heavy load)
ab -n 5000 -c 100 http://your-alb-dns/api/pokemon/search/fire

# Extended test (10,000 requests, 200 concurrent)
ab -n 10000 -c 200 -t 300 http://your-alb-dns/api/pokemon/random

# Test with custom headers
ab -n 1000 -c 50 -H "Accept: application/json" http://your-alb-dns/api/pokemon
```

**Sample Output:**
```
Server Software:        
Server Hostname:        your-alb-dns
Server Port:            80

Document Path:          /api/pokemon/random
Document Length:        312 bytes

Concurrency Level:      100
Time taken for tests:   15.432 seconds
Complete requests:      1000
Failed requests:        0
Total transferred:      469000 bytes
HTML transferred:       312000 bytes
Requests per second:    64.80 [#/sec] (mean)
Time per request:       1543.186 [ms] (mean)
Time per request:       15.432 [ms] (mean, across all concurrent requests)
Transfer rate:          29.68 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    5   2.1      5      12
Processing:   125  890 245.2    876    1456
Waiting:      120  885 245.8    871    1451
Total:        132  895 245.0    881    1461

Percentage of the requests served within a certain time (ms)
  50%    881
  66%    945
  75%    998
  80%   1034
  90%   1156
  95%   1298
  98%   1398
  99%   1432
 100%   1461 (longest request)
```

### 2. hey - Modern HTTP Load Tester

**Installation:**
```bash
# Using Go
go install github.com/rakyll/hey@latest

# Or download binary from GitHub releases
curl -L https://github.com/rakyll/hey/releases/latest/download/hey_linux_amd64 -o hey
chmod +x hey
sudo mv hey /usr/local/bin/
```

**Advanced Load Tests:**
```bash
# Duration-based test (5 minutes)
hey -z 5m -c 100 http://your-alb-dns/api/pokemon/random

# Request count-based test with rate limiting
hey -n 10000 -c 50 -q 100 http://your-alb-dns/api/pokemon/random

# Test with custom HTTP method and headers
hey -n 1000 -c 50 -m GET -H "User-Agent: LoadTest/1.0" http://your-alb-dns/api/pokemon

# Test multiple endpoints
hey -n 500 -c 25 http://your-alb-dns/api/pokemon/1
hey -n 500 -c 25 http://your-alb-dns/api/pokemon/25
hey -n 500 -c 25 http://your-alb-dns/api/pokemon/150

# JSON payload test (if you have POST endpoints)
hey -n 1000 -c 50 -m POST -H "Content-Type: application/json" -d '{"query":"electric"}' http://your-alb-dns/api/search
```

### 3. wrk - High-Performance HTTP Benchmarking

**Installation:**
```bash
# Ubuntu/Debian
sudo apt-get install wrk

# CentOS/RHEL (requires EPEL)
sudo yum install epel-release
sudo yum install wrk

# From source
git clone https://github.com/wg/wrk.git
cd wrk && make
sudo cp wrk /usr/local/bin/
```

**Performance Tests:**
```bash
# Basic test (12 threads, 400 connections, 30 seconds)
wrk -t12 -c400 -d30s http://your-alb-dns/api/pokemon/random

# Extended test with script
wrk -t12 -c100 -d60s -s script.lua http://your-alb-dns/api/

# High-intensity test
wrk -t20 -c1000 -d120s --timeout 30s http://your-alb-dns/api/pokemon/random
```

**Custom Lua Script (script.lua):**
```lua
-- Random endpoint tester
local paths = {
    "/api/pokemon/random",
    "/api/pokemon/1",
    "/api/pokemon/25",
    "/api/pokemon/150",
    "/api/pokemon/search/fire",
    "/api/pokemon/search/water",
    "/api/stats",
    "/health"
}

request = function()
    local path = paths[math.random(#paths)]
    return wrk.format("GET", path)
end

response = function(status, headers, body)
    if status ~= 200 then
        print("Error: " .. status)
    end
end
```

### 4. Custom Node.js Load Tester

**Create advanced-load-test.js:**
```javascript
const http = require('http');
const https = require('https');
const { URL } = require('url');

class LoadTester {
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl;
        this.options = {
            duration: options.duration || 60000, // 1 minute
            concurrency: options.concurrency || 100,
            rampUp: options.rampUp || 5000, // 5 seconds
            endpoints: options.endpoints || ['/api/pokemon/random'],
            ...options
        };
        
        this.stats = {
            requests: 0,
            responses: 0,
            errors: 0,
            totalTime: 0,
            responseTimes: [],
            statusCodes: {}
        };
    }

    async run() {
        console.log(`🚀 Starting load test...`);
        console.log(`📊 Configuration:`);
        console.log(`   Base URL: ${this.baseUrl}`);
        console.log(`   Duration: ${this.options.duration}ms`);
        console.log(`   Concurrency: ${this.options.concurrency}`);
        console.log(`   Endpoints: ${this.options.endpoints.length}`);
        
        const startTime = Date.now();
        
        // Gradual ramp-up
        await this.rampUp();
        
        // Main test duration
        await this.runTest();
        
        // Results
        this.printResults(startTime);
    }

    async rampUp() {
        const interval = this.options.rampUp / this.options.concurrency;
        console.log(`📈 Ramping up... (${this.options.rampUp}ms)`);
        
        for (let i = 0; i < this.options.concurrency; i++) {
            setTimeout(() => this.startWorker(), i * interval);
        }
        
        await this.delay(this.options.rampUp);
    }

    async runTest() {
        console.log(`⚡ Running main test... (${this.options.duration}ms)`);
        await this.delay(this.options.duration);
        this.stopTest = true;
    }

    startWorker() {
        if (this.stopTest) return;
        
        const endpoint = this.options.endpoints[
            Math.floor(Math.random() * this.options.endpoints.length)
        ];
        
        this.makeRequest(endpoint, () => {
            // Continue making requests
            if (!this.stopTest) {
                setTimeout(() => this.startWorker(), 10);
            }
        });
    }

    makeRequest(path, callback) {
        const url = new URL(path, this.baseUrl);
        const client = url.protocol === 'https:' ? https : http;
        
        const startTime = Date.now();
        this.stats.requests++;
        
        const req = client.request(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                this.stats.responses++;
                this.stats.totalTime += responseTime;
                this.stats.responseTimes.push(responseTime);
                this.stats.statusCodes[res.statusCode] = 
                    (this.stats.statusCodes[res.statusCode] || 0) + 1;
                
                callback();
            });
        });

        req.on('error', (err) => {
            this.stats.errors++;
            console.error(`❌ Request error: ${err.message}`);
            callback();
        });

        req.setTimeout(30000, () => {
            req.destroy();
            this.stats.errors++;
            callback();
        });

        req.end();
    }

    printResults(startTime) {
        const duration = (Date.now() - startTime) / 1000;
        const avgResponseTime = this.stats.totalTime / this.stats.responses;
        const requestsPerSecond = this.stats.responses / duration;
        
        // Sort response times for percentile calculation
        this.stats.responseTimes.sort((a, b) => a - b);
        const p50 = this.getPercentile(50);
        const p95 = this.getPercentile(95);
        const p99 = this.getPercentile(99);
        
        console.log(`\n📊 Load Test Results:`);
        console.log(`┌─────────────────────┬─────────────────┐`);
        console.log(`│ Metric              │ Value           │`);
        console.log(`├─────────────────────┼─────────────────┤`);
        console.log(`│ Duration            │ ${duration.toFixed(2)}s         │`);
        console.log(`│ Requests Sent       │ ${this.stats.requests.toLocaleString()}           │`);
        console.log(`│ Responses Received  │ ${this.stats.responses.toLocaleString()}           │`);
        console.log(`│ Errors              │ ${this.stats.errors.toLocaleString()}             │`);
        console.log(`│ Requests/sec        │ ${requestsPerSecond.toFixed(2)}         │`);
        console.log(`│ Avg Response Time   │ ${avgResponseTime.toFixed(2)}ms        │`);
        console.log(`│ 50th Percentile     │ ${p50.toFixed(2)}ms        │`);
        console.log(`│ 95th Percentile     │ ${p95.toFixed(2)}ms        │`);
        console.log(`│ 99th Percentile     │ ${p99.toFixed(2)}ms        │`);
        console.log(`└─────────────────────┴─────────────────┘`);
        
        console.log(`\n📈 Status Code Distribution:`);
        Object.entries(this.stats.statusCodes).forEach(([code, count]) => {
            console.log(`   ${code}: ${count} (${(count/this.stats.responses*100).toFixed(2)}%)`);
        });
    }

    getPercentile(percentile) {
        const index = Math.floor(this.stats.responseTimes.length * percentile / 100);
        return this.stats.responseTimes[index] || 0;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Usage examples
async function runBasicTest() {
    const tester = new LoadTester('http://your-alb-dns', {
        duration: 60000,      // 1 minute
        concurrency: 50,      // 50 concurrent users
        rampUp: 10000,        // 10 second ramp-up
        endpoints: [
            '/api/pokemon/random',
            '/api/pokemon/1',
            '/api/pokemon/search/fire',
            '/api/stats',
            '/health'
        ]
    });
    
    await tester.run();
}

async function runScalingTest() {
    console.log('🔥 Starting Auto Scaling Verification Test');
    
    // Phase 1: Baseline (should use 2 instances)
    console.log('\n📊 Phase 1: Baseline Load');
    const baselineTest = new LoadTester('http://your-alb-dns', {
        duration: 120000,     // 2 minutes
        concurrency: 20,      // Light load
        endpoints: ['/api/pokemon/random']
    });
    await baselineTest.run();
    
    console.log('\n⏳ Waiting 2 minutes for metrics to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    // Phase 2: Scale-out trigger (should trigger scaling)
    console.log('\n🚀 Phase 2: Heavy Load (Trigger Scale-Out)');
    const scaleOutTest = new LoadTester('http://your-alb-dns', {
        duration: 300000,     // 5 minutes
        concurrency: 200,     // Heavy load
        endpoints: [
            '/api/pokemon/random',
            '/api/pokemon/search/fire',
            '/api/pokemon/search/water'
        ]
    });
    await scaleOutTest.run();
    
    console.log('\n⏳ Waiting 10 minutes for scale-out to complete...');
    await new Promise(resolve => setTimeout(resolve, 600000));
    
    // Phase 3: Sustained load (should maintain scaled instances)
    console.log('\n💪 Phase 3: Sustained Load');
    const sustainedTest = new LoadTester('http://your-alb-dns', {
        duration: 300000,     // 5 minutes
        concurrency: 100,     // Medium load
        endpoints: ['/api/pokemon/random']
    });
    await sustainedTest.run();
    
    console.log('\n✅ Auto Scaling Test Complete!');
    console.log('Check CloudWatch console to verify scaling events.');
}

// Run the appropriate test
if (process.argv[2] === 'scaling') {
    runScalingTest().catch(console.error);
} else {
    runBasicTest().catch(console.error);
}
```

**Run the custom tester:**
```bash
# Basic load test
node advanced-load-test.js

# Auto scaling verification test
node advanced-load-test.js scaling
```

## 📊 Expected Performance Benchmarks

### Performance Targets
| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Response Time (avg) | <100ms | <200ms | >500ms |
| 95th Percentile | <200ms | <400ms | >1000ms |
| Throughput | >500 RPS | >200 RPS | <100 RPS |
| Error Rate | <0.1% | <1% | >5% |
| Availability | 99.9% | 99% | <95% |

### Scaling Triggers
| Load Level | Concurrent Users | Expected Instances | Expected RPS |
|------------|------------------|-------------------|--------------|
| Low | 1-20 | 2 | 50-200 |
| Medium | 21-100 | 2-4 | 200-800 |
| High | 101-300 | 4-8 | 800-1500 |
| Peak | 300+ | 8-10 | 1500+ |

## 🔍 Monitoring During Tests

### CloudWatch Metrics to Watch
```bash
# Monitor CPU utilization
aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --dimensions Name=AutoScalingGroupName,Value=pokedex-asg \
    --start-time 2024-01-01T10:00:00Z \
    --end-time 2024-01-01T11:00:00Z \
    --period 300 \
    --statistics Average,Maximum

# Monitor request count
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name RequestCount \
    --dimensions Name=LoadBalancer,Value=app/pokedex-alb/xyz \
    --start-time 2024-01-01T10:00:00Z \
    --end-time 2024-01-01T11:00:00Z \
    --period 300 \
    --statistics Sum

# Monitor target response time
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name TargetResponseTime \
    --dimensions Name=LoadBalancer,Value=app/pokedex-alb/xyz \
    --start-time 2024-01-01T10:00:00Z \
    --end-time 2024-01-01T11:00:00Z \
    --period 300 \
    --statistics Average
```

### Real-time Monitoring Script
```bash
#!/bin/bash
# monitor-during-test.sh

ALB_ARN="arn:aws:elasticloadbalancing:region:account:loadbalancer/app/pokedex-alb/xyz"
ASG_NAME="pokedex-asg"

echo "📊 Real-time Load Test Monitoring"
echo "=================================="

while true; do
    clear
    echo "🕐 $(date)"
    echo ""
    
    # Get current instance count
    INSTANCE_COUNT=$(aws autoscaling describe-auto-scaling-groups \
        --auto-scaling-group-names $ASG_NAME \
        --query 'AutoScalingGroups[0].DesiredCapacity' \
        --output text)
    
    # Get healthy targets
    HEALTHY_TARGETS=$(aws elbv2 describe-target-health \
        --target-group-arn $TARGET_GROUP_ARN \
        --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' \
        --output text)
    
    echo "🏗️  Current Instances: $INSTANCE_COUNT"
    echo "💚 Healthy Targets: $HEALTHY_TARGETS"
    echo ""
    
    # Get recent metrics (last 5 minutes)
    END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S")
    START_TIME=$(date -u -d "5 minutes ago" +"%Y-%m-%dT%H:%M:%S")
    
    CPU_AVG=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/EC2 \
        --metric-name CPUUtilization \
        --dimensions Name=AutoScalingGroupName,Value=$ASG_NAME \
        --start-time $START_TIME \
        --end-time $END_TIME \
        --period 300 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text)
    
    echo "🔥 Average CPU: ${CPU_AVG}%"
    
    sleep 30
done
```

## 📋 Load Test Scenarios

### Scenario 1: Baseline Performance
**Objective**: Establish baseline performance with minimal load
```bash
ab -n 1000 -c 10 http://your-alb-dns/api/pokemon/random
```

### Scenario 2: Normal Traffic Simulation
**Objective**: Simulate normal website traffic patterns
```bash
# Mixed endpoints, moderate concurrency
hey -n 5000 -c 50 http://your-alb-dns/api/pokemon/random &
hey -n 2000 -c 25 http://your-alb-dns/api/pokemon/1 &
hey -n 1000 -c 10 http://your-alb-dns/api/stats &
wait
```

### Scenario 3: Traffic Spike Simulation
**Objective**: Verify auto scaling triggers work correctly
```bash
# Sudden high load
ab -n 20000 -c 500 -t 300 http://your-alb-dns/api/pokemon/random
```

### Scenario 4: Endurance Test
**Objective**: Test stability over extended period
```bash
# 30-minute sustained load
hey -z 30m -c 100 http://your-alb-dns/api/pokemon/random
```

### Scenario 5: Burst and Recovery
**Objective**: Test scaling up and down behavior
```bash
#!/bin/bash
echo "🔥 Starting burst test..."
ab -n 10000 -c 200 http://your-alb-dns/api/pokemon/random &
BURST_PID=$!

echo "⏳ Waiting for burst to complete..."
wait $BURST_PID

echo "😴 Cooling down for 15 minutes..."
sleep 900

echo "🔥 Second burst..."
ab -n 5000 -c 100 http://your-alb-dns/api/pokemon/random
```

## 🚨 Troubleshooting Load Tests

### Common Issues

**1. Connection Timeouts**
```bash
# Increase timeout values
ab -n 1000 -c 50 -s 30 http://your-alb-dns/api/pokemon/random
hey -n 1000 -c 50 -t 30 http://your-alb-dns/api/pokemon/random
```

**2. Too Many Open Files**
```bash
# Increase file descriptor limits
ulimit -n 65536
echo "fs.file-max = 2097152" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**3. DNS Resolution Issues**
```bash
# Use IP address instead of DNS name
dig your-alb-dns
ab -n 1000 -c 50 -H "Host: your-alb-dns" http://IP-ADDRESS/api/pokemon/random
```

**4. Load Balancer Throttling**
```bash
# Reduce concurrency and add delays
ab -n 1000 -c 25 -i http://your-alb-dns/api/pokemon/random
```

## 📈 Interpreting Results

### Success Indicators
- ✅ Response times remain consistent under load
- ✅ Auto Scaling Group increases instance count during high load
- ✅ Error rate stays below 1%
- ✅ All instances remain healthy
- ✅ CloudWatch alarms trigger appropriately

### Warning Signs
- ⚠️  Response times increase significantly (>500ms)
- ⚠️  Error rate above 1%
- ⚠️  Some instances become unhealthy
- ⚠️  Scaling takes longer than 5 minutes

### Failure Indicators
- ❌ Error rate above 5%
- ❌ Response times exceed 1 second consistently
- ❌ Auto scaling doesn't trigger
- ❌ Load balancer returns 503 errors
- ❌ Application becomes completely unresponsive

## 📊 Sample Test Report Template

```markdown
# Load Test Report - Pokédex API

## Test Configuration
- **Date**: 2024-01-15
- **Duration**: 10 minutes
- **Tool**: Apache Bench
- **Command**: `ab -n 10000 -c 100 http://alb-dns/api/pokemon/random`

## Results Summary
- **Total Requests**: 10,000
- **Successful Requests**: 9,987 (99.87%)
- **Failed Requests**: 13 (0.13%)
- **Requests per Second**: 142.34
- **Average Response Time**: 703ms
- **95th Percentile**: 1,234ms

## Auto Scaling Behavior
- **Initial Instances**: 2
- **Peak Instances**: 6
- **Scale-out Time**: 4 minutes 23 seconds
- **Scale-in Time**: 12 minutes 45 seconds

## CloudWatch Metrics
- **Peak CPU Usage**: 82%
- **Average CPU Usage**: 67%
- **Peak Request Count**: 180/minute
- **Target Response Time**: 156ms

## Recommendations
1. ✅ Performance meets requirements
2. ⚠️  Consider reducing scale-out threshold to 60% CPU
3. ✅ Auto scaling working as expected
4. ⚠️  Monitor error rate during peak times
```

---

**Happy Load Testing! 🚀⚡**
