# 🗺️ MapTrip

**Rede Social de Viagens com Mapa Interativo**

Plataforma 100% gratuita onde usuários podem registrar passeios com fotos e localização, descobrir novos lugares e explorar um mapa interativo com experiências reais.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** (design system customizado)
- **MongoDB** (driver oficial) — dados, índices geoespaciais `2dsphere` e fotos no GridFS
- **Login próprio**: senha com bcrypt + sessão em cookie httpOnly assinado (JWT/HS256)
- **Leaflet** + OpenStreetMap (mapa 100% gratuito)

---

## 🚀 Setup rápido

### 1. Instale

```bash
npm install
```

### 2. Tenha um MongoDB

- **Local:** instale o MongoDB Community e use `mongodb://127.0.0.1:27017`, ou
- **Atlas (gratuito):** crie um cluster em [mongodb.com/atlas](https://www.mongodb.com/atlas) e copie a connection string (`mongodb+srv://...`).

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `MONGODB_URI` e gere o `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

As coleções e os índices são criados automaticamente na primeira requisição.

### 4. Rode o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 📁 Estrutura do projeto

```
src/
├── app/                    # Páginas (App Router)
│   ├── (auth)/             # Login, Register (sem navbar)
│   ├── (main)/             # Feed, Map, Post, Profile (com navbar)
│   └── api/                # API Routes
├── components/
│   ├── ui/                 # Componentes reutilizáveis
│   ├── feed/               # PostCard, FeedList
│   ├── map/                # MapView, MapPin
│   ├── layout/             # Navbar, FAB
│   └── ...
├── lib/
│   ├── db/                 # Conexão MongoDB, tipos, regras de visibilidade
│   ├── auth/               # Sessão (cookie assinado) e contas
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Helpers
└── hooks/                  # React hooks customizados
```

---

## 🗓️ Etapas de desenvolvimento

| Etapa | Status | Descrição |
|-------|--------|-----------|
| 1. Setup + Auth | ✅ | Projeto base, Supabase, login/register |
| 2. Criar Post | 🔜 | Formulário de check-in com upload |
| 3. Feed | 🔜 | Lista de posts com curtidas |
| 4. Mapa | 🔜 | Pins interativos no Leaflet |
| 5. Perfil | 🔜 | Página de perfil com mapa pessoal |
| 6. Social | 🔜 | Comentários, follows |

---

## 📝 Licença

Projeto pessoal — uso livre.
