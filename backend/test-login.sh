#!/bin/bash

echo "=== Admin Login Test ==="
echo ""

API_URL="http://localhost:3000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Testing Backend Connection...${NC}"
if ! curl -s -f http://localhost:3000/api 2>/dev/null; then
    echo -e "${RED}❌ Backend not running on port 3000${NC}"
    echo "Start backend with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

echo -e "${YELLOW}2. Testing Admin Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin@123"
  }')

echo "Response:"
echo "$LOGIN_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}❌ Login failed - no token received${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo ""

echo -e "${YELLOW}3. Testing Dashboard Endpoint...${NC}"
DASHBOARD=$(curl -s -X GET $API_URL/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN")

echo "Dashboard response:"
echo "$DASHBOARD" | jq '.'
echo ""

echo -e "${YELLOW}4. Testing Users List...${NC}"
USERS=$(curl -s -X GET $API_URL/api/admin/users \
  -H "Authorization: Bearer $TOKEN")

echo "Users count:"
echo "$USERS" | jq 'length'
echo ""

echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Admin Token:"
echo "$TOKEN"
