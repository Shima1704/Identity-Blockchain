#!/usr/bin/env pwsh

Write-Host "=== Admin Login Test ===" -ForegroundColor Cyan
Write-Host ""

$ApiUrl = "http://localhost:3000"

# Test 1: Backend Connection
Write-Host "1. Testing Backend Connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/api" -ErrorAction SilentlyContinue
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend not running on port 3000" -ForegroundColor Red
    Write-Host "Start backend with: npm run dev"
    exit 1
}

Write-Host ""

# Test 2: Admin Login
Write-Host "2. Testing Admin Login..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "$ApiUrl/api/admin/login" `
      -Method POST `
      -Headers @{"Content-Type" = "application/json"} `
      -Body '{"username":"admin","password":"admin@123"}' `
      -ErrorAction Stop

    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.access_token

    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($loginData | ConvertTo-Json | Out-String)
    Write-Host "✅ Login successful" -ForegroundColor Green

} catch {
    Write-Host "❌ Login failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Dashboard
Write-Host "3. Testing Dashboard Endpoint..." -ForegroundColor Yellow
try {
    $dashResponse = Invoke-WebRequest -Uri "$ApiUrl/api/admin/dashboard" `
      -Method GET `
      -Headers @{"Authorization" = "Bearer $token"} `
      -ErrorAction Stop

    $dashData = $dashResponse.Content | ConvertFrom-Json
    Write-Host "Dashboard Stats:" -ForegroundColor Green
    Write-Host ($dashData | ConvertTo-Json | Out-String)

} catch {
    Write-Host "❌ Dashboard request failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Users List
Write-Host "4. Testing Users List..." -ForegroundColor Yellow
try {
    $usersResponse = Invoke-WebRequest -Uri "$ApiUrl/api/admin/users" `
      -Method GET `
      -Headers @{"Authorization" = "Bearer $token"} `
      -ErrorAction Stop

    $users = $usersResponse.Content | ConvertFrom-Json
    Write-Host "Users count: $($users.Length)" -ForegroundColor Green

} catch {
    Write-Host "❌ Users request failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Your Admin Token:" -ForegroundColor Yellow
Write-Host "$token"
Write-Host ""
Write-Host "Frontend URL: http://localhost:3001/admin/login" -ForegroundColor Cyan
Write-Host "Username: admin" -ForegroundColor Cyan
Write-Host "Password: admin@123" -ForegroundColor Cyan
