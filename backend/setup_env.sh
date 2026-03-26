#!/bin/bash
# Setup script voor backend/.env
# Voer dit uit vanuit de backend/ directory

echo "=== City Solid Backend Setup ==="
echo ""
echo "Ga naar: https://supabase.com/dashboard/project/qwtvruniwnhiqgsyjskn/settings/api-keys/legacy"
echo "Kopieer de 'service_role' key (klik Reveal, dan Copy)"
echo ""
read -p "Plak hier de service_role key: " SERVICE_KEY
echo ""
echo "Ga naar: https://supabase.com/dashboard/project/qwtvruniwnhiqgsyjskn/settings/jwt/legacy"
echo "Kopieer de 'Legacy JWT secret' (klik Copy)"
echo ""
read -p "Plak hier de JWT secret: " JWT_SECRET
echo ""

cat > .env << EOF
SUPABASE_URL=https://qwtvruniwnhiqgsyjskn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
SUPABASE_JWT_SECRET=${JWT_SECRET}
EOF

echo "✅ backend/.env aangemaakt!"
echo ""
echo "Nu: pip install -r requirements.txt && uvicorn main:app --reload --port 8000"
