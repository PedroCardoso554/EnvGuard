# 🛡️ EnvGuard

[![CI](https://img.shields.io/github/actions/workflow/status/envguard/envguard/ci.yml?branch=main&label=CI)](./.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](./package.json)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](./package.json)

**EnvGuard** é uma ferramenta de linha de comando (CLI) leve, rápida e **zero-config** para sincronização de arquivos `.env`, validação de tipagem por comentários, prevenção de vazamento de segredos e geração automática de documentação Markdown.

---

## ✨ Por que usar o EnvGuard?

* **Zero Dependências de Runtime:** Construído 100% sobre APIs nativas do Node.js (`node:util`, `node:readline/promises`, `node:fs/promises`).
* **Zero Configuração:** Sem arquivos extras de schema. As regras vivem como comentários simples no seu próprio `.env.example`.
* **Pronto para CI/CD & Pre-commit Hooks:** Retorna `exit code 1` automaticamente quando encontra erros críticos ou segredos expostos.

---

## 🚀 Comandos Principais

### 1. `npx envguard check` (Sincronização e Validação)
Compara o `.env.example` com o `.env` local, apontando a linha exata de variáveis ausentes, variáveis não documentadas e valores com tipo inválido.

```bash
npx envguard check
npx envguard check --env .env.production --strict
```

**Sintaxe de comentários no `.env.example`:**
```dotenv
PORT=3000 # @type:number @required Porta HTTP onde o servidor será iniciado
DATABASE_URL=postgresql://postgres:password@localhost:5432/envguard # @type:url @required
ENABLE_CACHE=false # @type:boolean Habilita o cache em memória
```
* **Tipos suportados na v1.0:** `string`, `number`, `boolean`, `url`, `email`, `json`.

### 2. `npx envguard scan` (Prevenção de Vazamento de Segredos)
Audita o `.env.example` antes do commit para garantir que nenhuma chave real foi adicionada acidentalmente no lugar de um placeholder.
Detecta nativamente:
* Chaves AWS (`AKIA...`, `ASIA...`)
* Tokens do GitHub (`ghp_...`, `github_pat_...`)
* Chaves da Stripe (`sk_live_...`, `rk_live_...`)
* Strings de conexão de banco (`postgres://`, `mongodb://`, `redis://`, `mysql://`) com senhas reais
* Chaves privadas (`-----BEGIN RSA PRIVATE KEY-----`) e tokens JWT (`eyJ...`)
* Chaves de provedores de IA e SaaS (`sk-ant-...`, `sk-proj-...`, `xoxb-...`, `SG....`)

```bash
npx envguard scan
```

### 3. `npx envguard docs` (Documentação Automática)
Lê as variáveis e comentários do `.env.example` e gera/atualiza automaticamente a tabela de documentação no `README.md` entre os marcadores `<!-- ENVGUARD:START -->` e `<!-- ENVGUARD:END -->`.

```bash
npx envguard docs
```

### 4. `npx envguard init` (Onboarding Interativo)
Lê o `.env.example` e conduz um assistente interativo no terminal, validando cada resposta em tempo real antes de gerar o `.env` final.

```bash
npx envguard init
```

---

## 📋 Variáveis de Ambiente

<!-- ENVGUARD:START -->
| Variável | Tipo | Obrigatória | Exemplo / Padrão | Descrição |
| :--- | :--- | :---: | :--- | :--- |
| `PORT` | `number` | ✅ Sim | `3000` | Porta HTTP onde o servidor será iniciado |
| `NODE_ENV` | `string` | ✅ Sim | `development` | Ambiente de execução (development, production, test) |
| `DATABASE_URL` | `url` | ✅ Sim | `postgresql://postgres:password@localhost:5432/envguard` | URL de conexão com o banco PostgreSQL |
| `ENABLE_CACHE` | `boolean` | ❌ Não | `false` | Habilita o cache em memória da aplicação |
| `ADMIN_EMAIL` | `email` | ❌ Não | `admin@example.com` | E-mail para recebimento de alertas críticos |
| `FEATURE_FLAGS` | `json` | ❌ Não | `{"betaCheckout":false,"maxRetries":3}` | Objeto JSON com flags de funcionalidades |
| `APP_TAG` | `string` | ❌ Não | `v1.0#stable` | Tag de release (suporta # dentro de aspas) |
<!-- ENVGUARD:END -->

---

## 🗺️ Roadmap (v1.0 vs. v2.0+)

| Funcionalidade | v1.0 (Core MVP) | v2.0+ (Futuro) |
| :--- | :---: | :---: |
| Comparar `.env` vs `.env.example` (`check`) | ✅ | — |
| Validação de tipos básicos (`string`, `number`, `boolean`, `url`, `email`, `json`) | ✅ | — |
| Scanner de chaves vazadas via Regex (`scan`) | ✅ | — |
| Gerador de tabela no `README.md` (`docs`) e onboarding (`init`) | ✅ | — |
| Integração com IA (Claude API) para inferir schemas e descrições automaticamente (`--ai`) | ❌ | 🎯 Foco v2.0 |
| Sincronização segura com nuvem (AWS Secrets Manager, Vercel, Doppler) | ❌ | 🔜 Planejado |
| Sistema de plugins e regras customizadas | ❌ | 🔜 Planejado |

---

## 📄 Licença

Distribuído sob a licença [MIT](./LICENSE).
